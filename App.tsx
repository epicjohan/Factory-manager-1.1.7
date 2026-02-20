
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncService } from './services/sync';
import { ConnectionOverlay } from './components/ConnectionOverlay';
import { db } from './services/storage';
import { Dashboard } from './pages/Dashboard';
import { AndonDashboard } from './pages/AndonDashboard';
import { LogisticsAndon } from './pages/LogisticsAndon';
import { CreateMachine } from './pages/CreateMachine';
import { MachineDetail } from './pages/MachineDetail';
import { MachineToolGuard } from './pages/MachineToolGuard';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/UserManagement';
import { InventoryManagement } from './pages/InventoryManagement';
import { SupportDashboard } from './pages/SupportDashboard';
import { QuestionsDashboard } from './pages/QuestionsDashboard';
import { EnergyDashboard } from './pages/EnergyDashboard';
import { EnergyManagement } from './pages/EnergyManagement';
import { EfficiencyDashboard } from './pages/EfficiencyDashboard';
import { MaintenancePlanner } from './pages/MaintenancePlanner';
import { Settings } from './pages/Settings';
import { SystemUpdate } from './pages/SystemUpdate'; 
import { CostReport } from './pages/CostReport';
import { SystemHealth } from './pages/SystemHealth';
import { SuperAdminHelp } from './pages/SuperAdminHelp';
import { ReleaseManual } from './pages/ReleaseManual';
import { LicenseManagement } from './pages/LicenseManagement';
import { CommercialModels } from './pages/CommercialModels';
import { Help } from './pages/Help'; 
import { Showcase } from './pages/Showcase'; 
import { SystemSimulator } from './pages/SystemSimulator';
import { DeveloperGuide } from './pages/DeveloperGuide';
import { LoginScreen } from './pages/LoginScreen';
import { ArticleManagement } from './pages/ArticleManagement';
import { TemplateManagement } from './pages/TemplateManagement';
import { ProductionDashboard } from './pages/ProductionDashboard';
import { UserRole, AssetType, AppModule, FocasLiveStats } from './types';

const ModuleGuard: React.FC<{ module: AppModule, children: React.ReactNode }> = ({ module, children }) => {
    const { canAccessModule } = useAuth();
    if (!canAccessModule(module)) return <Navigate to="/" replace />;
    return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <LoginScreen />;
  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/" />;
    return <>{children}</>;
};

const GhostAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    if (!user || user.id !== 'super-admin-ghost') return <Navigate to="/admin" />;
    return <>{children}</>;
};

const BackgroundSimulator: React.FC = () => {
    useEffect(() => {
        // --- FIX: Logic in setInterval is now async to handle db promises ---
        const interval = setInterval(async () => {
            const sim = await db.getSimulationState();
            if (!sim || !sim.active) return;
            const machines = await db.getMachines();
            const m = machines.find(x => x.id === sim.machineId);
            if (!m) return;
            const nextElapsed = sim.elapsedInTool + 1;
            let nextActiveToolIdx = sim.activeToolIdx;
            let nextCycleCount = sim.cycleCount;
            let finalElapsed = nextElapsed;
            if (nextElapsed >= sim.secondsPerTool) {
                nextActiveToolIdx = (sim.activeToolIdx + 1) % sim.toolSequence.length;
                finalElapsed = 0;
                if (nextActiveToolIdx === 0) nextCycleCount++;
            }
            const jitter = (Math.random() - 0.5) * 2;
            let currentLoad = sim.baseLoad + jitter;
            let currentState: any = 'ACTIVE';
            if (sim.scenario === 'WEAR') currentLoad += (nextCycleCount * 0.5);
            else if (sim.scenario === 'BREAKAGE' && nextActiveToolIdx === 0 && finalElapsed > 2) {
                currentLoad = 145;
                currentState = 'ALARM';
            }
            const currentTool = sim.toolSequence[nextActiveToolIdx];
            const stats: FocasLiveStats = {
                connected: true, lastUpdated: new Date().toISOString(), runMode: 'MEM', programNumber: 'O1000', programComment: `SIM: ${sim.scenario}`, executionState: currentState, spindleLoad: Math.round(currentLoad), spindleSpeed: currentState === 'ACTIVE' ? 12000 : 0, feedOverride: 100, currentTool: currentTool, partsCount: nextCycleCount, targetCount: 500, cycleTimeSec: 120, totalPowerOnTime: 1000 + nextCycleCount, totalOperatingTime: 500 + nextCycleCount, totalCuttingTime: 400 + nextCycleCount, alarmCode: currentState === 'ALARM' ? 1002 : undefined, alarmMessage: currentState === 'ALARM' ? 'TOOL BREAKAGE DETECTED' : undefined
            };
            await db.setMachineLiveStats(sim.machineId, stats);
            await db.setSimulationState({ ...sim, elapsedInTool: finalElapsed, activeToolIdx: nextActiveToolIdx, cycleCount: nextCycleCount });
            window.dispatchEvent(new CustomEvent('simulation-tick', { detail: stats }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    return null;
};

const App: React.FC = () => {
  useEffect(() => { SyncService.start(); return () => SyncService.stop(); }, []);
  return (
    <ErrorBoundary>
        <NotificationProvider>
            <AuthProvider>
            <ThemeProvider>
                <BackgroundSimulator />
                <ConnectionOverlay />
                <HashRouter>
                <Routes>
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/machines" element={<ProtectedRoute><Dashboard typeFilter={AssetType.CNC} title="CNC Machines" subtitle="Overzicht van het machinepark." /></ProtectedRoute>} />
                    <Route path="/robots" element={<ProtectedRoute><Dashboard typeFilter={AssetType.ROBOT} title="Robotica" subtitle="Status van robots en cobots." /></ProtectedRoute>} />
                    <Route path="/cmm" element={<ProtectedRoute><Dashboard typeFilter={AssetType.CMM} title="Meetkamer" subtitle="Beschikbaarheid meetgereedschap." /></ProtectedRoute>} />
                    <Route path="/climate" element={<ProtectedRoute><Dashboard typeFilter={AssetType.CLIMATE} title="Klimaatbeheersing" subtitle="Status van filters en afzuiging." /></ProtectedRoute>} />
                    <Route path="/machine/:id" element={<ProtectedRoute><MachineDetail /></ProtectedRoute>} />
                    
                    {/* PRODUCTION DASHBOARD ROUTE */}
                    <Route path="/production/machine/:id" element={<ProtectedRoute><ProductionDashboard /></ProtectedRoute>} />

                    <Route path="/machine/:id/toolguard" element={<ProtectedRoute><ModuleGuard module={AppModule.TOOLGUARD}><MachineToolGuard /></ModuleGuard></ProtectedRoute>} />
                    <Route path="/efficiency" element={<ProtectedRoute><EfficiencyDashboard /></ProtectedRoute>} />
                    <Route path="/energy" element={<ProtectedRoute><EnergyDashboard /></ProtectedRoute>} />
                    <Route path="/andon" element={<ProtectedRoute><AndonDashboard /></ProtectedRoute>} />
                    <Route path="/logistics-andon" element={<ProtectedRoute><LogisticsAndon /></ProtectedRoute>} />
                    <Route path="/planner" element={<ProtectedRoute><MaintenancePlanner /></ProtectedRoute>} />
                    <Route path="/support" element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
                    <Route path="/questions" element={<ProtectedRoute><QuestionsDashboard /></ProtectedRoute>} />
                    <Route path="/articles" element={<ProtectedRoute><ModuleGuard module={AppModule.ARTICLES}><ArticleManagement /></ModuleGuard></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/create-machine" element={<ProtectedRoute><AdminRoute><CreateMachine /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/edit-machine/:id" element={<ProtectedRoute><AdminRoute><CreateMachine /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/templates" element={<ProtectedRoute><AdminRoute><ModuleGuard module={AppModule.ARTICLES}><TemplateManagement /></ModuleGuard></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><UserManagement /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/inventory" element={<ProtectedRoute><AdminRoute><InventoryManagement /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/cost-report" element={<ProtectedRoute><AdminRoute><CostReport /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/health" element={<ProtectedRoute><AdminRoute><SystemHealth /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/simulator" element={<ProtectedRoute><GhostAdminRoute><SystemSimulator /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/commercial" element={<ProtectedRoute><GhostAdminRoute><CommercialModels /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/help" element={<ProtectedRoute><AdminRoute><Help /></AdminRoute></ProtectedRoute>} />
                    <Route path="/admin/super-help" element={<ProtectedRoute><GhostAdminRoute><SuperAdminHelp /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/release-guide" element={<ProtectedRoute><GhostAdminRoute><ReleaseManual /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/license-config" element={<ProtectedRoute><GhostAdminRoute><LicenseManagement /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/dev-guide" element={<ProtectedRoute><GhostAdminRoute><DeveloperGuide /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/update" element={<ProtectedRoute><GhostAdminRoute><SystemUpdate /></GhostAdminRoute></ProtectedRoute>} />
                    <Route path="/admin/energy-config" element={<ProtectedRoute><AdminRoute><ModuleGuard module={AppModule.ENERGY}><EnergyManagement /></ModuleGuard></AdminRoute></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
                    <Route path="/showcase" element={<Showcase />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </HashRouter>
            </ThemeProvider>
            </AuthProvider>
        </NotificationProvider>
    </ErrorBoundary>
  );
};
export default App;
