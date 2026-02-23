
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from '../../icons';

interface SearchableSelectProps {
    value: string;
    options: string[];
    onSelect: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    value, 
    options, 
    onSelect, 
    placeholder = 'Selecteer...', 
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sluit dropdown bij klikken buiten component
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus zoekveld bij openen
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const handleSelect = (opt: string) => {
        onSelect(opt);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between bg-slate-50 dark:bg-slate-900 transition-all cursor-pointer ${
                    disabled ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700' : 
                    isOpen ? 'border-blue-500 ring-1 ring-blue-500 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
            >
                <span className={`text-sm font-bold truncate ${value ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                    {value || placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <button onClick={clearSelection} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white"
                                placeholder="Zoek optie..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelect(opt)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        value === opt 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400 italic">Geen opties gevonden</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
