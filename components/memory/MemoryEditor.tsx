import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ImagePlus, Sparkles, Trash2, ArrowUpRight, Download, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { JournalEntry, AIAction } from '../../types';
import { cleanHtml, imageOf, paletteOf, seedOf, textOf } from '../../services/memoryArt';
import { callAI, callAIToGenerateMemory } from '../../services/ai';
import { supabase, isCloudConfigured } from '../../services/supabase';

interface Props { entry: JournalEntry; onUpdate: (id: string, patch: Partial<JournalEntry>) => void; onDelete: (id: string) => void; localOnly: boolean; onBusy: (busy: boolean) => void; }
export function MemoryEditor({ entry, onUpdate, onDelete, localOnly, onBusy }: Props) {
  const editor = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef(entry); latest.current = entry;
  const mounted = useRef(true);
  const [editing, setEditing] = useState(!textOf(entry.content));
  const [uploading, setUploading] = useState(false), [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState(''), [aiSuggestion, setAiSuggestion] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (editor.current && document.activeElement !== editor.current) editor.current.innerHTML = cleanHtml(entry.content);
  }, [entry.content, editing]);
  const saveEditor = () => { if (editor.current) onUpdate(entry.id, { content: cleanHtml(editor.current.innerHTML) }); };
  const command = (name: string) => { editor.current?.focus(); document.execCommand(name); saveEditor(); };
  const addPhoto = async (file: File) => {
    if (uploading) return;
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) { setNotice('请上传 JPG、PNG、WebP、GIF 或 AVIF 图片。'); return; }
    if (file.size > 20 * 1024 * 1024) { setNotice('图片超过 20MB，请先缩小。'); return; }
    setUploading(true); onBusy(true); setNotice('正在处理照片…');
    const id = entry.id;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: .25, maxWidthOrHeight: 1400, useWebWorker: true, fileType: 'image/jpeg' });
      const dataURL = await imageCompression.getDataUrlFromFile(compressed);
      const palette = await paletteOf(compressed).catch(() => undefined);
      const current = latest.current;
      const planet: NonNullable<JournalEntry['planet']> = { version: 1, seed: current.planet?.seed ?? seedOf(id), palette: palette || current.planet?.palette || ['#e5ef70', '#ed8eaa', '#5168cf'], cover: dataURL, material: 'resin' };
      // Persist a portable image before network work; never save a temporary blob: URL.
      const images = [...(current.images || []), dataURL];
      onUpdate(id, { images, planet });
      latest.current = { ...current, images, planet };
      if (!localOnly && isCloudConfigured) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from('journal-photos').upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });
        if (error) { if (mounted.current) setNotice('照片已保留在记录内；独立图片上传失败，记录仍会尝试同步。'); return; }
        const { data } = supabase.storage.from('journal-photos').getPublicUrl(path);
        const now = latest.current;
        // Update by captured entry ID even when the user switches records during upload.
        const patch: Partial<JournalEntry> = { images: (now.images || images).map(src => src === dataURL ? data.publicUrl : src) };
        if (now.planet?.cover === dataURL) patch.planet = { ...now.planet, cover: data.publicUrl };
        onUpdate(id, patch);
      }
      if (mounted.current) setNotice('照片已加入，星球也换上了它的颜色。');
    } catch { if (mounted.current) setNotice('照片处理失败，原有记录未受影响。请换一张或重试。'); }
    finally { if (mounted.current) setUploading(false); onBusy(false); }
  };
  const ai = async (kind: 'memory' | 'continue') => {
    const content = textOf(latest.current.content);
    if (!content) { setNotice('先写一点内容，再邀请 AI。'); return; }
    if (!confirm('将把这篇记录的文字发送给 DeepSeek 处理，不发送照片。继续吗？')) return;
    setAiBusy(true); setNotice(''); const id = entry.id;
    try {
      if (kind === 'memory') {
        const result = await callAIToGenerateMemory(content.slice(0, 16000));
        if (result) onUpdate(id, { memoryResult: result });
        else if (mounted.current) setNotice('AI 暂时没有返回结果，记录已经保留，可以稍后重试。');
      } else {
        const result = await callAI(content.slice(-1200), AIAction.PREDICT);
        if (mounted.current) { setAiSuggestion(result); if (!result) setNotice('AI 暂时不可用，写作和保存不受影响。'); }
      }
    } finally { if (mounted.current) setAiBusy(false); }
  };
  const images = [...new Set([...(entry.images || []), imageOf(entry)].filter(Boolean))] as string[];
  return <section className="memory-editor">
    <div className="editor-heading"><span className="eyebrow">FIELD NOTES / 私人手记</span><div className="segmented"><button className={!editing ? 'selected' : ''} onClick={() => { saveEditor(); setEditing(false); }}>阅读</button><button className={editing ? 'selected' : ''} onClick={() => setEditing(true)}>编辑</button></div></div>
    <input className="memory-title-input" value={entry.title || ''} aria-label="回忆标题" placeholder="给这一天起个名字" onChange={e => onUpdate(entry.id, { title: e.target.value })} maxLength={100} />
    <div className="entry-meta"><time>{new Date(entry.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</time><span>{textOf(entry.content).length} 字</span></div>
    {editing && <div className="editor-toolbar"><button title="粗体" aria-label="粗体" onMouseDown={e => e.preventDefault()} onClick={() => command('bold')}><Bold size={17} /></button><button title="斜体" aria-label="斜体" onMouseDown={e => e.preventDefault()} onClick={() => command('italic')}><Italic size={17} /></button><button title="列表" aria-label="列表" onMouseDown={e => e.preventDefault()} onClick={() => command('insertUnorderedList')}><List size={17} /></button><span /><button onClick={() => fileInput.current?.click()} disabled={uploading}><ImagePlus size={16} /> 添加照片</button></div>}
    {editing ? <div ref={editor} className="memory-prose editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="日记正文" aria-multiline="true" data-placeholder="不用想好怎么写。先留下一句话。" onInput={saveEditor} onBlur={saveEditor} onPaste={e => {
      e.preventDefault(); const file = e.clipboardData.files[0];
      if (file) { void addPhoto(file); return; }
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); saveEditor();
    }} /> : <div className="memory-prose" dangerouslySetInnerHTML={{ __html: cleanHtml(entry.content) || '<p class="muted">这一天，还等着你写下。</p>' }} />}
    <input type="file" ref={fileInput} hidden accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={e => { const f = e.target.files?.[0]; if (f) void addPhoto(f); e.target.value = ''; }} />
    <div className="photo-strip" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) void addPhoto(e.dataTransfer.files[0]); }}>
      {images.map((src, i) => <button key={src} className={`photo-tile ${imageOf(entry) === src ? 'active' : ''}`} title="设为星球照片" onClick={() => onUpdate(entry.id, { planet: { version: 1, seed: seedOf(entry.id), palette: entry.planet?.palette || ['#e5ef70', '#ed8eaa', '#5168cf'], material: 'resin', cover: src } })}><img src={src} alt={`回忆照片 ${i + 1}`} /><span>{imageOf(entry) === src ? '星球封面' : '设为封面'}</span></button>)}
      <button className="photo-add" onClick={() => fileInput.current?.click()} disabled={uploading}><ImagePlus size={23} /><span>{uploading ? '处理中…' : '把照片变成星球'}</span></button>
    </div>
    {imageOf(entry) && <button className="text-button original-link" onClick={() => setShowOriginal(true)}>查看原图 <ArrowUpRight size={14} /></button>}
    <div className="memory-attributes"><label>这一天的心情<select value={entry.userMood || ''} onChange={e => onUpdate(entry.id, { userMood: e.target.value })}><option value="">先不定义</option>{['平静', '开心', '思念', '疲惫', '复杂', '兴奋'].map(m => <option key={m}>{m}</option>)}</select></label><label>记忆里的天气<select value={entry.weather || 'none'} onChange={e => onUpdate(entry.id, { weather: e.target.value as JournalEntry['weather'] })}><option value="none">未记录</option><option value="clear">晴</option><option value="rain">雨</option><option value="cloud">雾与云</option><option value="snow">雪</option></select></label></div>
    <label className="tag-input">回忆标签<input value={entry.tags.join('，')} onChange={e => onUpdate(entry.id, { tags: e.target.value.split(/[,，]/).slice(0, 12) })} placeholder="散步，旅行，生活的小事" /></label>
    <div className="ai-actions"><span><Sparkles size={16} /> 灵感留白</span><button disabled={aiBusy} onClick={() => void ai('memory')}>{aiBusy ? '正在想…' : '提取记忆印记'}</button><button disabled={aiBusy} onClick={() => void ai('continue')}>接着写一句</button></div>
    {aiSuggestion && <div className="ai-note"><p>{aiSuggestion}</p><button onClick={() => { const addition = document.createElement('p'); addition.textContent = aiSuggestion; onUpdate(entry.id, { content: latest.current.content + addition.outerHTML }); setAiSuggestion(''); setEditing(false); }}>留在记录里</button><button onClick={() => setAiSuggestion('')}>不用了</button></div>}
    {entry.memoryResult && <aside className="memory-imprint"><span className="eyebrow">AI 记忆印记</span><blockquote>{entry.memoryResult.quote}</blockquote><div><span>{entry.memoryResult.stampText}</span><span>{entry.memoryResult.keywords.join(' · ')}</span></div></aside>}
    {(entry.aiSummary || entry.aiMood) && <aside className="memory-imprint"><span className="eyebrow">此前留下的 AI 回声</span>{entry.aiSummary && <p>{entry.aiSummary}</p>}{entry.aiMood && <p>{entry.aiMood}</p>}</aside>}
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    <div className="editor-footer"><button className="text-button" onClick={() => onUpdate(entry.id, { isPinned: !entry.isPinned })}>{entry.isPinned ? '取消珍藏' : '珍藏这段回忆'}</button><button className="text-button danger" onClick={() => { if (confirm('删除这段回忆？其他设备同步后也会删除。')) onDelete(entry.id); }}><Trash2 size={14} /> 删除</button></div>
    {showOriginal && <div className="original-overlay" role="dialog" aria-modal="true" aria-label="回忆原图" onClick={() => setShowOriginal(false)} onKeyDown={e => { if (e.key === 'Escape') setShowOriginal(false); }}><button autoFocus aria-label="关闭原图" onClick={() => setShowOriginal(false)}><X /></button><img src={imageOf(entry)} alt="回忆照片原图" /></div>}
  </section>;
}
