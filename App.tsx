import React, { useState, useEffect } from 'react';
import { JournalEntry, ViewMode } from './types';
import { 
  saveEntriesToCloud, 
  loadEntriesLocal, 
  loadEntriesFromCloud, 
  createEntry, 
  setPasswordHash,
  checkUserExists,
  registerNewUserCloud
} from './services/storage';
import { hashPasscode } from './services/encryption';
import { JournalUI } from './components/JournalUI';
import { LockScreen } from './components/LockScreen';

const App: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('journal');
  
  // State for locking mechanism
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [passcode, setPasscode] = useState<string>('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // UI State for save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Debounced Save to Cloud (Auto-save) with UI Feedback
  useEffect(() => {
    if (!isLocked && passcode && entries.length > 0) {
      setSaveStatus('saving');
      
      const timer = setTimeout(async () => {
        const { error } = await saveEntriesToCloud(entries, passcode);
        if (error) {
          setSaveStatus('error');
          // Optionally auto-hide error after a long delay, or keep it visible
          setTimeout(() => setSaveStatus('idle'), 5000); 
        } else {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 2000); 
      
      return () => clearTimeout(timer);
    }
  }, [entries, isLocked, passcode]);

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

    // --- Developer / Offline Mode Bypass ---
    if (inputPass === 'Hibiscus_200212') {
      const localData = loadEntriesLocal(inputPass);
      if (localData) {
        initSession(inputPass, localData);
      } else {
        // Create new local session if none exists for this key
        const devEntry = createEntry();
        devEntry.content = "<h3>Developer Mode</h3><p>本地模式已激活。Supabase 连接已跳过。</p>";
        initSession(inputPass, [devEntry]);
      }
      return;
    }

    // 1. Try local cache first (fastest)
    const localData = loadEntriesLocal(inputPass);
    if (localData) {
      initSession(inputPass, localData);
      
      // Background sync
      loadEntriesFromCloud(inputPass).then(cloudData => {
        if (cloudData) {
           setEntries(cloudData);
           if (cloudData.length > 0 && !currentId) setCurrentId(cloudData[0].id);
        }
      });
      return;
    }

    // 2. Check Cloud
    const cloudData = await loadEntriesFromCloud(inputPass);
    
    if (cloudData) {
      initSession(inputPass, cloudData);
    } else {
      // 3. Check existence
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

    const firstEntry = createEntry();
    const newEntries = [firstEntry];
    
    // Attempt registration with backend validation
    const { error } = await registerNewUserCloud(newEntries, inputPass);
    
    if (error) {
      // Handle Duplicate Key Error (Postgres code 23505)
      // Since the backend has a UNIQUE constraint on ID
      if (error.code === '23505' || (error.message && error.message.includes('duplicate'))) {
        setLockError("该密码对应的ID已存在，请更换密码");
      } else {
        setLockError(`注册失败: ${error.message || '网络或服务器错误'}`);
      }
      setIsLoading(false);
      return;
    }
    
    initSession(inputPass, newEntries);
  };

  const handleLock = () => {
    setEntries([]); // Clear memory
    setPasscode('');
    setIsLocked(true);
    setLockError(null);
    setViewMode('journal');
  };

  const handleCreate = () => {
    const newEntry = createEntry();
    setEntries(prev => [newEntry, ...prev]);
    setCurrentId(newEntry.id);
    setViewMode('journal');
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
  
  // Updated signature to allow partial updates (including isPinned)
  const handleUpdateMeta = (id: string, meta: Partial<JournalEntry>) => {
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
        saveStatus={saveStatus}
        viewMode={viewMode}
        onChangeView={setViewMode}
      />
    </div>
  );
};

export default App;