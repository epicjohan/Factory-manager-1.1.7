
import { Activity, AlertTriangle, Wrench, Clock, Power } from '../icons';

export const STATUS_CONFIG = {
    RUNNING: {
        label: 'Producerend',
        color: 'bg-green-500',
        lightBg: 'bg-green-100',
        text: 'text-green-700',
        darkText: 'dark:text-green-400',
        darkBg: 'dark:bg-green-900/30',
        border: 'border-green-200',
        darkBorder: 'dark:border-green-800',
        icon: Activity,
        animate: false
    },
    MAINTENANCE: {
        label: 'Onderhoud',
        color: 'bg-orange-500',
        lightBg: 'bg-orange-100',
        text: 'text-orange-700',
        darkText: 'dark:text-orange-400',
        darkBg: 'dark:bg-orange-900/30',
        border: 'border-orange-200',
        darkBorder: 'dark:border-orange-800',
        icon: Wrench,
        animate: false
    },
    ERROR: {
        label: 'Storing',
        color: 'bg-red-600',
        lightBg: 'bg-red-100',
        text: 'text-red-700',
        darkText: 'dark:text-red-400',
        darkBg: 'dark:bg-red-900/30',
        border: 'border-red-200',
        darkBorder: 'dark:border-red-800',
        icon: AlertTriangle,
        animate: true
    },
    OFFLINE: {
        label: 'Offline',
        color: 'bg-slate-500',
        lightBg: 'bg-slate-100',
        text: 'text-slate-600',
        darkText: 'dark:text-slate-400',
        darkBg: 'dark:bg-slate-800',
        border: 'border-slate-200',
        darkBorder: 'dark:border-slate-700',
        icon: Power,
        animate: false
    }
};
