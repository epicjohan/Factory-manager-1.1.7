
// A simple in-memory logger to track system events for debugging support.
// This is critical for commercial software to diagnose issues remotely.

export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SYSTEM';
    message: string;
    details?: any;
}

const MAX_LOGS = 200;
let logs: LogEntry[] = [];

export const Logger = {
    log: (level: LogEntry['level'], message: string, details?: any) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            details: details ? JSON.stringify(details) : undefined
        };
        
        // Console output for dev
        if (level === 'ERROR') console.error(`[${level}] ${message}`, details);
        else if (level === 'WARN') console.warn(`[${level}] ${message}`, details);
        else console.log(`[${level}] ${message}`, details || '');

        // Add to history
        logs.unshift(entry);
        if (logs.length > MAX_LOGS) {
            logs.pop();
        }
    },

    info: (msg: string, details?: any) => Logger.log('INFO', msg, details),
    warn: (msg: string, details?: any) => Logger.log('WARN', msg, details),
    error: (msg: string, details?: any) => Logger.log('ERROR', msg, details),
    system: (msg: string, details?: any) => Logger.log('SYSTEM', msg, details),

    getLogs: () => logs,

    exportLogs: () => {
        const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message} ${l.details || ''}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `factory_manager_debug_${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    clear: () => logs = []
};
