// __BUILD_NUMBER__ en __BUILD_TIMESTAMP__ worden door Vite ingebakken
// via scripts/bump-build.js (prebuild) → build.json → vite.config.ts define
declare const __BUILD_NUMBER__: number;
declare const __BUILD_TIMESTAMP__: string;

export const APP_INFO = {
    NAME: 'Factory Manager',
    VERSION: '1.1.7',
    BUILD: __BUILD_NUMBER__,
    BUILD_TIMESTAMP: __BUILD_TIMESTAMP__,
    AUTHOR: 'J.Houben',
    YEAR: '2025',
    DB_SCHEMA_VERSION: 1
};