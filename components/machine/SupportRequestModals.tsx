
import React, { useState, useEffect } from 'react';
import { SupportType } from '../../types';
import { Box, Recycle, Droplet, Container, X, RefreshCw, Clock } from 'lucide-react';

interface SupportRequestModalsProps {
    activeType: SupportType | null;
    onClose: () => void;
    onSubmit: (type: SupportType, extraData: any) => void;
}

export const SupportRequestModals: React.FC<SupportRequestModalsProps> = ({ activeType, onClose, onSubmit }) => {
    // Form States
    const [materialOrderNumber, setMaterialOrderNumber] = useState('');
    const [materialLocation, setMaterialLocation] = useState('');
    const [materialDesiredTime, setMaterialDesiredTime] = useState('');
    const [materialUrgency, setMaterialUrgency] = useState<'NORMAL' | 'HIGH'>('NORMAL');

    const [swarfMaterial, setSwarfMaterial] = useState('');
    const [customSwarfMaterial, setCustomSwarfMaterial] = useState('');
    const [swarfUrgency, setSwarfUrgency] = useState<'NORMAL' | 'HIGH'>('NORMAL');

    const [oilUrgency, setOilUrgency] = useState<'NORMAL' | 'HIGH'>('NORMAL');
    const [binUrgency, setBinUrgency] = useState<'NORMAL' | 'HIGH'>('NORMAL');

    // Flexible text field for "When" on Swarf and Bins
    const [commonDesiredTime, setCommonDesiredTime] = useState('');

    // Reset states when type changes
    useEffect(() => {
        if (activeType === SupportType.MATERIAL) {
            setMaterialOrderNumber(''); setMaterialLocation(''); setMaterialDesiredTime(''); setMaterialUrgency('NORMAL');
        } else if (activeType === SupportType.SWARF) {
            setSwarfMaterial(''); setCustomSwarfMaterial(''); setSwarfUrgency('NORMAL'); setCommonDesiredTime('');
        } else if (activeType === SupportType.COOLANT) {
            setOilUrgency('NORMAL'); setCommonDesiredTime('');
        } else if (activeType === SupportType.EMPTY_BIN || activeType === SupportType.BIN_EXCHANGE) {
            setBinUrgency('NORMAL'); setCommonDesiredTime('');
        }
    }, [activeType]);

    if (!activeType) return null;

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeType === SupportType.MATERIAL) {
            onSubmit(SupportType.MATERIAL, { 
                message: materialOrderNumber, 
                location: materialLocation, 
                desiredTime: materialDesiredTime, 
                urgency: materialUrgency 
            });
        } else if (activeType === SupportType.SWARF) {
            const finalMaterial = swarfMaterial === 'Anders' ? customSwarfMaterial : swarfMaterial;
            onSubmit(SupportType.SWARF, { 
                contentMaterial: finalMaterial, 
                urgency: swarfUrgency,
                desiredTime: commonDesiredTime
            });
        } else if (activeType === SupportType.COOLANT) {
            onSubmit(SupportType.COOLANT, { 
                urgency: oilUrgency,
                desiredTime: commonDesiredTime
            });
        } else if (activeType === SupportType.EMPTY_BIN) {
            onSubmit(SupportType.EMPTY_BIN, { 
                urgency: binUrgency,
                desiredTime: commonDesiredTime
            });
        } else if (activeType === SupportType.BIN_EXCHANGE) {
            onSubmit(SupportType.BIN_EXCHANGE, { 
                urgency: binUrgency,
                desiredTime: commonDesiredTime
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tighter italic">
                        {activeType === SupportType.MATERIAL && <><Box className="text-purple-600" size={24} /> Materiaal Aanvraag</>}
                        {activeType === SupportType.SWARF && <><Recycle className="text-orange-600" size={24} /> Spanenbak Vol</>}
                        {activeType === SupportType.COOLANT && <><Droplet className="text-blue-600" size={24} /> Leibaan Olie</>}
                        {activeType === SupportType.EMPTY_BIN && <><Container className="text-teal-600" size={24} /> Extra Lege Bak</>}
                        {activeType === SupportType.BIN_EXCHANGE && <><RefreshCw className="text-teal-600" size={24} /> Bak Wissel</>}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                    {activeType === SupportType.MATERIAL && (
                        <>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Order / Project Nr</label><input required type="text" className="w-full p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold focus:border-blue-500 outline-none transition-colors" value={materialOrderNumber} onChange={e => setMaterialOrderNumber(e.target.value)} placeholder="Bijv. 2024-500" /></div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Locatie (Optioneel)</label><input type="text" className="w-full p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold focus:border-blue-500 outline-none transition-colors" value={materialLocation} onChange={e => setMaterialLocation(e.target.value)} placeholder="Bijv. Palletplek A" /></div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Gewenste Tijd</label><input type="time" className="w-full p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold focus:border-blue-500 outline-none transition-colors" value={materialDesiredTime} onChange={e => setMaterialDesiredTime(e.target.value)} /></div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Urgentie</label><div className="flex gap-2"><button type="button" onClick={() => setMaterialUrgency('NORMAL')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${materialUrgency === 'NORMAL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>Normaal</button><button type="button" onClick={() => setMaterialUrgency('HIGH')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${materialUrgency === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>SPOED</button></div></div>
                        </>
                    )}

                    {activeType === SupportType.SWARF && (
                        <>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Materiaal (Inhoud)</label><select required className="w-full p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold outline-none focus:border-blue-500 transition-colors" value={swarfMaterial} onChange={e => setSwarfMaterial(e.target.value)}><option value="">-- Kies Materiaal --</option><option value="Staal (Algemeen)">Staal (Algemeen)</option><option value="RVS 304/316">RVS 304/316</option><option value="Aluminium">Aluminium</option><option value="Messing">Messing</option><option value="Kunststof">Kunststof</option><option value="Anders">Overig / Anders...</option></select></div>
                            {swarfMaterial === 'Anders' && (<div className="animate-in slide-in-from-top-2 duration-200"><label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Specificeer Materiaal</label><input required type="text" className="w-full p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold focus:border-blue-500 outline-none transition-colors" value={customSwarfMaterial} onChange={e => setCustomSwarfMaterial(e.target.value)} placeholder="Bijv. Inconel 718" /></div>)}
                            <div className="animate-in slide-in-from-top-2 space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Wanneer nodig?</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold outline-none focus:border-blue-500 transition-colors" 
                                        value={commonDesiredTime} 
                                        onChange={e => setCommonDesiredTime(e.target.value)} 
                                        placeholder="Bijv: over 15 min..." 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Urgentie</label><div className="flex gap-2"><button type="button" onClick={() => setSwarfUrgency('NORMAL')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${swarfUrgency === 'NORMAL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>Normaal</button><button type="button" onClick={() => setSwarfUrgency('HIGH')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${swarfUrgency === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>SPOED</button></div></div>
                        </>
                    )}

                    {activeType === SupportType.COOLANT && (
                        <>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-inner">Vraag om bijvulling van leibaan olie of smeermiddel voor de machine-ondersteuning.</p>
                            <div className="animate-in slide-in-from-top-2 space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Wanneer nodig?</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold outline-none focus:border-blue-500 transition-colors" 
                                        value={commonDesiredTime} 
                                        onChange={e => setCommonDesiredTime(e.target.value)} 
                                        placeholder="Bijv: voor de pauze..." 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Urgentie</label><div className="flex gap-2"><button type="button" onClick={() => setOilUrgency('NORMAL')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${oilUrgency === 'NORMAL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>Normaal</button><button type="button" onClick={() => setOilUrgency('HIGH')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${oilUrgency === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>SPOED</button></div></div>
                        </>
                    )}

                    {(activeType === SupportType.EMPTY_BIN || activeType === SupportType.BIN_EXCHANGE) && (
                        <>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-teal-50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-800 shadow-inner">
                                {activeType === SupportType.EMPTY_BIN ? 'Vraag een extra opvangbak aan voor gereed product.' : 'Meld een volle bak en vraag om een lege (wissel).'}
                            </p>
                            <div className="animate-in slide-in-from-top-2 space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Wanneer nodig?</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 p-3 rounded-xl border-2 border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm font-bold outline-none focus:border-blue-500 transition-colors" 
                                        value={commonDesiredTime} 
                                        onChange={e => setCommonDesiredTime(e.target.value)} 
                                        placeholder="Bijv: over 15 min..." 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1"><label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Urgentie</label><div className="flex gap-2"><button type="button" onClick={() => setBinUrgency('NORMAL')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${binUrgency === 'NORMAL' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>Normaal</button><button type="button" onClick={() => setBinUrgency('HIGH')} className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${binUrgency === 'HIGH' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-200'}`}>SPOED</button></div></div>
                        </>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Annuleren</button>
                        <button type="submit" className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)] ${activeType === SupportType.MATERIAL ? 'bg-purple-600 hover:bg-purple-500' : activeType === SupportType.SWARF ? 'bg-orange-500 hover:bg-orange-400' : activeType === SupportType.COOLANT ? 'bg-blue-600 hover:bg-blue-500' : 'bg-teal-600 hover:bg-teal-500'}`}>Versturen</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
