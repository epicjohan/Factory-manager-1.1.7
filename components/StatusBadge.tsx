
import React from 'react';
import { STATUS_CONFIG } from '../config/statusConfig';

interface StatusBadgeProps {
    status: keyof typeof STATUS_CONFIG;
    showIcon?: boolean;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true, className = "" }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
    const Icon = config.icon;

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5 ${config.lightBg} ${config.text} ${config.darkBg} ${config.darkText} ${config.border} ${config.darkBorder} ${config.animate ? 'animate-pulse' : ''} ${className}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
            {showIcon && <Icon size={12} />}
            <span>{config.label}</span>
        </span>
    );
};
