
import { useState, useEffect } from 'react';

interface PanicConfig {
  onPanic?: () => void;
}

export const usePanicMode = ({ onPanic }: PanicConfig = {}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);

  useEffect(() => {
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Panic Triggers: F12, Ctrl+Shift+I/C/J, PrintScreen
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase())) ||
        e.key === 'PrintScreen'
      ) {
        triggerPanic();
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
    if (onPanic) onPanic();
  };

  return { isBlurred, panicTriggered, triggerPanic };
};
