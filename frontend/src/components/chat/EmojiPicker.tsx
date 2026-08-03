'use client';
import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiItem {
  char: string;
  name: string;
}

const CATEGORIES: { label: string; emojis: EmojiItem[] }[] = [
  {
    label: 'Smileys',
    emojis: [
      { char: '😀', name: 'grinning face' },
      { char: '😁', name: 'grinning face with big eyes' },
      { char: '😂', name: 'joy tears laughing' },
      { char: '🤣', name: 'rofl rolling on the floor laughing' },
      { char: '😃', name: 'smiley happy' },
      { char: '😄', name: 'smile happy eyes' },
      { char: '😅', name: 'sweat smile nervous' },
      { char: '😆', name: 'laughing squinting' },
      { char: '😊', name: 'blush smile happy' },
      { char: '😋', name: 'yum tongue tasty savoring' },
      { char: '😎', name: 'cool sunglasses' },
      { char: '😍', name: 'heart eyes love' },
      { char: '🥰', name: 'loving smiling face with hearts' },
      { char: '😘', name: 'kiss blow face' },
      { char: '🙂', name: 'slight smile' },
      { char: '🤗', name: 'hug hugging' },
      { char: '😏', name: 'smirk' },
      { char: '😒', name: 'unamused' },
      { char: '😞', name: 'disappointed' },
      { char: '😔', name: 'pensive sad' },
      { char: '😟', name: 'worried' },
      { char: '😢', name: 'cry sad tear' },
      { char: '😭', name: 'sob crying loudly' },
      { char: '😤', name: 'huff triumph steam' },
      { char: '😠', name: 'angry mad' },
      { char: '😡', name: 'rage furious angry red' },
      { char: '🤬', name: 'cursing swearing angry' },
      { char: '🤯', name: 'mind blown exploding head' },
      { char: '😳', name: 'flushed embarrassed' },
      { char: '🥵', name: 'hot sweating' },
      { char: '😱', name: 'scream shocked' },
      { char: '😨', name: 'fearful scared' },
      { char: '😰', name: 'anxious sweat' },
      { char: '🤔', name: 'thinking' },
      { char: '😶', name: 'no mouth speechless' },
      { char: '😐', name: 'neutral' },
      { char: '😑', name: 'expressionless' },
      { char: '😬', name: 'grimace' },
      { char: '🙄', name: 'eye roll' },
      { char: '😯', name: 'hushed surprised' },
      { char: '😮', name: 'open mouth surprised' },
      { char: '😲', name: 'astonished' },
      { char: '🥱', name: 'yawn tired' },
      { char: '😴', name: 'sleeping zzz' },
      { char: '🥳', name: 'party celebrate' },
      { char: '🤩', name: 'star struck excited' },
      { char: '🤠', name: 'cowboy' },
      { char: '😷', name: 'mask sick' },
      { char: '🥴', name: 'woozy dizzy' },
      { char: '😈', name: 'devil smiling imp' },
      { char: '👿', name: 'devil angry imp' },
      { char: '💀', name: 'skull dead' },
      { char: '☠️', name: 'skull and crossbones danger' },
      { char: '🤡', name: 'clown' },
      { char: '👻', name: 'ghost spooky' },
      { char: '💩', name: 'poop' },
      { char: '🤖', name: 'robot' },
      { char: '👾', name: 'alien monster game' },
      { char: '🎭', name: 'masks drama theater' },
    ],
  },
  {
    label: 'Hands',
    emojis: [
      { char: '👋', name: 'wave hello goodbye' },
      { char: '🤚', name: 'raised back hand' },
      { char: '🖐️', name: 'hand fingers splayed' },
      { char: '✋', name: 'raised hand stop' },
      { char: '🖖', name: 'vulcan salute spock' },
      { char: '👌', name: 'ok okay' },
      { char: '🤌', name: 'pinched fingers italian' },
      { char: '🤏', name: 'pinch small little bit' },
      { char: '✌️', name: 'peace victory' },
      { char: '🤞', name: 'fingers crossed luck' },
      { char: '🤟', name: 'love you sign' },
      { char: '🤘', name: 'rock horns metal' },
      { char: '🤙', name: 'call me shaka' },
      { char: '👈', name: 'point left' },
      { char: '👉', name: 'point right' },
      { char: '👆', name: 'point up' },
      { char: '🖕', name: 'middle finger' },
      { char: '👇', name: 'point down' },
      { char: '☝️', name: 'index pointing up' },
      { char: '👍', name: 'thumbs up like good' },
      { char: '👎', name: 'thumbs down dislike bad' },
      { char: '✊', name: 'fist raised' },
      { char: '👊', name: 'fist bump punch' },
      { char: '🤛', name: 'fist left' },
      { char: '🤜', name: 'fist right' },
      { char: '🤝', name: 'handshake deal' },
      { char: '👏', name: 'clap applause' },
      { char: '🙌', name: 'raised hands celebrate' },
      { char: '👐', name: 'open hands' },
      { char: '🤲', name: 'palms up together' },
      { char: '🙏', name: 'pray please thanks' },
      { char: '✍️', name: 'writing hand' },
      { char: '💅', name: 'nail polish' },
      { char: '🦶', name: 'foot' },
      { char: '🦵', name: 'leg' },
      { char: '💪', name: 'muscle strong flex' },
      { char: '🦾', name: 'mechanical arm' },
      { char: '🫶', name: 'heart hands' },
      { char: '🫱', name: 'rightwards hand' },
      { char: '🫲', name: 'leftwards hand' },
    ],
  },
  {
    label: 'Hearts',
    emojis: [
      { char: '❤️', name: 'red heart love' },
      { char: '🧡', name: 'orange heart' },
      { char: '💛', name: 'yellow heart' },
      { char: '💚', name: 'green heart' },
      { char: '💙', name: 'blue heart' },
      { char: '💜', name: 'purple heart' },
      { char: '🖤', name: 'black heart' },
      { char: '🤍', name: 'white heart' },
      { char: '🤎', name: 'brown heart' },
      { char: '💔', name: 'broken heart heartbreak' },
      { char: '❤️‍🔥', name: 'heart on fire' },
      { char: '❤️‍🩹', name: 'mending heart' },
      { char: '💕', name: 'two hearts' },
      { char: '💞', name: 'revolving hearts' },
      { char: '💓', name: 'beating heart' },
      { char: '💗', name: 'growing heart' },
      { char: '💖', name: 'sparkling heart' },
      { char: '💘', name: 'heart with arrow cupid' },
      { char: '💝', name: 'heart with gift' },
      { char: '💟', name: 'heart decoration' },
      { char: '♥️', name: 'heart suit' },
      { char: '🫀', name: 'anatomical heart' },
      { char: '😻', name: 'heart eyes cat' },
      { char: '💑', name: 'couple with heart' },
      { char: '👫', name: 'couple man and woman' },
      { char: '👬', name: 'couple men' },
      { char: '👭', name: 'couple women' },
      { char: '💏', name: 'kiss couple' },
      { char: '💋', name: 'kiss lips' },
      { char: '🌹', name: 'rose flower romance' },
    ],
  },
  {
    label: 'Objects',
    emojis: [
      { char: '🎮', name: 'video game controller' },
      { char: '🕹️', name: 'joystick' },
      { char: '🎯', name: 'dart target bullseye' },
      { char: '🎲', name: 'dice game' },
      { char: '♟️', name: 'chess pawn' },
      { char: '🃏', name: 'joker playing card' },
      { char: '🎰', name: 'slot machine' },
      { char: '🎳', name: 'bowling' },
      { char: '🏆', name: 'trophy win' },
      { char: '🥇', name: 'gold medal first place' },
      { char: '🎵', name: 'music note' },
      { char: '🎶', name: 'music notes' },
      { char: '🎤', name: 'microphone sing' },
      { char: '🎧', name: 'headphones' },
      { char: '🎸', name: 'guitar' },
      { char: '🎹', name: 'piano musical keyboard' },
      { char: '🎺', name: 'trumpet' },
      { char: '🎻', name: 'violin' },
      { char: '🥁', name: 'drum' },
      { char: '🎼', name: 'sheet music score' },
      { char: '📱', name: 'mobile phone' },
      { char: '💻', name: 'laptop computer' },
      { char: '🖥️', name: 'desktop computer' },
      { char: '⌨️', name: 'keyboard' },
      { char: '🖱️', name: 'computer mouse' },
      { char: '📷', name: 'camera photo' },
      { char: '📸', name: 'camera with flash' },
      { char: '📹', name: 'video camera' },
      { char: '🎬', name: 'clapper board movie film' },
      { char: '📺', name: 'television tv' },
      { char: '🔥', name: 'fire lit hot' },
      { char: '💥', name: 'boom collision explosion' },
      { char: '✨', name: 'sparkles' },
      { char: '⭐', name: 'star' },
      { char: '🌟', name: 'glowing star' },
      { char: '💫', name: 'dizzy star' },
      { char: '🌈', name: 'rainbow' },
      { char: '☀️', name: 'sun sunny' },
      { char: '🌙', name: 'crescent moon' },
      { char: '⚡', name: 'lightning bolt zap' },
    ],
  },
  {
    label: 'Symbols',
    emojis: [
      { char: '✅', name: 'check mark yes' },
      { char: '❌', name: 'cross mark x no' },
      { char: '⭕', name: 'heavy large circle' },
      { char: '🔴', name: 'red circle' },
      { char: '🟠', name: 'orange circle' },
      { char: '🟡', name: 'yellow circle' },
      { char: '🟢', name: 'green circle' },
      { char: '🔵', name: 'blue circle' },
      { char: '🟣', name: 'purple circle' },
      { char: '⚫', name: 'black circle' },
      { char: '⚪', name: 'white circle' },
      { char: '🔶', name: 'large orange diamond' },
      { char: '🔷', name: 'large blue diamond' },
      { char: '🔸', name: 'small orange diamond' },
      { char: '🔹', name: 'small blue diamond' },
      { char: '🔺', name: 'red triangle up' },
      { char: '🔻', name: 'red triangle down' },
      { char: '💠', name: 'diamond with a dot' },
      { char: '🔘', name: 'radio button' },
      { char: '🔲', name: 'black square button' },
      { char: '🔳', name: 'white square button' },
      { char: '▪️', name: 'black small square' },
      { char: '▫️', name: 'white small square' },
      { char: '◾', name: 'black medium small square' },
      { char: '◽', name: 'white medium small square' },
      { char: '◼️', name: 'black medium square' },
      { char: '◻️', name: 'white medium square' },
      { char: '⬛', name: 'black large square' },
      { char: '⬜', name: 'white large square' },
      { char: '🟥', name: 'red square' },
      { char: '💯', name: 'hundred points perfect' },
      { char: '❗', name: 'exclamation mark' },
      { char: '❓', name: 'question mark' },
      { char: '‼️', name: 'double exclamation mark' },
      { char: '⁉️', name: 'exclamation question mark interrobang' },
      { char: '🚨', name: 'siren alert police' },
      { char: '⚠️', name: 'warning' },
      { char: '🔞', name: 'no one under eighteen' },
      { char: '🆘', name: 'sos help' },
      { char: '🆕', name: 'new' },
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

  const query = search.trim().toLowerCase();
  const displayEmojis = query
    ? allEmojis.filter(e => e.name.includes(query))
    : CATEGORIES[activeTab]?.emojis ?? [];

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
      {!query && (
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
          {displayEmojis.map((item, i) => (
            <button
              key={`${item.char}-${i}`}
              onClick={() => onSelect(item.char)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#2A2D35] rounded transition-colors"
              title={item.name}
            >
              {item.char}
            </button>
          ))}
        </div>
        {query && displayEmojis.length === 0 && (
          <p className="font-mono text-[10px] text-[#525566] text-center py-4">No emojis found</p>
        )}
      </div>
    </div>
  );
}
