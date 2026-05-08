
import React, { useState, useRef } from "react";
import { MessageSquare, Image as ImageIcon, Copy, Check, Sparkles, Loader2, X, Send } from "lucide-react";
import { matchScript } from "../services/geminiService";
import { ScriptItem } from "../data/scriptLibrary";

const ScriptMatcher: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: string; recommendations: ScriptItem[]; } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            setImagePreview(reader.result as string);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && !selectedImage) return;
    try {
      setIsLoading(true); setResult(null);
      const data = await matchScript(inputText, selectedImage ?? undefined);
      setResult(data);
    } catch (error) { alert("分析失败"); } finally { setIsLoading(false); }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-2 lg:p-0 overflow-hidden text-theme-text">
      {/* Left Input */}
      <div className="flex-1 flex flex-col min-h-0 bg-theme-card/60 backdrop-blur-md rounded-theme border border-theme-border shadow-sm">
        <div className="px-6 py-4 border-b border-theme-border">
          <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare size={20} className="text-theme-accent" /> 商家对话分析</h2>
          <p className="text-xs text-theme-subtext mt-1">粘贴聊天记录或截图，AI 帮你生成回复。</p>
        </div>
        <div className="flex-1 flex flex-col p-4 min-h-0">
          <div className="flex-1 relative rounded-theme-sm bg-theme-input border border-theme-border overflow-hidden focus-within:ring-2 focus-within:ring-theme-accent/20 transition-shadow">
            <textarea
              className="w-full h-full p-4 resize-none outline-none text-[15px] bg-transparent text-theme-text placeholder:text-theme-subtext leading-relaxed"
              placeholder="在此输入..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            {imagePreview && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-theme-sm bg-theme-card border border-theme-border p-2 shadow-sm">
                 <div className="flex items-center gap-3"><img src={imagePreview} className="w-10 h-10 object-cover rounded-theme-sm border border-theme-border" /><span className="text-xs font-medium text-theme-subtext">已添加图片</span></div>
                 <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="p-1 hover:bg-theme-input rounded-full text-theme-subtext"><X size={16} /></button>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-theme-sm text-theme-subtext hover:bg-theme-input hover:text-theme-accent transition-all text-sm font-medium"><ImageIcon size={18} /> 上传截图</button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
            <button onClick={handleSubmit} disabled={isLoading || (!inputText.trim() && !selectedImage)} className={`flex items-center gap-2 px-6 py-2.5 rounded-theme-sm font-medium text-sm shadow-md transition-all ${isLoading || (!inputText.trim() && !selectedImage) ? 'bg-theme-input text-theme-subtext cursor-not-allowed' : 'bg-theme-accent text-white hover:opacity-90 active:scale-95'}`}>
              {isLoading ? <><Loader2 size={16} className="animate-spin" />分析中...</> : <><Sparkles size={16} />生成回复</>}
            </button>
          </div>
        </div>
      </div>

      {/* Right Output */}
      <div className="flex-1 flex flex-col min-h-0 bg-theme-card rounded-theme border border-theme-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme-border bg-theme-input/50">
          <h3 className="text-base font-semibold text-theme-text flex items-center gap-2">AI 建议</h3>
        </div>
        <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-theme-input/20">
          {!result && !isLoading && <div className="flex-1 flex flex-col items-center justify-center text-theme-subtext gap-3"><MessageSquare size={24} className="opacity-20" /><p className="text-sm">等待输入...</p></div>}
          {isLoading && <div className="flex-1 flex flex-col items-center justify-center gap-4 text-theme-subtext"><Loader2 className="animate-spin text-theme-accent" size={32} /><p className="text-sm font-medium">深度分析中...</p></div>}
          {result && !isLoading && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-theme-sm bg-theme-accent-bg border border-theme-border p-4">
                <div className="flex items-center gap-2 mb-3 text-theme-accent text-sm font-bold"><span className="w-2 h-2 rounded-full bg-theme-accent"></span>潜台词分析</div>
                <p className="text-sm leading-relaxed text-theme-text">{result.analysis}</p>
              </div>
              <div className="space-y-4">
                {result.recommendations.map((script, index) => (
                  <div key={index} className="group bg-theme-card rounded-theme-sm border border-theme-border p-4 shadow-sm hover:border-theme-accent transition-all relative">
                      <div className="mb-3"><span className="inline-flex items-center px-2.5 py-1 rounded-theme-sm bg-theme-input text-theme-subtext text-xs font-medium border border-theme-border">{script.scenario || "参考话术"}</span></div>
                      <p className="text-[15px] leading-relaxed text-theme-text whitespace-pre-wrap">{script.content}</p>
                      <div className="mt-3 pt-3 border-t border-theme-border flex justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopy(script.content, index)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-theme-sm text-xs font-medium transition-colors ${copiedIndex === index ? 'text-green-600' : 'bg-theme-input text-theme-subtext hover:bg-theme-card-hover'}`}>
                          {copiedIndex === index ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptMatcher;
