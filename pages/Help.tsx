
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, Wrench, AlertTriangle, Smartphone, Package, Activity, Droplet, LayoutGrid, Monitor, Wifi } from '../icons';

export const Help: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALGEMEEN' | 'PRODUCTIE' | 'ONDERHOUD' | 'BEHEER'>('ALGEMEEN');

  const GuideSection = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <Icon className="text-blue-500" size={24} />
            {title}
        </h3>
        <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
        </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
        <ArrowLeft size={18} />
        <span>Terug naar Dashboard</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Book className="text-blue-600" />
            Gebruikershandleiding
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
            Instructies voor Operators, Technische Dienst en Managers.
        </p>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
          <button 
              onClick={() => setActiveTab('ALGEMEEN')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ALGEMEEN' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
              <LayoutGrid size={16} /> Algemeen
          </button>
          <button 
              onClick={() => setActiveTab('PRODUCTIE')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PRODUCTIE' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
              <AlertTriangle size={16} /> Productie & Storing
          </button>
          <button 
              onClick={() => setActiveTab('ONDERHOUD')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ONDERHOUD' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
              <Droplet size={16} /> Onderhoud & Koeling
          </button>
          <button 
              onClick={() => setActiveTab('BEHEER')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'BEHEER' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
              <Package size={16} /> Materieel & Voorraad
          </button>
      </div>

      <div className="space-y-8">
        
        {/* TAB 1: ALGEMEEN */}
        {activeTab === 'ALGEMEEN' && (
            <>
                <GuideSection title="Starten & Navigeren" icon={Activity}>
                    <p>
                        <strong>Inloggen:</strong> Iedere gebruiker heeft een eigen 4-cijferige pincode. 
                        Bij het opstarten van de applicatie voert u deze code in. Afhankelijk van uw rol (Operator, TD, Admin) ziet u specifieke functies.
                    </p>
                    <p>
                        <strong>Navigatie:</strong> Gebruik het menu aan de linkerkant (desktop) of het 'hamburger' icoon (mobiel) om te schakelen tussen:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Dashboard:</strong> Overzicht van actieve storingen.</li>
                        <li><strong>Machines / Robots:</strong> Detailoverzichten van uw assets.</li>
                        <li><strong>Onderhoudsplanner:</strong> Kalender met geplande taken.</li>
                    </ul>
                </GuideSection>

                <GuideSection title="Mobiel Gebruik & QR Codes" icon={Smartphone}>
                    <p>
                        Elke machine heeft een unieke QR-code (te vinden via het QR-icoon rechtsboven op de machinepagina).
                    </p>
                    <p>
                        Print deze codes uit en plak ze op de machines. Operators kunnen met hun tablet of telefoon de code scannen om direct op de juiste pagina te komen voor:
                    </p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-slate-500">
                        <li>Het afvinken van de dagelijkse checklist.</li>
                        <li>Het inzien van de handleiding (PDF).</li>
                        <li>Het snel melden van een lekkage of storing.</li>
                    </ul>
                </GuideSection>
            </>
        )}

        {/* TAB 2: PRODUCTIE */}
        {activeTab === 'PRODUCTIE' && (
            <>
                <GuideSection title="Live Machine Diagnose (FOCAS)" icon={Monitor}>
                     <p>
                         Machines die gekoppeld zijn met de "Factory Bridge" zenden live data naar het systeem.
                     </p>
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                         <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                             <Wifi size={16} /> Automatische Foutuitlezing
                         </h4>
                         <p className="text-sm">
                             Wanneer een machine in storing valt, leest de software direct de <strong>specifieke foutcode</strong> uit de besturing (bijv. Fanuc).
                         </p>
                         <div className="mt-3 bg-red-600 text-white p-3 rounded shadow-sm text-xs font-mono">
                             #1002 SPINDLE CONTROL ERROR
                         </div>
                         <p className="text-sm mt-2">
                             Dit verschijnt automatisch op het Andon bord en in de app. U hoeft de storing dus <strong>niet handmatig</strong> te omschrijven als de machine verbonden is.
                         </p>
                     </div>
                </GuideSection>

                <GuideSection title="Handmatig Storing Melden" icon={AlertTriangle}>
                     <p>
                         Voor machines zonder FOCAS of voor fysieke problemen (lekkage, geluid):
                     </p>
                     <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                         <h4 className="font-bold text-slate-800 dark:text-white mb-2">Stappenplan:</h4>
                         <ol className="list-decimal pl-5 space-y-2 text-sm">
                             <li>Navigeer naar de machine of klik op <strong>"Snel Storing Melden"</strong> op het dashboard.</li>
                             <li>Vul een korte titel en omschrijving in.</li>
                             <li>Kies de urgentie:
                                 <ul className="list-disc pl-5 mt-1 text-slate-500">
                                     <li><span className="text-blue-600 font-bold">Normaal:</span> Geen directe stilstand, maar wel actie nodig.</li>
                                     <li><span className="text-red-600 font-bold">Kritiek:</span> Machine staat stil. De status van de machine springt direct op rood (STORING).</li>
                                 </ul>
                             </li>
                         </ol>
                     </div>
                </GuideSection>
            </>
        )}

        {/* TAB 3: ONDERHOUD */}
        {activeTab === 'ONDERHOUD' && (
            <GuideSection title="Vloeistoffen & Filters" icon={Droplet}>
                <p>
                    Voor CNC machines is het beheer van koelvloeistof essentieel.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Metingen:</strong> Ga naar het tabblad 'Koeling' bij een machine. Voer de Brix-waarde in. 
                        Het systeem berekent automatisch of u water of olie moet toevoegen om op het doel (bijv. 7%) te komen.
                    </li>
                    <li>
                        <strong>Mistfilters:</strong> Bij het vervangen van een filter registreert u dit onder het tabblad 'Mistfilter'. 
                        Koppel direct het gebruikte filter uit de voorraad zodat de kosten worden geboekt.
                    </li>
                </ul>
            </GuideSection>
        )}

        {/* TAB 4: BEHEER */}
        {activeTab === 'BEHEER' && (
            <GuideSection title="Materieel & Voorraad" icon={Package}>
                <p>
                    Beheer reserveonderdelen en algemene materialen via het menu <em>Materieel & Voorraad</em> (toegankelijk via de zijbalk of admin menu).
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Onderdelen:</strong> Kunnen machine-specifiek zijn (gekoppeld aan één machine) of algemeen (bouten, moeren, handschoenen).</li>
                    <li><strong>Minimale Voorraad:</strong> Stel een minimum in. Zodra de voorraad hieronder komt door een reparatie, krijgt de beheerder een melding.</li>
                </ul>
                <div className="bg-purple-50 dark:bg-purple-900/10 p-3 mt-4 rounded-lg border border-purple-100 dark:border-purple-800 text-sm text-purple-800 dark:text-purple-300">
                    <strong>Tip:</strong> Gebruik het zoekveld om snel een artikelcode te vinden en de voorraad te corrigeren.
                </div>
            </GuideSection>
        )}

      </div>
      
      <div className="text-center mt-12 text-slate-400 text-xs">
         Vragen? Neem contact op met de systeembeheerder.
      </div>
    </div>
  );
};
