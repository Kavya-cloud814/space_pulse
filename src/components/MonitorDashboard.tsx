import React from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryLow,
  Compass,
  Droplets,
  Flame,
  HeartPulse,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';
import { ENVIRONMENT_PROFILES, ENVIRONMENTAL_EVENTS, LOCATIONS } from '../data/environments';
import { ActivityContext, SensorFailureMode, SymptomTag } from '../types/spacePulse';
import { DualTrendChart, EcgWaveformChart } from './Charts';

const ACTIVITIES: ActivityContext[] = ['Resting', 'Moderate Work', 'Exercise', 'EVA / Suited', 'Sleeping'];
const SYMPTOMS: SymptomTag[] = [
  'Headache',
  'Respiratory Discomfort',
  'Fatigue',
  'Dizziness',
  'Nausea',
  'Mild Dehydration',
];

const FAILURE_MODES: Array<{ value: SensorFailureMode; label: string }> = [
  { value: 'none', label: 'Healthy' },
  { value: 'stopped', label: 'Stopped Sending' },
  { value: 'inconsistent', label: 'Inconsistent / Spikes' },
  { value: 'frozen', label: 'Frozen / Repeated' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'low_battery', label: 'Low Battery' },
  { value: 'transmission_interrupted', label: 'Tx Interrupted' },
  { value: 'delayed', label: 'Delayed' },
];

export const MonitorDashboard: React.FC = () => {
  const {
    currentEnvironmentId,
    currentLocationId,
    currentLocation,
    changeLocation,
    setActivePage,
    openIntroModal,
    simStatus,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    activeEventIds,
    returningToNormal,
    triggerEnvironmentalEvent,
    returnToNormalConditions,
    astronauts,
    activeAstronautId,
    activeAstronaut,
    setActiveAstronautId,
    updateAstronautHealth,
    toggleSymptom,
    setActivityContext,
    latestWearable,
    wearableHistory,
    latestEnv,
    envHistoryCurrentLocation,
    sensorHealth,
    setSensorFailureMode,
    activeFindings,
    runDemoScenario,
  } = useSpacePulse();

  const envProfile = ENVIRONMENT_PROFILES[currentEnvironmentId];
  const locationEvents = ENVIRONMENTAL_EVENTS.filter((e) => e.environmentIds.includes(currentEnvironmentId));
  const astroWearables = wearableHistory.filter((w) => w.astronautId === activeAstronautId);
  const previousEnv = envHistoryCurrentLocation.length >= 2 ? envHistoryCurrentLocation[envHistoryCurrentLocation.length - 2] : null;

  const isHeartAbnormal =
    latestWearable?.heartRate != null &&
    activeAstronaut.activity !== 'Exercise' &&
    Math.abs(latestWearable.heartRate - activeAstronaut.preMissionBaseline.heartRate) >= 15;

  const sensorBadgeColor = (status: string) => {
    if (status === 'Healthy') return 'text-[#43D6A0]';
    if (status === 'Low Battery' || status === 'Delayed') return 'text-[#FFC857]';
    return 'text-[#FF5874]';
  };

  return (
    <div className="space-y-6">
      {/* Top Location + Simulation Control Bar */}
      <section className="cosmic-panel rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#36D6C4]">
            <span>SIMULATED DATA</span>
            <span aria-hidden="true">·</span>
            <span>STATUS: {simStatus.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span>{envProfile.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[#F4F0FF]">{currentLocation.name}</h1>
            <select
              aria-label="Move to Another Base"
              value={currentLocationId}
              onChange={(e) => changeLocation(e.target.value, 'manual')}
              className="rounded-lg bg-[#090D19]/80 border border-white/15 px-3 py-1.5 text-xs text-[#F3F8FB] focus:outline-none focus:border-[#36D6C4]"
            >
              {LOCATIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  Move to: {l.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setActivePage('environment')}
              className="text-xs font-medium text-[#74C7E8] hover:underline flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" /> GPS / Base Chooser
            </button>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {simStatus === 'idle' || simStatus === 'stopped' ? (
            <button
              onClick={startSimulation}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#36D6C4] to-[#20BFA9] text-[#090D19] hover:opacity-95 flex items-center gap-1.5 shadow-lg shadow-[#36D6C4]/20"
            >
              <Play className="w-3.5 h-3.5" /> Start Simulation
            </button>
          ) : simStatus === 'running' ? (
            <button
              onClick={pauseSimulation}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FFC857] text-[#090D19] hover:opacity-95 flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button
              onClick={resumeSimulation}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#43D6A0] text-[#090D19] hover:opacity-95 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}

          <button
            onClick={stopSimulation}
            disabled={simStatus === 'idle' || simStatus === 'stopped'}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 disabled:opacity-40 text-[#F3F8FB] border border-white/10 flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>

          <button
            onClick={returnToNormalConditions}
            disabled={activeEventIds.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[#668BFF]/20 hover:bg-[#668BFF]/30 disabled:opacity-40 text-[#74C7E8] border border-[#668BFF]/30 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {returningToNormal ? 'Restoring Normal...' : 'Return to Normal'}
          </button>

          <button
            onClick={openIntroModal}
            title="Watch Simulation Walkthrough"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#91A1B8] hover:text-[#F3F8FB] border border-white/10"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Playful Quick Demo Scenarios Strip */}
      <section className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#91A1B8] font-medium mr-1">Quick Scenarios:</span>
        {[
          { id: 'normal', label: 'Normal Baseline' },
          { id: 'co2_env_only', label: 'CO₂ Spike (Env Only)' },
          { id: 'combined_co2_headache', label: 'CO₂ + Headache + HR' },
          { id: 'exercise_context', label: 'Exercise HR Context' },
          { id: 'sensor_discrepancy', label: 'Fixed vs Personal Sensor' },
          { id: 'gradual_hr_drift', label: 'Gradual HR Drift' },
          { id: 'sensor_failure', label: 'HR Sensor Drop' },
        ].map((sc) => (
          <button
            key={sc.id}
            onClick={() => runDemoScenario(sc.id)}
            className="px-3 py-1.5 rounded-lg bg-[#17243D]/80 hover:bg-[#241B35] border border-white/10 hover:border-[#9277F5]/60 text-[#F3F8FB] transition-colors whitespace-nowrap"
          >
            {sc.label}
          </button>
        ))}
      </section>

      {/* Editable Astronaut Health Conditions & Context Panel */}
      <section className="cosmic-panel-aubergine rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#E879C9]" />
            <h2 className="text-base font-semibold text-[#F4F0FF]">
              Editable Health Conditions &amp; Astronaut Context
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Astronaut Switcher */}
            <select
              aria-label="Select Astronaut"
              value={activeAstronautId}
              onChange={(e) => setActiveAstronautId(e.target.value)}
              className="rounded-lg bg-[#090D19]/80 border border-white/15 px-3 py-1.5 text-xs text-[#F3F8FB]"
            >
              {astronauts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} · {a.name}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                updateAstronautHealth(activeAstronautId, (p) => ({
                  ...p,
                  editableOverrides: { ...p.editableOverrides, enabled: !p.editableOverrides.enabled },
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeAstronaut.editableOverrides.enabled
                  ? 'bg-[#E879C9] text-[#090D19]'
                  : 'bg-white/10 text-[#F3F8FB] hover:bg-white/15'
              }`}
            >
              {activeAstronaut.editableOverrides.enabled ? 'Manual Vitals: ON' : 'Auto Simulator: ON'}
            </button>
          </div>
        </div>

        {/* Sliders for live editable health metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#090D19]/55 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#91A1B8]">Heart Rate</span>
              <span className="font-mono tabular-nums text-[#E879C9] font-semibold">
                {activeAstronaut.editableOverrides.heartRate} BPM
              </span>
            </div>
            <input
              type="range"
              min={45}
              max={155}
              value={activeAstronaut.editableOverrides.heartRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateAstronautHealth(activeAstronautId, (p) => ({
                  ...p,
                  editableOverrides: { ...p.editableOverrides, enabled: true, heartRate: v },
                }));
              }}
              className="w-full cosmic-slider"
            />
          </div>

          <div className="rounded-xl bg-[#090D19]/55 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#91A1B8]">Blood Oxygen (SpO₂)</span>
              <span className="font-mono tabular-nums text-[#36D6C4] font-semibold">
                {activeAstronaut.editableOverrides.spo2}%
              </span>
            </div>
            <input
              type="range"
              min={86}
              max={100}
              step={0.2}
              value={activeAstronaut.editableOverrides.spo2}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateAstronautHealth(activeAstronautId, (p) => ({
                  ...p,
                  editableOverrides: { ...p.editableOverrides, enabled: true, spo2: v },
                }));
              }}
              className="w-full cosmic-slider"
            />
          </div>

          <div className="rounded-xl bg-[#090D19]/55 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#91A1B8]">Body Temp</span>
              <span className="font-mono tabular-nums text-[#FF9F43] font-semibold">
                {activeAstronaut.editableOverrides.bodyTemp}°C
              </span>
            </div>
            <input
              type="range"
              min={35.0}
              max={39.5}
              step={0.1}
              value={activeAstronaut.editableOverrides.bodyTemp}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateAstronautHealth(activeAstronautId, (p) => ({
                  ...p,
                  editableOverrides: { ...p.editableOverrides, enabled: true, bodyTemp: v },
                }));
              }}
              className="w-full cosmic-slider"
            />
          </div>

          <div className="rounded-xl bg-[#090D19]/55 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#91A1B8]">Hydration Level</span>
              <span className="font-mono tabular-nums text-[#74C7E8] font-semibold">
                {activeAstronaut.hydrationLevelPct}%
              </span>
            </div>
            <input
              type="range"
              min={45}
              max={100}
              value={activeAstronaut.hydrationLevelPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateAstronautHealth(activeAstronautId, (p) => ({
                  ...p,
                  hydrationLevelPct: v,
                }));
              }}
              className="w-full cosmic-slider"
            />
          </div>
        </div>

        {/* Activity Context & Reported Symptoms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <div className="text-xs text-[#91A1B8]">Current Activity Context (Context-Aware Analysis)</div>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITIES.map((act) => (
                <button
                  key={act}
                  onClick={() => setActivityContext(act)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeAstronaut.activity === act
                      ? 'bg-[#36D6C4] text-[#090D19] font-semibold'
                      : 'bg-white/5 text-[#91A1B8] hover:text-[#F3F8FB]'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-[#91A1B8]">Reported Symptoms (Toggle to Test Correlation)</div>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((sym) => {
                const active = activeAstronaut.reportedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#FF5874] text-white font-semibold'
                        : 'bg-white/5 text-[#91A1B8] hover:text-[#F3F8FB]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Wearable Health Monitoring */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#F4F0FF] flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#36D6C4]" />
            Astronaut Health Dashboard · {activeAstronaut.name}
          </h2>
          <span className="text-xs font-mono text-[#658BAA]">
            SIMULATED DATA · {latestWearable ? new Date(latestWearable.timestamp).toLocaleTimeString() : 'Awaiting simulated sensor data'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Heart Rate + ECG */}
          <div className={`cosmic-panel rounded-2xl p-4 space-y-3 ${isHeartAbnormal ? 'border-[#FFC857]/60' : ''}`}>
            <div className="flex items-center justify-between text-xs text-[#91A1B8]">
              <span>Heart Rate &amp; ECG</span>
              <span className="font-mono text-[#36D6C4]">
                {latestWearable?.dataQuality.heartRate ?? 'Waiting'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono tabular-nums font-bold text-[#F4F0FF]">
                {latestWearable?.heartRate !== null && latestWearable?.heartRate !== undefined
                  ? latestWearable.heartRate
                  : '--'}
              </span>
              <span className="text-xs font-mono text-[#91A1B8]">BPM</span>
              <span className="ml-auto text-xs text-[#74C7E8]">
                Base: {activeAstronaut.preMissionBaseline.heartRate}
              </span>
            </div>
            <EcgWaveformChart
              points={latestWearable?.ecgPoints ?? []}
              rhythm={latestWearable?.ecgRhythm ?? 'Signal Unavailable'}
              heartRate={latestWearable?.heartRate ?? null}
            />
          </div>

          {/* SpO2 & Respiratory */}
          <div className="cosmic-panel rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#91A1B8]">
                <span>Blood Oxygen (SpO₂)</span>
                <span className="font-mono text-[#43D6A0]">
                  {latestWearable?.dataQuality.spo2 ?? 'Waiting'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono tabular-nums font-bold text-[#36D6C4]">
                  {latestWearable?.spo2 !== null && latestWearable?.spo2 !== undefined
                    ? latestWearable.spo2
                    : '--'}
                </span>
                <span className="text-xs font-mono text-[#91A1B8]">%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#91A1B8]">
                <span>Respiratory Rate</span>
                <Wind className="w-3.5 h-3.5 text-[#74C7E8]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono tabular-nums font-bold text-[#F4F0FF]">
                  {latestWearable?.respiratoryRate !== null && latestWearable?.respiratoryRate !== undefined
                    ? latestWearable.respiratoryRate
                    : '--'}
                </span>
                <span className="text-xs font-mono text-[#91A1B8]">breaths/min</span>
              </div>
            </div>
          </div>

          {/* Body Temp & Motion */}
          <div className="cosmic-panel rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#91A1B8]">
                <span>Body Temperature</span>
                <Thermometer className="w-3.5 h-3.5 text-[#FF9F43]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono tabular-nums font-bold text-[#FF9F43]">
                  {latestWearable?.bodyTemp !== null && latestWearable?.bodyTemp !== undefined
                    ? latestWearable.bodyTemp
                    : '--'}
                </span>
                <span className="text-xs font-mono text-[#91A1B8]">°C</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs text-[#91A1B8]">
                <span>Motion &amp; Activity</span>
                <Activity className="w-3.5 h-3.5 text-[#E879C9]" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-[#F4F0FF]">{activeAstronaut.activity}</span>
                <span className="text-xs font-mono tabular-nums text-[#E879C9]">
                  {latestWearable ? `${latestWearable.motionLevel}% load` : 'Awaiting'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Environmental Conditions (Outside Environment vs Inside Habitat) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Outside Environment */}
        <div className="cosmic-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F4F0FF]">Outside Environment</h2>
              <p className="text-xs text-[#91A1B8]">External conditions around {currentLocation.name} (isolated from cabin)</p>
            </div>
            <span className="text-[11px] font-mono text-[#FF9F43]">EXTERIOR</span>
          </div>

          {!latestEnv ? (
            <div className="py-8 text-center text-xs text-[#658BAA]">Awaiting simulated sensor data</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1">
                <div className="text-[#91A1B8]">External Radiation</div>
                <div className="text-xl font-mono tabular-nums font-bold text-[#FF9F43]">
                  {latestEnv.outside.radiation.value !== null ? `${latestEnv.outside.radiation.value}` : 'Unavailable'}
                  <span className="text-xs font-normal text-[#91A1B8] ml-1">mSv/day</span>
                </div>
                <div className="text-[11px] text-[#658BAA]">{latestEnv.outside.radiation.quality}</div>
              </div>

              <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1">
                <div className="text-[#91A1B8]">External Dust / Particles</div>
                <div className="text-xl font-mono tabular-nums font-bold text-[#E7C6A5]">
                  {!latestEnv.outside.dust.applicable
                    ? 'Not applicable'
                    : latestEnv.outside.dust.value !== null
                      ? `${latestEnv.outside.dust.value} mg/m³`
                      : 'Unavailable'}
                </div>
                <div className="text-[11px] text-[#658BAA]">
                  {latestEnv.outside.dust.applicable ? latestEnv.outside.dust.quality : 'Orbital vacuum'}
                </div>
              </div>

              <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1">
                <div className="text-[#91A1B8]">External Temperature</div>
                <div className="text-xl font-mono tabular-nums font-bold text-[#74C7E8]">
                  {latestEnv.outside.temperature.value}
                  <span className="text-xs font-normal text-[#91A1B8] ml-1">°C</span>
                </div>
                <div className="text-[11px] text-[#658BAA]">Surface / orbital ambient</div>
              </div>

              <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1">
                <div className="text-[#91A1B8]">External Atmosphere</div>
                <div className="text-sm font-mono font-semibold text-[#F3F8FB]">
                  {latestEnv.outside.atmosphere.applicable
                    ? `${latestEnv.outside.atmosphere.value} kPa`
                    : 'Not applicable'}
                </div>
                <div className="text-[11px] text-[#658BAA]">{latestEnv.outside.atmosphere.note}</div>
              </div>
            </div>
          )}
        </div>

        {/* Inside Habitat */}
        <div className="cosmic-panel-ocean rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F4F0FF]">Inside Habitat</h2>
              <p className="text-xs text-[#91A1B8]">Protected living &amp; working space · Fixed + Personal sensors</p>
            </div>
            <span className="text-[11px] font-mono text-[#36D6C4]">HABITAT</span>
          </div>

          {!latestEnv ? (
            <div className="py-8 text-center text-xs text-[#658BAA]">Awaiting simulated sensor data</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                {
                  label: 'CO₂ Concentration',
                  val: latestEnv.inside.co2.value !== null ? `${latestEnv.inside.co2.value}` : 'Unavailable',
                  unit: 'ppm',
                  warn: (latestEnv.inside.co2.value ?? 0) >= 3000,
                },
                {
                  label: 'Oxygen (O₂)',
                  val: `${latestEnv.inside.oxygen.value}`,
                  unit: '%',
                  warn: (latestEnv.inside.oxygen.value ?? 21) < 19.5,
                },
                {
                  label: 'Air Quality',
                  val: `${latestEnv.inside.airQuality.value}`,
                  unit: 'AQI',
                  warn: (latestEnv.inside.airQuality.value ?? 0) >= 90,
                },
                {
                  label: 'Habitat Temp',
                  val: `${latestEnv.inside.temperature.value}`,
                  unit: '°C',
                  warn: false,
                },
                {
                  label: 'Humidity',
                  val: `${latestEnv.inside.humidity.value}`,
                  unit: '%RH',
                  warn: false,
                },
                {
                  label: 'Pressure',
                  val: `${latestEnv.inside.pressure.value}`,
                  unit: 'kPa',
                  warn: (latestEnv.inside.pressure.value ?? 101) < 62,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className={`rounded-xl bg-[#090D19]/60 p-3 space-y-1 border ${
                    m.warn ? 'border-[#FFC857]/60' : 'border-transparent'
                  }`}
                >
                  <div className="text-[#91A1B8] truncate">{m.label}</div>
                  <div className={`text-lg font-mono tabular-nums font-bold ${m.warn ? 'text-[#FFC857]' : 'text-[#F3F8FB]'}`}>
                    {m.val} <span className="text-[11px] font-normal text-[#91A1B8]">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {latestEnv?.personalSensor.discrepancyDetected && (
            <div className="rounded-xl bg-[#FFC857]/15 border border-[#FFC857]/40 p-3 text-xs text-[#FFC857] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{latestEnv.personalSensor.discrepancyNote}</span>
            </div>
          )}
        </div>
      </section>

      {/* Environmental Events Simulator (Location-Filtered) */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FF9F43]" />
              Environmental Events ({envProfile.shortName})
            </h2>
            <p className="text-xs text-[#91A1B8]">
              Trigger realistic simulated events for {currentLocation.name} and watch readings change live.
            </p>
          </div>
          {activeEventIds.length > 0 && (
            <button
              onClick={returnToNormalConditions}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#43D6A0] text-[#090D19]"
            >
              Return to Normal Conditions
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {locationEvents.map((ev) => {
            const isActive = activeEventIds.includes(ev.id);
            return (
              <div
                key={ev.id}
                className={`rounded-xl p-4 border flex flex-col justify-between gap-3 ${
                  isActive
                    ? 'bg-[#CD7055]/20 border-[#FF9F43]'
                    : 'bg-[#090D19]/55 border-white/10'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#FF9F43]">{ev.affectedTarget.toUpperCase()}</span>
                    <span className={isActive ? 'text-[#FFC857] font-semibold' : 'text-[#658BAA]'}>
                      {isActive ? 'ACTIVE · SIMULATED' : ev.severityHint}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[#F4F0FF]">{ev.title}</div>
                  <p className="text-xs text-[#91A1B8]">{ev.summary}</p>
                </div>

                <button
                  onClick={() => triggerEnvironmentalEvent(ev.id)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#FF9F43]/25 text-[#FF9F43] border border-[#FF9F43]/50'
                      : 'bg-white/10 hover:bg-white/15 text-[#F3F8FB]'
                  }`}
                >
                  {isActive ? 'Event Running' : 'Trigger Event'}
                </button>
              </div>
            );
          })}
        </div>

        {activeEventIds.length > 0 && latestEnv && previousEnv && (
          <div className="rounded-xl bg-[#090D19]/60 border border-white/10 p-3 text-xs text-[#91A1B8] flex flex-wrap gap-4">
            <span className="text-[#F3F8FB] font-medium">Delta vs Previous Cycle:</span>
            <span>
              Ext Dust: {previousEnv.outside.dust.value ?? 'N/A'} →{' '}
              <strong className="text-[#FF9F43]">{latestEnv.outside.dust.value ?? 'N/A'}</strong>
            </span>
            <span>
              Ext Rad: {previousEnv.outside.radiation.value ?? 'N/A'} →{' '}
              <strong className="text-[#FF9F43]">{latestEnv.outside.radiation.value ?? 'N/A'}</strong>
            </span>
            <span>
              Hab CO₂: {previousEnv.inside.co2.value ?? 'N/A'} →{' '}
              <strong className="text-[#36D6C4]">{latestEnv.inside.co2.value ?? 'N/A'} ppm</strong>
            </span>
          </div>
        )}
      </section>

      {/* Sensor Health Monitoring & Failure Simulation */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#43D6A0]" />
            Sensor Health Monitoring (Failure &amp; Recovery)
          </h2>
          <span className="text-xs text-[#91A1B8]">
            Test how SPACE PULSE isolates sensor faults from health emergencies
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sensorHealth.map((s) => (
            <div key={s.sensorId} className="rounded-xl bg-[#090D19]/60 border border-white/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#F4F0FF] truncate">{s.name}</div>
                <span className={`text-[11px] font-mono font-semibold whitespace-nowrap ${sensorBadgeColor(s.status)}`}>
                  {s.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#91A1B8] font-mono">
                <span>{s.sensorId}</span>
                {s.batteryPct !== null && (
                  <span className="flex items-center gap-1">
                    <BatteryLow className="w-3 h-3" /> {s.batteryPct}%
                  </span>
                )}
              </div>
              <select
                aria-label={`Simulate failure for ${s.name}`}
                value={s.failureMode}
                onChange={(e) => setSensorFailureMode(s.sensorId, e.target.value as SensorFailureMode)}
                className="w-full rounded-lg bg-[#17243D] border border-white/15 px-2.5 py-1.5 text-xs text-[#F3F8FB]"
              >
                {FAILURE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    Mode: {m.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Historical Charts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F4F0FF]">
            Live &amp; Historical Trends ({currentLocation.name})
          </h2>
          <span className="text-xs text-[#91A1B8] flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-[#74C7E8]" />
            {activeFindings.length} active analytical finding(s)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DualTrendChart
            title="Heart Rate & SpO₂ Trends"
            timestamps={astroWearables.map((w) => w.timestamp)}
            series={[
              { label: 'Heart Rate', color: '#E879C9', unit: 'BPM', values: astroWearables.map((w) => w.heartRate) },
              { label: 'SpO₂', color: '#36D6C4', unit: '%', values: astroWearables.map((w) => w.spo2) },
            ]}
          />
          <DualTrendChart
            title="Body Temp & Breathing Rate"
            timestamps={astroWearables.map((w) => w.timestamp)}
            series={[
              { label: 'Body Temp', color: '#FF9F43', unit: '°C', values: astroWearables.map((w) => w.bodyTemp) },
              { label: 'Resp Rate', color: '#74C7E8', unit: 'br/m', values: astroWearables.map((w) => w.respiratoryRate) },
            ]}
          />
          <DualTrendChart
            title="Habitat CO₂ & Oxygen"
            timestamps={envHistoryCurrentLocation.map((e) => e.timestamp)}
            series={[
              { label: 'CO₂', color: '#FFC857', unit: 'ppm', values: envHistoryCurrentLocation.map((e) => e.inside.co2.value) },
              { label: 'Oxygen', color: '#43D6A0', unit: '%', values: envHistoryCurrentLocation.map((e) => e.inside.oxygen.value) },
            ]}
          />
          <DualTrendChart
            title="External Radiation & Dust"
            timestamps={envHistoryCurrentLocation.map((e) => e.timestamp)}
            series={[
              { label: 'Radiation', color: '#9277F5', unit: 'mSv/d', values: envHistoryCurrentLocation.map((e) => e.outside.radiation.value) },
              { label: 'Dust', color: '#CD7055', unit: 'mg/m³', values: envHistoryCurrentLocation.map((e) => e.outside.dust.value) },
            ]}
          />
        </div>
      </section>
    </div>
  );
};
