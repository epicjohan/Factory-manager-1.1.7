import React, { useState } from 'react';
import { StickyNote, Plus, Trash2, User } from '../../icons';
import { QmsFolder, FolderNote } from '../../types';
import { db } from '../../services/storage';
import { generateId } from '../../services/db/core';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface FolderNotesProps {
    folder: QmsFolder;
}



export const FolderNotes: React.FC<FolderNotesProps> = ({ folder }) => {
    const { user } = useAuth();
    const confirm = useConfirm();
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const notes: FolderNote[] = folder.notes || [];

    const handleAdd = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setSaving(true);

        const note: FolderNote = {
            id: generateId(),
            text: trimmed,
            createdBy: user?.name || 'Gebruiker',
            createdAt: new Date().toISOString(),
        };

        const updated: QmsFolder = {
            ...folder,
            notes: [...notes, note],
            updated: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        await db.updateQmsFolder(updated);
        setText('');
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'Notitie verwijderen',
            message: 'Weet je zeker dat je deze notitie wilt verwijderen?',
            confirmLabel: 'Verwijderen',
            danger: true
        });
        if (ok) {
            const updated: QmsFolder = {
                ...folder,
                notes: notes.filter(n => n.id !== id),
                updated: new Date().toISOString().replace('T', ' ').split('.')[0],
            };
            await db.updateQmsFolder(updated);
        }
    };

    return (
        <div className="space-y-4">
            {/* Input Area */}
            <div className="flex gap-2">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={2}
                    placeholder="Voeg een interne notitie of opmerking toe..."
                    className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                />
                <button
                    onClick={handleAdd}
                    disabled={!text.trim() || saving}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-sm disabled:opacity-40 transition-all self-end flex items-center gap-2"
                >
                    <Plus size={14} /> Toevoegen
                </button>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <StickyNote className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={24} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nog geen opmerkingen</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notes.map(note => (
                        <div key={note.id} className="group p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 dark:text-white whitespace-pre-wrap break-words">{note.text}</p>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
                                    <User size={10} /> {note.createdBy}
                                    <span className="opacity-50">•</span>
                                    {new Date(note.createdAt).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(note.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shrink-0 self-start"
                                title="Verwijder notitie"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
