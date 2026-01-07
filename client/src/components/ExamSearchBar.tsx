import { useState } from 'react';
import { Search } from 'lucide-react';

interface ExamSearchBarProps {
  onSearch?: (examCode: string) => void;
  darkMode?: boolean;
}

export default function ExamSearchBar({ onSearch, darkMode = false }: ExamSearchBarProps) {
  const [examCode, setExamCode] = useState('');

  const handleSearch = () => {
    // Buscar si hay código (sin validación de formato específico)
    if (examCode.trim()) {
      if (onSearch) {
        onSearch(examCode.trim());
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="absolute top-6 right-8 z-20">
      <div className={`backdrop-blur-md rounded-lg shadow-lg border px-2 py-2 flex items-center gap-2 hover:shadow-xl transition-all duration-300 ${
        darkMode 
          ? 'bg-slate-800/95 border-slate-700' 
          : 'bg-white/95 border-white/20'
      }`}>
        <Search className={`w-4 h-4 ml-3 transition-colors duration-300 ${
          darkMode ? 'text-gray-400' : 'text-gray-400'
        }`} />
        <input
          type="text"
          value={examCode}
          onChange={(e) => setExamCode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Clave de examen"
          className={`w-48 px-2 py-1 bg-transparent text-sm outline-none transition-colors duration-300 ${
            darkMode 
              ? 'text-white placeholder:text-gray-400' 
              : 'text-gray-900 placeholder:text-gray-400'
          }`}
        />
        
        <button
          type="button"
          onClick={handleSearch}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all hover:shadow-md hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
              : 'bg-gradient-to-r from-[#003876] to-[#00508f] text-white'
          }`}
        >
          Buscar
        </button>
      </div>
    </div>
  );
}