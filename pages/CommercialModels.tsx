
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Server, Cloud, Shield, Wrench, HardDrive, RefreshCw, Zap, TrendingUp, Calculator, Info, HelpCircle, Box, PieChart, Target, Clock, Euro, ArrowRight, Briefcase, Settings, Truck, Package, Layers, ListChecks, Monitor } from '../icons';

type ModelType = 'SAAS' | 'PERPETUAL';
type ViewTab = 'PRICING' | 'ROI';

export const CommercialModels: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewTab>('PRICING');
  
  // --- PRICING STATE ---
  const [numMachines, setNumMachines] = useState(5);
  const [includeEnergy, setIncludeEnergy] = useState(true);
  const [includePlanning, setIncludePlanning] = useState(true);
  const [includeInventory, setIncludeInventory] = useState(false);
  const [includeAndon, setIncludeAndon] = useState(false);

  // --- ROI STATE ---
  const [hourlyRate, setHourlyRate] = useState(85); // Machine uurtarief
  const [downtimeHours, setDowntimeHours] = useState(4); // Uren stilstand per week per machine
  const [adminHours, setAdminHours] = useState(6); // Uren admin/planning per week
  const [personnelRate, setPersonnelRate] = useState(45); // Kosten planner/admin
  
  // NEW: Logistics ROI State
  const [logisticsHours, setLogisticsHours] = useState(8); // Uren per week lopen/zoeken
  const [logisticsRate, setLogisticsRate] = useState(35); // Kosten logistiek medewerker

  // --- PRICING CONFIGURATION ---
  
  // 1. HARDWARE & SETUP (Geldt voor beide)
  const HARDWARE_PRICE = 850; // Intel NUC + Industrial Case
  const SETUP_SERVICE = 950;  // Dagdeel implementatie + training
  const ONE_TIME_TOTAL = HARDWARE_PRICE + SETUP_SERVICE;

  // 2. SAAS MODEL (Monthly)
  const SAAS_BASE_FEE = 149;       // Server hosting, updates, backups, 1 user
  const SAAS_PER_ASSET = 15;       // Prijs per machine per maand
  const SAAS_MODULE_PRICE = 35;    // Prijs per module per maand

  // 3. PERPETUAL MODEL (One-Off License)
  const PERP_BASE_LICENSE = 2950;  // Core software licentie
  const PERP_PER_ASSET = 350;      // Licentie per machine (eenmalig)
  const PERP_MODULE_PRICE = 850;   // Licentie per module (eenmalig)
  const MAINTENANCE_RATE = 0.18;   // 18% per jaar voor updates & support (optioneel, maar aanbevolen)

  const activeModules = [includeEnergy, includePlanning, includeInventory, includeAndon].filter(Boolean).length;

  const calculatePricing = () => {
      // SAAS CALC
      const saasMonthlyBase = SAAS_BASE_FEE;
      const saasMonthlyAssets = numMachines * SAAS_PER_ASSET;
      const saasMonthlyModules = activeModules * SAAS_MODULE_PRICE;
      const saasTotalMonthly = saasMonthlyBase + saasMonthlyAssets + saasMonthlyModules;
      
      const saasYear1 = ONE_TIME_TOTAL + (saasTotalMonthly * 12);
      const saasYear3 = ONE_TIME_TOTAL + (saasTotalMonthly * 36);

      // PERPETUAL CALC
      const perpLicenseBase = PERP_BASE_LICENSE;
      const perpLicenseAssets = numMachines * PERP_PER_ASSET;
      const perpLicenseModules = activeModules * PERP_MODULE_PRICE;
      const perpTotalLicense = perpLicenseBase + perpLicenseAssets + perpLicenseModules;
      
      const perpMaintenanceYearly = perpTotalLicense * MAINTENANCE_RATE;
      const perpMaintenanceMonthly = perpMaintenanceYearly / 12;

      const perpYear1 = ONE_TIME_TOTAL + perpTotalLicense + perpMaintenanceYearly; // Incl 1st year maintenance
      const perpYear3 = ONE_TIME_TOTAL + perpTotalLicense + (perpMaintenanceYearly * 3);

      return {
          saas: {
              monthlyBase: saasMonthlyBase,
              monthlyAssets: saasMonthlyAssets,
              monthlyModules: saasMonthlyModules,
              totalMonthly: saasTotalMonthly,
              upfront: ONE_TIME_TOTAL,
              tco1: saasYear1,
              tco3: saasYear3
          },
          perp: {
              licenseTotal: perpTotalLicense,
              maintenanceYearly: perpMaintenanceYearly,
              maintenanceMonthly: perpMaintenanceMonthly,
              upfront: ONE_TIME_TOTAL + perpTotalLicense,
              tco1: perpYear1,
              tco3: perpYear3
          }
      };
  };

  const calculateROI = (pricingData: any) => {
      // Assumptions (Conservative)
      const DOWNTIME_REDUCTION = 0.15; // 15% minder stilstand door snellere respons
      const ADMIN_REDUCTION = 0.40;    // 40% minder zoektijd/papierwerk
      const LOGISTICS_REDUCTION = 0.50; // 50% minder loopwerk door digitale oproepen

      // Current Costs (Monthly)
      // Downtime: uren * machines * tarief * 4.3 weken
      const currentDowntimeCost = (downtimeHours * numMachines) * hourlyRate * 4.3;
      const currentAdminCost = adminHours * personnelRate * 4.3;
      const currentLogisticsCost = logisticsHours * logisticsRate * 4.3;

      // Savings
      const savingDowntime = currentDowntimeCost * DOWNTIME_REDUCTION;
      const savingAdmin = currentAdminCost * ADMIN_REDUCTION;
      const savingLogistics = currentLogisticsCost * LOGISTICS_REDUCTION;
      
      const totalMonthlySavings = savingDowntime + savingAdmin + savingLogistics;

      // Investment (Using SaaS Year 1 avg monthly cost as baseline for simplicity, or just monthly fee)
      // To keep it fair, we look at: "How many months to earn back the Setup Fee + First Month?"
      const investmentSaaS = pricingData.saas.upfront + pricingData.saas.totalMonthly;
      const paybackSaaS = investmentSaaS / totalMonthlySavings;

      const investmentPerp = pricingData.perp.upfront; // Huge upfront
      const paybackPerp = investmentPerp / (totalMonthlySavings - pricingData.perp.maintenanceMonthly); // Net savings

      return {
          currentDowntimeCost,
          currentAdminCost,
          currentLogisticsCost,
          savingDowntime,
          savingAdmin,
          savingLogistics,
          totalMonthlySavings,
          paybackSaaS,
          paybackPerp
      };
  };

  const pricing = calculatePricing();
  const roi = calculateROI(pricing);

  const PriceRow = ({ label, value, subtext, highlight = false }: { label: string, value: string, subtext?: string, highlight?: boolean }) => (
      <div className={`flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-700 ${highlight ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
          <div>
              <div className="text-sm">{label}</div>
              {subtext && <div className="text-[10px] text-slate-400 font-normal">{subtext}</div>}
          </div>
          <div className="text-sm font-mono">{value}</div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
        <ArrowLeft size={18} />
        <span>Terug naar Admin</span>
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Briefcase size={32} className="text-indigo-600" />
                Sales & Business Case
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
                Configureer het aanbod en bereken de ROI voor de klant.
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button 
                  onClick={() => setActiveTab('PRICING')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'PRICING' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                  <Calculator size={16} /> Prijscalculator
              </button>
              <button 
                  onClick={() => setActiveTab('ROI')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ROI' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                  <TrendingUp size={16} /> ROI Tool
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: SHARED CONFIG (ALWAYS VISIBLE) */}
          <div className="xl:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                      <Settings size={20} className="text-slate-500" />
                      Scope Bepaling
                  </h3>
                  
                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-slate-500 uppercase">Aantal Machines</label>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                  {numMachines}
                              </span>
                          </div>
                          <input 
                              type="range" min="1" max="50" 
                              value={numMachines} 
                              onChange={e => setNumMachines(parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                      </div>

                      <div className="space-y-3">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Gewenste Modules</label>
                          
                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> Energie (P1)</span>
                              <input type="checkbox" checked={includeEnergy} onChange={e => setIncludeEnergy(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                          </label>

                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><Wrench size={16} className="text-orange-500"/> Planner</span>
                              <input type="checkbox" checked={includePlanning} onChange={e => setIncludePlanning(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                          </label>

                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><Server size={16} className="text-purple-500"/> Voorraad</span>
                              <input type="checkbox" checked={includeInventory} onChange={e => setIncludeInventory(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                          </label>

                          <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"><RefreshCw size={16} className="text-teal-500"/> Andon TV</span>
                              <input type="checkbox" checked={includeAndon} onChange={e => setIncludeAndon(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                          </label>
                      </div>
                  </div>
              </div>
              
              {/* Setup Cost Explanation */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase mb-2 flex items-center gap-2">
                      <Box size={14} /> Hardware & Setup
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                      <li><strong>Factory Gateway:</strong> Industriële PC (NUC).</li>
                      <li><strong>Installatie:</strong> IP-scan & training.</li>
                  </ul>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600 font-bold text-right text-slate-800 dark:text-white text-sm">
                      Eenmalig: € {ONE_TIME_TOTAL.toLocaleString()}
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: DYNAMIC CONTENT */}
          <div className="xl:col-span-9">
              
              {/* === TAB: PRICING === */}
              {activeTab === 'PRICING' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          
                          {/* MODEL A: SAAS */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-500 shadow-xl overflow-hidden flex flex-col transform hover:-translate-y-1 transition-all">
                              <div className="bg-indigo-600 text-white p-2 text-center text-xs font-bold uppercase tracking-widest">Aanbevolen voor MKB</div>
                              <div className="p-8 flex-1 flex flex-col">
                                  <div className="flex items-center gap-3 mb-4">
                                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                          <Cloud size={32} />
                                      </div>
                                      <div>
                                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">SaaS Model</h3>
                                          <p className="text-sm text-slate-500">Software as a Service</p>
                                      </div>
                                  </div>

                                  <div className="mb-8">
                                      <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">€ {pricing.saas.totalMonthly}</span>
                                      <span className="text-slate-500 font-medium"> / maand</span>
                                  </div>

                                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700 flex-1">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Prijsopbouw (Maandelijks)</h4>
                                      <PriceRow label="Basis Licentie (Core)" value={`€ ${pricing.saas.monthlyBase}`} subtext="Hosting, Updates, Backups" />
                                      <PriceRow label={`Asset Fee (${numMachines}x)`} value={`€ ${pricing.saas.monthlyAssets}`} subtext={`€ ${SAAS_PER_ASSET} per machine`} />
                                      <PriceRow label="Extra Modules" value={`€ ${pricing.saas.monthlyModules}`} subtext="Uitbreidingen" />
                                      <PriceRow label="Totaal Maandelijks" value={`€ ${pricing.saas.totalMonthly}`} highlight />
                                      
                                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                          <PriceRow label="Eenmalige Startkosten" value={`€ ${pricing.saas.upfront}`} subtext="Hardware & Installatie" />
                                      </div>
                                  </div>

                                  <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl mb-6">
                                      <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-2">Total Cost of Ownership (TCO)</h4>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-600 dark:text-slate-400">Na 1 jaar:</span>
                                          <span className="font-bold text-slate-800 dark:text-white">€ {pricing.saas.tco1.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                          <span className="text-slate-600 dark:text-slate-400">Na 3 jaar:</span>
                                          <span className="font-bold text-slate-800 dark:text-white">€ {pricing.saas.tco3.toLocaleString()}</span>
                                      </div>
                                  </div>

                                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mt-auto">
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Lage instapkosten (CAPEX vriendelijk)</span></li>
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Altijd de nieuwste versie (Updates inbegrepen)</span></li>
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Inclusief Cloud Backup & Monitoring</span></li>
                                  </ul>
                              </div>
                          </div>

                          {/* MODEL B: PERPETUAL */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col relative overflow-hidden transform hover:-translate-y-1 transition-all">
                              <div className="p-8 flex-1 flex flex-col">
                                  <div className="flex items-center gap-3 mb-4">
                                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                                          <HardDrive size={32} />
                                      </div>
                                      <div>
                                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Perpetual Model</h3>
                                          <p className="text-sm text-slate-500">Eenmalige Aanschaf (Koop)</p>
                                      </div>
                                  </div>

                                  <div className="mb-8">
                                      <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">€ {pricing.perp.upfront.toLocaleString()}</span>
                                      <span className="text-slate-500 font-medium"> / eenmalig</span>
                                  </div>

                                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-700 flex-1">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Prijsopbouw (Eenmalig)</h4>
                                      <PriceRow label="Software Licentie (Core)" value={`€ ${PERP_BASE_LICENSE}`} />
                                      <PriceRow label={`Asset Licenties (${numMachines}x)`} value={`€ ${numMachines * PERP_PER_ASSET}`} subtext={`€ ${PERP_PER_ASSET} per machine`} />
                                      <PriceRow label="Module Licenties" value={`€ ${activeModules * PERP_MODULE_PRICE}`} />
                                      <PriceRow label="Hardware & Setup" value={`€ ${ONE_TIME_TOTAL}`} />
                                      <PriceRow label="Totaal Investering" value={`€ ${(pricing.perp.upfront).toLocaleString()}`} highlight />
                                      
                                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                          <div className="flex justify-between items-center mb-1">
                                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Service Contract (Verplicht jaar 1)</span>
                                              <span className="text-sm font-mono font-bold text-slate-800 dark:text-white">€ {pricing.perp.maintenanceYearly.toFixed(0)} / jaar</span>
                                          </div>
                                          <p className="text-[10px] text-slate-400">18% van licentiewaarde. Dekt updates & support.</p>
                                      </div>
                                  </div>

                                  <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl mb-6">
                                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-2">Total Cost of Ownership (TCO)</h4>
                                      <div className="flex justify-between text-sm mb-1">
                                          <span className="text-slate-600 dark:text-slate-400">Na 1 jaar:</span>
                                          <span className="font-bold text-slate-800 dark:text-white">€ {pricing.perp.tco1.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                          <span className="text-slate-600 dark:text-slate-400">Na 3 jaar:</span>
                                          <span className="font-bold text-slate-800 dark:text-white">€ {pricing.perp.tco3.toLocaleString()}</span>
                                      </div>
                                  </div>

                                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mt-auto">
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Eigendom van Licentie & Data</span></li>
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Geen vaste lasten na jaar 1 (als contract stopt)</span></li>
                                      <li className="flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5" /> <span>Volledig offline te gebruiken (Air-gapped)</span></li>
                                  </ul>
                              </div>
                          </div>
                      </div>

                      {/* MODULE DESCRIPTION SECTION */}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                  <ListChecks size={20} className="text-blue-500" />
                                  Module Specificaties
                              </h3>
                              <p className="text-sm text-slate-500 mt-1">Wat houdt elke module precies in?</p>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                  <div className="flex items-start gap-3">
                                      <div className="bg-slate-200 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300"><Layers size={24} /></div>
                                      <div><h4 className="font-bold text-slate-800 dark:text-white">CORE Licentie</h4><span className="text-[10px] uppercase font-bold text-slate-400">Basis (Verplicht)</span></div>
                                  </div>
                                  <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                                      <p>De fundering van Factory Manager. Biedt volledig beheer over assets, gebruikers en storingen.</p>
                                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                          <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Onbeperkt aantal gebruikers & rollen</li>
                                          <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Digitale Checklists & QR-codes</li>
                                          <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Storing- & Reparatietickets</li>
                                          <li className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Financiële Rapportages</li>
                                      </ul>
                                  </div>
                              </div>

                              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                  <div className="flex items-start gap-3">
                                      <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg text-yellow-600 dark:text-yellow-400"><Zap size={24} /></div>
                                      <div><h4 className="font-bold text-slate-800 dark:text-white">Energy</h4><span className="text-[10px] uppercase font-bold text-slate-400">Module</span></div>
                                  </div>
                                  <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300">
                                      <p className="mb-2">Real-time inzicht in energieverbruik en kosten via P1-meter integratie. Voorkom boetes voor piekbelasting.</p>
                                      <div className="flex gap-2">
                                          <span className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">Live kW Grafieken</span>
                                          <span className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">Kosten per Uur</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                  <div className="flex items-start gap-3">
                                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400"><Wrench size={24} /></div>
                                      <div><h4 className="font-bold text-slate-800 dark:text-white">Planner</h4><span className="text-[10px] uppercase font-bold text-slate-400">Module</span></div>
                                  </div>
                                  <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300">
                                      <p>Automatiseer preventief onderhoud. De planner genereert taken op basis van tijdsintervallen (6/12/24 maanden) en wijst deze toe aan de TD.</p>
                                  </div>
                              </div>

                              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                  <div className="flex items-start gap-3">
                                      <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400"><Server size={24} /></div>
                                      <div><h4 className="font-bold text-slate-800 dark:text-white">Inventory</h4><span className="text-[10px] uppercase font-bold text-slate-400">Module</span></div>
                                  </div>
                                  <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300">
                                      <p>Beheer voorraad van reserveonderdelen en materieel. Koppel verbruik direct aan reparatietickets voor een sluitende kostenadministratie.</p>
                                  </div>
                              </div>

                              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                  <div className="flex items-start gap-3">
                                      <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg text-teal-600 dark:text-teal-400"><RefreshCw size={24} /></div>
                                      <div><h4 className="font-bold text-slate-800 dark:text-white">Andon TV</h4><span className="text-[10px] uppercase font-bold text-slate-400">Module</span></div>
                                  </div>
                                  <div className="md:col-span-3 text-sm text-slate-600 dark:text-slate-300">
                                      <p>Visueel management voor in de hal. Toon de status van alle machines (Running/Error) op grote TV-schermen. Inclusief automatische refresh.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* === TAB: ROI === */}
              {activeTab === 'ROI' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      
                      {/* INPUTS */}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                              <Target size={20} className="text-blue-500" />
                              Huidige Situatie (Klant)
                          </h3>
                          <div className="space-y-6">
                              
                              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                      <Wrench size={16} /> Machine Stilstand
                                  </h4>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Gemiddeld uurtarief machine (€)</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-400">€</span>
                                              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Stilstand per machine (Uur/week)</label>
                                          <input type="number" value={downtimeHours} onChange={e => setDowntimeHours(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                          <p className="text-[10px] text-slate-400 mt-1">Door wachten op TD, zoeken naar onderdelen, etc.</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                      <Clock size={16} /> Administratie & Planning
                                  </h4>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Uurtarief planner/hoofd TD (€)</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-400">€</span>
                                              <input type="number" value={personnelRate} onChange={e => setPersonnelRate(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Uren per week (Zoeken/Papierwerk)</label>
                                          <input type="number" value={adminHours} onChange={e => setAdminHours(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                      <Truck size={16} /> Logistiek & Ondersteuning
                                  </h4>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Uurtarief Logistiek/Heftruck (€)</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-400">€</span>
                                              <input type="number" value={logisticsRate} onChange={e => setLogisticsRate(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Uren per week (Lopen/Zoeken)</label>
                                          <input type="number" value={logisticsHours} onChange={e => setLogisticsHours(parseInt(e.target.value))} className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                          <p className="text-[10px] text-slate-400 mt-1">Tijd verloren aan controleren spanenbakken, koelmiddel, materiaal zoeken.</p>
                                      </div>
                                  </div>
                              </div>

                          </div>
                      </div>

                      {/* RESULTS */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 p-6 shadow-lg flex flex-col relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-6 opacity-10">
                              <PieChart size={120} className="text-emerald-600" />
                          </div>
                          
                          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-6 flex items-center gap-2">
                              <TrendingUp size={20} />
                              De Business Case
                          </h3>

                          <div className="space-y-6 flex-1">
                              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-sm">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-1">Huidige Verspilling (per maand)</div>
                                  <div className="text-2xl font-black text-red-500">€ {((roi.currentDowntimeCost + roi.currentAdminCost + roi.currentLogisticsCost)).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                  <div className="text-xs text-slate-400 mt-1">Stilstand + Admin + Logistiek</div>
                              </div>

                              <div className="flex items-center gap-4">
                                  <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-sm">
                                      <div className="text-xs text-emerald-600 uppercase font-bold mb-1">Verwachte Besparing</div>
                                      <div className="text-3xl font-black text-emerald-600">€ {roi.totalMonthlySavings.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                      <div className="text-[10px] text-emerald-500 mt-1 font-medium">per maand</div>
                                  </div>
                              </div>

                              <div className="space-y-2 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="text-emerald-800 dark:text-emerald-200">15% minder stilstand:</span>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">€ {roi.savingDowntime.toFixed(0)} /mnd</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="text-emerald-800 dark:text-emerald-200">40% minder admin:</span>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">€ {roi.savingAdmin.toFixed(0)} /mnd</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="text-emerald-800 dark:text-emerald-200">50% minder loopwerk:</span>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">€ {roi.savingLogistics.toFixed(0)} /mnd</span>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 bg-emerald-600 text-white p-6 rounded-xl shadow-lg text-center transform hover:scale-[1.02] transition-transform">
                              <div className="text-sm font-medium opacity-90 uppercase tracking-widest mb-1">Terugverdientijd (ROI)</div>
                              <div className="text-5xl font-black mb-2">{roi.paybackSaaS.toFixed(1)} <span className="text-2xl font-normal">maanden</span></div>
                              <div className="text-xs opacity-80 bg-emerald-700 inline-block px-3 py-1 rounded-full">
                                  Op basis van SaaS Setup + Maandbedrag
                              </div>
                          </div>
                      </div>

                  </div>
              )}

          </div>
      </div>
    </div>
  );
};
