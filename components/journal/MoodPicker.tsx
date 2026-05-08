
import React from 'react';
import { JournalEntry } from '../../types';

interface MoodPickerProps {
  currentEntry: JournalEntry;
  onUpdateMeta: (id: string, meta: Partial<JournalEntry>) => void;
  isOpen: boolean;
  onClose: () => void;
  onToggle: (e: React.MouseEvent) => void;
}

const MOODS = ['☁️', '🌞', '🌧️', '☕', '🍷', '🌲', '🌙', '🌊', '😶'];

export const MoodPicker: React.FC<MoodPickerProps> = ({ 
  currentEntry, 
  onUpdateMeta, 
  isOpen, 
  onClose,
  onToggle 
}) => {
  return (
    <div className="relative pb-0.5">
      <button 
          onClick={onToggle}
          className="w-12 h-12 flex items-center justify-center text-4xl hover:scale-110 transition-transform cursor-pointer outline-none"
      >
          {currentEntry.userMood || '😶'}
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur border border-stone-100 shadow-xl rounded-xl p-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200 w-max z-50 ring-1 ring-black/5">
          {MOODS.map(m => (
            <button 
              key={m} 
              onClick={() => { 
                onUpdateMeta(currentEntry.id, { userMood: m }); 
                onClose(); 
              }} 
              className="w-10 h-10 flex items-center justify-center hover:bg-stone-50 rounded-lg text-2xl hover:scale-125 transition-transform"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
