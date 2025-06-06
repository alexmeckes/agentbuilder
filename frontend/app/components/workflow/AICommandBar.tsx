'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, History } from 'lucide-react';

interface AICommandBarProps {
  onCommand: (command: string) => void;
  isProcessing?: boolean;
}

const AICommandBar: React.FC<AICommandBarProps> = ({ onCommand, isProcessing = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    // Load history from session storage on mount
    const savedHistory = sessionStorage.getItem('aiCommandHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveHistory = (newHistory: string[]) => {
    setHistory(newHistory);
    sessionStorage.setItem('aiCommandHistory', JSON.stringify(newHistory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (trimmedInput && !isProcessing) {
      onCommand(trimmedInput);

      // Add to history and save
      const newHistory = [trimmedInput, ...history.filter(h => h !== trimmedInput)].slice(0, 5); // Keep last 5 unique commands
      saveHistory(newHistory);

      setInputValue('');
      setHistoryIndex(-1);
    }
  };

  const handleHistoryNavigation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        setInputValue(newIndex === -1 ? '' : history[newIndex]);
      }
    }
  };


  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-2">
        
        {/* Chat History */}
        {history.length > 0 && (
          <div className="px-2 pt-2 pb-1 border-b border-slate-200">
             <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <History className="w-3 h-3" />
                <span>Recent Commands</span>
             </div>
             <div className="space-y-1 max-h-24 overflow-y-auto">
                {history.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => setInputValue(item)}
                        className="w-full text-left text-xs text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                        {item}
                    </button>
                ))}
             </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center pt-1">
          <div className="p-2 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleHistoryNavigation}
            placeholder="Describe the change you want to make... (e.g., 'Rename Agent 1 to Research Agent')"
            className="w-full h-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputValue.trim()}
            className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-all"
            aria-label="Submit AI command"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AICommandBar; 