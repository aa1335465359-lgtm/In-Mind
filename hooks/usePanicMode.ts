
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

    // 3. 3秒后自动恢复
    if (riskTimerRef.current) clearTimeout(riskTimerRef.current);
    riskTimerRef.current = setTimeout(() => {
      setIsRiskDetected(false);
      setIsBlurred(false);
      riskTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    // 2. 原生复制事件监听 (精准)
    const handleCopy = () => {
      if (window.getSelection()?.toString()) {
        triggerTemporaryBlur('copy');
      }
    };
    
    // 3. 按键检测 (Keydown) ONLY Printscreen and F12
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen / F12
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        triggerTemporaryBlur('screenshot');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
