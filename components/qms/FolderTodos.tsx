import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, User, MessageSquare } from '../../icons';
import { QmsFolder, FolderTodo } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmModal } from './ConfirmModal';

interface FolderTodosProps {
    folder: QmsFolder;
}

const generateId = () => `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const ResultBadge: React.FC<{ done: boolean }> = ({ done }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
        done
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
    }`}>
        {done ? 'Afgerond' : 'Open'}
    </span>
);

export const FolderTodos: React.FC<FolderTodosProps> = ({ folder }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const todos: FolderTodo[] = folder.todos || [];

    const saveFolder = async (updatedTodos: FolderTodo[]) => {
        const updated: QmsFolder = {
            ...folder,
            todos: updatedTodos,
            updated: new Date().toISOString().replace('T', ' ').split('.')[0],
        };
        await db.updateQmsFolder(updated);
    };

    const handleAdd = async () => {
        const trimmed = title.trim();
        if (!trimmed) return;
        setSaving(true);

        const todo: FolderTodo = {
            id: generateId(),
            title: trimmed,
            description: description.trim() || undefined,
            done: false,
            createdAt: new Date().toISOString(),
        };

        await saveFolder([...todos, todo]);
        setTitle('');
        setDescription('');
        setShowForm(false);
        setSaving(false);
    };

    const handleToggleDone = async (id: string) => {
        const updatedTodos = todos.map(t => {
            if (t.id !== id) return t;
            const nowDone = !t.done;
            return {
                ...t,
                done: nowDone,
                doneBy: nowDone ? (user?.name || 'Gebruiker') : undefined,
                doneAt: nowDone ? new Date().toISOString() : undefined,
            };
        });
        await saveFolder(updatedTodos);
    };

    const handleUpdateComments = async (id: string, comments: string) => {
        const updatedTodos = todos.map(t =>
            t.id === id ? { ...t, comments } : t
        );
        await saveFolder(updatedTodos);
    };

    const handleDelete = async (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        await saveFolder(todos.filter(t => t.id !== pendingDeleteId));
        setPendingDeleteId(null);
    };

    const open = todos.filter(t => !t.done);
    const done = todos.filter(t => t.done);

    return (
        <div className="space-y-4">
            {/* Add Button */}
            <div className="flex justify-between items-center">
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                    <span className="text-orange-600">{open.length} Open</span>
                    <span className="text-emerald-600">{done.length} Afgerond</span>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                    <Plus size={14} /> Actiepunt toevoegen
                </button>
            </div>

            {/* New Todo Form */}
            {showForm && (
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <input
                        autoFocus
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Omschrijving van het verbeterpunt..."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Extra toelichting (optioneel)..."
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                        >
                            Annuleren
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!title.trim() || saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-sm disabled:opacity-40 transition-all flex items-center gap-2"
                        >
                            <Plus size={14} /> Toevoegen
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {todos.length === 0 && !showForm && (
                <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <CheckSquare className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={24} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nog geen actiepunten</p>
                </div>
            )}

            {/* Todo Items */}
            {todos.length > 0 && (
                <div className="space-y-2">
                    {[...open, ...done].map(todo => (
                        <div
                            key={todo.id}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                                todo.done
                                    ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                        >
                            {/* Todo Header Row */}
                            <div className="flex items-center gap-3 p-3">
                                {/* Checkbox */}
                                <button
                                    onClick={() => handleToggleDone(todo.id)}
                                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                        todo.done
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                    }`}
                                    title={todo.done ? 'Heropenen' : 'Markeer als afgerond'}
                                >
                                    {todo.done && (
                                        <svg viewBox="0 0 12 12" className="w-3 h-3 fill-white">
                                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                {/* Title & badges */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-bold truncate ${todo.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                                            {todo.title}
                                        </span>
                                        <ResultBadge done={todo.done} />
                                    </div>
                                    {todo.done && todo.doneBy && (
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                            <User size={10} /> {todo.doneBy}
                                            {todo.doneAt && (
                                                <span className="opacity-70 ml-1">
                                                    {new Date(todo.doneAt).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Expand & Delete buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => setExpandedId(expandedId === todo.id ? null : todo.id)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Opmerkingen / details"
                                    >
                                        <MessageSquare size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(todo.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Verwijderen"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded: description + comments */}
                            {expandedId === todo.id && (
                                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                    {todo.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                            {todo.description}
                                        </p>
                                    )}
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-1.5">
                                            <MessageSquare size={10} className="inline mr-1" />
                                            Opmerkingen
                                        </label>
                                        <CommentsEditor
                                            initialValue={todo.comments || ''}
                                            onSave={(val) => handleUpdateComments(todo.id, val)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {pendingDeleteId && (
                <ConfirmModal
                    title="Actiepunt verwijderen"
                    message="Weet je zeker dat je dit actiepunt definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDeleteId(null)}
                />
            )}
        </div>
    );
};

// Inline comment editor with auto-save on blur
const CommentsEditor: React.FC<{ initialValue: string; onSave: (val: string) => void }> = ({ initialValue, onSave }) => {
    const [value, setValue] = useState(initialValue);

    const handleBlur = () => {
        if (value !== initialValue) onSave(value);
    };

    return (
        <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            placeholder="Voeg hier je opmerkingen bij dit actiepunt toe..."
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
    );
};
