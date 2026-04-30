
import React, { useState, useEffect } from 'react';
import { hashPasscode } from '../../services/encryption';

interface ChatJoinProps {
  onJoin: (roomId: string, nickname: string) => boolean | void | Promise<any>;
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
  // const [passcode, setPasscode] = useState('888'); // Locked to 888
  const passcode = '888';
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
    
    try {
        const id = await hashPasscode(passcode);
        const result = await onJoin(id, nickname);
        if (result === false) {
            setError('您当前处于离线测试通道，无法连接信箱网络。');
        }
    } catch (e) {
        setError('生成凭证失败或网络错误');
    }
  };

  // 随机漫游逻辑 (暂未启用)
  const handleRandomJoin = async () => {
    if (!nickname.trim()) {
      setError('请先生成一个代号');
      return;
    }
    const randomChannel = PRESET_CHANNELS[Math.floor(Math.random() * PRESET_CHANNELS.length)];
    onJoin(randomChannel, nickname);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 relative bg-noise text-[#4A443F]">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl z-0"></div>
      <div className="w-full max-w-md space-y-8 relative z-10">
         <div className="text-center space-y-3">
           <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg border border-white mb-4">
             <span className="text-4xl">📮</span>
           </div>
           <h2 className="text-2xl font-serif text-[#4A443F]">限时信箱</h2>
           <p className="text-xs text-[#958D85] font-sans tracking-widest uppercase">匿名 · 阅后即焚 · 治愈树洞</p>
         </div>
         
         <div className="space-y-5 bg-white/70 p-8 rounded-3xl backdrop-blur-xl border border-white shadow-xl">
           {/* Nickname Input */}
           <div>
             <label className="text-[10px] text-[#958D85] font-bold uppercase tracking-wider block mb-2 text-center">带上你的面具</label>
             <div className="relative">
                <input 
                  type="text"
                  placeholder="例如：穿黑丝的奥特曼66"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="w-full bg-white/50 border border-white text-[#4A443F] p-4 rounded-xl text-center outline-none focus:bg-white focus:shadow-sm transition-all placeholder:text-[#958D85]/50 font-serif"
                />
                <button 
                  onClick={generateRandomNickname}
                  className="absolute right-4 top-4 text-lg text-[#958D85] hover:text-[#FAAE9D] hover:scale-110 transition-transform"
                  title="随机面具"
                >
                  🪄
                </button>
             </div>
           </div>

           <div className="hidden">
             {/* Hidden passcode, locked to 888 internally */}
             <input type="text" value={passcode} readOnly />
           </div>

           {error && <div className="text-[#FAAE9D] text-xs text-center font-bold bg-[#FDF3F1] py-2 rounded-lg">{error}</div>}

           <div className="space-y-3 pt-4">
             <button 
               onClick={handleJoin}
               className="w-full bg-[#A3D2C3] hover:bg-[#8DBDAB] text-white py-4 rounded-xl transition-all font-bold tracking-widest text-sm shadow-[0_4px_15px_rgba(163,210,195,0.4)] hover:shadow-[0_6px_20px_rgba(163,210,195,0.6)] hover:-translate-y-0.5"
             >
               敲门进入
             </button>

             <button 
               disabled={true}
               onClick={handleRandomJoin}
               className="w-full bg-white/50 text-[#958D85] py-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-2 text-sm"
               title="该功能正在开发中"
             >
               <span>🌌 随机漫游 (即将开放)</span>
             </button>
           </div>
           
           <button 
             onClick={onClose}
             className="w-full text-xs text-[#958D85] hover:text-[#FAAE9D] py-2 mt-4 font-bold"
           >
             返回我的日记本
           </button>
         </div>
         
         <div className="text-[10px] text-[#958D85]/70 text-center leading-relaxed font-serif">
           这里没有历史，你的每一次发言都如同流星。<br/>
           退出或刷新后，一切痕迹将被抹去。
         </div>
      </div>
    </div>
  );
};
