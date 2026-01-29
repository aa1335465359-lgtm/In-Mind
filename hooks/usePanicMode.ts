
import { useState, useEffect, useRef } from 'react';

// 定义明确的风险类型
type RiskAction = 'screenshot' | 'copy';

interface PanicConfig {
  onPanic?: () => void; // 本地回调
  onScreenshot?: (action: RiskAction) => void; // 网络广播回调
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false); // 视觉模糊 (包括切屏和风险)
  const [isRiskDetected, setIsRiskDetected] = useState(false); // 仅在检测到风险时为真 (用于显示红字警告)
  const [panicTriggered, setPanicTriggered] = useState(false);

  // 这里的 Ref 用于解决闭包问题，保证在事件回调中能读到最新的 props
  const callbacksRef = useRef({ onPanic, onScreenshot });
  
  // 用于自动消除风险状态的定时器
  const riskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbacksRef.current = { onPanic, onScreenshot };
  }, [onPanic, onScreenshot]);

  // 触发一次临时的“惩罚性”模糊，3秒后自动恢复
  const triggerTemporaryBlur = (action: RiskAction) => {
    // 1. 标记风险 + 视觉模糊
    setIsRiskDetected(true);
    setIsBlurred(true);
    
    // 2. 发送广播
    if (callbacksRef.current.onScreenshot) {
      callbacksRef.current.onScreenshot(action);
    }

    // 3. 3秒后自动恢复 (仅恢复风险状态，如果当前窗口是后台，isBlurred 仍由 focus/blur 事件控制)
    if (riskTimerRef.current) clearTimeout(riskTimerRef.current);
    riskTimerRef.current = setTimeout(() => {
      setIsRiskDetected(false);
      // 如果当前页面是聚焦状态，则同时取消模糊；否则保持模糊直到 focus
      if (document.hasFocus()) {
         setIsBlurred(false);
      }
    }, 3000);
  };

  useEffect(() => {
    // 1. 切屏/失焦保护 (隐私模糊)
    const handleWindowBlur = () => {
      setIsBlurred(true);
    };

    const handleWindowFocus = () => {
      // 只有在没有正在进行的风险警告时，才解除模糊
      if (!riskTimerRef.current) {
         setIsBlurred(false);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // 2. 原生复制事件监听 (精准)
    const handleCopy = () => {
      if (window.getSelection()?.toString()) {
        triggerTemporaryBlur('copy');
      }
    };
    
    // 3. 按键检测 (Keydown)
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      
      // --- 截图键 ---
      // PrintScreen / F12
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        triggerTemporaryBlur('screenshot');
        return;
      }

      // Windows Snipping: Win + Shift + S
      if (e.metaKey && e.shiftKey && k === 's') {
        triggerTemporaryBlur('screenshot');
        return;
      }

      // Mac Screenshot: Cmd + Shift + 3/4/5
      if (e.metaKey && e.shiftKey && (['3', '4', '5'].includes(k))) {
        triggerTemporaryBlur('screenshot');
        return;
      }

      // --- 尝试捕获组合键 (如果未被全局拦截) ---
      // Ctrl + Alt + A
      if (e.ctrlKey && e.altKey && k === 'a') {
        triggerTemporaryBlur('screenshot');
        return;
      }
      
      // Alt + A
      if (e.altKey && k === 'a') {
        triggerTemporaryBlur('screenshot');
        return;
      }
      
      // Alt + C (自定义复制)
      if (e.altKey && k === 'c') {
        triggerTemporaryBlur('copy');
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
       const k = e.key.toLowerCase();
       if (k === 'a' && e.altKey) {
          // KeyUp 检测备用
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      if (riskTimerRef.current) clearTimeout(riskTimerRef.current);
    };
  }, []);

  const triggerPanic = () => {
    setPanicTriggered(true);
    if (callbacksRef.current.onPanic) callbacksRef.current.onPanic();
  };

  return { isBlurred, isRiskDetected, panicTriggered, triggerPanic };
};
