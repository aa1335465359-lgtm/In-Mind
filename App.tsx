
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Todo, Priority } from './types';
import TaskInput from './components/TaskInput';
import TodoItem from './components/TodoItem';
import ImageEditor from './components/ImageEditor';
import ScriptMatcher from './components/ScriptMatcher';
import AiAssistant from './components/AiAssistant';
import CalendarView from './components/CalendarView';
import ThemeBackground from './components/ThemeBackground';
import CyberStormEffect from './components/CyberStormEffect';
import SnowEffect from './components/SnowEffect';
import { 
  Inbox, 
  CheckCircle2, 
  Layout, 
  Zap,
  Search,
  Quote,
  Palette,
  ShoppingBag,
  MessageSquare,
  ExternalLink,
  Bot,
  ArrowUpDown,
  Clock,
  Calendar,
  CalendarRange,
  ChevronDown,
  LayoutList,
  FileText,
  Undo2,
  Heart,
  Trash2
} from 'lucide-react';

// Quotes (Customized for Plus-size Buyer: Caring + Black Humor)
const FASHION_QUOTES = [
  "“忙完这个P0，就去点杯半糖奶茶续个命吧。”",
  "“上班到眼花？没事，那说明离爆款不远了（大概）。”",
  "“咖啡是早上的救命水，奶茶是晚上的安魂汤。”",
  "“催样催不动？深呼吸，商家也是肉做的，虽然有时像石头。”",
  "“11点下班是常态，但千万别把心情也留在公司。”",
  "“核价是门玄学，只要我不尴尬，尴尬的就是商家。”",
  "“今天也是在成堆的样衣里淘金的一天，加油啊特种兵。”",
  "“虽然是11-11-6，但快乐要是24小时的（做梦）。”",
  "“别让那几个烂款坏了心情，它们不配。”",
  "“加站成功的那一刻，感觉发际线都长回来了一点。”",
  "“P0做不完没关系，地球离了你照样转，但你加班了会不开心。”",
  "“做个情绪稳定的成年人... 除非商家说货还没发。”",
  "“在这个冷漠的时尚圈，只有手里的热咖啡是有温度的。”",
  "“已读乱回是成年人的保护色，特别是面对无理取闹的催单。”",
  "“傻b商家不做就滚”",
  "“宝，别太累了，那个只会发‘在吗’的商家不值得你长皱纹。”"
];

const THEME_OPTIONS = [
  { id: 'neo-chinese', name: '中式', color: '#C93F3F' }, // Renamed
  { id: 'glass', name: '玻璃', color: '#a5b4fc' },
  { id: 'amethyst', name: '紫晶', color: '#4E345C' },
  { id: 'memphis', name: '孟菲', color: '#FFEB3B' },
  { id: 'dopamine', name: '多巴', color: '#002FA7' },
  { id: 'maillard', name: '美拉', color: '#8B4513' },
  { id: 'minecraft', name: '方块', color: '#5a8e3d' },
  { id: 'kawaii', name: '甜心', color: '#f9a8d4' },
  { id: 'wooden', name: '原木', color: '#d4a373' },
  { id: 'watercolor', name: '水彩', color: '#93c5fd' },
  { id: 'oil-slick', name: '虹彩', color: '#FF7B89' },
  { id: 'neon-billboard', name: '霓虹', color: '#FF3EA6' },
  { id: 'deepNebula', name: '星云', color: '#4DA6FF' },
];

const App: React.FC = () => {
  // --- STATE ---
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('buyer_todos');
    const parsed = saved ? JSON.parse(saved) : [];
    // Filter out 'processing' status tasks so they don't persist on refresh
    return parsed
      .filter((t: any) => t.aiStatus !== 'processing')
      .map((t: any) => ({
        ...t,
        status: t.status || (t.isCompleted ? 'done' : 'todo')
      }));
  });
  
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    // Migration: 'pixel' -> 'minecraft'
    if (saved === 'pixel') return 'minecraft';
    // Migration: 'terrarium' -> 'neo-chinese'
    if (saved === 'terrarium') return 'neo-chinese';
    // Migration: If user had a deleted theme, fallback to glass
    if (['rainy', 'paper', 'ultra-rgb', 'laser-tunnel', 'dragonScale', 'blackGold', 'synthwaveGrid', 'kinetic-chrome'].includes(saved || '')) {
        return 'glass';
    }
    return saved || 'glass';
  });
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [currentView, setCurrentView] = useState<'todos' | 'image-editor' | 'indie-chi' | 'script-matcher' | 'bot' | 'tomato-pdf'>('todos');
  const [filter, setFilter] = useState<'all' | 'p0' | 'completed'>('all');
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sortMode, setSortMode] = useState<'priority' | 'deadline' | 'created'>('priority');
  const [isGroupedByDay, setIsGroupedByDay] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [quote, setQuote] = useState('');

  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);

  // Undo Delete State
  const [lastDeleted, setLastDeleted] = useState<Todo | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<any>(null);

  // Store previous theme for temporary switches
  const previousThemeRef = useRef<string | null>(null);

  // --- REFS ---
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    const randomQuote = FASHION_QUOTES[Math.floor(Math.random() * FASHION_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => { localStorage.setItem('buyer_todos', JSON.stringify(todos)); }, [todos]);
  useEffect(() => { 
      // Only persist theme if it's NOT a temporary one
      if (theme !== 'landetian') {
          localStorage.setItem('app_theme', theme); 
      }
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) setShowSortMenu(false);
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) setShowThemeMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleAddTodos = (newTodos: Todo[]) => setTodos(prev => [...newTodos, ...prev]);
  
  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newStatus = t.status === 'done' ? 'todo' : 'done';
      return { ...t, status: newStatus, isCompleted: newStatus === 'done', completedAt: newStatus === 'done' ? Date.now() : undefined };
    }));
    if (focusedTodoId === id) setFocusedTodoId(null);
  };
  
  const handleUpdateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => {
       if (t.id !== id) return t;
       const updated = { ...t, ...updates };
       if (updates.status !== undefined) {
           updated.isCompleted = updates.status === 'done';
           if (updates.status === 'done' && !updated.completedAt) updated.completedAt = Date.now();
           else if (updates.status !== 'done') updated.completedAt = undefined;
       }
       return updated;
    }));
  };

  const handleDeleteTodo = (id: string) => {
    // 1. Attempt to find task for Undo feature
    const todoToDelete = todos.find(t => t.id === id);
    
    if (todoToDelete) {
        setLastDeleted(todoToDelete);
        setShowUndo(true);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = setTimeout(() => setShowUndo(false), 8000); // 8 seconds to undo
    }

    // 2. ALWAYS perform deletion using functional update
    setTodos(prev => prev.filter(t => t.id !== id));
    
    if (focusedTodoId === id) setFocusedTodoId(null);
  };

  const handleUndoDelete = () => {
    if (lastDeleted) {
        setTodos(prev => [...prev, lastDeleted]);
        setShowUndo(false);
        setLastDeleted(null);
    }
  };

  const handleSecretCode = (code: string) => {
     const lower = code.toLowerCase();
     if (lower === '1335465359') setTheme('sewer');
     if (lower === 'merry christmas' || lower === '圣诞快乐') setTheme('christmas');
     
     // Temporary Theme Logic for Landetian
     if (lower === 'landetian' || lower === '蓝的天') {
         if (theme !== 'landetian') {
            previousThemeRef.current = theme;
            setTheme('landetian');
         }
     } else if (lower === 'exit_landetian') {
         if (theme === 'landetian' && previousThemeRef.current) {
             setTheme(previousThemeRef.current);
             previousThemeRef.current = null;
         }
     }
  };

  // --- DERIVED STATE ---
  const sortedTodos = useMemo(() => {
    const priorityOrder = { [Priority.P0]: 0, [Priority.P1]: 1, [Priority.P2]: 2, [Priority.P3]: 3, [Priority.P4]: 4 };
    const getScore = (p: string) => {
        if (p === 'HIGH') return 0;
        if (p === 'MEDIUM') return 2;
        if (p === 'LOW') return 3;
        return priorityOrder[p as Priority] ?? 5;
    };
    return [...todos].sort((a, b) => {
        // Always place processing tasks at the very top for visual feedback
        const aProc = a.aiStatus === 'processing';
        const bProc = b.aiStatus === 'processing';
        if (aProc && !bProc) return -1;
        if (!aProc && bProc) return 1;

        const aDone = a.status === 'done';
        const bDone = b.status === 'done';

        // NEW: Sort completed items by completion time (Recent -> Far)
        if (aDone && bDone) {
             return (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0);
        }

        if (aDone !== bDone) return aDone ? 1 : -1;
        
        if (sortMode === 'priority') {
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline) return -1;
            if (b.deadline) return 1;
        } else if (sortMode === 'deadline') {
            if (a.deadline && b.deadline) return a.deadline - b.deadline;
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;
            const scoreA = getScore(a.priority);
            const scoreB = getScore(b.priority);
            if (scoreA !== scoreB) return scoreA - scoreB;
        } else if (sortMode === 'created') {
            return b.createdAt - a.createdAt;
        }
        return b.createdAt - a.createdAt;
    });
  }, [todos, sortMode]);

  // Seperate processing tasks to ensure they are always pinned on top visually
  const processingTodos = useMemo(() => todos.filter(t => t.aiStatus === 'processing'), [todos]);
  
  // Normal Filtered List (Excluding processing which we render manually)
  const filteredTodos = useMemo(() => {
    return sortedTodos.filter(todo => {
        if (todo.aiStatus === 'processing') return false; // Handled separately

        if (searchQuery) {
           const query = searchQuery.toLowerCase();
           const matches = todo.title.toLowerCase().includes(query) || 
                           todo.shopId?.includes(query) ||
                           todo.description?.toLowerCase().includes(query);
           if (!matches) return false;
        }
        if (filter === 'completed') return todo.status === 'done';
        if (todo.status === 'done') return false;
        if (filter === 'p0') return todo.priority === Priority.P0 || (todo.priority as string) === 'HIGH';
        return true;
    });
  }, [sortedTodos, searchQuery, filter]);

  const groupedTodos = useMemo(() => {
    if (!isGroupedByDay) return [];
    const groups: { [key: string]: Todo[] } = {};
    filteredTodos.forEach(todo => {
        const d = new Date(todo.createdAt);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todoTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        let key = '';
        if (todoTime === todayStart) key = '今天';
        else if (todoTime === todayStart - 86400000) key = '昨天';
        else if (todoTime === todayStart - 86400000 * 2) key = '前天';
        else key = `${d.getMonth() + 1}月${d.getDate()}日`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(todo);
    });
    const sortedGroups: { title: string, tasks: Todo[] }[] = [];
    ['今天', '昨天', '前天'].forEach(k => { if (groups[k]) sortedGroups.push({ title: k, tasks: groups[k] }); });
    const dateKeys = Object.keys(groups).filter(k => !['今天', '昨天', '前天'].includes(k));
    dateKeys.sort((a, b) => {
        const taskA = groups[a][0];
        const taskB = groups[b][0];
        return taskB.createdAt - taskA.createdAt;
    });
    dateKeys.forEach(k => sortedGroups.push({ title: k, tasks: groups[k] }));
    return sortedGroups;
  }, [filteredTodos, isGroupedByDay]);

  const activeCount = todos.filter(t => t.status !== 'done').length;
  const p0Count = todos.filter(t => t.status !== 'done' && (t.priority === Priority.P0 || (t.priority as string) === 'HIGH')).length;

  return (
    <>
    <style>{`
        /* Helper for solid menu background in App.tsx */
        .bg-theme-menu {
            background-color: var(--bg-menu, rgba(255,255,255,0.95));
        }
        /* Keep-alive helper class */
        .view-hidden {
            display: none !important;
        }
    `}</style>
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-8" data-theme={theme}>
      <ThemeBackground theme={theme} />
      
      {/* Main Container */}
      <div className="w-full max-w-6xl h-full max-h-[900px] bg-theme-panel rounded-theme-lg flex overflow-hidden shadow-theme transition-all duration-300 border-theme border-theme-width backdrop-blur-md relative">
        
        {/* === CYBER STORM EFFECT (Injected ONLY here, behind content but on top of panel bg) === */}
        {theme === 'sewer' && <CyberStormEffect />}
        
        {/* === SNOW EFFECT (Injected ONLY here, behind content but on top of panel bg) === */}
        {(theme === 'christmas' || theme === 'reindeer') && <SnowEffect />}

        {/* Sidebar */}
        <div className="main-sidebar w-64 bg-theme-sidebar border-r border-theme-border border-theme-width flex flex-col pt-6 pb-4 hidden md:flex shrink-0 transition-colors z-10">
          
          {/* Theme Entry Point */}
          <div className="px-6 mb-8 relative" ref={themeMenuRef}>
            <div 
              className="cursor-pointer group select-none"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
            >
              <h1 className="text-xl font-extrabold tracking-widest text-theme-text uppercase group-hover:text-theme-accent transition-colors flex items-center gap-1 font-sans">
                BUYER MATE <ChevronDown size={14} className={`transition-transform opacity-50 ${showThemeMenu ? 'rotate-180' : ''}`} />
              </h1>
              <p className="text-xs text-theme-subtext mt-1 opacity-60 font-mono tracking-widest">v3.0.0</p>
            </div>
            
            {showThemeMenu && (
              <div className="absolute top-full left-6 mt-2 w-48 max-h-[400px] overflow-y-auto bg-theme-menu border border-theme-border border-theme-width rounded-theme shadow-theme p-1 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setTheme(opt.id); setShowThemeMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 transition-colors ${theme === opt.id ? 'bg-theme-accent-bg text-theme-accent' : 'text-theme-subtext hover:bg-theme-input'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }}></div>
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            <SidebarItem 
              icon={<Inbox size={18} />} 
              label="全部待办" 
              count={activeCount}
              active={currentView === 'todos' && filter === 'all'} 
              onClick={() => { setCurrentView('todos'); setFilter('all'); }} 
            />
            
            <SidebarItem 
              icon={<Zap size={18} />} 
              label="紧急事项 (P0)" 
              active={currentView === 'todos' && filter === 'p0'} 
              count={p0Count}
              onClick={() => { setCurrentView('todos'); setFilter('p0'); }} 
            />
             <SidebarItem 
              icon={<CheckCircle2 size={18} />} 
              label="已归档" 
              active={currentView === 'todos' && filter === 'completed'} 
              onClick={() => { setCurrentView('todos'); setFilter('completed'); }} 
            />

            {/* Toolbox Section */}
            <div className="pt-6">
               <p className="px-3 mb-3 text-[12px] font-medium text-theme-subtext opacity-70 tracking-widest">工具箱</p>
               <div className="space-y-1">
                   <SidebarItem icon={<Bot size={18} />} label="小番茄" active={currentView === 'bot'} onClick={() => setCurrentView('bot')} />
                   <SidebarItem icon={<Palette size={18} />} label="智能改图" active={currentView === 'image-editor'} onClick={() => setCurrentView('image-editor')} />
                   <SidebarItem icon={<MessageSquare size={18} />} label="话术推荐" active={currentView === 'script-matcher'} onClick={() => setCurrentView('script-matcher')} />
                   <SidebarItem 
                     icon={<ShoppingBag size={18} />} 
                     label="Indie Chi 选款" 
                     active={currentView === 'indie-chi'} 
                     onClick={() => setCurrentView('indie-chi')} 
                   />
                   <SidebarItem 
                     icon={<FileText size={18} />} 
                     label="番茄PDF" 
                     active={currentView === 'tomato-pdf'} 
                     onClick={() => setCurrentView('tomato-pdf')} 
                   />
               </div>
            </div>
          </nav>

          <div className="px-5 mt-auto mb-6">
             <div className="relative group p-4 bg-theme-card border border-theme-border rounded-theme shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-theme-border/20 rounded-full"></div>
                <Heart className="absolute top-3 right-3 text-theme-accent w-4 h-4 opacity-40 group-hover:opacity-80 transition-opacity" />
                <p className="text-[12px] md:text-[13px] text-theme-text font-medium leading-relaxed relative z-10 quote-vertical opacity-90">
                   {quote}
                </p>
             </div>
          </div>
        </div>

        {/* Content Area - KEEP ALIVE IMPLEMENTATION */}
        <div className="flex-1 flex flex-col bg-transparent relative min-w-0 z-10 h-full overflow-hidden">
            
            {/* 1. TODOS VIEW */}
            <div className={`flex flex-col h-full ${currentView === 'todos' ? '' : 'view-hidden'}`}>
                {/* Header */}
                <div className="h-16 border-b border-theme-border border-theme-width flex items-center justify-between px-8 bg-theme-panel/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                  <div className="flex flex-col">
                      <h2 className="font-semibold text-theme-text flex items-center gap-2 text-lg">
                      {filter === 'all' && '工作台'}
                      {filter === 'p0' && '紧急事项 (P0)'}
                      {filter === 'completed' && '历史归档'}
                      </h2>
                      <span className="text-[10px] text-theme-subtext font-medium">
                          {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtext opacity-50" />
                    <input 
                        type="text" 
                        placeholder="搜索..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-theme-input border border-theme-border border-theme-width focus:bg-theme-card rounded-theme text-sm outline-none transition-all w-48 focus:w-64 placeholder-theme-subtext/50 shadow-sm text-theme-text"
                    />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-2 border-b border-theme-border border-theme-width flex items-center justify-between bg-theme-panel/20 backdrop-blur-sm shrink-0 z-20">
                    <div className="relative" ref={sortMenuRef}>
                      {viewMode === 'list' && (
                        <>
                        <button 
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="flex items-center gap-2 text-xs font-medium text-theme-text bg-theme-input hover:bg-theme-card px-3 py-1.5 rounded-theme border border-theme-border border-theme-width shadow-sm transition-all"
                        >
                            <span className="text-theme-subtext">排序:</span>
                            <span className="font-semibold">{isGroupedByDay ? '日维度' : (sortMode === 'priority' ? '优先级' : sortMode === 'deadline' ? '截止时间' : '创建时间')}</span>
                            <ChevronDown size={12} className={`text-theme-subtext transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showSortMenu && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-theme-menu border border-theme-border border-theme-width rounded-theme shadow-theme p-1 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                                <button onClick={() => { setSortMode('priority'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><ArrowUpDown size={13} /> 优先级</button>
                                <button onClick={() => { setSortMode('deadline'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><Clock size={13} /> 截止时间</button>
                                <button onClick={() => { setSortMode('created'); setIsGroupedByDay(false); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><Calendar size={13} /> 创建时间</button>
                                <div className="h-[1px] bg-theme-border my-1 mx-1"></div>
                                <button onClick={() => { setIsGroupedByDay(true); setShowSortMenu(false); }} className="w-full text-left px-3 py-2 rounded-theme-sm text-xs font-medium flex items-center gap-2 hover:bg-theme-input text-theme-text"><CalendarRange size={13} /> 日维度</button>
                            </div>
                        )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex bg-theme-input p-1 rounded-theme border border-theme-border border-theme-width ml-auto">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'list' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}><LayoutList size={16} /></button>
                        <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-theme-sm transition-all ${viewMode === 'calendar' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}><Calendar size={16} /></button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                      {filteredTodos.length === 0 && processingTodos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-theme-subtext">
                            <Layout className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium opacity-50">暂无任务</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-24">
                           {/* Pinned Processing Items (The "Tomato" Card) */}
                           {processingTodos.map(todo => (
                               <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />
                           ))}

                           {/* Main List */}
                           {isGroupedByDay ? groupedTodos.map(group => (
                             <div key={group.title} className="space-y-3">
                               <div className="flex items-center gap-2 px-1"><h3 className="text-xs font-bold text-theme-subtext opacity-70 uppercase tracking-wider">{group.title}</h3></div>
                               {group.tasks.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />)}
                             </div>
                           )) : filteredTodos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onUpdate={handleUpdateTodo} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />)}
                        </div>
                      )}
                    </div>

                    <div className="p-6 md:px-8 bg-gradient-to-t from-theme-panel via-theme-panel/90 to-transparent sticky bottom-0 z-20">
                       <TaskInput 
                          onAddTodos={handleAddTodos} 
                          onUpdateTodo={handleUpdateTodo} 
                          onDeleteTodo={handleDeleteTodo}
                          onSecretCode={handleSecretCode}
                        />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-6 md:p-8 overflow-hidden flex flex-col">
                      <CalendarView 
                        todos={todos} 
                        onToggle={handleToggleTodo} 
                        onDelete={handleDeleteTodo} 
                        onUpdate={handleUpdateTodo} 
                        focusedTodoId={focusedTodoId} 
                        setFocusedTodoId={setFocusedTodoId} 
                      />
                  </div>
                )}
            </div>

            {/* 2. IMAGE EDITOR VIEW */}
            <div className={`h-full ${currentView === 'image-editor' ? '' : 'view-hidden'}`}>
                <ImageEditor />
            </div>

            {/* 3. INDIE CHI VIEW (Embedded) */}
            <div className={`h-full w-full ${currentView === 'indie-chi' ? '' : 'view-hidden'}`}>
                <iframe 
                    src="https://fake-indie.vercel.app/" 
                    className="w-full h-full border-none"
                    title="Indie Chi"
                />
            </div>

            {/* 4. SCRIPT MATCHER VIEW */}
            <div className={`h-full ${currentView === 'script-matcher' ? '' : 'view-hidden'}`}>
                <ScriptMatcher />
            </div>

            {/* 5. AI BOT VIEW */}
            <div className={`h-full ${currentView === 'bot' ? '' : 'view-hidden'}`}>
                <AiAssistant theme={theme} />
            </div>

            {/* 6. TOMATO PDF VIEW (Embedded) */}
            <div className={`h-full w-full ${currentView === 'tomato-pdf' ? '' : 'view-hidden'}`}>
                <iframe 
                    src="https://share-pdf-beta.vercel.app/" 
                    className="w-full h-full border-none"
                    title="Tomato PDF"
                />
            </div>

            {/* Undo Toast */}
            {showUndo && (
              <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-theme-input/90 backdrop-blur-md border border-theme-border text-theme-text px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
                 <span className="text-sm font-medium">已删除一项任务</span>
                 <button onClick={handleUndoDelete} className="flex items-center gap-1 text-sm font-bold text-theme-accent hover:underline">
                    <Undo2 size={14} /> 撤销
                 </button>
              </div>
            )}

        </div>
      </div>
    </div>
    </>
  );
};

// Helper Component for Sidebar Items
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, count, active, onClick, variant = 'default' }) => {
  if (variant === 'primary') {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-theme-sm transition-all shadow-md group sidebar-btn-primary ${
          active 
            ? 'bg-theme-accent text-white font-bold' 
            : 'bg-theme-card text-theme-text hover:brightness-95'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-inherit">
            {icon}
          </div>
          <span className="text-base">{label}</span>
        </div>
        {count !== undefined && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-inherit">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-theme-sm transition-all group ${
        active 
          ? 'bg-theme-input font-bold text-theme-text' 
          : 'text-theme-subtext hover:text-theme-text hover:bg-theme-input/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`transition-colors ${active ? 'text-theme-text' : 'text-theme-subtext group-hover:text-theme-text'}`}>
          {icon}
        </div>
        <span className="text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-theme-input text-theme-subtext`}>
          {count}
        </span>
      )}
    </button>
  );
};

export default App;
