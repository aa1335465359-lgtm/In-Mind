
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Sparkles, Send } from 'lucide-react';
import { analyzeImageAndText } from '../services/geminiService';
import { Priority, Todo } from '../types';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

interface TaskInputProps {
  onAddTodos: (todos: Todo[]) => void;
  onUpdateTodo?: (id: string, updates: Partial<Todo>) => void;
  onDeleteTodo?: (id: string) => void;
  onSecretCode?: (code: string) => void;
}

const TaskInput: React.FC<TaskInputProps> = ({ onAddTodos, onUpdateTodo, onDeleteTodo, onSecretCode }) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(false);
  // isLandetianMode state removed as we don't need to track 'locking' anymore, just trigger once.
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) return;
      if (target instanceof HTMLTextAreaElement && target !== textAreaRef.current) return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleImageSelect(file);
          textAreaRef.current?.focus();
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    setIsSmartMode(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleImageSelect(e.target.files[0]);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleTextChange = (val: string) => {
      setText(val);
      // Check for secret codes
      if (onSecretCode) {
         if (val === '1335465359') {
             onSecretCode(val);
             setText('');
         } else if (val.toLowerCase() === 'merry christmas') {
             onSecretCode('merry christmas');
             setText('');
         }
         
         // Landetian Logic (Trigger Only)
         // Input '蓝的天' triggers the theme. Deleting it does NOT revert.
         if (val === '蓝的天') {
             onSecretCode('landetian');
         }
      }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedImage) return;

    const tempId = generateId();
    const needsAi = isSmartMode || !!selectedImage;

    // 1. Simple Task Mode
    if (!needsAi) {
        onAddTodos([{
            id: tempId, title: text, priority: Priority.P2, status: 'todo', isCompleted: false, createdAt: Date.now(), aiStatus: 'idle'
        }]);
        setText('');
        return; 
    }
    
    // 2. AI Mode - Add Processing Placeholder
    onAddTodos([{
        id: tempId, title: `待整理记录`, description: '🍅 正在帮你拆分任务…', priority: Priority.P2, status: 'todo', isCompleted: false, createdAt: Date.now(), aiStatus: 'processing'
    }]);
    
    const payloadText = text;
    const payloadImage = selectedImage;
    
    // Clear Input UI immediately
    setText('');
    clearImage();

    try {
        const aiResponse = await analyzeImageAndText(payloadText, payloadImage || undefined);
        
        if (aiResponse.tasks && aiResponse.tasks.length > 0) {
            // Transform AI response to Todo objects
            const realTodos = aiResponse.tasks.map(task => ({
                id: generateId(), 
                title: task.title,
                description: task.description,
                priority: (task.priority as Priority) || Priority.P2,
                status: 'todo',
                isCompleted: false,
                createdAt: Date.now(),
                shopId: task.shopId,
                quantity: task.quantity,
                actionTime: task.actionTime,
                deadline: task.deadline, // Use the parsed timestamp for countdown
                aiStatus: 'done' 
            } as Todo));

            // CRITICAL: Delete the processing placeholder FIRST to ensure UI cleanup
            if (onDeleteTodo) {
                onDeleteTodo(tempId);
            }
            
            // Then add the new tasks
            onAddTodos(realTodos);
        } else {
            // Fallback: Just update the placeholder to a generic task if AI failed to parse meaningful tasks
            if (onUpdateTodo) onUpdateTodo(tempId, { aiStatus: 'done', title: payloadText || '未识别到任务', description: 'AI 未提取到有效信息' });
        }
    } catch (error) {
        if (onUpdateTodo) onUpdateTodo(tempId, { aiStatus: 'error', title: payloadText || "任务识别失败", description: "请手动编辑" });
    }
  };

  return (
    <div className={`relative w-full rounded-theme-lg border-theme-width border-theme-border transition-all duration-300 bg-theme-card shadow-theme ${isFocused ? 'ring-2 ring-theme-accent/20 border-theme-accent' : 'hover:border-theme-accent/50'}`}>
      {imagePreview && (
        <div className="px-4 pt-4 pb-2 flex items-start gap-4 border-b border-theme-border bg-theme-input rounded-t-theme-lg">
          <div className="relative group shrink-0">
             <img src={imagePreview} alt="Upload" className="h-16 w-auto rounded-md border border-theme-border shadow-sm" />
             <button onClick={clearImage} className="absolute -top-2 -right-2 bg-slate-800 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
          </div>
          <div className="text-xs text-theme-subtext py-1">
             <p className="font-medium text-theme-text">已添加截图</p>
             <p>AI将自动提取截图中的店铺ID和任务信息。</p>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
         <textarea
          ref={textAreaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
          placeholder={isSmartMode ? "✨ AI模式：粘贴文本或截图..." : "添加待办..."}
          className="w-full bg-transparent border-none outline-none text-theme-text placeholder:text-theme-subtext/60 resize-none max-h-32 py-2.5 px-2 text-[15px] font-medium"
          rows={1}
          style={{ minHeight: '44px' }} 
        />
        <div className="flex items-center gap-1.5 shrink-0 pb-1.5 pr-1">
           <button
             onClick={() => {
                setIsSmartMode(!isSmartMode);
                // Return focus to textarea so pressing Enter triggers submit, not button toggle
                textAreaRef.current?.focus(); 
             }}
             className={`p-2 rounded-theme transition-all flex items-center justify-center border-none ${isSmartMode ? 'bg-theme-accent-bg text-theme-accent' : 'bg-transparent text-theme-subtext hover:bg-theme-input'}`}
             title={isSmartMode ? "AI 智能识别已开启" : "开启 AI 智能识别"}
           >
              <Sparkles size={18} fill={isSmartMode ? "currentColor" : "none"} />
           </button>
           <button 
             onClick={() => fileInputRef.current?.click()} 
             className={`p-2 rounded-theme transition-colors ${selectedImage ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-subtext hover:bg-theme-input'}`}
             title="上传截图"
           >
             <ImageIcon size={20} />
           </button>
           <button 
             onClick={handleSubmit} 
             disabled={!text && !selectedImage} 
             className={`w-9 h-9 rounded-theme transition-all flex items-center justify-center ${(!text && !selectedImage) ? 'bg-theme-input text-theme-subtext cursor-not-allowed opacity-50' : 'bg-theme-accent text-white hover:opacity-90 shadow-md active:scale-95'}`}
           >
             <Send size={18} className={(!text && !selectedImage) ? "" : "ml-0.5"} />
           </button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept="image/*" />
    </div>
  );
};

export default TaskInput;
