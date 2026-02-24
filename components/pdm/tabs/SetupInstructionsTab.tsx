import React, { useEffect, useRef } from 'react';
import { ClipboardList, Plus, Trash2 } from '../../../icons';
import { ArticleStep } from '../../../types';

interface AutoResizingTextareaProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

const AutoResizingTextarea: React.FC<AutoResizingTextareaProps> = ({ value, onChange, disabled, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            disabled={disabled}
            className={`${className} resize-none overflow-hidden transition-[height] duration-200`}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
        />
    );
};

interface SetupInstructionsTabProps {
    steps: ArticleStep[];
    isLocked: boolean;
    onUpdateSteps: (steps: ArticleStep[]) => void;
    onDeleteStep: (stepId: string) => void;
    onAddStep: () => void;
}

export const SetupInstructionsTab: React.FC<SetupInstructionsTabProps> = ({ 
    steps, isLocked, onUpdateSteps, onDeleteStep, onAddStep 
}) => {
    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center px-2">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic flex items-center gap-2"><ClipboardList size={14} className="text-teal-500" /> Werkinstructies</h4>
                {!isLocked && (
                    <button onClick={onAddStep} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-lg shadow-teal-500/20 transition-all"><Plus size={16}/> Stap Toevoegen</button>
                )}
            </div>
            <div className="space-y-3 pb-10">
                {(steps || []).sort((a, b) => a.order - b.order).map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-5 p-6 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm group/step hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-black text-sm text-slate-400 shrink-0 shadow-inner group-hover/step:text-blue-500 transition-colors self-start">{idx + 1}</div>
                        <div className="flex-1 text-left">
                            <AutoResizingTextarea 
                                disabled={isLocked} 
                                className="w-full bg-transparent border-none outline-none font-bold text-base dark:text-white disabled:opacity-60 p-0 focus:ring-0" 
                                value={step.description} 
                                onChange={val => { 
                                    const ns = steps.map(s => s.id === step.id ? { ...s, description: val } : s); 
                                    onUpdateSteps(ns); 
                                }} 
                                placeholder="Typ instructie..."
                            />
                        </div>
                        {!isLocked && (
                            <button 
                                onClick={() => onDeleteStep(step.id)} 
                                className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] transition-all opacity-0 group-hover/step:opacity-100 self-start"
                            >
                                <Trash2 size={20}/>
                            </button>
                        )}
                    </div>
                ))}
                {steps.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic">Nog geen instructies toegevoegd.</div>
                )}
            </div>
        </div>
    );
};