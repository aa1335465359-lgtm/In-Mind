
import React from 'react';

export const IntroModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/5 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-noise w-full max-w-lg max-h-[85vh] rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-white overflow-hidden flex flex-col relative font-serif">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent pointer-events-none z-0"></div>
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex border border-[#FAAE9D]/30 bg-white items-center justify-center rounded-full text-xl shadow-sm">
                🕊️
            </div>
            <span className="font-bold text-[#4A443F] tracking-widest uppercase">落叶信箱</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-[#958D85] hover:text-[#FAAE9D] transition-all shadow-sm"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 text-[#958D85] space-y-8 leading-loose text-sm custom-scrollbar relative z-10">
           
           {/* Intro */}
           <div className="bg-white/60 backdrop-blur-md p-6 rounded-[1.5rem] border border-white shadow-sm">
              <p className="font-bold text-[#4A443F] mb-3 text-base">说真的，现在的世界有些太吵了。</p>
              <p className="opacity-90">
                朋友圈要分组，文字怕被过度解读，想碎碎念几句还得斟酌半天。
                <br/><br/>
                所以我做了这个<strong>「落叶信箱」</strong>。没有推送，没有算法，主打一个【绝对安全】与【温柔写意】。这是一本只属于你的视觉日记。
              </p>
           </div>

           {/* Features List */}
           <div className="space-y-6">
              
              <div className="flex gap-5 items-start">
                 <div className="w-12 h-12 shrink-0 bg-[#FDF3F1] text-[#FAAE9D] rounded-2xl flex items-center justify-center text-xl shadow-[0_4px_15px_rgba(253,243,241,0.8)] border border-white">
                    🔐
                 </div>
                 <div className="pt-1">
                    <h3 className="font-bold text-[#4A443F] mb-1 tracking-widest">无痕的绝对隐私</h3>
                    <p className="text-[#958D85] opacity-90">
                       采用端到端加密，你的暗号就是唯一的钥匙。数据库里存的都是无法解密的碎片。
                       <span className="block mt-2 text-xs bg-[#FAAE9D]/10 text-[#FAAE9D] px-3 py-1.5 rounded-xl w-fit font-bold">
                          ⚠️ 警告：不留后门，暗号遗忘将永久封存记忆。
                       </span>
                    </p>
                 </div>
              </div>

              <div className="flex gap-5 items-start">
                 <div className="w-12 h-12 shrink-0 bg-[#E6F3F0] text-[#A3D2C3] rounded-2xl flex items-center justify-center text-xl shadow-[0_4px_15px_rgba(230,243,240,0.8)] border border-white">
                    💌
                 </div>
                 <div className="pt-1">
                    <h3 className="font-bold text-[#4A443F] mb-1 tracking-widest">信件流转模式</h3>
                    <p className="text-[#958D85] opacity-90">
                       除了自己书写，你还可以生成匿名分享卡片，或是进入树洞，发出「阅后即焚」的限时信纸，体验擦肩而过的微光的温暖。
                    </p>
                 </div>
              </div>

              <div className="flex gap-5 items-start">
                 <div className="w-12 h-12 shrink-0 bg-[#F5F2F7] text-[#C0B3D7] rounded-2xl flex items-center justify-center text-xl shadow-[0_4px_15px_rgba(245,242,247,0.8)] border border-white">
                    🌿
                 </div>
                 <div className="pt-1">
                    <h3 className="font-bold text-[#4A443F] mb-1 tracking-widest">温柔的 AI 共鸣</h3>
                    <p className="text-[#958D85] opacity-90">
                       它不讲大道理，也不做阅读理解。只是静静地读取你的心声，为你生成温暖的情绪色彩和诗意折页，就像深夜的电台 DJ。
                    </p>
                 </div>
              </div>

           </div>

           {/* Footer */}
           <div className="pt-8 mt-4 text-center relative">
              <button 
                onClick={onClose}
                className="bg-[#A3D2C3] text-white px-10 py-4 rounded-full hover:bg-[#8DBDAB] transition-all shadow-[0_4px_20px_rgba(163,210,195,0.4)] hover:shadow-[0_6px_25px_rgba(163,210,195,0.6)] hover:-translate-y-0.5 font-bold tracking-widest text-sm uppercase"
              >
                开启今天落叶
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};
