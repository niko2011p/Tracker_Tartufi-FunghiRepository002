import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  accentColor?: 'green' | 'blue' | 'amber' | 'red';
  showSearchButton?: boolean;
  className?: string;
  maxHistory?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Cerca...",
  value,
  onChange,
  onSearch,
  accentColor = "green",
  showSearchButton = false,
  className = "",
  maxHistory = 5
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Get color classes based on accentColor
  const getColorClasses = () => {
    switch (accentColor) {
      case 'blue':
        return {
          ring: 'ring-blue-500 border-blue-500',
          text: 'text-blue-500',
          button: 'bg-blue-500 hover:bg-blue-600'
        };
      case 'amber':
        return {
          ring: 'ring-amber-500 border-amber-500',
          text: 'text-amber-500',
          button: 'bg-amber-500 hover:bg-amber-600'
        };
      case 'red':
        return {
          ring: 'ring-red-500 border-red-500',
          text: 'text-red-500',
          button: 'bg-red-500 hover:bg-red-600'
        };
      case 'green':
      default:
        return {
          ring: 'ring-green-500 border-green-500',
          text: 'text-green-500',
          button: 'bg-green-500 hover:bg-green-600'
        };
    }
  };
  
  const colorClasses = getColorClasses();
  
  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('searchHistory');
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, []);
  
  // Save search history to localStorage
  const saveToHistory = (query: string) => {
    if (!query.trim()) return;
    
    try {
      // Don't add duplicates, move to top if exists
      const newHistory = [
        query,
        ...searchHistory.filter(item => item !== query)
      ].slice(0, maxHistory);
      
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
      saveToHistory(value);
      setShowHistory(false);
    }
    if (e.key === 'Escape') {
      setShowHistory(false);
    }
  };
  
  const handleHistoryItemClick = (item: string) => {
    onChange(item);
    setShowHistory(false);
    if (onSearch) {
      setTimeout(() => onSearch(), 100);
    }
  };
  
  const handleSearchButtonClick = () => {
    if (onSearch) {
      onSearch();
      saveToHistory(value);
      setShowHistory(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${colorClasses.ring} transition-all shadow-sm hover:shadow bg-white text-gray-800`}
            aria-label={placeholder}
          />
          <Search 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isFocused ? colorClasses.text : 'text-gray-400'} transition-colors`} 
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {showSearchButton && onSearch && (
          <button
            onClick={handleSearchButtonClick}
            className={`px-4 py-3 ${colorClasses.button} text-white rounded-lg hover:opacity-90 active:opacity-100 transition-colors duration-300 flex items-center justify-center gap-2 font-medium shadow-sm whitespace-nowrap`}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Cerca</span>
          </button>
        )}
      </div>
      
      {/* Search history dropdown */}
      {isFocused && searchHistory.length > 0 && (
        <div className="absolute mt-1 w-full bg-white border rounded-lg shadow-lg z-50 overflow-hidden max-h-60">
          <div className="p-2 text-sm text-gray-500 border-b flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span>Ricerche recenti</span>
          </div>
          <ul>
            {searchHistory.map((item, index) => (
              <li 
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between text-gray-700"
                onClick={() => handleHistoryItemClick(item)}
              >
                <span className="truncate">{item}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar; 