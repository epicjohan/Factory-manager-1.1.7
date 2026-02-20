
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, Lock } from 'lucide-react';
import { PredefinedOperation } from '../../../types';

interface MKGCodePickerProps { 
    value: string;
    options: PredefinedOperation[];
    onSelect: (code: string) => void;
    disabled?: boolean;
}

export const MKGCodePicker: React.FC<MKGCodePickerProps> = ({ value, options, onSelect, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return options.filter(o => o.code.toLowerCase().includes(term) || o.name.toLowerCase().includes(term));
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.code === value);

    if (disabled) {
        return (
            <div className="w-full p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between opacity-80">
                <div>
                    <div className="font-mono text-xs font-black text-slate-500">{value || '-'}</div>
                    {selectedOption && <div className="text-[10px] text-slate-400 font-bold uppercase">{selectedOption.name}</div>}
                </div>
                <Lock size={12} className="text-slate-300" />
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-black text-blue-600 text-left flex justify-between items-center transition-all hover:border-blue-500 hover:shadow-sm`}
            >
                <div className="min-w-0">
                    <span className="truncate block">{value || '-- Selecteer Code --'}</span>
                    {selectedOption && <span className="text-[9px] text-slate-400 font-bold uppercase truncate block -mt-0.5">{selectedOption.name}</span>}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] p-3 animate-in zoom-in-95 duration-200 min-w-[280px]">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Zoek code of naam..." 
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none text-xs font-bold dark:text-white"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                        {filtered.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSelect(opt.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full p-3 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col gap-0.5 ${value === opt.code ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' : ''}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="font-mono text-xs font-black text-blue-600">{opt.code}</div>
                                    {opt.operationType === 'PROCESS' && <div className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-black text-slate-500">PROCES</div>}
                                </div>
                                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight italic">{opt.name}</div>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="p-4 text-center text-[10px] text-slate-400 italic">Geen resultaten.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
