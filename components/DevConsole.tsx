
import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '../types';
import { isCloudConfigured } from '../services/supabase';

interface DevConsoleProps {
  entries: JournalEntry[];
  onClose: () => void;
  passcodeHash?: string;
}

export const DevConsole: React.FC<DevConsoleProps> = ({ entries, onClose, passcodeHash }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  useEffect(() => {
    addLog('System kernel initialized...');
    addLog(`User Identity Hash: ${passcodeHash || 'Unknown'}`);
    addLog(`Loaded ${entries.length} encrypted entries.`);
    addLog('Cloud Sync Status: ' + (isCloudConfigured ? 'ONLINE' : 'OFFLINE'));
    addLog('Type "help" for available commands.');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processCommand(command);
      setCommand('');
    }
  };

  const processCommand = (cmd: string) => {
    const cleanCmd = cmd.trim().toLowerCase();
    addLog(`$ ${cleanCmd}`);

    switch (cleanCmd) {
      case 'help':
        addLog('Available commands:');
        addLog('  ls        - List all entries (metadata only)');
        addLog('  export    - Download all data as JSON');
        addLog('  storage   - Check LocalStorage usage');
        addLog('  clear     - Clear terminal logs');
        addLog('  exit      - Close developer console');
        break;
      case 'ls':
        entries.forEach(e => {
          addLog(`ID: ${e.id.substring(0, 8)}... | Date: ${new Date(e.createdAt).toLocaleDateString()} | Tags: [${e.tags.join(', ')}]`);
        });
        addLog(`Total: ${entries.length} items.`);
        break;
      case 'clear':
        setLogs([]);
        break;
      case 'exit':
        onClose();
        break;
      case 'storage':
        let _lsTotal = 0, _xLen, _x;
        for (_x in localStorage) {
            if (!localStorage.hasOwnProperty(_x)) continue;
            _xLen = ((localStorage[_x].length + _x.length) * 2);
            _lsTotal += _xLen;
        }
        addLog(`LocalStorage Usage: ${(_lsTotal / 1024).toFixed(2)} KB`);
        addLog(`Image Cache Strategy: Browser Native`);
        break;
      case 'export':
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `hidden_thoughts_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addLog('Backup file generated and downloading...');
        break;
      default:
        if (cleanCmd) addLog(`Command not found: ${cleanCmd}`);
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center font-mono text-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[80vh] bg-[#0c0c0c] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-green-900/50">
        {/* Header */}
        <div className="h-8 bg-[#1a1a1a] flex items-center px-4 justify-between border-b border-[#333]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          <div className="text-[#666] text-xs">root@hidden-thoughts:~</div>
          <button onClick={onClose} className="text-[#666] hover:text-white">✕</button>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar text-green-500/90 space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="break-all whitespace-pre-wrap">{log}</div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-[#111] border-t border-[#333] flex items-center gap-2">
          <span className="text-green-500 font-bold">$</span>
          <input 
            type="text" 
            autoFocus
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommand}
            className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-700"
            placeholder="Enter command..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
