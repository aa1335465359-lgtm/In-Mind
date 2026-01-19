
import { useState, useEffect, useRef } from 'react';

interface PanicConfig {
  onPanic?: () => void;
  onScreenshot?: () => void;
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
      let isSecurityRisk = false;

      // 1. 标准按键
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        isSecurityRisk = true;
      }

      // 2. Mac 截图 (Cmd + Shift + 3/4/5)
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        isSecurityRisk = true;
      }

      // 3. Windows 自带截图 (Win + Shift + S) - 注: Win键通常会被系统拦截，但部分浏览器能捕获
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        isSecurityRisk = true;
      }

      // 4. 微信/QQ 常用截图 (Ctrl + Alt + A) 或 (Alt + A)
      if ((e.ctrlKey && e.altKey && (e.key === 'a' || e.key === 'A')) || (e.altKey && (e.key === 'a' || e.key === 'A'))) {
        isSecurityRisk = true;
      }

      // 5. 复制内容 (Ctrl + C / Cmd + C) - 阅后即焚场景下，复制也被视为一种"记录"
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
         // 检查是否有选中文本
         if (window.getSelection()?.toString()) {
           isSecurityRisk = true;
         }
      }

      if (isSecurityRisk) {
        // 立即模糊
        setIsBlurred(true);
        
        // 执行报警广播
        if (callbacksRef.current.onScreenshot) {
          callbacksRef.current.onScreenshot();
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
