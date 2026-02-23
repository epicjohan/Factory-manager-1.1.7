
import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from '../../icons';
import { APP_INFO } from '../../services/appInfo';

interface UpdateBannerProps {
    show: boolean;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ show }) => {
    if (!show) return null;

    return (
        <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50 animate-in slide-in-from-top duration-500">
            <span className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="animate-spin-slow shrink-0" size={16} /> 
                Nieuwe software versie gedetecteerd (v{APP_INFO.VERSION})
            </span>
            <Link to="/admin/update" className="bg-white text-orange-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-50 transition-colors whitespace-nowrap">Nu Activeren</Link>
        </div>
    );
};
