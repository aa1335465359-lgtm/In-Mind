
import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  isSetup: boolean;
  isNewUser?: boolean;
  onLogin: (pass: string) => void;
  onRegister: (pass: string) => void;
  onReset: () => void;
  errorMsg?: string | null;
  isLoading?: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({ 
  isSetup, 
  isNewUser = false, 
  onLogin, 
  onRegister, 
  onReset,
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
    <div className="w-full h-screen bg-[#f5f5f7] flex flex-col items-center justify-center font-sans text-stone-700 animate-in fade-in duration-700 relative">
      <div className="w-full max-w-md p-8 flex flex-col items-center mb-10">
        <div className="mb-8 w-16 h-16 bg-stone-200 rounded-2xl flex items-center justify-center shadow-inner text-2xl">
           {mode === 'login' ? '🗝️' : '📝'}
        </div>
        
        <h1 className="text-2xl font-light mb-2 tracking-wide text-stone-800">
          {mode === 'login' ? '欢迎回来' : '创建加密账户'}
        </h1>
        <p className={`text-sm text-stone-400 mb-8 text-center ${mode === 'register' ? 'text-xs px-2 text-stone-500 leading-relaxed' : ''}`}>
          {mode === 'login' 
            ? '请输入密码解密您的隐念空间' 
            : '这是一个零知识加密系统。我们不存储您的密码，也无法访问您的数据。如果您忘记密码，您的日记将永远锁定，无法找回。请务必牢记您的暗号。'}
        </p>

        <form onSubmit={handleSubmit} className="w-full relative space-y-4">
          <div className="relative">
             <input
                type="password"
                autoFocus
                value={pass}
                onChange={(e) => { setPass(e.target.value); setInternalError(null); }}
                className={`
                  w-full bg-white border outline-none rounded-lg px-4 py-4 text-center text-lg tracking-[0.3em] transition-all shadow-sm
                  ${currentError ? 'border-red-300 ring-2 ring-red-100 text-red-500' : 'border-stone-200 focus:border-stone-400 focus:ring-2 focus:ring-stone-100'}
                `}
                placeholder={mode === 'login' ? "••••••" : "设置复杂密码"}
              />
          </div>
          
          {mode === 'register' && (
             <input
             type="password"
             value={confirmPass}
             onChange={(e) => setConfirmPass(e.target.value)}
             className={`
               w-full bg-white border outline-none rounded-lg px-4 py-4 text-center text-lg tracking-[0.3em] transition-all shadow-sm
               ${pass && confirmPass && pass !== confirmPass ? 'border-red-300' : 'border-stone-200 focus:border-stone-400'}
             `}
             placeholder="确认密码"
           />
          )}

          {currentError && (
            <div className="w-full text-center mt-2 text-xs text-red-400 animate-bounce font-medium">
              {currentError}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className={`
              w-full mt-2 bg-stone-800 text-white py-3 rounded-lg hover:bg-stone-700 transition-colors shadow-lg shadow-stone-200 text-sm font-medium tracking-widest
              ${isLoading ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {isLoading ? '处理中...' : (mode === 'login' ? '解锁' : '立即注册')}
          </button>
        </form>
        
        <button 
          onClick={toggleMode}
          className="mt-8 text-xs text-stone-400 hover:text-stone-600 underline underline-offset-4 transition-colors"
        >
          {mode === 'login' ? '没有账号？创建新账户' : '已有账号？返回登录'}
        </button>

        <div className="mt-4 text-[10px] text-stone-300 text-center leading-relaxed">
           端到端加密保护<br/>
           {mode === 'register' ? '要求：大小写字母 + 数字 + 符号' : '零知识证明架构'}
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
