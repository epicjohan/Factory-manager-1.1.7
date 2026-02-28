
import React, { useState } from 'react';
import { X, MessageSquare, Send } from '../../../icons';
import { ArticleOperation, OperationNote } from '../../../types/pdm';
import { generateId } from '../../../services/db/core';

interface OperationNotesModalProps {
    operation: ArticleOperation;
    currentUser: string;
    onClose: () => void;
    onAddNote: (opId: string, note: OperationNote) => void;
}

export const OperationNotesModal: React.FC<OperationNotesModalProps> = ({
    operation, currentUser, onClose, onAddNote
}) => {
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const sortedNotes = [...(operation.notes || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const handleSubmit = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setSubmitting(true);
        const note: OperationNote = {
            id: generateId(),
            date: new Date().toISOString(),
            user: currentUser,
            text: trimmed,
        };
        onAddNote(operation.id, note);
        setText('');
        setSubmitting(false);
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const formatNoteDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
                + ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 dark:text-white text-base">Notities & Verbeteringen</h2>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {operation.order}. {operation.description || 'Bewerking'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Notes list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {sortedNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                            <MessageSquare size={36} className="mb-3 opacity-30" />
                            <p className="font-bold text-sm">Nog geen notities</p>
                            <p className="text-xs mt-1">Wees de eerste om een verbetering te delen.</p>
                        </div>
                    ) : (
                        sortedNotes.map(note => (
                            <div key={note.id} className="flex gap-3">
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                    {getInitials(note.user)}
                                </div>
                                {/* Bubble */}
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{note.user}</span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{formatNoteDate(note.date)}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input area */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                    <div className="flex gap-3 items-end">
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
                            }}
                            placeholder="Schrijf een verbetering of notitie... (Ctrl+Enter om te plaatsen)"
                            rows={3}
                            className="flex-1 resize-none px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-slate-400"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!text.trim() || submitting}
                            className="p-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all active:scale-95 shrink-0 shadow-md shadow-indigo-500/20"
                            title="Plaatsen (Ctrl+Enter)"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
