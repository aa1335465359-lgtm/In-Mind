
import { useState, useEffect, useRef } from 'react';

type RiskAction = 'screenshot' | 'copy';

interface PanicConfig {
  onPanic?: () => void;
  onScreenshot?: (action: RiskAction) => void;
}

export const usePanicMode = ({ onPanic, onScreenshot }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  // 使用 ref 追踪最新的回调函数，避免闭包陷阱
  const callbacksRef = useRef({ onPanic, onScreenshot });
  
  useEffect(() => {
    callbacksRef.current = { onPanic, onScreenshot };
  }, [onPanic, onScreenshot]);

  useEffect(() => {
    const handleBlur = () => {
      // 窗口失去焦点时（可能是切换窗口，也可能是唤起了截图工具）
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // --- 截图与隐私泄露检测 ---
      let riskType: RiskAction | null = null;

      // 1. 截图检测 (Screenshot)
      
      // Standard: PrintScreen
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        riskType = 'screenshot';
      }

      // Mac: Cmd + Shift + 3/4/5
      if (e.metaKey && e.shiftKey && (['3', '4', '5'].includes(e.key))) {
        riskType = 'screenshot';
      }

      // Windows Snipping: Win + Shift + S
      // 注意：Win键(Meta)通常被系统拦截，但在部分浏览器/全屏下可捕获
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        riskType = 'screenshot';
      }

      // WeChat/QQ: Ctrl + Alt + A
      if (e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) {
        riskType = 'screenshot';
      }

      // WeChat Alternate: Alt + A
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        riskType = 'screenshot';
      }

      // 2. 复制/记录检测 (Copy)

      // Standard Copy: Ctrl + C / Cmd + C
      // 在阅后即焚场景中，复制文本也被视为违规
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
         // 只有当实际上有选中文本时才触发，避免误报
         if (window.getSelection()?.toString()) {
           riskType = 'copy';
         }
      }

      // Custom: Alt + C (User Request)
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        riskType = 'copy';
      }

      if (riskType) {
        // 立即模糊
        setIsBlurred(true);
        
        // 执行报警广播
        if (callbacksRef.current.onScreenshot) {
          callbacksRef.current.onScreenshot(riskType);
        }
        
        // 触发本地 Panic UI (可选)
        if (callbacksRef.current.onPanic) {
            callbacksRef.current.onPanic();
        }
      }
    };

    // 监听 Visibility Change 以处理移动端或最小化
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const triggerPanic = () => {
    setPanicTriggered(true);
    if (callbacksRef.current.onPanic) callbacksRef.current.onPanic();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
