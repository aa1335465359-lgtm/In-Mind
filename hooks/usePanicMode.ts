
import { useState, useEffect, useRef } from 'react';

interface PanicConfig {
  onPanic?: () => void;
  onScreenshot?: () => void;
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  // 使用 ref 追踪最新的回调函数，避免闭包陷阱 (Stale Closure)
  // 这样当外部组件状态(如 isJoined)变化导致 onScreenshot 更新时，这里能拿到最新的函数
  const callbacksRef = useRef({ onPanic, onScreenshot });
  
  useEffect(() => {
    callbacksRef.current = { onPanic, onScreenshot };
  }, [onPanic, onScreenshot]);

  useEffect(() => {
    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 保留截图侦测逻辑，用于触发报警广播
      // Mac: Cmd+Shift+3/4/5
      // Win: PrintScreen, Win+Shift+S, F12 (DevTools)
      if (
        e.key === 'F12' || 
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey) || 
        (e.metaKey && e.shiftKey)
      ) {
        // 触发模糊
        setIsBlurred(true);
        
        // 执行截图回调（如果存在）
        if (callbacksRef.current.onScreenshot) {
          callbacksRef.current.onScreenshot();
        }
        
        // 触发 Panic 回调
        if (callbacksRef.current.onPanic) {
            callbacksRef.current.onPanic();
        }
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerPanic = () => {
    setPanicTriggered(true);
    if (callbacksRef.current.onPanic) callbacksRef.current.onPanic();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
