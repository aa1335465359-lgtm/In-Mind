import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ImagePlus, Sparkles, Trash2, ArrowUpRight, X } from 'lucide-react';
import { JournalEntry, AIAction } from '../../types';
import { cleanHtml, imageOf, paletteOf, seedOf, textOf } from '../../services/memoryArt';
import { callAI, callAIToGenerateMemory } from '../../services/ai';

interface Props {
  entry: JournalEntry;
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  localOnly: boolean;
  onBusy: (busy: boolean) => void;
}

export function MemoryEditor({ entry, onUpdate, onDelete, localOnly, onBusy }: Props) {
  const editor = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef(entry); latest.current = entry;
  const mounted = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingHtml = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false), [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState(''), [aiSuggestion, setAiSuggestion] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [aiOpen, setAiOpen] = useState(Boolean(entry.memoryResult || entry.aiSummary || entry.aiMood));

  useEffect(() => {
    mounted.current = true;
    requestAnimationFrame(() => {
      const node = editor.current;
      if (!node) return;
      node.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(node); range.collapse(false);
      selection.removeAllRanges(); selection.addRange(range);
    });
    return () => {
      mounted.current = false;
      clearTimeout(saveTimer.current);
      if (pendingHtml.current !== null) onUpdate(entry.id, { content: pendingHtml.current });
    };
  }, [entry.id]);

  useEffect(() => {
    if (editor.current && document.activeElement !== editor.current) editor.current.innerHTML = cleanHtml(entry.content);
  }, [entry.content]);

  const commitEditor = (immediate = false) => {
    if (!editor.current) return;
    const html = cleanHtml(editor.current.innerHTML);
    if (html === latest.current.content && pendingHtml.current === null) return;
    pendingHtml.current = html;
    clearTimeout(saveTimer.current);
    const commit = () => {
      const content = pendingHtml.current;
      if (content === null) return;
      pendingHtml.current = null;
      latest.current = { ...latest.current, content };
      onUpdate(entry.id, { content });
    };
    if (immediate) commit(); else saveTimer.current = setTimeout(commit, 280);
  };

  const command = (name: string) => {
    editor.current?.focus();
    document.execCommand(name);
    commitEditor();
  };

  const addPhoto = async (file: File) => {
    if (uploading) return;
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) { setNotice('请上传 JPG、PNG、WebP、GIF 或 AVIF 图片。'); return; }
    if (file.size > 20 * 1024 * 1024) { setNotice('图片超过 20MB，请先缩小。'); return; }
    setUploading(true); onBusy(true); setNotice('正在处理照片…');
    const id = entry.id;
    try {
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(file, { maxSizeMB: .25, maxWidthOrHeight: 1400, useWebWorker: true, fileType: 'image/jpeg' });
      const dataURL = await imageCompression.getDataUrlFromFile(compressed);
      const palette = await paletteOf(compressed).catch(() => undefined);
      const current = latest.current;
      const planet: NonNullable<JournalEntry['planet']> = {
        version: 1,
        seed: current.planet?.seed ?? seedOf(id),
        palette: palette || current.planet?.palette || ['#e5ef70', '#ed8eaa', '#5168cf'],
        cover: dataURL,
        material: 'resin',
        atmosphere: current.planet?.atmosphere,
      };
      const images = [...(current.images || []), dataURL];
      onUpdate(id, { images, planet });
      latest.current = { ...current, images, planet };
      if (!localOnly) {
        const { supabase, isCloudConfigured } = await import('../../services/supabase');
        if (isCloudConfigured) {
          const path = `${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage.from('journal-photos').upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });
          if (error) { if (mounted.current) setNotice('照片已保留在记录内；独立图片上传失败。'); return; }
          const { data } = supabase.storage.from('journal-photos').getPublicUrl(path);
          const now = latest.current;
          const patch: Partial<JournalEntry> = { images: (now.images || images).map(src => src === dataURL ? data.publicUrl : src) };
          if (now.planet?.cover === dataURL) patch.planet = { ...now.planet, cover: data.publicUrl };
          onUpdate(id, patch);
        }
      }
      if (mounted.current) setNotice('照片已加入。');
    } catch {
      if (mounted.current) setNotice('照片处理失败，请换一张或重试。');
    } finally {
      if (mounted.current) setUploading(false);
      onBusy(false);
    }
  };

  const ai = async (kind: 'memory' | 'continue') => {
    const content = textOf(latest.current.content);
    if (!content) { setNotice('先写一点内容，再邀请 AI。'); return; }
    if (!confirm('将把这篇记录的文字发送给 DeepSeek 处理，不发送照片。继续吗？')) return;
    setAiBusy(true); setNotice('');
    const id = entry.id;
    try {
      if (kind === 'memory') {
        const result = await callAIToGenerateMemory(content.slice(0, 16000));
        if (result) onUpdate(id, { memoryResult: result });
        else if (mounted.current) setNotice('AI 暂时没有返回结果，记录已经保留。');
      } else {
        const result = await callAI(content.slice(-1200), AIAction.PREDICT);
        if (mounted.current) { setAiSuggestion(result); if (!result) setNotice('AI 暂时不可用，写作和保存不受影响。'); }
      }
    } finally {
      if (mounted.current) setAiBusy(false);
    }
  };

  const images = [...new Set([...(entry.images || []), imageOf(entry)].filter(Boolean))] as string[];
  return <section className="memory-editor">
    <input className="memory-title-input" value={entry.title || ''} aria-label="回忆标题" placeholder="给这一天起个名字" onChange={event => onUpdate(entry.id, { title: event.target.value })} maxLength={100} />
    <div className="entry-meta">
      <time>{new Date(entry.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</time>
      <span>{textOf(entry.content).length} 字</span>
    </div>
    <div className="editor-toolbar" aria-label="写作工具">
      <button title="粗体" aria-label="粗体" onMouseDown={event => event.preventDefault()} onClick={() => command('bold')}><Bold size={16} /></button>
      <button title="斜体" aria-label="斜体" onMouseDown={event => event.preventDefault()} onClick={() => command('italic')}><Italic size={16} /></button>
      <button title="列表" aria-label="列表" onMouseDown={event => event.preventDefault()} onClick={() => command('insertUnorderedList')}><List size={16} /></button>
      <span />
      <button onClick={() => fileInput.current?.click()} disabled={uploading}><ImagePlus size={16} /> {uploading ? '处理中' : '照片'}</button>
    </div>
    <div
      ref={editor}
      className="memory-prose editable"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="日记正文"
      aria-multiline="true"
      data-placeholder="从此刻开始写……"
      onInput={() => commitEditor()}
      onBlur={() => commitEditor(true)}
      onPaste={event => {
        event.preventDefault();
        const file = event.clipboardData.files[0];
        if (file) { void addPhoto(file); return; }
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
        commitEditor();
      }}
    />
    <input type="file" ref={fileInput} hidden accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={event => { const file = event.target.files?.[0]; if (file) void addPhoto(file); event.target.value = ''; }} />

    {(images.length > 0 || uploading) && <div className="photo-strip" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (event.dataTransfer.files[0]) void addPhoto(event.dataTransfer.files[0]); }}>
      {images.map((src, index) => <button key={src} className={`photo-tile ${imageOf(entry) === src ? 'active' : ''}`} title="设为星球照片" onClick={() => onUpdate(entry.id, { planet: { version: 1, seed: entry.planet?.seed ?? seedOf(entry.id), palette: entry.planet?.palette || ['#e5ef70', '#ed8eaa', '#5168cf'], material: 'resin', cover: src, atmosphere: entry.planet?.atmosphere } })}>
        <img src={src} alt={`回忆照片 ${index + 1}`} />
        <span>{imageOf(entry) === src ? '星球封面' : '设为封面'}</span>
      </button>)}
      <button className="photo-add" onClick={() => fileInput.current?.click()} disabled={uploading}><ImagePlus size={22} /><span>{uploading ? '处理中…' : '继续添加'}</span></button>
    </div>}
    {imageOf(entry) && <button className="text-button original-link" onClick={() => setShowOriginal(true)}>查看原图 <ArrowUpRight size={14} /></button>}

    <details className="editor-drawer">
      <summary>补充这一天</summary>
      <div className="memory-attributes">
        <label>心情<select value={entry.userMood || ''} onChange={event => onUpdate(entry.id, { userMood: event.target.value })}><option value="">先不定义</option>{['平静', '开心', '思念', '疲惫', '复杂', '兴奋'].map(mood => <option key={mood}>{mood}</option>)}</select></label>
        <label>天气<select value={entry.weather || 'none'} onChange={event => onUpdate(entry.id, { weather: event.target.value as JournalEntry['weather'] })}><option value="none">未记录</option><option value="clear">晴</option><option value="rain">雨</option><option value="cloud">雾与云</option><option value="snow">雪</option></select></label>
        <label>背景<select value={entry.planet?.atmosphere || ''} onChange={event => onUpdate(entry.id, { planet: { version: 1, seed: entry.planet?.seed ?? seedOf(entry.id), palette: entry.planet?.palette || ['#e5ef70', '#ed8eaa', '#5168cf'], material: entry.planet?.material || 'resin', cover: entry.planet?.cover, atmosphere: (event.target.value || undefined) as NonNullable<JournalEntry['planet']>['atmosphere'] } })}><option value="">自动</option><option value="ocean">海面</option><option value="sky">蓝天</option><option value="aurora">极光</option><option value="stars">星空</option><option value="cosmos">宇宙</option><option value="clouds">白云与雾</option><option value="rain">雨夜</option></select></label>
      </div>
      <label className="tag-input">标签<input value={entry.tags.join('，')} onChange={event => onUpdate(entry.id, { tags: event.target.value.split(/[,，]/).slice(0, 12) })} placeholder="散步，旅行，生活的小事" /></label>
    </details>

    <details className="editor-drawer ai-drawer" open={aiOpen} onToggle={event => setAiOpen(event.currentTarget.open)}>
      <summary><Sparkles size={14} /> AI 回声</summary>
      <div className="ai-actions"><button disabled={aiBusy} onClick={() => void ai('memory')}>{aiBusy ? '正在想…' : '提取记忆印记'}</button><button disabled={aiBusy} onClick={() => void ai('continue')}>接着写一句</button></div>
      {aiSuggestion && <div className="ai-note"><p>{aiSuggestion}</p><button onClick={() => { const addition = document.createElement('p'); addition.textContent = aiSuggestion; onUpdate(entry.id, { content: latest.current.content + addition.outerHTML }); setAiSuggestion(''); }}>留在记录里</button><button onClick={() => setAiSuggestion('')}>不用了</button></div>}
      {entry.memoryResult && <aside className="memory-imprint"><span className="eyebrow">AI 记忆印记</span><blockquote>{entry.memoryResult.quote}</blockquote><div><span>{entry.memoryResult.stampText}</span><span>{entry.memoryResult.keywords.join(' · ')}</span></div></aside>}
      {(entry.aiSummary || entry.aiMood) && <aside className="memory-imprint">{entry.aiSummary && <p>{entry.aiSummary}</p>}{entry.aiMood && <p>{entry.aiMood}</p>}</aside>}
    </details>

    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <div className="editor-footer"><button className="text-button" onClick={() => onUpdate(entry.id, { isPinned: !entry.isPinned })}>{entry.isPinned ? '取消珍藏' : '珍藏'}</button><button className="text-button danger" onClick={() => { if (confirm('删除这段回忆？其他设备同步后也会删除。')) onDelete(entry.id); }}><Trash2 size={14} /> 删除</button></div>
    {showOriginal && <div className="original-overlay" role="dialog" aria-modal="true" aria-label="回忆原图" onClick={() => setShowOriginal(false)} onKeyDown={event => { if (event.key === 'Escape') setShowOriginal(false); }}><button autoFocus aria-label="关闭原图" onClick={() => setShowOriginal(false)}><X /></button><img src={imageOf(entry)} alt="回忆照片原图" /></div>}
  </section>;
}
