
import React, { useState, useEffect } from 'react';
import { JournalEntry, ViewMode } from './types';
import { 
  saveEntriesToCloud, 
  loadEntriesLocal, 
  loadEntriesFromCloud, 
  createEntry, 
  setPasswordHash,
  checkUserExists,
  registerNewUserCloud,
  hasPassword,
  clearLocalData
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
  const [hasAccount, setHasAccount] = useState<boolean>(() => hasPassword());
  
  // URL Params for Chat Invite
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  // UI State for save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Check for Room Invite Link on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setPendingRoomId(room);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auto-save Effect
  useEffect(() => {
    if (!isLocked && passcode && entries.length > 0) {
      setSaveStatus('saving');
      
      const timer = setTimeout(async () => {
        const { error } = await saveEntriesToCloud(entries, passcode);
        if (error) {
          setSaveStatus('error');
          // Reset error status after a while
          setTimeout(() => setSaveStatus('idle'), 5000); 
        } else {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 2000); 
      
      return () => clearTimeout(timer);
    }
  }, [entries, isLocked, passcode]);

  const initSession = async (pass: string, data: JournalEntry[]) => {
    setEntries(data);
    if (data.length > 0) {
      setCurrentId(data[0].id);
    } else {
      const newEntry = createEntry();
      setEntries([newEntry]);
      setCurrentId(newEntry.id);
    }
    
    const hash = await hashPasscode(pass);
    setPasswordHash(hash);
    setHasAccount(true); // Account now confirmed
    setPasscode(pass); // State holds raw pass for encryption usage (will be trimmed by service)
    setIsLocked(false);
    setIsLoading(false);

    if (pendingRoomId) {
       setViewMode('chat');
    }
  };

  const handleLogin = async (inputPass: string) => {
    setLockError(null);
    setIsLoading(true);

    try {
      // 1. Try Local Load
      const localData = await loadEntriesLocal(inputPass);
      if (localData) {
        await initSession(inputPass, localData);
        // Background sync
        loadEntriesFromCloud(inputPass).then(cloudData => {
          if (cloudData) {
             setEntries(cloudData);
             if (cloudData.length > 0 && !currentId) setCurrentId(cloudData[0].id);
          }
        });
        return;
      }

      // 2. Try Cloud Load
      const cloudData = await loadEntriesFromCloud(inputPass);
      if (cloudData) {
        await initSession(inputPass, cloudData);
      } else {
        // 3. Check if user exists but failed to decrypt (or genuinely new)
        const exists = await checkUserExists(inputPass);
        if (exists) {
          setLockError("密码错误或数据损坏 (无法解密)");
        } else {
          setLockError("账号不存在，请切换到注册页创建");
        }
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLockError("登录过程发生未知错误");
      setIsLoading(false);
    }
  };

  const handleRegister = async (inputPass: string) => {
    setLockError(null);
    setIsLoading(true);
    const firstEntry = createEntry();
    const newEntries = [firstEntry];
    
    // Attempt registration
    const { error } = await registerNewUserCloud(newEntries, inputPass);
    
    if (error) {
      const errMsg = error.message || '';
      // Check for config error first
      if (error.code === 'CONFIG_MISSING') {
         setLockError("系统配置错误：云端数据库未连接 (请检查 Vercel 环境变量)");
      } else if (error.code === '23505' || errMsg.includes('duplicate')) {
        setLockError("该密码生成的 ID 已存在，请更换密码");
      } else {
        setLockError(`注册失败: ${errMsg || '网络连接问题'}`);
      }
      setIsLoading(false);
      return;
    }
    
    await initSession(inputPass, newEntries);
  };

  const handleLock = () => {
    setEntries([]); 
    setPasscode('');
    setIsLocked(true);
    setLockError(null);
    setViewMode('journal');
  };

  const handleReset = () => {
    clearLocalData();
    window.location.reload();
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
          isNewUser={!hasAccount} 
          onLogin={handleLogin} 
          onRegister={handleRegister}
          onReset={handleReset}
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
        initialRoomId={pendingRoomId || undefined}
      />
    </div>
  );
};

export default App;
