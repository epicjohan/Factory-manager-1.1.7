
import React from 'react';
import {
    Monitor,
    Factory,
    Ruler,
    Thermometer,
    Package,
    Calendar,
    Megaphone,
    MessageSquare,
    Briefcase,
    LayoutGrid,
    Wrench,
    Box,
    Zap,
    TrendingUp,
    BarChart2,
    LayoutDashboard,
    Tv,
    Truck,
    FileText,
    ShieldCheck
} from '../icons';
import { AppModule } from '../types';

// Custom Icon for Industrial Robot Arm (Re-used for consistency)
const RobotArmIcon = ({ size = 22, className = "" }: { size?: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M2 21h6" />
        <path d="M5 21v-7" />
        <path d="M5 14l9-9" />
        <path d="M14 5l5 5" />
        <path d="M19 10l3 2" />
        <path d="M19 10l-2 3" />
        <circle cx="5" cy="14" r="1.5" />
        <circle cx="14" cy="5" r="1.5" />
    </svg>
);

export interface SubModuleConfig {
    id: AppModule;
    label: string;
    path: string;
    icon: any;
    badgeKey?: 'support' | 'questions'; // Keys to look up badge counts in Layout
}

export interface ModuleGroupConfig {
    id: string;
    title: string;
    icon: any;
    items: SubModuleConfig[];
}

export const MODULE_GROUPS: ModuleGroupConfig[] = [
    {
        id: 'DASHBOARDS',
        title: 'Dashboards',
        icon: LayoutDashboard,
        items: [
            { id: AppModule.DASHBOARD_MAIN, label: 'Fabriek Overzicht', path: '/', icon: Factory },
            { id: AppModule.EFFICIENCY, label: 'Efficiency', path: '/efficiency', icon: TrendingUp },
            // Updated to EFFICIENCY to allow disabling via "Smart Factory" module
            { id: AppModule.EFFICIENCY, label: 'TV / Andon Bord', path: '/andon', icon: Tv },
            { id: AppModule.SUPPORT, label: 'Support & Oproepen', path: '/support', icon: Megaphone, badgeKey: 'support' },
            { id: AppModule.SUPPORT, label: 'Logistiek Monitor', path: '/logistics-andon', icon: Truck },
            { id: AppModule.QUESTIONS, label: 'Vragen & Berichten', path: '/questions', icon: MessageSquare, badgeKey: 'questions' },
            { id: AppModule.ENERGY, label: 'Energy Management', path: '/energy', icon: Zap },
            { id: AppModule.FINANCE, label: 'Financieel Rapport', path: '/admin/cost-report', icon: BarChart2 },
        ]
    },
    {
        id: 'ASSETS',
        title: 'Assets & Machines',
        icon: Monitor,
        items: [
            { id: AppModule.MACHINES, label: 'CNC Machines', path: '/machines', icon: Monitor },
            { id: AppModule.ROBOTS, label: 'Robots', path: '/robots', icon: RobotArmIcon },
            { id: AppModule.CMM, label: 'Meetkamer (CMM)', path: '/cmm', icon: Ruler },
            { id: AppModule.CLIMATE, label: 'Klimaatbeheersing', path: '/climate', icon: Thermometer },
        ]
    },
    {
        id: 'TOOLS',
        title: 'Productie & Beheer',
        icon: Briefcase,
        items: [
            { id: AppModule.ARTICLES, label: 'Artikelen (PDM)', path: '/articles', icon: FileText },
            { id: AppModule.COMPLIANCE, label: 'Kwaliteit & Audits', path: '/compliance', icon: ShieldCheck },
            { id: AppModule.PLANNER, label: 'Onderhoudsplanner', path: '/planner', icon: Calendar },
            { id: AppModule.INVENTORY, label: 'Materieel & Voorraad', path: '/admin/inventory', icon: Package },
        ]
    }
];
