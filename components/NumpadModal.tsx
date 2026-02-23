
import React, { useState, useEffect } from 'react';
import { Check, X } from '../icons';

interface NumpadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (val: number) => void;
    title: string;
    initialValue: number | string;
    unit?: string;
    decimal?: boolean;
}

export const NumpadModal: React.FC<NumpadModalProps> = ({ isOpen, onClose, onConfirm, title, initialValue, unit, decimal = true }) => {
    const [val, setVal] = useState(initialValue.toString());

    useEffect(() => {
        if (isOpen) setVal(initialValue.toString());
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const num = parseFloat(val);
        if (!isNaN(num)) onConfirm(num);
        onClose();
    };

    const handleKey = (num: string) => {
        if (num === '.' && val.includes('.')) return;
        setVal(v => v === '0' && num !== '.' ? num : v + num);
    };

    const handleBackspace = () => {
        setVal(v => v.length > 1 ? v.slice(0, -1) : '0');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-xs text-center">
                <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] mb-4">{title}</h3>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-8 shadow-2xl">
                    <div className="text-5xl font-black font-mono text-white tracking-tighter flex items-baseline justify-center gap-2">
                        {val || '0'}<span className="text-xl opacity-30">{unit}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} onClick={() => handleKey(num.toString())} className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-2xl font-black text-white transition-transform active:scale-90">{num}</button>
                    ))}
                    {decimal ? (
                        <button onClick={() => handleKey('.')} className="h-16 rounded-2xl bg-white/5 text-2xl font-black text-white active:scale-90">.</button>
                    ) : (
                        <div className="h-16"></div>
                    )}
                    <button onClick={() => handleKey('0')} className="h-16 rounded-2xl bg-white/5 text-2xl font-black text-white active:scale-90">0</button>
                    <button onClick={handleBackspace} className="h-16 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center active:scale-90">
                        <X size={24} />
                    </button>
                </div>
                
                <button 
                    onClick={handleConfirm} 
                    className="w-full mt-6 py-5 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 text-xl"
                >
                    <Check size={28} /> BEVESTIGEN
                </button>
                
                <button onClick={onClose} className="mt-8 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Annuleren</button>
            </div>
        </div>
    );
};
