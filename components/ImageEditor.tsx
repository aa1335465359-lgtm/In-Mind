
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Loader2, History, X, Trash2, Clock, Sparkles, MoveRight } from 'lucide-react';
import { editImage } from '../services/geminiService';

interface HistoryItem { id: string; timestamp: number; prompt: string; resultUrl: string; }

// Updated Prompts based on user request
const PRESET_PROMPTS = [
    { 
        label: "印花迁移", 
        text: "请将参考图（图二）中的印花图案精准迁移到底图（图一）的服装上。保持底图服装的版型、褶皱、光影及背景完全不变，仅替换印花纹理。" 
    },
    { 
        label: "电商主图 (室内)", 
        text: "生成一张SHEIN风格的电商主图。模特为欧美面孔大码女装模特（1XL尺码），身穿底图中的服装。场景设定在室内阳台或卧室，光线自然明亮，氛围轻松日常。模特佩戴合适的首饰搭配。画面清晰锐利，不要有任何景深虚化（模拟35mm f1.8镜头，但保持全焦清晰）。" 
    },
    { 
        label: "电商主图 (户外)", 
        text: "生成一张SHEIN风格的电商主图。模特为欧美面孔大码女装模特（1XL尺码），身穿底图中的服装。场景设定在街头咖啡厅门口或马路边，氛围时尚自然。模特佩戴合适的首饰搭配。画面清晰锐利，不要有任何景深虚化。" 
    },
    { 
        label: "更改面料", 
        text: "请提取参考图（图二）的面料材质、纹理、质感和纹理走向，严格替换到底图（图一）的服装上。保持底图服装的版型和光影结构不变，仅改变面料材质。" 
    }
];

const ImageEditor: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<(File | null)[]>([null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => { const saved = localStorage.getItem('image_editor_history'); if(saved) setHistory(JSON.parse(saved)); }, []);
  
  const processFile = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        if (!e.target?.result) return;
        const newPreviews = [...previewUrls]; 
        newPreviews[index] = e.target.result as string; 
        setPreviewUrls(newPreviews);
    };
    reader.readAsDataURL(file);
    const newImages = [...selectedImages]; newImages[index] = file; setSelectedImages(newImages);
  };

  const clearImage = (index: number) => {
      const newPreviews = [...previewUrls]; newPreviews[index] = null; setPreviewUrls(newPreviews);
      const newImages = [...selectedImages]; newImages[index] = null; setSelectedImages(newImages);
      
      // Fix for TS18047: Assign ref current to a variable to ensure type safety
      if (index === 0) {
          const input1 = fileInputRef1.current;
          if (input1) input1.value = '';
      }
      if (index === 1) {
          const input2 = fileInputRef2.current;
          if (input2) input2.value = '';
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const validImages = selectedImages.filter((img): img is File => img !== null);
      const result = await editImage(validImages, prompt);
      setResultUrl(result);
      const newItem = { id: Date.now().toString(), timestamp: Date.now(), prompt, resultUrl: result };
      setHistory(prev => [newItem, ...prev].slice(0, 10));
      localStorage.setItem('image_editor_history', JSON.stringify([newItem, ...history].slice(0, 10)));
    } catch (e) { alert("生成失败，请重试"); } finally { setIsLoading(false); }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
              processFile(file, index);
          }
      }
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col md:flex-row text-theme-text bg-transparent">
      
      {/* History Sidebar - Floating Overlay */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-theme-panel/95 backdrop-blur-xl shadow-2xl z-50 transition-transform duration-300 border-l border-theme-border ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
             <h3 className="font-semibold flex items-center gap-2 text-sm text-theme-text"><History size={16} /> 生成历史</h3>
             <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-theme-input rounded-full text-theme-subtext transition-colors"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 h-[calc(100%-60px)]">
             {history.map(item => (
                 <div key={item.id} onClick={() => { setResultUrl(item.resultUrl); setPrompt(item.prompt); setShowHistory(false); }} className="group bg-theme-card border border-theme-border hover:border-theme-accent rounded-lg p-2 cursor-pointer shadow-sm flex gap-3 transition-all hover:scale-[1.02]">
                    <img src={item.resultUrl} className="w-16 h-16 shrink-0 bg-theme-input rounded-md object-cover" />
                    <div className="flex-1 flex flex-col min-w-0">
                       <p className="text-xs font-medium text-theme-text line-clamp-2 mb-auto">{item.prompt}</p>
                       <span className="text-[10px] text-theme-subtext flex items-center gap-1 mt-2 opacity-60"><Clock size={10} />{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                 </div>
             ))}
             {history.length === 0 && <div className="text-center text-theme-subtext text-xs py-10 opacity-60">暂无历史记录</div>}
          </div>
       </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold flex items-center gap-2 text-theme-text tracking-tight"><Sparkles className="text-theme-accent" size={24} /> 改图助手</h2>
             <p className="text-sm text-theme-subtext opacity-80">上传底图和参考图，AI 帮你自动融合设计</p>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all border border-theme-border text-xs font-medium bg-theme-card text-theme-subtext hover:bg-theme-input hover:text-theme-text shadow-sm hover:shadow">
             <History size={14} /> 历史记录
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left Panel: Clean Inputs */}
          <div className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0">
            
            {/* Upload Area: Unified Clean Look */}
            <div className="flex items-stretch gap-4">
                {[0, 1].map((index) => (
                    <div key={index} className="flex-1 flex flex-col gap-2">
                        <label className="text-xs font-bold text-theme-subtext uppercase tracking-wider pl-1">
                            {index === 0 ? "底图 (主图)" : "参考图"}
                        </label>
                        <div 
                            onClick={() => !previewUrls[index] && (index === 0 ? fileInputRef1.current?.click() : fileInputRef2.current?.click())} 
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`
                                relative aspect-[4/5] rounded-2xl border transition-all cursor-pointer overflow-hidden group
                                ${previewUrls[index] 
                                    ? 'border-theme-border bg-theme-card shadow-sm' 
                                    : 'border-dashed border-theme-border bg-theme-input/30 hover:bg-theme-input/60 hover:border-theme-accent/50'
                                }
                            `}
                        >
                             {previewUrls[index] ? (
                                 <>
                                    <img src={previewUrls[index]!} className="w-full h-full object-cover" />
                                    <button onClick={(e) => { e.stopPropagation(); clearImage(index); }} className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 backdrop-blur-sm"><Trash2 size={12} /></button>
                                 </>
                             ) : (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                     <div className="w-10 h-10 rounded-full bg-theme-card flex items-center justify-center mb-2 shadow-sm text-theme-subtext group-hover:scale-110 transition-transform"><Upload size={18} /></div>
                                     <span className="text-xs font-medium text-theme-subtext group-hover:text-theme-text transition-colors">点击上传</span>
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <input type="file" ref={fileInputRef1} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 0)} className="hidden" accept="image/*" />
            <input type="file" ref={fileInputRef2} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 1)} className="hidden" accept="image/*" />

            {/* Prompt Area: Simplified Lines */}
            <div className="flex flex-col gap-3 flex-1 bg-theme-card/30 rounded-2xl p-4 shadow-sm">
                <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGenerate();
                        }
                    }}
                    placeholder="在这里描述你的改图需求..." 
                    className="w-full flex-1 bg-transparent border-none outline-none text-sm text-theme-text placeholder:text-theme-subtext/50 resize-none leading-relaxed min-h-[100px]" 
                />
                
                {/* Presets Row - Removed Top Border for Cleaner Look */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {PRESET_PROMPTS.map((preset, i) => (
                        <button key={i} onClick={() => setPrompt(preset.text)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-theme-input/80 text-theme-subtext hover:bg-theme-accent-bg hover:text-theme-accent transition-colors">
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleGenerate} 
                disabled={isLoading || !prompt.trim()} 
                className={`
                    w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg
                    ${isLoading || !prompt.trim()
                    ? 'bg-theme-input text-theme-subtext cursor-not-allowed opacity-70 shadow-none' 
                    : 'bg-theme-accent text-white hover:brightness-110 hover:shadow-theme-accent/30 active:scale-[0.98]'
                    }
                `}
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {isLoading ? 'AI 正在绘制...' : '立即生成'}
            </button>
          </div>

          {/* Right Panel: Result (Center Stage) */}
          <div className="flex-1 flex flex-col items-center justify-center bg-theme-card/30 rounded-3xl border border-theme-border relative overflow-hidden group min-h-[400px]">
             {resultUrl ? (
               <div className="relative w-full h-full p-4 flex items-center justify-center">
                   <img src={resultUrl} className={`max-w-full max-h-full object-contain rounded-lg shadow-lg transition-all duration-700 ${isLoading ? 'blur-md scale-95 opacity-50' : 'scale-100 opacity-100'}`} />
                   {!isLoading && (
                       <a href={resultUrl} download={`edited-${Date.now()}.png`} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-black px-6 py-2.5 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 z-10 hover:scale-105 transition-transform backdrop-blur-md opacity-0 group-hover:opacity-100"><Download size={14} /> 下载高清图</a>
                   )}
               </div>
             ) : (
               <div className="text-center p-8 opacity-40">
                   <div className={`w-20 h-20 rounded-2xl bg-theme-input flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${isLoading ? 'animate-pulse scale-90' : ''}`}>
                       {isLoading ? <Loader2 size={40} className="animate-spin text-theme-accent" /> : <ImageIcon size={40} className="text-theme-subtext" />}
                   </div>
                   <p className="text-sm font-medium text-theme-subtext">{isLoading ? 'AI 正在施法...' : '效果图将在这里显示'}</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};
export default ImageEditor;
