/**
 * F-02: Geëxtraheerd uit SetupDocumentView.tsx
 * Toont de setup workflow status bar met actieknoppen per status.
 * Inclusief de vrijgave-bevestigingsmodal en verplichte-velden-validatie.
 */

import React, { useState } from 'react';
import { SetupStatus, SetupVariant, SetupFieldDefinition } from '../../../types';
import { AlertTriangle, GitBranch, History, Lock, ShieldCheck } from '../../../icons';

interface SetupStatusBarProps {
    setup: SetupVariant;
    canManage: boolean;
    fields?: SetupFieldDefinition[];
    templateData?: Record<string, any>;
    toolFields?: SetupFieldDefinition[];
    onChangeStatus: (status: SetupStatus) => void;
    onRevision: () => void;
}

export const SetupStatusBar: React.FC<SetupStatusBarProps> = ({
    setup, canManage, fields = [], templateData = {}, toolFields = [], onChangeStatus, onRevision
}) => {
    const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    const currentStatus = setup.status || SetupStatus.DRAFT;
    const isDraft = currentStatus === SetupStatus.DRAFT;
    const isReview = currentStatus === SetupStatus.REVIEW;
    const isReleased = currentStatus === SetupStatus.RELEASED;
    const isArchived = currentStatus === SetupStatus.ARCHIVED;

    /** Validate required fields before submitting for review */
    const handleReviewClick = () => {
        const missing: string[] = [];

        // Check fixture/template fields
        for (const field of fields) {
            if (field.required && field.type !== 'header') {
                const val = templateData?.[field.key];
                if (val === undefined || val === null || val === '' || val === false) {
                    missing.push(field.label);
                }
            }
        }

        // Check tool fields across all active tools
        const activeTools = (setup.tools || []).filter(t => t.status !== 'REPLACED');
        for (const tool of activeTools) {
            for (const field of toolFields) {
                if (field.required && field.type !== 'header') {
                    const val = tool.toolData?.[field.key];
                    if (val === undefined || val === null || val === '' || val === false) {
                        missing.push(`T${tool.order}: ${field.label}`);
                    }
                }
            }
        }

        if (missing.length > 0) {
            setMissingFields(missing);
            setShowValidationModal(true);
        } else {
            onChangeStatus(SetupStatus.REVIEW);
        }
    };

    return (
        <>
            <div className={`px-6 py-3 flex items-center justify-between border-b ${isDraft ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900' :
                isReview ? 'bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900' :
                    isReleased ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900' :
                        'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-2xl ${isDraft ? 'bg-orange-100 text-orange-600' :
                        isReview ? 'bg-yellow-100 text-yellow-600' :
                            isReleased ? 'bg-green-100 text-green-600' :
                                'bg-slate-200 text-slate-500'
                        }`}>
                        {isReleased ? <ShieldCheck size={16} /> : isArchived ? <History size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isDraft ? 'text-orange-600' : isReview ? 'text-yellow-600' : isReleased ? 'text-green-600' : 'text-slate-500'
                            }`}>
                            STATUS: {setup.status || 'DRAFT'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                            {isDraft ? 'Gereed voor bewerking' : isReview ? 'Wacht op goedkeuring' : isReleased ? 'Vrijgegeven voor productie' : 'Gearchiveerde versie'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {isDraft && (
                        <button
                            onClick={handleReviewClick}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                        >
                            Ter Review Aanbieden
                        </button>
                    )}

                    {isReview && canManage && (
                        <>
                            <button
                                onClick={() => onChangeStatus(SetupStatus.DRAFT)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Afkeuren
                            </button>
                            <button
                                onClick={() => setShowReleaseConfirm(true)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                            >
                                Goedkeuren &amp; Vrijgeven
                            </button>
                        </>
                    )}

                    {isReleased && (
                        <button
                            onClick={onRevision}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                            <GitBranch size={14} /> Nieuwe Versie
                        </button>
                    )}

                    {isArchived && (
                        <span className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                            Alleen Lezen
                        </span>
                    )}
                </div>
            </div>

            {/* Verplichte Velden Validatie Modal */}
            {showValidationModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-red-50 dark:bg-red-900/20">
                            <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Verplichte Velden</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">De volgende velden moeten nog ingevuld worden</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {missingFields.map((label, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                                        <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                                        <span className="text-sm font-bold text-red-800 dark:text-red-300">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setShowValidationModal(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all"
                            >
                                Begrepen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vrijgave Bevestigingsmodal */}
            {showReleaseConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-green-50 dark:bg-green-900/20">
                            <div className="p-3 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Setup Vrijgeven</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Deze actie kan niet ongedaan worden gemaakt</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Je staat op het punt <span className="text-green-600 dark:text-green-400 font-black">{setup.name}</span> vrij te geven voor productie.
                            </p>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/40">
                                    <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Wat betekent vrijgeven?</span>
                                </div>

                                <div className="divide-y divide-amber-100 dark:divide-amber-900/50">
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <Lock size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Setup wordt vergrendeld</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Alle velden zijn na vrijgave niet meer aanpasbaar.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <GitBranch size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Wijzigingen via nieuwe versie</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Gebruik "Nieuwe Versie" om aanpassingen te maken na vrijgave.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <ShieldCheck size={15} className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">Zichtbaar op de productievloer</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">De vrijgegeven versie is direct beschikbaar voor operators.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setShowReleaseConfirm(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all"
                            >
                                Annuleren
                            </button>
                            <button
                                onClick={() => { onChangeStatus(SetupStatus.RELEASED); setShowReleaseConfirm(false); }}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-sm shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <ShieldCheck size={16} /> Bevestigen &amp; Vrijgeven
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
