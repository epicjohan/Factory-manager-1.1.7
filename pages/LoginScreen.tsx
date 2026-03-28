import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/storage';
import { Lock, Delete, ArrowRight, CheckCircle2, ShieldAlert, Loader2 } from '../icons';

export const LoginScreen: React.FC = () => {
  const { loginWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const [isServerConfigured, setIsServerConfigured] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await db.getServerSettings();
      setIsServerConfigured(!!config.url);
    };
    loadConfig();
  }, []);

  const performLogin = useCallback(async (finalPin: string) => {
    if (isLoggingIn || lockoutTime > 0) return;
    setIsLoggingIn(true);

    // S-01 + S-07 FIX: Ghost PIN wordt vergeleken in AuthContext via VITE_GHOST_PIN.
    // De lockout-teller is nu van toepassing op ALLE logins, inclusief Ghost Admin.
    const success = await loginWithPin(finalPin);
    if (success) {
        setIsSuccess(true);
        setTimeout(() => setIsLoggingIn(false), 500);
    } else {
        setError(true);
        setPin('');
        setAttempts(prev => {
            const next = prev + 1;
            if (next >= 5) setLockoutTime(30);
            return next;
        });
        setTimeout(() => setError(false), 600);
        setIsLoggingIn(false);
    }
  }, [loginWithPin, isLoggingIn, lockoutTime]);

  useEffect(() => {
    if (lockoutTime > 0) {
        const timer = setInterval(() => setLockoutTime(v => v - 1), 1000);
        return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (lockoutTime > 0 || isSuccess) return;
        
        if (e.key >= '0' && e.key <= '9') {
            setPin(prev => {
                const next = prev.length < 8 ? prev + e.key : prev;
                if (next.length === 4 && next !== '0008') {
                    setTimeout(() => performLogin(next), 50);
                } else if (next.length === 6 && next === '000894') {
                    setTimeout(() => performLogin(next), 50);
                } else if (next.length === 6 && next !== '000894') {
                    setTimeout(() => performLogin(next), 50);
                }
                return next;
            });
        } else if (e.key === 'Backspace') {
            setPin(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter') {
            if (pin.length >= 4) performLogin(pin);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, performLogin, lockoutTime, isSuccess]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none text-left">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)]"></div>
        <div className={`relative z-10 w-full max-w-md p-6 transition-all duration-500 ${isSuccess ? 'scale-90 opacity-0 blur-xl' : 'scale-100'}`}>
            <div className="text-center mb-10">
                <div className={`bg-slate-900 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl transition-transform duration-700 ${isSuccess ? 'rotate-[360deg]' : ''}`}>
                    {isSuccess ? <CheckCircle2 className="text-emerald-500" size={48} /> : <Lock className="text-blue-500" size={40} />}
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Factory Manager</h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${isServerConfigured ? 'bg-teal-500 shadow-[0_0_8px_#14b8a6]' : 'bg-orange-50 shadow-[0_0_8px_#f97316] animate-pulse'}`}></div>
                    <p className="text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase">
                        {isServerConfigured ? 'Cloud Connection Active' : 'Local Preview Mode'}
                    </p>
                </div>
            </div>
            <div className={`bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-300 ${error ? 'animate-shake border-red-500/50' : ''}`}>
                <div className="flex justify-center gap-4 mb-10 h-4 items-center">
                    {[0,1,2,3,4,5].map(i => (
                        <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-blue-50 scale-125 shadow-[0_0_10px_#3b82f6]' : (i < 4 ? 'bg-slate-800' : 'bg-slate-800/30')}`}></div>
                    ))}
                </div>
                {lockoutTime > 0 ? (
                    <div className="py-10 text-center animate-in zoom-in">
                        <ShieldAlert size={48} className="mx-auto text-orange-500 mb-4" />
                        <div className="text-white font-bold uppercase text-sm tracking-widest">Systeem Geblokkeerd</div>
                        <div className="text-slate-500 text-xs mt-1">Wacht {lockoutTime} seconden...</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => {
                                const next = pin + n.toString();
                                setPin(next);
                                if (next.length === 4 && next !== '0008') performLogin(next);
                                else if (next.length === 6) performLogin(next);
                            }} className="h-16 rounded-2xl bg-white/5 text-white text-2xl font-black active:scale-90 transition-all hover:bg-white/10 border border-white/5">{n}</button>
                        ))}
                        <button onClick={() => setPin('')} className="h-16 rounded-2xl bg-white/5 text-slate-500 flex items-center justify-center hover:bg-white/10 border border-white/5"><Delete size={24}/></button>
                        <button onClick={() => {
                            const next = pin + '0';
                            setPin(next);
                            if (next.length === 4 && next !== '0008') performLogin(next);
                            else if (next.length === 6) performLogin(next);
                        }} className="h-16 rounded-2xl bg-white/5 text-white text-2xl font-black hover:bg-white/10 border border-white/5">0</button>
                        <button onClick={() => performLogin(pin)} disabled={isLoggingIn || pin.length < 4} className={`h-16 rounded-2xl flex items-center justify-center transition-all ${pin.length >= 4 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-600'}`}>
                            {isLoggingIn ? <Loader2 className="animate-spin" /> : <ArrowRight size={28}/>}
                        </button>
                    </div>
                )}
            </div>
            {!isServerConfigured && (
                <p className="text-center text-slate-600 text-[10px] mt-6 uppercase tracking-widest">Toets <span className="text-slate-400 font-bold">0000</span> om de preview te starten</p>
            )}
        </div>
    </div>
  );
};