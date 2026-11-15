import React from 'react';
import { AppPage, SpacePulseProvider, useSpacePulse } from './context/SpacePulseContext';
import { GalaxyBackground } from './components/GalaxyBackground';
import { IntroWalkthroughModal } from './components/IntroWalkthroughModal';
import { EnvironmentSelectorPage } from './components/EnvironmentSelectorPage';
import { MonitorDashboard } from './components/MonitorDashboard';
import { AnalysisView } from './components/AnalysisView';
import { AlertsAndCareView } from './components/AlertsAndCareView';
import { ReportsView } from './components/ReportsView';

const NAV_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'environment', label: 'Environment' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'alerts', label: 'Alerts & Care' },
  { id: 'reports', label: 'Reports' },
];

const SpacePulseShell: React.FC = () => {
  const {
    activePage,
    setActivePage,
    simStatus,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    currentLocation,
    activeAstronaut,
    alerts,
  } = useSpacePulse();

  const activeAlertCount = alerts.filter((a) => a.status !== 'Resolved').length;

  const handlePrimaryCta = () => {
    if (activePage === 'environment') {
      setActivePage('monitor');
      if (simStatus === 'idle') startSimulation();
      return;
    }
    if (simStatus === 'idle' || simStatus === 'stopped') startSimulation();
    else if (simStatus === 'running') pauseSimulation();
    else resumeSimulation();
  };

  const primaryCtaLabel =
    activePage === 'environment'
      ? 'Launch Monitor'
      : simStatus === 'running'
        ? 'Pause Stream'
        : simStatus === 'paused'
          ? 'Resume Stream'
          : 'Start Simulation';

  return (
    <div className="min-h-screen relative flex flex-col text-[#F3F8FB]">
      <GalaxyBackground />
      <IntroWalkthroughModal />

      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#090D19]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            onClick={() => setActivePage('environment')}
            className="text-lg sm:text-xl font-display font-bold tracking-tight text-[#F4F0FF] whitespace-nowrap shrink-0 hover:text-[#36D6C4] transition-colors"
          >
            SPACE PULSE
          </button>

          {/* Zone 2: 5 Clean Single-Line Nav Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 transition-colors border-b-2 ${
                    active
                      ? 'text-[#36D6C4] border-[#36D6C4]'
                      : 'text-[#91A1B8] border-transparent hover:text-[#F3F8FB]'
                  }`}
                >
                  {item.label}
                  {item.id === 'alerts' && activeAlertCount > 0 ? ` (${activeAlertCount})` : ''}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              onClick={handlePrimaryCta}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#090D19] bg-gradient-to-r from-[#36D6C4] to-[#74C7E8] hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </div>

        {/* Compact Mobile Navigation Row */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 pb-2.5">
          {NAV_ITEMS.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#36D6C4]/20 text-[#36D6C4]'
                    : 'bg-white/5 text-[#91A1B8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Subtle Workspace Context Strip below header */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#91A1B8] pb-2 border-b border-white/5">
          <div>
            Active Base: <strong className="text-[#F3F8FB]">{currentLocation.name}</strong>
            <span className="mx-2" aria-hidden="true">·</span>
            Crew: <strong className="text-[#36D6C4]">{activeAstronaut.id} ({activeAstronaut.name})</strong>
          </div>
          <div className="font-mono text-[11px] text-[#74C7E8]">
            SIMULATED DATA · VIRTUAL SENSOR DEMONSTRATION
          </div>
        </div>
      </div>

      {/* Main Content Stage */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {activePage === 'environment' && <EnvironmentSelectorPage />}
        {activePage === 'monitor' && <MonitorDashboard />}
        {activePage === 'analysis' && <AnalysisView />}
        {activePage === 'alerts' && <AlertsAndCareView />}
        {activePage === 'reports' && <ReportsView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <SpacePulseProvider>
      <SpacePulseShell />
    </SpacePulseProvider>
  );
}
