'use client';
import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: [
      '😀','😁','😂','🤣','😃','😄','😅','😆','😊','😋',
      '😎','😍','🥰','😘','🙂','🤗','😏','😒','😞','😔',
      '😟','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵',
      '😱','😨','😰','🤔','😶','😐','😑','😬','🙄','😯',
      '😮','😲','🥱','😴','😵','🥳','🤩','🤠','😷','🥴',
      '😈','👿','💀','☠️','🤡','👻','💩','🤖','👾','🎭',
    ],
  },
  {
    label: 'Hands',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
      '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','🤝','👏','🙌','👐','🤲',
      '🙏','✍️','💅','🦶','🦵','💪','🦾','🫶','🫱','🫲',
    ],
  },
  {
    label: 'Hearts',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟',
      '♥️','🫀','😻','💑','👫','👬','👭','💏','💋','🌹',
    ],
  },
  {
    label: 'Objects',
    emojis: [
      '🎮','🕹️','🎯','🎲','♟️','🃏','🎰','🎳','🏆','🥇',
      '🎵','🎶','🎤','🎧','🎸','🎹','🎺','🎻','🥁','🎼',
      '📱','💻','🖥️','⌨️','🖱️','📷','📸','📹','🎬','📺',
      '🔥','💥','✨','⭐','🌟','💫','🌈','☀️','🌙','⚡',
    ],
  },
  {
    label: 'Symbols',
    emojis: [
      '✅','❌','⭕','🔴','🟠','🟡','🟢','🔵','🟣','⚫',
      '⚪','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲',
      '🔳','▪️','▫️','◾','◽','◼️','◻️','⬛','⬜','🟥',
      '💯','❗','❓','‼️','⁉️','🚨','⚠️','🔞','🆘','🆕',
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const allEmojis = CATEGORIES.flatMap(c => c.emojis);

  // Very basic search — just show a flat list of all emojis when search is active
  const displayEmojis = search ? allEmojis : CATEGORIES[activeTab]?.emojis ?? [];

  return (
    <div
      ref={containerRef}
      className="bg-[#1A1D24] border border-[#2A2D35] w-72 max-h-80 flex flex-col overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
    >
      {/* Search */}
      <div className="p-2 border-b border-[#2A2D35] flex-shrink-0 relative">
        <Search size={11} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#525566]" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className="w-full bg-[#13151A] border border-[#2A2D35] pl-6 pr-2 py-1.5 text-xs text-[#E8EAF0] placeholder-[#525566] outline-none focus:border-[#FF4655]/40"
        />
      </div>

      {/* Category tabs (hidden during search) */}
      {!search && (
        <div className="flex border-b border-[#2A2D35] flex-shrink-0 overflow-x-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === i
                  ? 'text-[#FF4655] border-b-2 border-[#FF4655]'
                  : 'text-[#525566] hover:text-[#8B90A8]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {displayEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#2A2D35] rounded transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        {search && displayEmojis.length === 0 && (
          <p className="font-mono text-[10px] text-[#525566] text-center py-4">No emojis found</p>
        )}
      </div>
    </div>
  );
}
