import React from 'react';
import { JournalEntry } from '../types';

interface StealthLayerProps {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  onContentChange: (text: string) => void;
  onSelect: (id: string) => void;
}

/**
 * Enhanced Stealth Mode: Looks like a structured JSON config file or System Log.
 * Hides functionality inside "comments" or string values.
 */
export const StealthLayer: React.FC<StealthLayerProps> = ({
  entries,
  currentEntry,
  onContentChange,
  onSelect
}) => {
  // Use current timestamp for fake log times
  const time = new Date().toISOString();

  return (
    <div className="w-full h-screen bg-[#1e1e1e] text-[#cccccc] font-mono text-[13px] flex flex-col overflow-hidden leading-relaxed">
      {/* Top Bar - VS Code Style */}
      <div className="h-9 bg-[#3c3c3c] flex items-center justify-between px-3 select-none">
         <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
         </div>
         <div className="text-[#9a9a9a] text-xs">system_kernel_logs.json — Administrator</div>
         <div></div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 bg-[#252526] border-r border-[#1e1e1e] flex flex-col hidden md:flex">
          <div className="px-5 py-3 text-[11px] font-bold text-[#bbbbbb] uppercase tracking-wider">Project Explorer</div>
          <div className="flex-1 overflow-y-auto py-2">
             <div className="px-4 py-1 text-[#cccccc] flex items-center">
                <span className="mr-2 text-[#dcb67f]">📁</span> .config
             </div>
             <div className="px-4 py-1 text-[#cccccc] flex items-center">
                <span className="mr-2 text-[#dcb67f]">📁</span> src
             </div>
             <div className="mt-2 px-4 py-1 text-[11px] font-bold text-[#bbbbbb] uppercase tracking-wider">Logs</div>
             {entries.map((entry) => (
               <div 
                 key={entry.id}
                 onClick={() => onSelect(entry.id)}
                 className={`px-6 py-1 cursor-pointer flex items-center truncate transition-colors ${currentEntry?.id === entry.id ? 'bg-[#37373d] text-white' : 'text-[#858585] hover:text-[#cccccc]'}`}
               >
                 <span className="mr-2 text-[#4ec9b0]">{`{}`}</span>
                 {`err_${entry.id.substring(0, 8)}.log`}
               </div>
             ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
           {/* Tabs */}
           <div className="flex bg-[#252526] h-9">
              <div className="bg-[#1e1e1e] border-t-2 border-[#007acc] px-4 flex items-center text-[#d4d4d4] w-48 justify-between">
                 <span>{currentEntry ? `log_${currentEntry.id.substring(0,6)}.json` : 'Untitled'}</span>
                 <span className="hover:bg-[#333] rounded p-0.5 cursor-pointer">×</span>
              </div>
           </div>
           
           <div className="flex-1 flex overflow-hidden">
             {/* Line Numbers */}
             <div className="w-12 text-right pr-4 pt-4 text-[#858585] select-none leading-6 bg-[#1e1e1e]">
               {Array.from({length: 30}).map((_, i) => <div key={i}>{i+100}</div>)}
             </div>

             {/* Code/Content */}
             <div className="flex-1 p-4 overflow-y-auto font-mono">
               <div className="text-[#6a9955]">
                 // SYSTEM DIAGNOSTIC DUMP <br/>
                 // Generated at: {time}<br/>
                 // Status: WARNING<br/>
                 // Note: Input directly into the data field below to patch system memory.<br/>
               </div>
               <div className="mt-4">
                 <span className="text-[#569cd6]">const</span> <span className="text-[#4ec9b0]">SystemPatch</span> = <span className="text-[#d4d4d4]">{`{`}</span>
               </div>
               
               <div className="pl-4 mt-1">
                 <span className="text-[#9cdcfe]">"timestamp"</span>: <span className="text-[#ce9178]">"{Date.now()}"</span>,
               </div>
               <div className="pl-4 mt-1">
                 <span className="text-[#9cdcfe]">"node_id"</span>: <span className="text-[#b5cea8]">{currentEntry ? `"${currentEntry.id}"` : "null"}</span>,
               </div>
               <div className="pl-4 mt-1 relative">
                 <span className="text-[#9cdcfe]">"payload"</span>: <span className="text-[#ce9178]">"</span>
                 
                 {/* The secret textarea disguised as a string value */}
                 <textarea
                    value={currentEntry?.content || ''}
                    onChange={(e) => onContentChange(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[#ce9178] resize-none font-mono leading-6 block"
                    style={{ minHeight: '60vh' }}
                    spellCheck={false}
                 />
                 
                 <span className="text-[#ce9178]">"</span>,
               </div>

               <div className="text-[#d4d4d4] mt-1">{`};`}</div>
               
               <div className="mt-4 text-[#c586c0]">export default</div> <span className="text-[#4ec9b0]">SystemPatch</span>;
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
