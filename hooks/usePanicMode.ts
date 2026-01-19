
import { useState, useEffect, useRef } from 'react';

// 定义明确的风险类型
type RiskAction = 'screenshot' | 'copy';

interface PanicConfig {
  onPanic?: () => void;
  onScreenshot?: (action: RiskAction) => void;
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  const callbacksRef = useRef({ onPanic, onScreenshot });
  
  useEffect(() => {
    callbacksRef.current = { onPanic, onScreenshot };
  }, [onPanic, onScreenshot]);

  useEffect(() => {
    // 1. 处理窗口失去焦点 (模糊)
    const handleBlur = () => {
      setIsBlurred(true);
      // 注意：仅仅失去焦点不发送广播，以免误报。
      // 只有明确的按键或复制行为才发送广播。
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    // 2. 原生复制事件监听 (比 keydown 检测 Ctrl+C 更准确)
    const handleCopy = () => {
      // 如果有选中文本，且触发了复制
      if (window.getSelection()?.toString()) {
        setIsBlurred(true); // 视觉模糊
        if (callbacksRef.current.onScreenshot) {
           callbacksRef.current.onScreenshot('copy');
        }
      }
    };
    
    // 3. 按键检测 (针对截图和特殊快捷键)
    const handleKeyDown = (e: KeyboardEvent) => {
      let riskType: RiskAction | null = null;
      const k = e.key.toLowerCase();

      // --- 复制 (Copy) ---
      // Alt + C (用户自定义)
      if (e.altKey && k === 'c') {
        riskType = 'copy';
      }
      // 这里的 Ctrl+C 主要由 handleCopy 处理，但为了保险起见，如果不触发原生 copy 事件(如某些脚本拦截)，这里做兜底
      // (通常原生 copy 事件更准，这里仅作为辅助)

      // --- 截图 (Screenshot) ---
      
      // PrintScreen / F12
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        riskType = 'screenshot';
      }

      // Windows Snipping: Win + Shift + S
      if (e.metaKey && e.shiftKey && k === 's') {
        riskType = 'screenshot';
      }

      // Mac Screenshot: Cmd + Shift + 3/4/5
      if (e.metaKey && e.shiftKey && (k === '3' || k === '4' || k === '5')) {
        riskType = 'screenshot';
      }

      // WeChat / QQ: Ctrl + Alt + A
      if (e.ctrlKey && e.altKey && k === 'a') {
        riskType = 'screenshot';
      }

      // WeChat: Alt + A
      if (e.altKey && k === 'a') {
        riskType = 'screenshot';
      }

      if (riskType) {
        setIsBlurred(true);
        if (callbacksRef.current.onScreenshot) {
          callbacksRef.current.onScreenshot(riskType);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) setIsBlurred(true);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy); // 监听原生复制
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const triggerPanic = () => {
    setPanicTriggered(true);
    if (callbacksRef.current.onPanic) callbacksRef.current.onPanic();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
