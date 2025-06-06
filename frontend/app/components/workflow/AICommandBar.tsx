'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AICommandBarProps {
  onCommand: (command: string) => void;
  isProcessing?: boolean;
}

const AICommandBar: React.FC<AICommandBarProps> = ({ onCommand, isProcessing = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      onCommand(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200">
        <form onSubmit={handleSubmit} className="flex items-center p-2">
          <div className="p-2 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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