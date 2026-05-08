
import React, { useState, useMemo, useEffect } from 'react';
import { Todo, WorkSummary, Priority } from '../types';
import TodoItem from './TodoItem';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  Sparkles, FileText, BarChart3, TrendingUp, CheckCircle2, 
  AlertCircle, Loader2, ArrowRight, Zap, Target, ShieldAlert,
  Award, RefreshCcw, Layers
} from 'lucide-react';
import { generateDailyReport, generateWorkSummary } from '../services/geminiService';

interface CalendarViewProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  focusedTodoId: string | null;
  setFocusedTodoId: (id: string | null) => void;
}

type SummaryRange = 'week' | '15d' | '30d' | 'month';

const CalendarView: React.FC<CalendarViewProps> = ({ todos, onToggle, onDelete, onUpdate, focusedTodoId, setFocusedTodoId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'tasks' | 'summary'>('tasks');
  
  // Daily Summary State
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);

  // Periodic Summary State
  const [activeRange, setActiveRange] = useState<SummaryRange>('week');
  const [isGeneratingWorkSummary, setIsGeneratingWorkSummary] = useState(false);
  const [workSummary, setWorkSummary] = useState<WorkSummary | null>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); };

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  useEffect(() => { setDailySummary(null); }, [selectedDate]);

  const getTaskDate = (todo: Todo): Date => {
    if (todo.status === 'done' && todo.completedAt) return new Date(todo.completedAt);
    if (todo.deadline) return new Date(todo.deadline);
    return new Date(todo.createdAt);
  };

  const tasksByDate = useMemo(() => {
    const map: { [key: string]: Todo[] } = {};
    todos.forEach(todo => {
        const date = getTaskDate(todo);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(todo);
    });
    return map;
  }, [todos]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const selectedTasks = tasksByDate[selectedDateKey] || [];

  const handleGenerateDailyReport = async () => {
    if (selectedTasks.length === 0) return;
    setIsGeneratingDaily(true);
    try {
        const dateLabel = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`;
        const text = await generateDailyReport(selectedTasks, dateLabel);
        setDailySummary(text);
    } catch (e) { console.error(e); } finally { setIsGeneratingDaily(false); }
  };

  // Periodic Summary Logic
  const getRangeLabel = (range: SummaryRange) => {
    switch (range) {
      case 'week': return '最近7天';
      case '15d': return '最近15天';
      case '30d': return '最近30天';
      case 'month': return '本月';
      default: return '';
    }
  };

  const getRangeTasks = (range: SummaryRange) => {
    const now = Date.now();
    let startTime = 0;
    
    switch (range) {
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '15d':
        startTime = now - 15 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        const d = new Date();
        startTime = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        break;
    }

    const filtered = todos.filter(t => t.createdAt >= startTime);
    return { tasks: filtered, label: getRangeLabel(range) };
  };

  const handleGenerateWorkSummary = async (range: SummaryRange) => {
    const { tasks, label } = getRangeTasks(range);
    
    // Calculate Stats locally
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
    const overdue = tasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < Date.now()).length;
    const p0Tasks = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
    const p0Total = p0Tasks.length;
    const p0Completed = p0Tasks.filter(t => t.status === 'done').length;
    
    const stats = { total, completed, completionRate, overdue, p0Total, p0Completed };

    setIsGeneratingWorkSummary(true);
    try {
      const summary = await generateWorkSummary(tasks, stats, label);
      setWorkSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingWorkSummary(false);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - firstDay + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      if (!isValidDay) {
        days.push(<div key={`empty-${i}`} className="h-28 bg-black/5 border border-theme-border opacity-50"></div>);
        continue;
      }
      const thisDate = new Date(year, month, dayNum);
      const dateKey = `${year}-${month}-${dayNum}`;
      const dayTasks = tasksByDate[dateKey] || [];
      const total = dayTasks.length;
      const completed = dayTasks.filter(t => t.status === 'done').length;
      const progressPercent = total > 0 ? (completed / total) * 100 : 0;
      const hasOverdue = dayTasks.some(t => t.status !== 'done' && t.deadline && t.deadline < Date.now());
      const isSelected = isSameDay(thisDate, selectedDate);
      const isToday = isSameDay(thisDate, new Date());

      days.push(
        <div 
          key={dateKey}
          onClick={() => { setSelectedDate(thisDate); setViewType('tasks'); }}
          className={`
            h-24 rounded-theme border-theme-width transition-all flex flex-col items-center justify-center relative overflow-hidden group mx-0.5 my-0.5
            ${isSelected 
              ? 'bg-theme-input shadow-sm z-10 border-theme-accent ring-1 ring-theme-accent' 
              : 'bg-theme-card hover:bg-theme-card-hover border-theme-border'
            }
          `}
        >
           <div className={`text-xl font-bold tracking-tight transition-colors select-none ${isToday ? 'text-red-500' : (isSelected ? 'text-theme-accent' : 'text-theme-text')}`}>{dayNum}</div>
           {hasOverdue && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full" />}
           {total > 0 && (
              <div className="absolute bottom-3 w-10 h-1 bg-black/10 rounded-full overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-500 ${total === completed ? 'bg-emerald-500' : 'bg-theme-accent'}`} style={{ width: `${progressPercent}%` }} />
              </div>
           )}
           {completed > 0 && <div className="absolute bottom-3 right-3 text-[10px] font-bold text-theme-subtext opacity-50">{completed}</div>}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-theme-panel/40 rounded-theme overflow-hidden shadow-inner relative border-theme-width border-theme-border">
      {/* Calendar Header & Grid - Always Visible on Top Section */}
      <div className={`flex flex-col min-h-0 transition-all duration-500 ease-in-out ${viewType === 'summary' ? 'h-[0px] opacity-0 overflow-hidden' : 'flex-1'}`}>
          <div className="flex items-center justify-between px-6 py-4 bg-theme-panel backdrop-blur-sm border-b border-theme-border shrink-0 z-20">
             <div className="flex items-center gap-4">
                 <h2 className="text-xl font-bold text-theme-text">{year}年 {month + 1}月</h2>
                 <div className="flex items-center bg-theme-card rounded-theme border border-theme-border shadow-sm overflow-hidden">
                     <button onClick={prevMonth} className="p-1.5 hover:bg-theme-input text-theme-subtext"><ChevronLeft size={16} /></button>
                     <div className="w-[1px] h-4 bg-theme-border"></div>
                     <button onClick={nextMonth} className="p-1.5 hover:bg-theme-input text-theme-subtext"><ChevronRight size={16} /></button>
                 </div>
                 <button onClick={goToToday} className="text-xs font-medium px-3 py-1.5 bg-theme-card border border-theme-border rounded-theme text-theme-subtext hover:text-theme-accent transition-colors">回到今天</button>
             </div>
             <div className="flex bg-theme-input p-1 rounded-theme border border-theme-border">
                <button 
                  onClick={() => setViewType('tasks')} 
                  className={`px-3 py-1 rounded-theme-sm text-xs font-bold transition-all flex items-center gap-1.5 ${viewType === 'tasks' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}
                >
                  <CalendarIcon size={14} /> 当日
                </button>
                <button 
                  onClick={() => setViewType('summary')} 
                  className={`px-3 py-1 rounded-theme-sm text-xs font-bold transition-all flex items-center gap-1.5 ${viewType === 'summary' ? 'bg-theme-card shadow-sm text-theme-accent' : 'text-theme-subtext hover:text-theme-text'}`}
                >
                  <Sparkles size={14} /> 阶段复盘
                </button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
             <div className="grid grid-cols-7 border-b border-theme-border bg-theme-input/50 sticky top-0 z-10">
                 {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-2 text-center text-xs font-medium text-theme-subtext">{d}</div>)}
             </div>
             <div className="grid grid-cols-7 p-2 gap-1">{renderCalendarDays()}</div>
          </div>
      </div>

      {/* View Switcher: Task List or Summary Dashboard */}
      <div className={`border-t border-theme-border bg-theme-panel backdrop-blur-md flex flex-col shadow-theme z-30 overflow-hidden transition-all duration-500 ${viewType === 'summary' ? 'h-full flex-1' : 'h-[45%] min-h-[280px]'}`}>
         
         {/* --- TASK LIST VIEW --- */}
         {viewType === 'tasks' && (
           <>
              <div className="px-6 py-3 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-input/30">
                  <div className="flex items-center gap-2">
                      <CalendarIcon size={16} className="text-theme-accent" />
                      <span className="font-semibold text-theme-text">{selectedDate.getDate()}日待办</span>
                      <span className="bg-theme-input text-theme-subtext px-2 py-0.5 rounded-full text-xs font-medium">{selectedTasks.length}</span>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTasks.length > 0 && (
                      <div className="mb-2">
                        {!dailySummary ? (
                            <div className="flex items-center justify-between bg-theme-card rounded-theme px-4 py-3 transition-all group border border-theme-border shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-theme-subtext font-medium"><Sparkles size={14} className="text-theme-accent opacity-50" /><span>今日总结（点击生成）</span></div>
                                <button onClick={handleGenerateDailyReport} disabled={isGeneratingDaily} className="text-xs font-semibold text-theme-accent hover:underline transition-colors">{isGeneratingDaily ? "生成中..." : "生成"}</button>
                            </div>
                        ) : (
                            <div className="bg-theme-card rounded-theme px-4 py-3 flex flex-col gap-2 border border-theme-border shadow-sm animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start gap-3"><div className="mt-0.5 shrink-0"><Sparkles size={14} className="text-theme-accent" /></div><div className="flex-1 text-sm text-theme-text leading-relaxed text-justify">{dailySummary}</div></div>
                            </div>
                        )}
                      </div>
                  )}
                  <div className="space-y-2">
                      {selectedTasks.length > 0 ? selectedTasks.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} focusedTodoId={focusedTodoId} setFocusedTodoId={setFocusedTodoId} />) : <div className="py-8 flex flex-col items-center justify-center text-theme-subtext gap-2 opacity-50"><Clock size={32} /><p className="text-sm">这一天没有安排任务</p></div>}
                  </div>
              </div>
           </>
         )}

         {/* --- AI SUMMARY DASHBOARD VIEW --- */}
         {viewType === 'summary' && (
           <div className="flex-1 flex flex-col overflow-hidden bg-theme-panel/50">
              <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-input/50 backdrop-blur-md">
                 <div className="flex items-center gap-3">
                    {/* Fixed: Back button always visible */}
                    <button 
                        onClick={() => setViewType('tasks')} 
                        className="p-1.5 -ml-2 text-theme-subtext hover:text-theme-text transition-colors flex items-center gap-1 group"
                        title="返回日历"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-medium hidden sm:inline">返回</span>
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2"><Target size={20} className="text-theme-accent" /> 阶段工作复盘</h2>
                    </div>
                 </div>
                 <div className="flex gap-1 bg-theme-card p-1 rounded-lg border border-theme-border">
                    {(['week', '15d', '30d', 'month'] as SummaryRange[]).map(r => (
                      <button 
                        key={r} 
                        onClick={() => { setActiveRange(r); setWorkSummary(null); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeRange === r ? 'bg-theme-accent text-white shadow-sm' : 'text-theme-subtext hover:bg-theme-input hover:text-theme-text'}`}
                      >
                        {r === 'week' ? '近7天' : r === '15d' ? '近15天' : r === '30d' ? '近30天' : '本月'}
                      </button>
                    ))}
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                 {isGeneratingWorkSummary ? (
                   <div className="h-full flex flex-col items-center justify-center gap-6 text-theme-subtext">
                      <div className="relative">
                          <div className="absolute inset-0 bg-theme-accent blur-[20px] opacity-20 animate-pulse rounded-full"></div>
                          <Loader2 className="animate-spin text-theme-accent relative z-10" size={48} />
                      </div>
                      <div className="text-center space-y-2">
                          <p className="text-base font-bold text-theme-text">正在分析工作数据...</p>
                          <p className="text-xs opacity-60">计算完成率 · 评估P0交付 · 识别风险项</p>
                      </div>
                   </div>
                 ) : workSummary ? (
                   <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      {/* 1. Key Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <StatCard 
                            type="success"
                            icon={<CheckCircle2 />} 
                            label="整体完成率" 
                            value={workSummary.stats.completionRate} 
                            subtext={`${workSummary.stats.completed}/${workSummary.stats.total} 已完成`}
                         />
                         <StatCard 
                            type="warning"
                            icon={<Zap />} 
                            label="P0 交付率" 
                            value={workSummary.stats.p0Total > 0 ? `${Math.round((workSummary.stats.p0Completed / workSummary.stats.p0Total) * 100)}%` : 'N/A'} 
                            subtext={`${workSummary.stats.p0Completed}/${workSummary.stats.p0Total} 核心任务`}
                         />
                         <StatCard 
                            type="danger"
                            icon={<AlertCircle />} 
                            label="逾期任务" 
                            value={workSummary.stats.overdue} 
                            subtext="需尽快处理"
                         />
                          <StatCard 
                            type="info"
                            icon={<RefreshCcw />} 
                            label="平均日产出" 
                            value={(workSummary.stats.completed / 7).toFixed(1)} 
                            subtext="估算值"
                         />
                      </div>

                      {/* 2. Main Themes (Work Breakdown) */}
                      <div className="grid grid-cols-1 gap-6">
                          <div className="bg-theme-card/50 border border-theme-border rounded-xl p-5 shadow-sm">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-theme-accent mb-4 bg-theme-accent/10 px-3 py-1.5 rounded-lg w-fit">
                                  <Layers size={16} /> 核心工作项
                              </h4>
                              {workSummary.themes.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {workSummary.themes.map((theme, i) => (
                                          <div key={i} className="bg-theme-card border border-theme-border/50 rounded-lg p-4">
                                              <h5 className="font-bold text-theme-text text-sm mb-3 flex items-center gap-2">
                                                  <span className="w-2 h-2 rounded-full bg-theme-accent"></span>
                                                  {theme.title}
                                              </h5>
                                              <ul className="space-y-2">
                                                  {theme.actions.map((action, j) => (
                                                      <li key={j} className="text-xs text-theme-subtext flex items-start gap-2 leading-relaxed">
                                                          <span className="mt-1 w-1 h-1 rounded-full bg-theme-subtext/50 shrink-0"></span>
                                                          {action}
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-xs text-theme-subtext italic">暂无归类数据</p>
                              )}
                          </div>
                      </div>

                      {/* 3. Strategy Suggestions */}
                      <div className="bg-theme-accent-bg border border-theme-accent/20 rounded-xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Target size={100} className="text-theme-accent" />
                          </div>
                          <h4 className="text-sm font-bold text-theme-accent mb-4 flex items-center gap-2 uppercase tracking-wider relative z-10">
                              <TrendingUp size={16} /> 下一步策略建议
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                              {workSummary.suggestions.map((s, i) => (
                                  <div key={i} className="bg-theme-card border border-theme-border/50 p-4 rounded-lg shadow-sm flex flex-col gap-2">
                                      <span className="text-xs font-bold text-theme-accent opacity-60">STRATEGY {i+1}</span>
                                      <p className="text-xs md:text-sm font-medium text-theme-text leading-relaxed">{s}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-theme-subtext gap-6">
                      <div className="w-20 h-20 rounded-full bg-theme-input flex items-center justify-center mb-2 shadow-sm">
                         <BarChart3 size={40} className="text-theme-accent opacity-80" />
                      </div>
                      <div className="text-center space-y-2 max-w-xs">
                         <h3 className="text-lg font-bold text-theme-text">准备好复盘了吗？</h3>
                         <p className="text-xs opacity-60">当前选择范围：{getRangeLabel(activeRange)}</p>
                      </div>
                      <button 
                        onClick={() => handleGenerateWorkSummary(activeRange)}
                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-theme-accent text-white font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Sparkles size={18} /> 开始智能复盘
                      </button>
                   </div>
                 )}
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

// Helper Subcomponent for Stats
const StatCard = ({ icon, label, value, subtext, type = 'info' }: any) => {
    const styles: any = {
      success: {
        bg: 'from-emerald-500/10 to-emerald-500/5',
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-500',
        bar: 'bg-emerald-500'
      },
      warning: {
        bg: 'from-orange-500/10 to-orange-500/5',
        border: 'border-orange-500/20',
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-500',
        bar: 'bg-orange-500'
      },
      danger: {
        bg: 'from-red-500/10 to-red-500/5',
        border: 'border-red-500/20',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-500',
        bar: 'bg-red-500'
      },
      info: {
        bg: 'from-blue-500/10 to-blue-500/5',
        border: 'border-blue-500/20',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-500',
        bar: 'bg-blue-500'
      }
    };
  
    const s = styles[type] || styles.info;
  
    return (
      <div className={`relative overflow-hidden rounded-2xl border ${s.border} bg-theme-card shadow-sm hover:shadow-md transition-all duration-300 group`}>
         {/* Gradient Overlay */}
         <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-50`} />
         
         <div className="relative p-5 flex flex-col h-full justify-between">
            <div className="flex items-start justify-between mb-4">
               <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-theme-subtext uppercase tracking-wider opacity-80">{label}</span>
                  <span className={`text-3xl font-black tracking-tight text-theme-text`}>{value}</span>
               </div>
               <div className={`p-2.5 rounded-xl ${s.iconBg} ${s.iconColor} shadow-sm group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(icon, { size: 20, strokeWidth: 2.5 })}
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               {/* Decorative small bar */}
               <div className={`h-1 w-8 rounded-full ${s.bar} opacity-60`} />
               <div className="text-[11px] text-theme-subtext font-medium truncate opacity-70">{subtext}</div>
            </div>
         </div>
      </div>
    )
};

export default CalendarView;
