
import React, { useState } from 'react';
import { hashPasscode } from '../../services/encryption';

interface ChatJoinProps {
  onJoin: (roomId: string, nickname: string) => void;
  onClose: () => void;
}

export const ChatJoin: React.FC<ChatJoinProps> = ({ onJoin, onClose }) => {
  const [passcode, setPasscode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('给自己取个代号吧');
      return;
    }
    
    const id = passcode.trim() ? await hashPasscode(passcode) : 'public_lounge';
    onJoin(id, nickname);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 relative bg-[#1e1e1e] text-[#d4d4d4]">
      
      <div className="w-full max-w-sm space-y-6">
         <div className="text-center space-y-2">
           <h2 className="text-xl text-[#eee]">临时匿名对话</h2>
           <p className="text-xs text-[#666]">RAM Only · No History · Burn on Exit</p>
         </div>
         
         <div className="space-y-4">
           {/* Nickname Input */}
           <div>
             <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">代号 (Nickname)</label>
             <input 
               type="text"
               placeholder="例如：夜行者007"
               value={nickname}
               onChange={(e) => setNickname(e.target.value)}
               maxLength={12}
               className="w-full bg-[#2d2d2d] border border-[#444] text-white p-3 rounded text-center outline-none focus:border-[#666] transition-colors placeholder:text-[#444]"
             />
           </div>

           {/* Room Code Input */}
           <div>
             <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">暗号 (Passcode)</label>
             <input 
               type="password"
               placeholder="留空进入大厅，或输入暗号"
               value={passcode}
               onChange={(e) => setPasscode(e.target.value)}
               className="w-full bg-[#2d2d2d] border border-[#444] text-white p-3 rounded text-center outline-none focus:border-[#666] transition-colors placeholder:text-[#444]"
             />
           </div>

           {error && <div className="text-red-400 text-xs text-center">{error}</div>}

           <button 
             onClick={handleJoin}
             className="w-full bg-[#333] hover:bg-[#444] text-[#ccc] py-3 rounded border border-[#444] transition-all font-bold tracking-wide"
           >
             建立加密连接
           </button>
           
           <button 
             onClick={onClose}
             className="w-full text-xs text-[#555] hover:text-[#888] py-2"
           >
             返回日记
           </button>
         </div>
         
         <div className="text-[10px] text-[#444] text-center pt-8">
           注意：退出或刷新后，你发送的所有消息将从他人视角消失。<br/>
           请勿发送敏感个人信息。
         </div>
      </div>
    </div>
  );
};
