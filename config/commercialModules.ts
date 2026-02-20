
import { CommercialModule, AppModule } from "../types";
import { Zap, Calendar, Package, Monitor, MessageSquare, Layers, ShieldCheck, FileText } from "lucide-react";

export interface CommercialModuleDefinition {
    id: CommercialModule;
    name: string;
    description: string;
    icon: any;
    enables: AppModule[]; // Which functional App Modules are enabled by this Commercial Module
}

export const COMMERCIAL_MODULES: CommercialModuleDefinition[] = [
    {
        id: CommercialModule.CORE,
        name: "Factory Manager CORE",
        description: "Basisfunctionaliteit: Machine beheer, Storingen, Gebruikers.",
        icon: Layers,
        enables: [
            AppModule.DASHBOARD_MAIN,
            AppModule.MACHINES,
            AppModule.ROBOTS,
            AppModule.CMM,
            AppModule.CLIMATE
        ]
    },
    {
        id: CommercialModule.PDM,
        name: "Product Data Management (PDM)",
        description: "Beheer artikelen, digitale werkvoorbereiding, routing en setup sheets.",
        icon: FileText,
        enables: [AppModule.ARTICLES]
    },
    {
        id: CommercialModule.ENERGY,
        name: "Energy Intelligence",
        description: "P1 Meter integratie, real-time vermogen en kostenrapportage.",
        icon: Zap,
        enables: [AppModule.ENERGY]
    },
    {
        id: CommercialModule.PLANNER,
        name: "Maintenance Planner",
        description: "Periodiek onderhoud kalender en taaktoewijzing.",
        icon: Calendar,
        enables: [AppModule.PLANNER]
    },
    {
        id: CommercialModule.INVENTORY,
        name: "Inventory & Stock",
        description: "Magazijnbeheer, reserveonderdelen en voorraadwaarde.",
        icon: Package,
        enables: [AppModule.INVENTORY]
    },
    {
        id: CommercialModule.ANDON,
        name: "Smart Factory (Andon)",
        description: "TV Dashboard modus en OEE Efficiency analyse.",
        icon: Monitor,
        enables: [AppModule.EFFICIENCY]
    },
    {
        id: CommercialModule.CONNECTIVITY,
        name: "Connected Worker",
        description: "Microsoft Teams integratie, Vragenmodule en Support oproepen.",
        icon: MessageSquare,
        enables: [AppModule.SUPPORT, AppModule.QUESTIONS]
    },
    {
        id: CommercialModule.TOOLGUARD,
        name: "ToolGuard Monitor",
        description: "Load bewaking en standtijd beheer voor gereedschappen.",
        icon: ShieldCheck,
        enables: [AppModule.TOOLGUARD]
    }
];

export const getEnabledAppModules = (activeModules: CommercialModule[]): AppModule[] => {
    let allowed: AppModule[] = [];
    
    allowed.push(AppModule.FINANCE);

    if (!Array.isArray(activeModules)) {
        return [...allowed, ...COMMERCIAL_MODULES.find(m => m.id === CommercialModule.CORE)?.enables || []];
    }

    COMMERCIAL_MODULES.forEach(mod => {
        if (activeModules.includes(mod.id)) {
            allowed = [...allowed, ...mod.enables];
        }
    });

    return [...new Set(allowed)];
};
