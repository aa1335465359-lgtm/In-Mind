
import React, { useState, useEffect, useRef } from 'react';
import { Todo, Priority, TodoStatus } from '../types';
import { Copy, Check, Calendar, Clock, Edit3, X, Zap, Coffee, Moon, Sun, ChevronRight, MoreHorizontal, ArrowRight, PlayCircle, AlertCircle, Circle, Anchor, Sparkles, Loader2, Flag } from 'lucide-react';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  focusedTodoId: string | null;
  setFocusedTodoId: (id: string | null) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, onToggle, onDelete, onUpdate, focusedTodoId, setFocusedTodoId 
}) => {
  // --- STATE ---
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(todo.title);
  
  // Focus Mode State
  const isFocusMode = focusedTodoId === todo.id;
  const isDimmed = focusedTodoId !== null && focusedTodoId !== todo.id;
  const [focusProgress, setFocusProgress] = useState(0); 
  const [focusTimeLeft, setFocusTimeLeft] = useState(15 * 60); // 15 mins default
  const [isHoveringCheck, setIsHoveringCheck] = useState(false);
  
  // Menus
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const isDone = todo.status === 'done';
  const isAiProcessing = todo.aiStatus === 'processing';
  
  // Check if P0 for Digital Terrarium class logic
  const isP0 = todo.priority === Priority.P0 || (todo.priority as string) === 'HIGH';

  // --- CONFIG (P0-P4) ---
  // Updated to Solid, Low Saturation Colors
  const getPriorityStyle = (p: Priority) => {
    switch (p) {
      case Priority.P0: return { label: 'P0', textColor: 'text-white', bgColor: 'bg-rose-400', desc: '紧急', dotColor: 'bg-rose-400' };
      case Priority.P1: return { label: 'P1', textColor: 'text-white', bgColor: 'bg-orange-400', desc: '重要', dotColor: 'bg-orange-400' };
      case Priority.P2: return { label: 'P2', textColor: 'text-white', bgColor: 'bg-blue-400', desc: '正常', dotColor: 'bg-blue-400' };
      case Priority.P3: return { label: 'P3', textColor: 'text-white', bgColor: 'bg-emerald-400', desc: '稍缓', dotColor: 'bg-emerald-400' };
      case Priority.P4: return { label: 'P4', textColor: 'text-white', bgColor: 'bg-slate-400', desc: '待定', dotColor: 'bg-slate-400' };
      default: return { label: 'P2', textColor: 'text-white', bgColor: 'bg-blue-400', desc: '正常', dotColor: 'bg-blue-400' };
    }
  };

  const pConfig = getPriorityStyle(todo.priority);

  // --- EFFECTS ---
  useEffect(() => {
    if (Date.now() - todo.createdAt < 4000) { // Glow for 4 seconds
        setIsJustAdded(true);
        const timer = setTimeout(() => setIsJustAdded(false), 4000);
        return () => clearTimeout(timer);
    }
  }, [todo.createdAt]);

  useEffect(() => { setEditTitleValue(todo.title); }, [todo.title]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target as Node)) setShowPriorityMenu(false);
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (isEditingTitle && titleInputRef.current) titleInputRef.current.focus(); }, [isEditingTitle]);

  // Timer for DDL
  useEffect(() => {
    if (!todo.deadline || isDone) { setTimeLeft(null); setIsOverdue(false); return; }
    const updateTimer = () => {
      const now = Date.now();
      const diff = todo.deadline! - now;
      if (diff <= 0) { setTimeLeft("已截止"); setIsOverdue(true); } 
      else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) setTimeLeft(`${days}天 ${hours}小时`);
        else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
        else setTimeLeft(`${minutes}m`);
        setIsOverdue(false);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [todo.deadline, isDone]);

  // Focus Mode Timer (Smooth Progress Logic)
  useEffect(() => {
    let interval: any;
    if (isFocusMode && !isDone) {
      if (focusTimeLeft > 0) {
        // Update exactly every second to match CSS transition
        interval = setInterval(() => {
            setFocusTimeLeft(prev => {
                const newVal = prev - 1;
                // Calculate percentage: 15 mins = 900 secs
                setFocusProgress(Math.min(100, ((900 - newVal) / 900) * 100));
                return newVal;
            });
        }, 1000);
      } else {
        setFocusProgress(100);
      }
    }
    return () => clearInterval(interval);
  }, [isFocusMode, focusTimeLeft, isDone]);

  // --- HANDLERS ---
  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.shopId) {
        // Clean ID for clipboard
        const cleanId = todo.shopId.replace(/[【】\[\]\s]/g, '');
        navigator.clipboard.writeText(cleanId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTitleSave = () => {
    if (editTitleValue.trim() !== todo.title) onUpdate(todo.id, { title: editTitleValue });
    setIsEditingTitle(false);
  };

  const handleQuickDate = (type: '30m' | '1h' | 'today' | '5pm' | 'tomorrow' | 'permanent') => {
      const now = new Date();
      let timestamp = 0;
      switch (type) {
        case '30m': timestamp = now.getTime() + 30 * 60 * 1000; break;
        case '1h': timestamp = now.getTime() + 60 * 60 * 1000; break;
        case '5pm': 
            // 严格设定为今天17:00，不做任何跳转。如果过了就是过了。
            now.setHours(17, 0, 0, 0); 
            timestamp = now.getTime();
            break;
        case 'today': 
            // 严格设定为今天23:00
            now.setHours(23, 0, 0, 0); 
            timestamp = now.getTime(); 
            break;
        case 'tomorrow': 
            // 严格设定为明天23:00
            const tmr = new Date(); 
            tmr.setDate(tmr.getDate() + 1); 
            tmr.setHours(23, 0, 0, 0); 
            timestamp = tmr.getTime(); 
            break;
        case 'permanent': onUpdate(todo.id, { deadline: undefined }); setShowDateMenu(false); return;
      }
      const updates: Partial<Todo> = { deadline: timestamp };
      if (todo.status === 'todo') { updates.status = 'in_progress'; }
      onUpdate(todo.id, updates);
      setShowDateMenu(false);
  };

  const enterFocusMode = () => {
      if (!isDone && !isFocusMode) {
        setFocusedTodoId(todo.id);
        setFocusTimeLeft(15 * 60);
        setFocusProgress(0);
        if (todo.status === 'todo') { onUpdate(todo.id, { status: 'in_progress' }); }
      }
  };

  // Simplified Status Logic
  const getStatusDisplay = () => {
    if (todo.status === 'done') return { bg: 'bg-green-100/50', text: 'text-green-600', icon: Check, border: 'border-green-200' };
    if (isOverdue) return { bg: 'bg-red-50', text: 'text-red-600', icon: AlertCircle, border: 'border-red-200' };
    if (todo.status === 'in_progress') return { bg: 'bg-blue-50', text: 'text-blue-600', icon: PlayCircle, border: 'border-blue-200' };
    return { bg: 'bg-slate-100/60', text: 'text-slate-500', icon: Circle, border: 'border-transparent' };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  if (isAiProcessing) {
      return (
        <div className="relative rounded-theme border border-theme-border border-theme-width bg-theme-card/80 backdrop-blur-md p-3.5 flex items-center justify-center min-h-[56px] shadow-sm transition-all my-1 mb-3 ring-2 ring-theme-accent/30 animate-pulse">
             <div className="flex items-center gap-2.5 text-theme-accent font-medium text-sm">
                <span className="text-xl animate-bounce">🍅</span>
                <span className="tracking-wide font-semibold">小番茄正在看你发了什么...</span>
            </div>
        </div>
      );
  }

  return (
    <>
    <div 
        onDoubleClick={enterFocusMode}
        className={`
            todo-card
            group relative rounded-theme transition-all duration-500 border-theme-width ease-in-out select-none theme-border-style
            ${isP0 ? 'p0-organism' : ''} 
            ${isDimmed 
                ? 'opacity-20 grayscale blur-[1px] scale-95 pointer-events-none bg-transparent border-transparent' 
                : (isFocusMode 
                    ? 'h-24 shadow-2xl bg-theme-panel border-theme-border overflow-hidden z-20 scale-[1.02] ring-4 ring-theme-accent/20 my-4' 
                    : (isDone 
                        ? 'opacity-60 grayscale-[0.5] bg-theme-input border-transparent' 
                        : 'bg-theme-card hover:bg-theme-card-hover shadow-theme hover:shadow-md border-theme-border hover:border-theme-accent/30'
                      )
                  )
            }
            ${!isFocusMode && (showPriorityMenu || showDateMenu) ? 'z-50' : ''}
            ${isJustAdded && !isFocusMode ? 'animate-breathe-glow z-10' : ''}
        `}
    >
        {isFocusMode ? (
            // === FOCUS MODE (IMMERSIVE LIQUID FLOW) ===
            <div className="relative w-full h-full flex flex-col justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-[var(--p2-bg)] to-transparent opacity-20"></div>
                <div 
                    className="absolute inset-y-0 left-0 z-0 transition-[width] duration-[1000ms] ease-linear overflow-hidden bg-theme-accent/10"
                    style={{ width: `${focusProgress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/40 via-white/20 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                </div>

                <div className="relative z-10 flex items-center px-5 gap-5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggle(todo.id); setFocusedTodoId(null); }}
                        onMouseEnter={() => setIsHoveringCheck(true)}
                        onMouseLeave={() => setIsHoveringCheck(false)}
                        className={`rounded-full shrink-0 w-12 h-12 flex items-center justify-center shadow-lg transition-all transform duration-200 border-2 border-transparent ${isHoveringCheck ? 'bg-theme-accent text-white scale-110' : 'bg-white/80 backdrop-blur-sm text-theme-text shadow-sm hover:shadow-md'}`}
                    >
                        {isHoveringCheck ? <Check size={24} strokeWidth={3} /> : <span className="text-sm font-bold font-mono">{Math.round(focusProgress)}%</span>}
                    </button>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="text-lg font-bold text-theme-text truncate tracking-wide drop-shadow-sm mix-blend-hard-light">{todo.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ring-1 ring-inset ring-current/10 bg-white/50 backdrop-blur-sm text-theme-text ${pConfig.bgColor}`}>
                                {pConfig.label}
                            </span>
                            {todo.shopId && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/50 backdrop-blur-sm text-theme-subtext font-mono ring-1 ring-inset ring-theme-border/50">
                                    <Copy size={10} /> {todo.shopId.replace(/\s/g,'')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-4">
                        <div className={`flex items-center gap-1.5 font-mono text-base font-bold bg-white/60 backdrop-blur-md px-3 py-1.5 rounded text-theme-accent shadow-sm ring-1 ring-inset ring-theme-border/20`}>
                            <Clock size={14} className="animate-pulse" />
                            {Math.floor(focusTimeLeft / 60)}:{(focusTimeLeft % 60).toString().padStart(2, '0')}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setFocusedTodoId(null); }} className="p-2 text-theme-subtext hover:text-theme-text hover:bg-white/40 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                </div>
            </div>
        ) : (
            // === NORMAL MODE LAYOUT ===
            <div className="relative p-3.5 flex items-center gap-3 w-full min-h-[56px]">
                {/* Priority Tag (Solid Filled, Low Saturation, No Border) */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => !isDone && setShowPriorityMenu(!showPriorityMenu)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 group/pbtn relative overflow-hidden ${pConfig.bgColor}`}
                    >
                         <span className={`text-[13px] font-bold tracking-tight relative z-10 ${pConfig.textColor}`}>{pConfig.label}</span>
                    </button>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                     {isEditingTitle ? (
                         <input 
                             ref={titleInputRef}
                             value={editTitleValue}
                             onChange={(e) => setEditTitleValue(e.target.value)}
                             onBlur={handleTitleSave}
                             onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                             className="w-full bg-theme-input border border-theme-border rounded px-2 py-1 text-[15px] font-medium text-theme-text outline-none"
                         />
                     ) : (
                        <div className="flex items-center gap-2">
                             <span 
                               className={`text-[15px] font-semibold truncate leading-tight text-theme-text select-text cursor-text ${isDone ? 'line-through text-theme-subtext opacity-60' : ''}`}
                               onClick={(e) => e.stopPropagation()}
                             >
                                 {todo.title}
                             </span>
                        </div>
                     )}
                     <div className="flex items-center gap-2 mt-1.5">
                        {/* Status Chip (Redesigned as Pill with Squircle) */}
                        <div 
                            onClick={(e) => {e.stopPropagation(); onUpdate(todo.id, {status: isDone ? 'todo' : 'done'})}} 
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] border ${statusDisplay.border} ${statusDisplay.bg} ${statusDisplay.text} cursor-pointer hover:opacity-80 transition-all select-none`}
                        >
                            <StatusIcon size={10} strokeWidth={3} />
                            <span className="text-[10px] font-bold">{todo.status === 'todo' ? '未开始' : (todo.status === 'in_progress' ? '进行中' : '已完成')}</span>
                        </div>

                        {todo.shopId && (
                            <div onClick={handleCopyId} className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] text-[10px] font-medium bg-theme-input text-theme-subtext border border-theme-border cursor-pointer active:scale-95 transition-all group/shop">
                                {copied ? <Check size={10} className="text-green-500"/> : <Copy size={10} className="opacity-60 group-hover/shop:opacity-100" />}
                                <span className="font-mono tracking-wider">{todo.shopId.replace(/\s/g,'')}</span>
                            </div>
                        )}
                        {todo.quantity && ( <span className="text-[10px] font-medium text-theme-subtext opacity-60 px-1">· {todo.quantity}款</span> )}
                     </div>
                </div>

                {/* DDL Badge (Large Corner Radius, Shadow Only, No Border) */}
                <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditingTitle(true)} className="p-1.5 text-theme-subtext hover:text-theme-accent hover:bg-theme-input rounded transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => onDelete(todo.id)} className="p-1.5 text-theme-subtext hover:text-red-600 hover:bg-theme-input rounded transition-colors"><X size={14} /></button>
                    </div>
                   <button onClick={() => setShowDateMenu(!showDateMenu)} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-2xl transition-all shadow-sm hover:shadow-md relative z-10 ${isOverdue && !isDone ? 'bg-red-50 text-red-600' : 'bg-theme-card text-theme-subtext hover:text-theme-text'}`}>
                       <Clock size={13} className={isOverdue && !isDone ? "text-red-500" : "text-theme-subtext"} />
                       <span>{timeLeft || (todo.actionTime ? todo.actionTime : "暂无DDL")}</span>
                   </button>
                </div>
            </div>
        )}

        {/* --- MENU: PRIORITY (Vertical List with Squircle Indicators) --- */}
        {!isFocusMode && showPriorityMenu && (
            <div ref={priorityMenuRef} className="absolute top-10 left-0 z-50 w-36 bg-theme-menu border border-theme-border rounded-2xl shadow-theme p-1.5 animate-in fade-in zoom-in-95 backdrop-blur-xl flex flex-col gap-0.5">
                {[Priority.P0, Priority.P1, Priority.P2, Priority.P3, Priority.P4].map((p) => {
                    const style = getPriorityStyle(p);
                    const isSelected = todo.priority === p;
                    return (
                        <button 
                            key={p} 
                            onClick={(e) => { e.stopPropagation(); onUpdate(todo.id, { priority: p }); setShowPriorityMenu(false); }} 
                            className={`
                                w-full text-left px-2 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors group/item
                                ${isSelected ? 'bg-theme-input text-theme-text' : 'text-theme-subtext hover:bg-theme-input hover:text-theme-text'}
                            `}
                        >
                            {/* Large R (Squircle) Colored Indicator */}
                            <div className={`w-2.5 h-2.5 rounded-[3px] shadow-sm ${style.dotColor} ${isSelected ? 'ring-2 ring-offset-1 ring-offset-theme-card ' + style.dotColor : ''} opacity-90 group-hover/item:opacity-100`}></div>
                            <div className="flex items-center gap-1.5 flex-1">
                                <span className={`font-bold ${isSelected ? 'text-theme-text' : ''}`}>{style.label}</span>
                                <span className="opacity-60 font-normal">- {style.desc}</span>
                            </div>
                            {isSelected && <Check size={12} className="text-theme-text opacity-50 shrink-0" />}
                        </button>
                    )
                })}
            </div>
        )}

        {/* --- MENU: DATE --- */}
        {!isFocusMode && showDateMenu && (
            <div ref={dateMenuRef} className="absolute top-full right-0 mt-2 w-48 bg-theme-menu border border-theme-border rounded-theme shadow-theme p-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-right backdrop-blur-xl">
                <div className="text-[10px] font-bold text-theme-subtext px-2 py-1 uppercase tracking-wider mb-0.5 opacity-60">快速设定</div>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('today'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center gap-2 transition-colors"><Sun size={14} className="text-orange-500" /> 今天 (23:00)</button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('tomorrow'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center gap-2 transition-colors"><ArrowRight size={14} className="text-blue-500" /> 明天 (23:00)</button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('5pm'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center gap-2 transition-colors"><Coffee size={14} className="text-amber-600" /> 五点前 (17:00)</button>
                <div className="h-px bg-theme-border my-1"></div>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('30m'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center gap-2 transition-colors"><Zap size={14} className="text-yellow-500" /> 30 分钟后</button>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('1h'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center gap-2 transition-colors"><Clock size={14} className="text-indigo-500" /> 1 小时后</button>
                <div className="h-px bg-theme-border my-1"></div>
                <button onClick={(e) => { e.stopPropagation(); handleQuickDate('permanent'); }} className="w-full text-left px-2 py-2 rounded-sm text-xs text-theme-text hover:bg-theme-input flex items-center justify-between transition-colors group/custom"><div className="flex items-center gap-2"><Anchor size={14} className="text-theme-subtext group-hover/custom:text-theme-accent" /> 常驻任务</div></button>
            </div>
        )}
    </div>
    </>
  );
};

export default TodoItem;
