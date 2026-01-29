
import { useState, useEffect, useRef } from 'react';

// 定义明确的风险类型
type RiskAction = 'screenshot' | 'copy';

interface PanicConfig {
  onPanic?: () => void; // 本地回调
  onScreenshot?: (action: RiskAction) => void; // 网络广播回调
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  // 这里的 Ref 用于解决闭包问题，保证在事件回调中能读到最新的 props
  const callbacksRef = useRef({ onPanic, onScreenshot });
  
  // 用于自动消除模糊的定时器
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbacksRef.current = { onPanic, onScreenshot };
  }, [onPanic, onScreenshot]);

  // 触发一次临时的“惩罚性”模糊，3秒后自动恢复
  const triggerTemporaryBlur = (action: RiskAction) => {
    // 1. 视觉模糊
    setIsBlurred(true);
    
    // 2. 发送广播
    if (callbacksRef.current.onScreenshot) {
      callbacksRef.current.onScreenshot(action);
    }

    // 3. 3秒后自动恢复清晰，避免用户手动操作
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setIsBlurred(false);
    }, 3000);
  };

  useEffect(() => {
    // 1. 原生复制事件监听 (精准)
    const handleCopy = () => {
      if (window.getSelection()?.toString()) {
        triggerTemporaryBlur('copy');
      }
    };
    
    // 2. 按键检测 (Keydown)
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

    // 3. 补漏：Keyup 检测
    // 有些软件只拦截 Keydown，我们监听 Keyup 看看能不能捡漏
    const handleKeyUp = (e: KeyboardEvent) => {
       const k = e.key.toLowerCase();
       // 比如我们发现用户松开了 A 键，且当时 Alt 还是按下的
       // 注意：e.altKey 在 keyup 时表示“松开这个键的一瞬间，Alt是否还按着”
       if (k === 'a' && e.altKey) {
          // 这里不做强触发，因为误报率稍微有点高，
          // 但在严格模式下可以考虑。
          // triggerTemporaryBlur('screenshot'); 
       }
    };

    // 移除 blur/focus 监听，不再因为切屏而报警
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const triggerPanic = () => {
    setPanicTriggered(true);
    if (callbacksRef.current.onPanic) callbacksRef.current.onPanic();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
