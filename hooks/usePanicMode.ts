
import { useState, useEffect } from 'react';

interface PanicConfig {
  onPanic?: () => void;
  onScreenshot?: () => void;
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  useEffect(() => {
    // 性能优化：直接操作 DOM 样式以绕过 React 渲染周期，实现毫秒级响应
    const setInstantProtection = (active: boolean) => {
        const root = document.documentElement;
        if (active) {
            // 使用 brightness(0) 配合 blur 实现“黑雾”效果
            root.style.setProperty('filter', 'brightness(0) blur(20px)', 'important');
            root.style.setProperty('background-color', '#000', 'important');
            root.style.setProperty('pointer-events', 'none', 'important');
            root.style.setProperty('transition', 'none', 'important');
        } else {
            root.style.removeProperty('filter');
            root.style.removeProperty('background-color');
            root.style.removeProperty('pointer-events');
            root.style.removeProperty('transition');
        }
    };

    const handleBlur = () => {
      setInstantProtection(true);
      setIsBlurred(true);
      // Blur doesn't necessarily mean panic/screenshot, just focus lost
    };

    const handleFocus = () => {
      setInstantProtection(false);
      setIsBlurred(false);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 增加对常见截图快捷键的侦测
      // Mac: Cmd+Shift+3/4/5
      // Win: PrintScreen, Win+Shift+S, F12 (DevTools)
      if (
        e.key === 'F12' || 
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey) || // 通用组合键保护 (Win+Shift+S 等)
        (e.metaKey && e.shiftKey)    // Mac 截图组合 (Cmd+Shift+3/4)
      ) {
        setInstantProtection(true);
        triggerPanic(true); // True indicates it's a screenshot attempt
      }
    };

    // 使用 capture: true 确保在事件捕获阶段就拦截
    window.addEventListener('blur', handleBlur, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      setInstantProtection(false);
    };
  }, []);

  const triggerPanic = (isScreenshot = false) => {
    setPanicTriggered(true);
    if (onPanic) onPanic();
    if (isScreenshot && onScreenshot) onScreenshot();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
