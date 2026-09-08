import React, { useState } from 'react';
import { ArrowRight, Orbit, Eye, EyeOff, LoaderCircle } from 'lucide-react';

interface Props {
  isSetup: boolean;
  isNewUser?: boolean;
  onLogin: (pass: string) => void;
  onRegister: (pass: string) => void;
  onReset: () => void;
  onTestBypass?: () => void;
  errorMsg?: string | null;
  isLoading?: boolean;
}

export const LockScreen: React.FC<Props> = ({ onLogin, onRegister, onTestBypass, errorMsg, isLoading }) => {
  const [register, setRegister] = useState(false), [pass, setPass] = useState(''), [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false), [error, setError] = useState('');
  return <div className="entry-gate entry-gate-simple">
    <div className="gate-atmosphere" aria-hidden="true"><i /><i /><i /></div>
    <header>
      <div className="wordmark"><Orbit size={28} strokeWidth={1.4} /><span>in mind<span className="brand-dot">.</span></span></div>
      <span className="eyebrow">PRIVATE MEMORY SPACE</span>
    </header>
    <main className="gate-simple-layout">
      <section className="gate-copy">
        <span className="eyebrow">EVERY LITTLE THING, IN ORBIT.</span>
        <h1>给回忆，<br />一个小宇宙。</h1>
        <p>照片、手记与那些说不清的感受，留在同一颗星球。</p>
      </section>
      <section className="gate-form">
        <h2>{register ? '创建你的空间' : '打开记忆'}</h2>
        <form onSubmit={event => {
          event.preventDefault(); setError('');
          if (register && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/.test(pass.trim())) { setError('暗号至少 6 位，包含大小写字母、数字和符号。'); return; }
          if (register && pass !== confirm) { setError('两次暗号不一致。'); return; }
          register ? onRegister(pass) : onLogin(pass);
        }}>
          <label>专属暗号<div className="pass-field"><input autoFocus autoComplete={register ? 'new-password' : 'current-password'} required type={visible ? 'text' : 'password'} value={pass} onChange={event => setPass(event.target.value)} placeholder="输入暗号" /><button type="button" aria-label={visible ? '隐藏暗号' : '显示暗号'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {register && <label>再次确认<input type="password" required autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="再次输入暗号" /></label>}
          {(error || errorMsg) && <p className="inline-notice" role="alert">{error || errorMsg}</p>}
          <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}{isLoading ? '正在连接…' : register ? '创建空间' : '进入'}</button>
        </form>
        <div className="gate-secondary">
          <button className="text-button" disabled={isLoading} onClick={() => { setRegister(!register); setError(''); setPass(''); setConfirm(''); }}>{register ? '返回登录' : '第一次来？创建空间'}</button>
          <button className="text-button" onClick={onTestBypass} disabled={isLoading}>在本机体验</button>
        </div>
      </section>
    </main>
  </div>;
};
