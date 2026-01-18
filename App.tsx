import React, { useState, useEffect } from 'react';
import { JournalEntry } from './types';
import { 
  saveEntriesToCloud, 
  loadEntriesLocal, 
  loadEntriesFromCloud, 
  createEntry, 
  setPasswordHash,
  checkUserExists 
} from './services/storage';
import { hashPasscode } from './services/encryption';
import { JournalUI } from './components/JournalUI';
import { StealthLayer } from './components/StealthLayer';
import { LockScreen } from './components/LockScreen';

const App: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  // State for locking mechanism
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [passcode, setPasscode] = useState<string>('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [isStealthMode, setIsStealthMode] = useState<boolean>(false);

  // Debounced Save to Cloud (Auto-save)
  useEffect(() => {
    if (!isLocked && passcode && entries.length > 0) {
      const timer = setTimeout(() => {
        saveEntriesToCloud(entries, passcode);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [entries, isLocked, passcode]);

  // Stealth/Panic Mode shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsStealthMode(prev => !prev);
      }
      if (e.key === 'Escape') {
         window.location.replace('https://www.shein.com');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initSession = (pass: string, data: JournalEntry[]) => {
    setEntries(data);
    if (data.length > 0) {
      setCurrentId(data[0].id);
    } else {
      // Create first entry for new users
      const newEntry = createEntry();
      setEntries([newEntry]);
      setCurrentId(newEntry.id);
    }
    setPasswordHash(hashPasscode(pass));
    setPasscode(pass);
    setIsLocked(false);
    setIsLoading(false);
  };

  const handleLogin = async (inputPass: string) => {
    setLockError(null);
    setIsLoading(true);

    // 1. Try local cache first (fastest)
    // Note: Local cache might not match inputPass if multiple users use same device.
    // So we try decrypt. If decrypt fails (returns null), it means wrong pass for local data.
    const localData = loadEntriesLocal(inputPass);
    if (localData) {
      initSession(inputPass, localData);
      
      // Background sync: check if cloud has newer data
      loadEntriesFromCloud(inputPass).then(cloudData => {
        if (cloudData) {
           // Simple strategy: Cloud overrides local on load if exists
           // In a complex app, we'd merge by timestamp.
           setEntries(cloudData);
           if (cloudData.length > 0 && !currentId) setCurrentId(cloudData[0].id);
        }
      });
      return;
    }

    // 2. If no local data valid for this pass, check Cloud
    const cloudData = await loadEntriesFromCloud(inputPass);
    
    if (cloudData) {
      initSession(inputPass, cloudData);
    } else {
      // 3. If no cloud data either, check if user even exists
      const exists = await checkUserExists(inputPass);
      if (exists) {
        setLockError("密码错误或数据损坏 (无法解密)");
        setIsLoading(false);
      } else {
        setLockError("账号不存在，请切换到注册页创建");
        setIsLoading(false);
      }
    }
  };

  const handleRegister = async (inputPass: string) => {
    setLockError(null);
    setIsLoading(true);

    // 1. Check if user already exists
    const exists = await checkUserExists(inputPass);
    if (exists) {
      setLockError("该密码已被注册 (或与其他用户冲突)，请更换密码");
      setIsLoading(false);
      return;
    }

    // 2. Create new session
    const firstEntry = createEntry();
    const newEntries = [firstEntry];
    
    // 3. Immediately save to cloud to "reserve" this ID
    await saveEntriesToCloud(newEntries, inputPass);
    
    initSession(inputPass, newEntries);
  };

  const handleLock = () => {
    setEntries([]); // Clear memory
    setPasscode('');
    setIsLocked(true);
    setIsStealthMode(false);
    setLockError(null);
  };

  const handleCreate = () => {
    const newEntry = createEntry();
    setEntries(prev => [newEntry, ...prev]);
    setCurrentId(newEntry.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这篇记录吗？此操作不可恢复。')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      if (currentId === id) setCurrentId(null);
    }
  };

  const handleContentChange = (text: string) => {
    if (!currentId) return;
    setEntries(prev => prev.map(e => 
      e.id === currentId ? { ...e, content: text, updatedAt: Date.now() } : e
    ));
  };

  const handleUpdateAiField = (id: string, field: 'aiSummary' | 'aiMood', value: string) => {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };
  
  const handleUpdateMeta = (id: string, meta: { tags?: string[], userMood?: string }) => {
    setEntries(prev => prev.map(e => 
       e.id === id ? { ...e, ...meta, updatedAt: Date.now() } : e
    ));
  };

  const currentEntry = entries.find(e => e.id === currentId) || null;

  if (isLocked) {
    return (
      <div className="relative">
        <LockScreen 
          isSetup={false} 
          onLogin={handleLogin} 
          onRegister={handleRegister}
          errorMsg={lockError}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isStealthMode ? (
        <StealthLayer 
          entries={entries}
          currentEntry={currentEntry}
          onContentChange={handleContentChange}
          onSelect={setCurrentId}
        />
      ) : (
        <JournalUI 
          entries={entries}
          currentEntry={currentEntry}
          onContentChange={handleContentChange}
          onSelect={setCurrentId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateAiField={handleUpdateAiField}
          onUpdateMeta={handleUpdateMeta}
          onLock={handleLock}
        />
      )}
    </div>
  );
};

export default App;
