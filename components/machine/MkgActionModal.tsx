/**
 * MkgActionModal — Herbruikbare modal voor het starten of gereedmelden van MKG bewerkingen.
 * Wordt gebruikt vanuit MkgPlanningWidget en JobSection.
 */

import React, { useState } from 'react';
import { CheckCircle2, Play, Loader2, X } from 'lucide-react';
import { MkgPlnbRecord } from '../../types';
import { mkgCapaciteitService } from '../../services/mkg/mkgCapaciteitService';
import { db } from '../../services/storage';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface MkgActionModalProps {
    isOpen: boolean;
    type: 'start' | 'gereed';
    record: MkgPlnbRecord;
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const MkgActionModal: React.FC<MkgActionModalProps> = ({
    isOpen, type, record, onClose, onSuccess
}) => {
    const [aantal, setAantal] = useState(record.plnb_aantal);
    const [markeerGereed, setMarkeerGereed] = useState(type === 'gereed');
    const [gebruikerNaam, setGebruikerNaam] = useState(localStorage.getItem('fm_operator_naam') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const srv = await db.getServerSettings();
            const pbUrl = srv.url || window.location.origin;
            let result;
            if (type === 'start') {
                result = await mkgCapaciteitService.startBewerking(pbUrl, record, gebruikerNaam || undefined);
            } else {
                result = await mkgCapaciteitService.gereedmeldBewerking(pbUrl, record, aantal, markeerGereed, gebruikerNaam || undefined);
            }
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
             onClick={() => !loading && onClose()}>
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`px-8 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between ${
                    type === 'start'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                            type === 'start'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : 'bg-blue-100 dark:bg-blue-900/40'
                        }`}>
                            {type === 'start'
                                ? <Play size={20} className="text-emerald-600 dark:text-emerald-400" />
                                : <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
                            }
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                {type === 'start' ? 'Bewerking Starten' : 'Bewerking Gereedmelden'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Wordt direct doorgevoerd in MKG
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => !loading && onClose()}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        disabled={loading}
                    >
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-5">
                    {/* Order info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Order nr</p>
                            <p className="text-lg font-black font-mono text-slate-800 dark:text-white">{record.prdh_num}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Artikel</p>
                            <p className="text-sm font-bold font-mono text-slate-600 dark:text-slate-300">{record.arti_code || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bewerking</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{record.plnb_oms || `Bew. ${record.bwrk_num}`}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Omschrijving</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 truncate" title={record.arti_oms1}>{record.arti_oms1 || '—'}</p>
                        </div>
                    </div>

                    {/* Aantal invoer (alleen bij gereedmelden) */}
                    {type === 'gereed' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                                Aantal gereed
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min={0}
                                    max={record.plnb_aantal * 2}
                                    value={aantal}
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setAantal(val);
                                        setMarkeerGereed(val >= record.plnb_aantal);
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center"
                                />
                                <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                    van {record.plnb_aantal}
                                </span>
                            </div>
                            {record.plnb_aantal_grd > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    Reeds gereed gemeld: <span className="font-bold text-emerald-500">{record.plnb_aantal_grd}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Gereed checkbox */}
                    {type === 'gereed' && (
                        <div
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                                markeerGereed
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700'
                            }`}
                            onClick={() => setMarkeerGereed(prev => !prev)}
                        >
                            <input
                                type="checkbox"
                                checked={markeerGereed}
                                readOnly
                                className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${
                                    markeerGereed
                                        ? 'text-emerald-700 dark:text-emerald-300'
                                        : 'text-amber-700 dark:text-amber-300'
                                }`}>
                                    Bewerking gereed melden
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {markeerGereed
                                        ? 'De bewerking wordt als afgerond gemarkeerd in MKG.'
                                        : 'Alleen het aantal wordt bijgewerkt — de bewerking blijft open.'
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Operator naam */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">
                            Uitgevoerd door
                        </label>
                        <input
                            type="text"
                            placeholder="Naam operator..."
                            value={gebruikerNaam}
                            onChange={e => {
                                setGebruikerNaam(e.target.value);
                                localStorage.setItem('fm_operator_naam', e.target.value);
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Wordt gelogd in de productieorder memo intern.</p>
                    </div>

                    {/* Start info */}
                    {type === 'start' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                <span className="font-bold">Startdatum:</span> {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Aantal stuks: <span className="font-bold">{record.plnb_aantal}</span>
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3">
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                                {error.includes('422')
                                    ? 'MKG meldt dat deze bewerking niet bijgewerkt kan worden (HTTP 422). Mogelijk is de bewerking al gereedgemeld in MKG.'
                                    : error.includes('<!doctype') || error.includes('<html')
                                        ? error.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 200)
                                        : error
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Annuleren
                    </button>
                    <button
                        disabled={loading}
                        onClick={handleSubmit}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white rounded-xl transition-colors shadow-sm ${
                            type === 'start'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        } disabled:opacity-50`}
                    >
                        {loading ? (
                            <><Loader2 size={14} className="animate-spin" /> Verwerken...</>
                        ) : type === 'start' ? (
                            <><Play size={14} /> Bewerking Starten</>
                        ) : (
                            <><CheckCircle2 size={14} /> Gereedmelden</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
