import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from '../icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

interface ConfirmContextValue {
    confirm: ConfirmFn;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [opts, setOpts] = useState<Required<ConfirmOptions>>({
        title: 'Bevestigen',
        message: 'Weet je het zeker?',
        confirmLabel: 'Bevestigen',
        cancelLabel: 'Annuleren',
        danger: true,
    });

    // Resolve/reject ref so the Promise returned from confirm() settles when user clicks
    const resolveRef = useRef<((val: boolean) => void) | null>(null);

    const confirm: ConfirmFn = useCallback((optionsOrMessage) => {
        const raw = typeof optionsOrMessage === 'string'
            ? { message: optionsOrMessage }
            : optionsOrMessage;

        setOpts({
            title: raw.title ?? 'Bevestigen',
            message: raw.message,
            confirmLabel: raw.confirmLabel ?? 'Bevestigen',
            cancelLabel: raw.cancelLabel ?? 'Annuleren',
            danger: raw.danger ?? true,
        });
        setOpen(true);

        return new Promise<boolean>((res) => {
            resolveRef.current = res;
        });
    }, []);

    const handleConfirm = () => {
        setOpen(false);
        resolveRef.current?.(true);
    };

    const handleCancel = () => {
        setOpen(false);
        resolveRef.current?.(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {open && (
                <div
                    className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-5 pb-0">
                            <div className={`p-3 rounded-2xl ${opts.danger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                                <AlertTriangle size={26} />
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 pt-4">
                            <h3 className="text-base font-black text-slate-800 dark:text-white mb-1.5">{opts.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{opts.message}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl transition-colors"
                            >
                                {opts.cancelLabel}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 px-4 py-3 text-sm font-black text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                                    opts.danger
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                                }`}
                            >
                                {opts.danger && <Trash2 size={14} />}
                                {opts.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useConfirm = (): ConfirmFn => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
    return ctx.confirm;
};
