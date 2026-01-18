import { JournalEntry } from '../types';
import { simpleEncrypt, simpleDecrypt, hashPasscode } from './encryption';
import { supabase, isCloudConfigured } from './supabase';
import imageCompression from 'browser-image-compression';

const LEGACY_DATA_KEY = 'ht_data_enc';
const PASS_CHECK_KEY = 'ht_pass_hash';

// Helper to get user-specific storage key
const getStorageKey = (hash: string) => `ht_data_${hash}`;

// --- Local Helper ---
export const hasPassword = (): boolean => {
  return !!localStorage.getItem(PASS_CHECK_KEY);
};

export const setPasswordHash = (hash: string) => {
  localStorage.setItem(PASS_CHECK_KEY, hash);
};

export const createEntry = (): JournalEntry => {
  return {
    id: crypto.randomUUID(),
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    images: []
  };
};

// --- Image Handling ---

export const uploadImage = async (file: File): Promise<string | null> => {
  if (!isCloudConfigured) return null; // Skip if no cloud

  try {
    // 1. Compress Image (Target ~300KB)
    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };
    
    let compressedFile: File;
    try {
      compressedFile = await imageCompression(file, options);
    } catch (e) {
      console.warn("Compression failed, using original", e);
      compressedFile = file;
    }

    // 2. Rename with UUID for Privacy (Dissociate filename from content)
    const fileExt = 'jpg'; // We forced jpeg in options
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    // 3. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('journal-photos')
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return null;
    }

    // 4. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from('journal-photos')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error("Image upload process failed:", error);
    return null;
  }
};

// --- Local Storage (Fast / Offline) ---

export const saveEntriesLocal = (entries: JournalEntry[], pass: string): string | null => {
  try {
    const json = JSON.stringify(entries);
    const encrypted = simpleEncrypt(json, pass);
    const hash = hashPasscode(pass);
    localStorage.setItem(getStorageKey(hash), encrypted);
    return encrypted;
  } catch (error) {
    console.error('Failed to save local', error);
    return null;
  }
};

export const loadEntriesLocal = (pass: string): JournalEntry[] | null => {
  try {
    const hash = hashPasscode(pass);
    let encrypted = localStorage.getItem(getStorageKey(hash));

    // Migration Logic: Check legacy key if specific key not found
    if (!encrypted) {
      const legacy = localStorage.getItem(LEGACY_DATA_KEY);
      if (legacy) {
        // Try decrypting legacy data with current pass
        const legacyDecrypted = simpleDecrypt(legacy, pass);
        if (legacyDecrypted) {
          // Success! Migrate to new key format
          try {
             // Verify it's valid JSON
             JSON.parse(legacyDecrypted);
             encrypted = legacy;
             // Save to new key
             localStorage.setItem(getStorageKey(hash), legacy);
             // Optional: Keep legacy or remove. Keeping for safety for now.
          } catch(e) {}
        }
      }
    }

    if (!encrypted) return null;
    const decryptedJson = simpleDecrypt(encrypted, pass);
    if (!decryptedJson) return null;
    return JSON.parse(decryptedJson);
  } catch (error) {
    return null;
  }
};

// --- Cloud Storage (Supabase) ---

// Check if a user exists (by hash)
export const checkUserExists = async (pass: string): Promise<boolean> => {
  try {
    const id = hashPasscode(pass);
    
    // 1. Check Local Storage first (Robustness for offline/local-only mode)
    if (localStorage.getItem(getStorageKey(id))) {
      return true;
    }

    // 2. Check Legacy Local Storage
    const legacy = localStorage.getItem(LEGACY_DATA_KEY);
    if (legacy && simpleDecrypt(legacy, pass)) {
       return true;
    }

    // 3. Check Cloud
    if (!isCloudConfigured) return false;

    const { count, error } = await supabase
      .from('encrypted_journals')
      .select('id', { count: 'exact', head: true }) 
      .eq('id', id);
    
    if (error) return false;
    return count !== null && count > 0;
  } catch {
    return false;
  }
};

export const saveEntriesToCloud = async (entries: JournalEntry[], pass: string): Promise<{ error?: string }> => {
  try {
    const encrypted = saveEntriesLocal(entries, pass); // Save local first & get string
    if (!encrypted) return { error: '本地加密失败' };

    if (!isCloudConfigured) return {}; // Silent success if cloud is not configured

    const id = hashPasscode(pass); 

    const { error } = await supabase
      .from('encrypted_journals')
      .upsert({ 
        id: id, 
        data: encrypted, 
        updated_at: new Date().toISOString() 
      });

    if (error) {
      // Fix: Log the full error object safely
      console.error('Cloud save failed:', error);
      return { error: error.message || '云端同步失败，请稍后重试' };
    }
    
    return {};
  } catch (e: any) {
    console.error('Cloud save exception', e);
    return { error: e.message || '网络连接异常' };
  }
};

// New function to handle registration with duplicate check
export const registerNewUserCloud = async (entries: JournalEntry[], pass: string) => {
  try {
    const encrypted = saveEntriesLocal(entries, pass);
    if (!encrypted) return { error: { message: 'Local encryption failed' } };
    
    // We do NOT check isCloudConfigured here, because we want the UI to receive the "Supabase not configured" error
    // so the user knows why registration failed if they expected it to work.
    // If we simply returned success here, it would be a "fake" registration that only exists locally.

    const id = hashPasscode(pass);

    // Using INSERT instead of UPSERT to trigger unique constraint violation if ID exists
    const { error } = await supabase
      .from('encrypted_journals')
      .insert({
        id: id,
        data: encrypted,
        updated_at: new Date().toISOString()
      });

    return { error };
  } catch (e) {
    return { error: e };
  }
};

export const loadEntriesFromCloud = async (pass: string): Promise<JournalEntry[] | null> => {
  try {
    if (!isCloudConfigured) return null;

    const id = hashPasscode(pass);
    
    const { data, error } = await supabase
      .from('encrypted_journals')
      .select('data')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    // Decrypt the cloud data
    const decryptedJson = simpleDecrypt(data.data, pass);
    if (!decryptedJson) return null;

    // Update local cache too
    localStorage.setItem(getStorageKey(id), data.data);
    
    return JSON.parse(decryptedJson);
  } catch (e) {
    console.error('Cloud load error', e);
    return null;
  }
};