
import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  isSetup: boolean;
  isNewUser?: boolean;
  onLogin: (pass: string) => void;
  onRegister: (pass: string) => void;
  onReset: () => void;
  onTestBypass?: () => void;
  errorMsg?: string | null;
  isLoading?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ 
  isSetup, 
  isNewUser = false, 
  onLogin, 
  onRegister, 
  onReset,
  onTestBypass,
  errorMsg, 
  isLoading 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(isNewUser ? 'register' : 'login');
  
  // Auto switch if prop changes (e.g. after reset)
  useEffect(() => {
    if (isNewUser) setMode('register');
  }, [isNewUser]);

  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [internalError, setInternalError] = useState<string | null>(null);

  // Strong Password Regex:
  // (?=.*[a-z]) - At least one lowercase
  // (?=.*[A-Z]) - At least one uppercase
  // (?=.*\d)    - At least one digit
  // (?=.*[\W_]) - At least one special char
  const STRONG_PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError(null);

    if (pass.length === 0) return;

    if (mode === 'login') {
      onLogin(pass);
    } else {
      // Register Mode Validation
      if (!STRONG_PASS_REGEX.test(pass)) {
        setInternalError("密码必须包含：大小写字母 + 数字 + 标点符号");
        return;
      }

      if (pass !== confirmPass) {
        setInternalError("两次输入的密码不一致");
        return;
      }
      onRegister(pass);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setPass('');
    setConfirmPass('');
    setInternalError(null);
  };

  const handleResetClick = () => {
    if (window.confirm("⚠️ 确定要重置应用吗？\n\n此操作将清除本机所有数据。如果您忘记了密码且没有云端备份，数据将永久丢失。\n\n是否继续？")) {
      onReset();
    }
  };

  const currentError = internalError || errorMsg;

  return (
    <div className="w-full h-screen bg-noise flex flex-col items-center justify-center font-sans text-main animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden">
      
      {/* Decorative SVG Blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#FAAE9D]/30 rounded-[100px] blur-[80px] -translate-x-1/4 -translate-y-1/4 mix-blend-multiply pointer-events-none rotate-45"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#A3D2C3]/30 rounded-[150px] rotate-[-20deg] blur-[100px] translate-x-1/4 translate-y-1/4 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[600px] bg-[#E2D8F0]/40 rounded-[200px] rotate-12 blur-[90px] -translate-x-1/2 -translate-y-1/2 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-[#A7CDE7]/30 rounded-full blur-[80px] mix-blend-multiply pointer-events-none"></div>
      <div className="absolute top-20 right-20 w-[200px] h-[400px] bg-[#FAAE9D]/20 rounded-full blur-[60px] mix-blend-multiply pointer-events-none rotate-45"></div>

      {/* Test Mode ByPass */}
      {onTestBypass && (
        <button 
          type="button"
          onClick={onTestBypass}
          className="absolute top-10 right-10 px-4 py-2 bg-white/50 border border-white text-[#958D85] text-xs rounded-full hover:bg-white hover:text-[#4A443F] hover:-translate-y-0.5 transition-all shadow-sm focus:outline-none z-50 tracking-widest uppercase font-bold"
        >
          🚀 离线通道
        </button>
      )}

      <div className="w-full max-w-md p-10 flex flex-col items-center mb-10 bg-white/40 backdrop-blur-3xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white z-10 relative">
        <div className="mb-8 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-3xl animate-float">
           {mode === 'login' ? '🗝️' : '🕊️'}
        </div>
        
        <h1 className="text-2xl font-bold font-serif mb-3 tracking-widest text-[#4A443F]">
          {mode === 'login' ? '轻启日记' : '留下暗号'}
        </h1>
        <p className={`text-sm text-[#958D85] mb-10 text-center font-serif leading-relaxed opacity-90 ${mode === 'register' ? 'text-xs px-2' : ''}`}>
          {mode === 'login' 
            ? '用专属暗号，解开你的心声碎片' 
            : '这里是完全属于你的树洞。未留后门，无法找回密码，请一定把它记在心里。'}
        </p>

        <form onSubmit={handleSubmit} className="w-full relative space-y-4">
          <div className="relative">
             <input
                type="password"
                autoFocus
                value={pass}
                onChange={(e) => { setPass(e.target.value); setInternalError(null); }}
                className={`
                  w-full bg-white/70 border outline-none rounded-2xl px-6 py-4 text-center text-lg tracking-[0.3em] transition-all shadow-inner
                  ${currentError ? 'border-[#FAAE9D] ring-2 ring-[#FDF3F1] text-[#FAAE9D]' : 'border-transparent focus:border-white focus:bg-white text-[#4A443F] placeholder-[#958D85]/40'}
                `}
                placeholder={mode === 'login' ? "输入暗号" : "设置复杂暗号"}
              />
          </div>
          
          {mode === 'register' && (
             <input
             type="password"
             value={confirmPass}
             onChange={(e) => setConfirmPass(e.target.value)}
             className={`
               w-full bg-white/70 border outline-none rounded-2xl px-6 py-4 text-center text-lg tracking-[0.3em] transition-all shadow-inner
               ${pass && confirmPass && pass !== confirmPass ? 'border-[#FAAE9D]' : 'border-transparent focus:border-white focus:bg-white text-[#4A443F] placeholder-[#958D85]/40'}
             `}
             placeholder="确认暗号"
           />
          )}

          {currentError && (
            <div className="w-full text-center mt-2 text-xs text-[#FAAE9D] animate-bounce font-bold tracking-wider">
              {currentError}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className={`
              w-full mt-4 bg-[#A3D2C3] text-white py-4 rounded-2xl hover:bg-[#8DBDAB] transition-all shadow-[0_4px_15px_rgba(163,210,195,0.4)] hover:shadow-[0_6px_20px_rgba(163,210,195,0.6)] hover:-translate-y-0.5 text-sm font-bold tracking-widest uppercase
              ${isLoading ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {isLoading ? '解析中...' : (mode === 'login' ? '开启这天' : '生成空间')}
          </button>
        </form>
        
        <button 
          onClick={toggleMode}
          className="mt-8 text-xs text-[#958D85] hover:text-[#FAAE9D] font-bold tracking-widest transition-colors"
        >
          {mode === 'login' ? '初次使用？获取信箱' : '想起暗号了？去开箱'}
        </button>

        <div className="mt-6 text-[10px] text-[#958D85]/50 text-center leading-relaxed tracking-widest">
           端到端守护<br/>
           {mode === 'register' ? '(需包含大小写及符号数字)' : '不留痕迹的全加密设计'}
        </div>
      </div>

      {/* Reset Button */}
      <button 
        onClick={handleResetClick}
        className="absolute bottom-10 flex flex-col items-center gap-2 group opacity-50 hover:opacity-100 transition-all duration-300"
        title="清除本地数据并重置"
      >
        <div className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center text-stone-400 group-hover:border-red-400 group-hover:text-red-500 group-hover:bg-red-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>
        <span className="text-[10px] text-stone-400 group-hover:text-red-500 tracking-widest uppercase">Reset App</span>
      </button>
    </div>
  );
};