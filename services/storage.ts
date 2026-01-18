import { JournalEntry } from '../types';
import { simpleEncrypt, simpleDecrypt, hashPasscode } from './encryption';
import { supabase } from './supabase';

const DATA_KEY = 'ht_data_enc';
const PASS_CHECK_KEY = 'ht_pass_hash';

// --- Local Helper ---
export const hasPassword = (): boolean => {
  // Check local first
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
    tags: []
  };
};

// --- Local Storage (Fast / Offline) ---

export const saveEntriesLocal = (entries: JournalEntry[], pass: string): string | null => {
  try {
    const json = JSON.stringify(entries);
    const encrypted = simpleEncrypt(json, pass);
    localStorage.setItem(DATA_KEY, encrypted);
    return encrypted;
  } catch (error) {
    console.error('Failed to save local', error);
    return null;
  }
};

export const loadEntriesLocal = (pass: string): JournalEntry[] | null => {
  try {
    const encrypted = localStorage.getItem(DATA_KEY);
    if (!encrypted) return null;
    const decryptedJson = simpleDecrypt(encrypted, pass);
    if (!decryptedJson) return null;
    return JSON.parse(decryptedJson);
  } catch (error) {
    return null;
  }
};

// --- Cloud Storage (Supabase) ---

// Check if a user exists (by hash) without downloading the heavy data
export const checkUserExists = async (pass: string): Promise<boolean> => {
  try {
    const id = hashPasscode(pass);
    const { count, error } = await supabase
      .from('encrypted_journals')
      .select('id', { count: 'exact', head: true }) // head: true means don't return data, just check existence
      .eq('id', id);
    
    if (error) return false;
    return count !== null && count > 0;
  } catch {
    return false;
  }
};

export const saveEntriesToCloud = async (entries: JournalEntry[], pass: string) => {
  try {
    const encrypted = saveEntriesLocal(entries, pass); // Save local first & get string
    if (!encrypted) return;

    const id = hashPasscode(pass); 

    const { error } = await supabase
      .from('encrypted_journals')
      .upsert({ 
        id: id, 
        data: encrypted, 
        updated_at: new Date().toISOString() 
      });

    if (error) console.error('Cloud save failed:', error);
  } catch (e) {
    console.error('Cloud save error', e);
  }
};

export const loadEntriesFromCloud = async (pass: string): Promise<JournalEntry[] | null> => {
  try {
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
    localStorage.setItem(DATA_KEY, data.data);
    
    return JSON.parse(decryptedJson);
  } catch (e) {
    console.error('Cloud load error', e);
    return null;
  }
};
