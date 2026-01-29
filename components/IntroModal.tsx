
import React from 'react';

export const IntroModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <span className="font-bold text-stone-800 tracking-tight">这到底是个啥 APP？</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Content - 社交媒体风格文案 */}
        <div className="flex-1 overflow-y-auto p-6 text-stone-600 space-y-8 leading-relaxed text-[15px] custom-scrollbar">
           
           {/* Intro */}
           <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="font-medium text-stone-800 mb-2">说真的，现在的社交平台太吵了。</p>
              <p className="text-sm">
                朋友圈要分组，微博怕被杠，想碎碎念几句还得斟酌半天。
                <br/><br/>
                所以我写了这个<strong>「隐念」</strong>。不做社交，不搞算法推荐，主打一个【绝对安全】+【极客浪漫】。
              </p>
           </div>

           {/* Features List */}
           <div className="space-y-6">
              
              <div className="flex gap-4">
                 <div className="w-10 h-10 shrink-0 bg-stone-800 text-white rounded-lg flex items-center justify-center text-lg shadow-lg shadow-stone-200">🔒</div>
                 <div>
                    <h3 className="font-bold text-stone-900 mb-1">隐私狂魔福音</h3>
                    <p className="text-sm text-stone-500">
                       端到端加密，你的密码就是唯一的钥匙。数据库里存的都是乱码，连我这个开发者都看不到你写了啥。
                       <span className="block mt-1 text-xs bg-red-50 text-red-500 px-2 py-1 rounded w-fit">⚠️ 警告：密码忘了神仙也救不回来。</span>
                    </p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="w-10 h-10 shrink-0 bg-stone-800 text-white rounded-lg flex items-center justify-center text-lg shadow-lg shadow-stone-200">💻</div>
                 <div>
                    <h3 className="font-bold text-stone-900 mb-1">究极摸鱼模式</h3>
                    <p className="text-sm text-stone-500">
                       上班想写日记？一键伪装成 <strong>VS Code 代码界面</strong>。老板经过只觉得你敲代码敲得冒火星子，其实你在吐槽午饭难吃。
                    </p>
                 </div>
              </div>

              <div className="flex gap-4">
