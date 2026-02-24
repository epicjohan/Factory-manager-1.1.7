import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  X, 
  Monitor, 
  ShieldCheck, 
  Droplet, 
  Wrench, 
  Package, 
  BarChart2, 
  Wifi, 
  Activity, 
  Printer,
  ChevronDown,
  Database,
  Play,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Zap,
  Gauge
} from '../icons';
import { APP_INFO } from '../services/appInfo';

export const Showcase: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [hideUI, setHideUI] = useState(false);

  // --- SIMULATION STATE ---

  // 1. THE PULSE (Live Data)
  const [pulseLoad, setPulseLoad] = useState(65);
  const [pulseRpm, setPulseRpm] = useState(12000);

  // 2. TOOLGUARD (Process Security)
  const [toolCycles, setToolCycles] = useState(480);
  const [toolLoad, setToolLoad] = useState(22);
  const [toolStatus, setToolStatus] = useState<'OK' | 'WARNING' | 'BROKEN'>('OK');

  // 3. FLUID INTELLIGENCE (Coolant)
  const [brix, setBrix] = useState(7.0);
  const [fluidStatus, setFluidStatus] = useState<'OK' | 'LOW' | 'HIGH'>('OK');

  // 4. SMART MAINTENANCE (Tickets)
  const [ticketStep, setTicketStep] = useState(0); // 0=None, 1=Open, 2=Busy, 3=Done

  // 5. THE WAREHOUSE (Inventory)
  const [stockCount, setStockCount] = useState(5);
  const [stockAlert, setStockAlert] = useState(false);

  // 6. BOTTOM LINE (Energy/Cost)
  const [energyCost, setEnergyCost] = useState(0.35); // Euro/kWh

  // --- LOOPS & LOGIC ---

  useEffect(() => {
      // Pulse Effect
      const interval = setInterval(() => {
          setPulseLoad(prev => Math.max(10, Math.min(95, prev + (Math.random() - 0.5) * 15)));
          setPulseRpm(prev => Math.max(0, Math.min(15000, prev + (Math.random() - 0.5) * 100)));
      }, 500);
      return () => clearInterval(interval);
  }, []);

  const handlePrint = () => {
      setHideUI(true);
      setTimeout(() => window.print(), 500);
  };

  // ToolGuard Logic
  const simulateCut = () => {
      if (toolStatus === 'BROKEN') return;
      const newCycles = toolCycles + 1;
      setToolCycles(newCycles);
      // Simulate load spike
      const spike = 22 + Math.random() * 10 + (newCycles > 490 ? 20 : 0); 
      setToolLoad(spike);
      
      if (newCycles >= 500) {
          setToolStatus('WARNING');
      }
      if (spike > 45) {
          setToolStatus('BROKEN');
      }
      setTimeout(() => setToolLoad(22), 500); // Return to idle
  };
  const resetTool = () => { setToolCycles(480); setToolStatus('OK'); setToolLoad(22); };

  // Fluid Logic
  const updateFluid = (delta: number) => {
      setBrix(prev => {
          const newVal = parseFloat((prev + delta).toFixed(1));
          if (newVal < 5.0) setFluidStatus('LOW');
          else if (newVal > 9.0) setFluidStatus('HIGH');
          else setFluidStatus('OK');
          return newVal;
      });
  };

  // Warehouse Logic
  const consumePart = () => {
      if (stockCount > 0) {
          const newCount = stockCount - 1;
          setStockCount(newCount);
          if (newCount <= 2) setStockAlert(true);
      }
  };
  const restock = () => { setStockCount(10); setStockAlert(false); };

  const Chapter = ({ title, subtitle, icon: Icon, color, children, reversed }: any) => (
      <section className={`py-24 px-6 md:px-12 flex flex-col lg:flex-row ${reversed ? 'lg:flex-row-reverse' : ''} items-center gap-12 lg:gap-24 min-h-[70vh] break-inside-avoid print:py-10 print:min-h-0`}>
          <div className="flex-1 space-y-6 animate-in slide-in-from-bottom-8 duration-700">
              <div className={`inline-flex p-4 rounded-2xl ${color} text-white shadow-xl mb-4 print:text-black print:bg-transparent print:p-0 print:shadow-none`}>
                  <Icon size={40} />
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none print:text-3xl">
                  {title}
              </h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg print:text-sm print:text-slate-700">
                  {subtitle}
              </p>
              
              <div className="flex flex-wrap gap-3 pt-4 print:hidden">
                  <div className="h-1 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
          </div>

          <div className="flex-1 w-full max-w-xl">
              <div className={`rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 relative overflow-hidden shadow-2xl print:shadow-none print:border-2 print:rounded-[2rem]`}>
                  {children}
                  <div className={`absolute top-0 right-0 p-32 ${color.replace('bg-', 'bg-')} opacity-5 blur-[80px] rounded-full pointer-events-none`}></div>
              </div>
          </div>
      </section>
  );

  return (
    <div className={`bg-slate-50 dark:bg-black min-h-screen transition-colors duration-500 font-sans ${hideUI ? 'cursor-none' : ''} print:bg-white`}>
      
      {/* GLOBAL PRINT STYLES */}
      <style>{`
        @media print {
            @page { margin: 0; size: auto; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
            .no-print { display: none !important; }
            .print-break { break-before: page; }
            .dark .bg-black { background-color: white !important; color: black !important; }
            .text-white { color: black !important; }
        }
      `}</style>

      {/* UI CONTROLS */}
      {!hideUI && (
          <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
              <button onClick={toggleTheme} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-slate-500 hover:text-white hover:bg-white/20 transition-all">
                  {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button onClick={handlePrint} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-slate-500 hover:text-white hover:bg-white/20 transition-all">
                  <Printer size={20} />
              </button>
              <button onClick={() => setHideUI(true)} className="px-6 py-3 bg-blue-600 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-500 shadow-lg transition-all flex items-center gap-2">
                  <Monitor size={16} /> Presentatie
              </button>
              <button onClick={() => navigate('/admin')} className="p-3 bg-red-500/10 backdrop-blur-md rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all">
                  <X size={20} />
              </button>
          </div>
      )}

      {hideUI && (
          <div className="fixed top-6 right-6 z-50 no-print opacity-0 hover:opacity-100 transition-opacity">
              <button onClick={() => setHideUI(false)} className="px-6 py-3 bg-black/50 text-white rounded-full font-bold backdrop-blur-md">
                  Exit
              </button>
          </div>
      )}

      {/* HERO */}
      <header className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-6 overflow-hidden bg-slate-900 text-white print:min-h-[50vh] print:py-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.8),rgba(2,6,23,1)),url('https://images.unsplash.com/photo-1565514020176-88339088e0ba?q=80&w=2970&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
          
          <div className="relative z-10 space-y-8 animate-in zoom-in duration-1000 max-w-4xl">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-white/10 bg-white/5 text-slate-300 font-mono text-xs uppercase tracking-[0.3em] backdrop-blur-md">
                  <Zap size={14} className="text-yellow-400" /> Factory Manager v{APP_INFO.VERSION}
              </div>
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none">
                  INDUSTRIAL <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse">POWERHOUSE</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
                  Van de trilling in de spindel tot de factuur in de boekhouding. <br/>
                  <strong className="text-white">Volledige controle over uw productieproces.</strong>
              </p>
          </div>

          <div className="absolute bottom-10 animate-bounce no-print opacity-50">
              <ChevronDown size={32} />
          </div>
      </header>

      {/* 1. THE PULSE */}
      <Chapter 
          title="The Pulse" 
          subtitle="Real-time hartslag van uw machinepark. Geen vertraging, directe data via FOCAS & MTConnect."
          icon={Wifi}
          color="bg-blue-600"
      >
          <div className="flex flex-col gap-6 relative z-10">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-sm">CNC-01 ONLINE</span>
                  </div>
                  <Wifi size={20} className="text-slate-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                      <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Spindle Load</div>
                      <div className="text-4xl font-black text-slate-900 dark:text-white font-mono">{Math.round(pulseLoad)}%</div>
                      <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pulseLoad}%` }}></div>
                      </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                      <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Speed (RPM)</div>
                      <div className="text-4xl font-black text-slate-900 dark:text-white font-mono">{Math.round(pulseRpm)}</div>
                      <div className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(pulseRpm/15000)*100}%` }}></div>
                      </div>
                  </div>
              </div>

              <div className="p-4 bg-slate-900 text-green-400 font-mono text-xs rounded-[2rem] border border-slate-800">
                  <span className="text-slate-500">{'>'}</span> STREAM_ACTIVE: 12ms latency...
              </div>
          </div>
      </Chapter>

      {/* 2. TOOLGUARD */}
      <Chapter 
          title="ToolGuard" 
          subtitle="Voorkom breuk en uitval. ToolGuard bewaakt uw gereedschap en stopt de machine vóórdat het misgaat."
          icon={ShieldCheck}
          color="bg-purple-600"
          reversed
      >
          <div className="flex flex-col gap-6 relative z-10">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Tool T12</div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Hardfrees Ø12</div>
                      </div>
                      <div className={`px-3 py-1 rounded-2xl text-xs font-black uppercase ${toolStatus === 'OK' ? 'bg-green-100 text-green-700' : toolStatus === 'WARNING' ? 'bg-orange-100 text-orange-700' : 'bg-red-600 text-white animate-pulse'}`}>
                          {toolStatus}
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between text-xs font-bold mb-1 dark:text-slate-300">
                              <span>Levensduur (Cycli)</span>
                              <span>{toolCycles} / 500</span>
                          </div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${toolCycles > 490 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${(toolCycles/500)*100}%` }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-xs font-bold mb-1 dark:text-slate-300">
                              <span>Load Monitor (Piek)</span>
                              <span>{Math.round(toolLoad)}% (Max 45%)</span>
                          </div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-100 ${toolLoad > 40 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${(toolLoad/50)*100}%` }}></div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex gap-3">
                  <button onClick={simulateCut} disabled={toolStatus === 'BROKEN'} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-[2rem] shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50">
                      <Play size={16} className="inline mr-2" /> Simuleer Snede
                  </button>
                  <button onClick={resetTool} className="px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-[2rem] transition-all">
                      <RefreshCw size={16} />
                  </button>
              </div>
          </div>
      </Chapter>

      {/* 3. FLUID INTELLIGENCE */}
      <Chapter 
          title="Fluid Intel" 
          subtitle="Optimale condities voor uw product. Beheer koelvloeistof concentratie en voorkom bacteriegroei datagedreven."
          icon={Droplet}
          color="bg-cyan-500"
      >
          <div className="flex flex-col gap-6 relative z-10 text-center">
              <div className="w-48 h-48 mx-auto rounded-full border-8 border-slate-100 dark:border-slate-800 flex items-center justify-center relative bg-white dark:bg-slate-900 shadow-xl">
                  <div className="z-10">
                      <div className="text-5xl font-black text-slate-800 dark:text-white tabular-nums">{brix.toFixed(1)}</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">% BRIX</div>
                  </div>
                  {/* Fluid Wave Animation */}
                  <div className={`absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-1000 opacity-20 ${fluidStatus === 'OK' ? 'bg-cyan-500 h-1/2' : fluidStatus === 'LOW' ? 'bg-red-500 h-1/3' : 'bg-orange-500 h-3/4'}`}></div>
              </div>

              {fluidStatus !== 'OK' && (
                  <div className={`p-4 rounded-[2rem] font-bold text-sm animate-in zoom-in ${fluidStatus === 'LOW' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      <AlertTriangle size={16} className="inline mr-2 -mt-1" />
                      {fluidStatus === 'LOW' ? 'Concentratie te LAAG. Voeg olie toe.' : 'Concentratie te HOOG. Voeg water toe.'}
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => updateFluid(-0.5)} className="py-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold rounded-[2rem] border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                      + Water
                  </button>
                  <button onClick={() => updateFluid(0.5)} className="py-4 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300 font-bold rounded-[2rem] border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors">
                      + Olie
                  </button>
              </div>
          </div>
      </Chapter>

      {/* 4. SMART MAINTENANCE */}
      <Chapter 
          title="Smart Tickets" 
          subtitle="Van storing naar oplossing in recordtijd. De technische dienst heeft alle info, foto's en historie direct op zak."
          icon={Wrench}
          color="bg-orange-500"
          reversed
      >
          <div className="flex flex-col gap-6 relative z-10">
              <div className={`p-6 rounded-2xl border-l-8 shadow-xl transition-all duration-500 ${ticketStep === 0 ? 'bg-slate-100 border-slate-400' : ticketStep === 1 ? 'bg-red-50 border-red-500' : ticketStep === 2 ? 'bg-blue-50 border-blue-500' : 'bg-green-50 border-green-500'}`}>
                  <div className="flex justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ticket #8821</span>
                      <span className="text-[10px] font-bold uppercase">{new Date().toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {ticketStep === 0 ? 'Geen actieve storingen' : 'Hydrauliek Lekkage Hoofdpomp'}
                  </h3>
                  {ticketStep > 0 && <p className="text-sm text-slate-600 mb-4">Olie zichtbaar onder machine. Druk valt weg bij klemmen.</p>}
                  
                  {ticketStep === 2 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full w-fit">
                          <Activity size={14} className="animate-spin" /> In behandeling door J. Jansen
                      </div>
                  )}
                  {ticketStep === 3 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full w-fit">
                          <CheckCircle size={14} /> Opgelost & Gesloten
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setTicketStep(1)} disabled={ticketStep !== 0} className="p-3 bg-red-600 text-white rounded-[2rem] font-bold text-xs hover:bg-red-700 disabled:opacity-20 transition-all">
                      1. Meld Storing
                  </button>
                  <button onClick={() => setTicketStep(2)} disabled={ticketStep !== 1} className="p-3 bg-blue-600 text-white rounded-[2rem] font-bold text-xs hover:bg-blue-700 disabled:opacity-20 transition-all">
                      2. Start Reparatie
                  </button>
                  <button onClick={() => setTicketStep(3)} disabled={ticketStep !== 2} className="p-3 bg-green-600 text-white rounded-[2rem] font-bold text-xs hover:bg-green-700 disabled:opacity-20 transition-all">
                      3. Gereedmelden
                  </button>
              </div>
              {ticketStep === 3 && (
                  <button onClick={() => setTicketStep(0)} className="w-full py-2 text-slate-400 text-xs uppercase font-bold tracking-widest hover:text-slate-600">Reset Scenario</button>
              )}
          </div>
      </Chapter>

      {/* 5. THE WAREHOUSE */}
      <Chapter 
          title="The Warehouse" 
          subtitle="Grijp nooit meer mis. Automatisch voorraadbeheer gekoppeld aan uw machinepark en onderhoud."
          icon={Package}
          color="bg-amber-500"
      >
          <div className="flex flex-col gap-6 relative z-10">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                  <div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Artikel: PROX-SWITCH-12</div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">{stockCount} <span className="text-base text-slate-400 font-normal">stuks</span></div>
                  </div>
                  <div className={`p-4 rounded-2xl ${stockAlert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      <Package size={32} />
                  </div>
              </div>

              {stockAlert && (
                  <div className="bg-red-600 text-white p-4 rounded-[2rem] font-bold text-sm flex items-center gap-3 shadow-lg animate-in slide-in-from-left">
                      <AlertTriangle size={20} />
                      <div>
                          <div>MINIMALE VOORRAAD BEREIKT</div>
                          <div className="text-[10px] opacity-80 font-normal">Automatische inkooporder klaargezet.</div>
                      </div>
                  </div>
              )}

              <div className="flex gap-4">
                  <button onClick={consumePart} className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-bold hover:scale-[1.02] active:scale-95 transition-all">
                      Verbruik Onderdeel
                  </button>
                  {stockAlert && (
                      <button onClick={restock} className="px-6 py-4 bg-green-500 text-white rounded-[2rem] font-bold hover:bg-green-600 transition-colors animate-in zoom-in">
                          <RefreshCw size={20} />
                      </button>
                  )}
              </div>
          </div>
      </Chapter>

      {/* 6. BOTTOM LINE */}
      <Chapter 
          title="The Bottom Line" 
          subtitle="Onderbuikgevoel wordt harde data. Combineer energiedata met productiecounters voor de echte kostprijs."
          icon={BarChart2}
          color="bg-emerald-600"
          reversed
      >
          <div className="flex flex-col gap-6 relative z-10">
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><Zap size={120} /></div>
                  <div className="relative z-10">
                      <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Cost per Part (Realtime)</div>
                      <div className="text-6xl font-black tracking-tighter mb-6">€ {(energyCost * 1.42).toFixed(3)}</div>
                      
                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-700">
                          <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Energie Verbruik</div>
                              <div className="text-xl font-mono">1.42 kWh</div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Energie Prijs</div>
                              <div className="text-xl font-mono text-emerald-400">€ {energyCost.toFixed(2)}</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Simuleer Energieprijs (€/kWh)</label>
                  <input 
                      type="range" 
                      min="0.10" 
                      max="1.00" 
                      step="0.01" 
                      value={energyCost} 
                      onChange={(e) => setEnergyCost(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-2xl appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>€0.10</span>
                      <span>€1.00</span>
                  </div>
              </div>
          </div>
      </Chapter>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white py-24 text-center print:hidden">
          <div className="max-w-4xl mx-auto px-6">
              <div className="inline-flex p-6 bg-blue-600 rounded-3xl mb-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-all">
                  <Database size={48} />
              </div>
              <h2 className="text-5xl md:text-7xl font-black mb-8">KLAAR VOOR DE START?</h2>
              <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
                  Uw fabriek genereert nu al data. Het is tijd om er naar te luisteren met Factory Manager.
              </p>
              
              <div className="flex flex-col md:flex-row justify-center gap-4">
                  <button onClick={() => navigate('/admin/commercial')} className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all shadow-xl">
                      Bekijk Prijzen & ROI
                  </button>
                  <button onClick={() => navigate('/')} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/50">
                      Naar Dashboard
                  </button>
              </div>

              <div className="mt-20 pt-10 border-t border-slate-800 text-slate-600 text-sm font-mono">
                  {APP_INFO.NAME} {APP_INFO.VERSION} &bull; Made by {APP_INFO.AUTHOR} &bull; {APP_INFO.YEAR}
              </div>
          </div>
      </footer>
    </div>
  );
};