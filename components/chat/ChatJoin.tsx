
import React, { useState, useEffect } from 'react';
import { hashPasscode } from '../../services/encryption';

interface ChatJoinProps {
  onJoin: (roomId: string, nickname: string) => void;
  onClose: () => void;
}

// 搞怪前缀
const ADJECTIVES = [
  '爱喝可乐的', '穿五个羽绒服的', '穿黑丝的', '喝了二斤二锅头的', 
  '没洗头的', '刚出狱的', '正在补作业的', '只有三岁半的', 
  '相信光的', '拥有八块腹肌的', '沉迷学习的', '熬夜写代码的',
  '想吃烤肉的', '刚拿驾照的', '即使秃头也要变强的', '能够一口气吃十个汉堡的',
  '正在摸鱼的', '被富婆包养的', '刚从精神病院跑出来的', '除了帅一无所有的'
];

// 动漫/搞怪角色
const NOUNS = [
  '猪猪侠', '魔仙女王', '游乐王子', '米老鼠', '光头强', '吉吉国王',
  '喜羊羊', '灰太狼', '懒羊羊', '汤姆猫', '杰瑞鼠', '派大星', 
  '海绵宝宝', '哆啦A梦', '蜡笔小新', '柯南', '奥特曼', '葫芦娃', 
  '黑猫警长', '皮卡丘', '小猪佩奇', '章鱼哥', '沸羊羊'
];

// 预设的10个公共漫游频道
const PRESET_CHANNELS = Array.from({ length: 10 }, (_, i) => `public_roaming_channel_${i + 1}`);

export const ChatJoin: React.FC<ChatJoinProps> = ({ onJoin, onClose }) => {
  const [passcode, setPasscode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  // Auto-generate random nickname on mount
  useEffect(() => {
    generateRandomNickname();
  }, []);

  const generateRandomNickname = () => {
    const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    // 添加一个小随机数防止重名，如果觉得太长可以去掉或者减小范围
    const randomSuffix = Math.floor(Math.random() * 100); 
    setNickname(`${randomAdj}${randomNoun}${randomSuffix}`);
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('给自己取个代号吧');
      return;
    }
    
    // 如果没有输入密码，默认进入大厅
    const id = passcode.trim() ? await hashPasscode(passcode) : 'public_lounge';
    onJoin(id, nickname);
  };

  // 随机漫游逻辑 (暂未启用)
  const handleRandomJoin = async () => {
    if (!nickname.trim()) {
      setError('请先生成一个代号');
      return;
    }

    // TODO: 实现更复杂的逻辑，例如检查Supabase Presence API来优先加入人多的房间
    // 目前使用纯随机逻辑
    const randomChannel = PRESET_CHANNELS[Math.floor(Math.random() * PRESET_CHANNELS.length)];
    onJoin(randomChannel, nickname);
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
             <div className="relative">
                <input 
                  type="text"
                  placeholder="例如：穿黑丝的奥特曼66"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="w-full bg-[#2d2d2d] border border-[#444] text-white p-3 rounded text-center outline-none focus:border-[#666] transition-colors placeholder:text-[#444]"
                />
                <button 
                  onClick={generateRandomNickname}
                  className="absolute right-3 top-3.5 text-xs text-[#666] hover:text-[#bbb]"
                  title="随机生成"
                >
                  🎲
                </button>
             </div>
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

           <div className="space-y-3 pt-2">
             <button 
               onClick={handleJoin}
               className="w-full bg-[#333] hover:bg-[#444] text-[#ccc] py-3 rounded border border-[#444] transition-all font-bold tracking-wide"
             >
               建立加密连接
             </button>

             {/* Random Join Button - Disabled State */}
             <button 
               disabled={true}
               onClick={handleRandomJoin}
               className="w-full bg-[#252526] text-[#555] py-3 rounded border border-[#333] cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
               title="该功能正在开发中"
             >
               <span>🌌 随机漫游 (暂未开启)</span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
             </button>
           </div>
           
           <button 
             onClick={onClose}
             className="w-full text-xs text-[#555] hover:text-[#888] py-2 mt-2"
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
