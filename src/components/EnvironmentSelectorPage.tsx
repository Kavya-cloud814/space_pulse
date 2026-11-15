import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, Globe2, MapPin, Navigation, Orbit, Rocket, ShieldAlert, Sparkles } from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';
import { ENVIRONMENT_PROFILES, LOCATIONS } from '../data/environments';
import { EnvironmentId } from '../types/spacePulse';

const ENV_ICON_MAP: Record<EnvironmentId, React.ReactNode> = {
  spacecraft: <Rocket className="w-5 h-5" />,
  iss: <Orbit className="w-5 h-5" />,
  lunar_rover: <Navigation className="w-5 h-5" />,
  moon_base: <Compass className="w-5 h-5" />,
  mars_base: <Globe2 className="w-5 h-5" />,
  earth: <MapPin className="w-5 h-5" />,
  mars_transit: <Sparkles className="w-5 h-5" />,
};

export const EnvironmentSelectorPage: React.FC = () => {
  const {
    currentEnvironmentId,
    currentLocationId,
    currentLocation,
    detectionSource,
    gpsState,
    detectWithBrowserGps,
    simulateGpsSuggestion,
    confirmSuggestedEnvironment,
    changeLocation,
    setActivePage,
    visitedLocationIds,
    envHistoryAll,
  } = useSpacePulse();

  const [selectedEnvCard, setSelectedEnvCard] = useState<EnvironmentId>(currentEnvironmentId);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const envOrder: EnvironmentId[] = [
    'mars_base',
    'moon_base',
    'lunar_rover',
    'iss',
    'spacecraft',
    'mars_transit',
    'earth',
  ];

  const activeProfile = ENVIRONMENT_PROFILES[currentEnvironmentId];
  const locationsForSelectedEnv = LOCATIONS.filter((l) => l.environmentId === selectedEnvCard);

  const detectionBadgeText =
    detectionSource === 'gps_auto'
      ? 'Detected Automatically Using GPS'
      : detectionSource === 'gps_overridden'
        ? 'Manually Overridden'
        : 'Manually Selected';

  return (
    <div className="space-y-6">
      {/* Compact Hero & Active Environment Banner */}
      <section className="cosmic-panel rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#74C7E8]">
            <span>PHASE 2 · ENVIRONMENT RECOGNITION</span>
            <span aria-hidden="true">·</span>
            <span>{detectionBadgeText}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F0FF]">
            Choose Your Mission Environment &amp; Base
          </h1>
          <p className="text-sm text-[#91A1B8]">
            Select where the astronaut is operating via GPS aid or manual pick. Switching bases starts a fresh location-specific sensor cycle while preserving prior records.
          </p>
        </div>

        <div className="cosmic-panel-ocean rounded-xl p-4 min-w-[270px] space-y-2">
          <div className="text-[11px] font-mono text-[#36D6C4]">ACTIVE PROFILE · SIMULATED DATA</div>
          <div className="text-lg font-semibold text-[#F4F0FF]">{currentLocation.name}</div>
          <div className="text-xs text-[#91A1B8]">
            {activeProfile.name} · {activeProfile.gravityLabel}
          </div>
          <button
            onClick={() => setActivePage('monitor')}
            className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#090D19] bg-gradient-to-r from-[#36D6C4] to-[#74C7E8] hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            Open Live Monitor <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* GPS Detection Aid Card */}
      <section className="cosmic-panel-aubergine rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E879C9]" />
              GPS Environment-Detection Aid
            </h2>
            <p className="text-xs text-[#91A1B8]">
              GPS assists environment recognition only—never a health measurement. Uncertain or ambiguous signals ask for your confirmation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={detectWithBrowserGps}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#090D19] bg-[#E879C9] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Detect via Device GPS
            </button>
            <button
              onClick={() => simulateGpsSuggestion('lunar_rover', false)}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-[#F3F8FB] border border-white/10 transition-colors whitespace-nowrap"
            >
              Test GPS: Lunar Rover
            </button>
            <button
              onClick={() => simulateGpsSuggestion('mars_base', true)}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-[#F3F8FB] border border-white/10 transition-colors whitespace-nowrap"
            >
              Test Ambiguous Signal
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#090D19]/60 border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#F3F8FB]">{gpsState.message}</div>
          {(gpsState.status === 'suggested' || gpsState.status === 'ambiguous') && gpsState.suggestedEnvironmentId && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={confirmSuggestedEnvironment}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#43D6A0] text-[#090D19] hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm {ENVIRONMENT_PROFILES[gpsState.suggestedEnvironmentId].shortName}
              </button>
              <button
                onClick={() => setSelectedEnvCard(gpsState.suggestedEnvironmentId!)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-[#91A1B8]"
              >
                Override Manually
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Step 1: Colorful Environment Picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F4F0FF]">1. Select Mission Environment</h2>
          <span className="text-xs text-[#91A1B8]">5 Core Space Environments + Earth &amp; Transit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {envOrder.map((envId) => {
            const prof = ENVIRONMENT_PROFILES[envId];
            const isActiveEnv = currentEnvironmentId === envId;
            const isSelected = selectedEnvCard === envId;
            return (
              <button
                key={envId}
                onClick={() => setSelectedEnvCard(envId)}
                className={`text-left rounded-2xl p-4 transition-all border ${
                  isSelected
                    ? 'bg-[#17243D]/95 border-[#36D6C4] shadow-lg shadow-[#36D6C4]/10 -translate-y-0.5'
                    : 'bg-[#17243D]/60 border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#090D19]"
                    style={{ backgroundColor: prof.accentHex }}
                  >
                    {ENV_ICON_MAP[envId]}
                  </span>
                  <span className="text-[11px] font-mono text-[#91A1B8]">
                    {isActiveEnv ? 'ACTIVE' : prof.isPrimaryFive ? 'MISSION' : 'SUPPORT'}
                  </span>
                </div>
                <div className="text-base font-semibold text-[#F4F0FF]">{prof.shortName}</div>
                <div className="text-xs text-[#91A1B8] mt-1">{prof.gravityLabel}</div>
                <div className="text-[11px] text-[#74C7E8] mt-2 truncate">
                  Risks: {prof.primaryHazards.slice(0, 2).join(' · ')}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Specific Base / Move to Another Base */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#F4F0FF]">
            2. Choose Specific Location / Move to Another Base ({ENVIRONMENT_PROFILES[selectedEnvCard].shortName})
          </h2>
          <span className="text-xs text-[#91A1B8]">
            Visited bases preserved in history: {visitedLocationIds.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locationsForSelectedEnv.map((loc) => {
            const isCurrent = loc.id === currentLocationId;
            const sampleCount = envHistoryAll.filter((e) => e.locationId === loc.id).length;

            return (
              <div
                key={loc.id}
                className={`cosmic-panel rounded-2xl p-5 flex flex-col justify-between gap-4 border ${
                  isCurrent ? 'border-[#36D6C4]' : 'border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#E7C6A5]">{loc.sector}</span>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-[#43D6A0]">● Current Location</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-[#F4F0FF]">{loc.name}</h3>
                  <p className="text-xs text-[#91A1B8]">{loc.shortDesc}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                    <div className="rounded-lg bg-[#090D19]/60 p-2">
                      <div className="text-[#658BAA] text-[10px]">EXT. RAD</div>
                      <div className="font-mono tabular-nums text-[#FF9F43] font-semibold">
                        {loc.baseOutside.radiation} mSv/d
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#090D19]/60 p-2">
                      <div className="text-[#658BAA] text-[10px]">EXT. TEMP</div>
                      <div className="font-mono tabular-nums text-[#74C7E8] font-semibold">
                        {loc.baseOutside.temperature} °C
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#090D19]/60 p-2">
                      <div className="text-[#658BAA] text-[10px]">HAB CO₂</div>
                      <div className="font-mono tabular-nums text-[#36D6C4] font-semibold">
                        {loc.baseInside.co2} ppm
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[11px] font-mono text-[#91A1B8]">
                    {sampleCount} saved readings
                  </span>
                  <button
                    onClick={() => {
                      changeLocation(loc.id, 'manual');
                      setActivePage('monitor');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-white/10 text-[#F3F8FB] hover:bg-white/15'
                        : 'bg-gradient-to-r from-[#36D6C4] to-[#668BFF] text-[#090D19] hover:opacity-95'
                    }`}
                  >
                    {isCurrent ? 'Go to Monitor' : 'Move Here & Start Cycle'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Expandable Phase 2 Risk & Monitoring Matrix (kept clean & optional) */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF9F43]" />
            <h3 className="text-sm font-semibold text-[#F4F0FF]">
              Activated Profile: {activeProfile.name}
            </h3>
          </div>
          <button
            onClick={() => setShowProfileDetails((v) => !v)}
            className="text-xs font-medium text-[#36D6C4] hover:underline"
          >
            {showProfileDetails ? 'Hide Risk Matrix' : 'View Risk & Sensor Matrix'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-[#090D19]/50 p-3">
            <div className="text-[#658BAA] mb-1">Priority Readings</div>
            <div className="text-[#F3F8FB]">{activeProfile.priorityReadings.join(' · ')}</div>
          </div>
          <div className="rounded-xl bg-[#090D19]/50 p-3">
            <div className="text-[#658BAA] mb-1">Immediate Risks</div>
            <div className="text-[#FFC857]">{activeProfile.immediateRisks.join(' · ')}</div>
          </div>
          <div className="rounded-xl bg-[#090D19]/50 p-3">
            <div className="text-[#658BAA] mb-1">Comms Profile</div>
            <div className="text-[#74C7E8]">{activeProfile.commsDelayLabel}</div>
          </div>
        </div>

        {showProfileDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-[#91A1B8]">
            <div className="rounded-xl bg-[#090D19]/50 p-3 space-y-1">
              <div className="text-[#F3F8FB] font-medium">Mandatory vs Optional Sensors</div>
              <div>Mandatory: {activeProfile.mandatorySensors.join(', ')}</div>
              <div>Optional: {activeProfile.optionalSensors.join(', ')}</div>
            </div>
            <div className="rounded-xl bg-[#090D19]/50 p-3 space-y-1">
              <div className="text-[#F3F8FB] font-medium">Cumulative Risks &amp; EVA Handling</div>
              <div>Cumulative: {activeProfile.cumulativeRisks.join(', ')}</div>
              <div>EVA Policy: {activeProfile.evaHandling}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
