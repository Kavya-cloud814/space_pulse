import React, { useState } from 'react';
import { BrainCircuit, ChevronDown, ChevronUp, Lock, ShieldAlert, Unlock } from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';
import { AnalyticalFinding } from '../types/spacePulse';

const RISK_STYLE: Record<AnalyticalFinding['riskClassification'], string> = {
  Advisory: 'text-[#43D6A0] border-[#43D6A0]/40 bg-[#43D6A0]/10',
  Warning: 'text-[#FFC857] border-[#FFC857]/40 bg-[#FFC857]/10',
  Critical: 'text-[#FF5874] border-[#FF5874]/50 bg-[#FF5874]/15',
};

export const AnalysisView: React.FC = () => {
  const {
    activeAstronaut,
    latestWearable,
    latestEnv,
    envHistoryCurrentLocation,
    activeFindings,
    findingHistory,
    sensorHealth,
    unlockEvolvingBaseline,
    runDemoScenario,
    setActivePage,
  } = useSpacePulse();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const degradedCount = sensorHealth.filter((s) => s.status !== 'Healthy').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="cosmic-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#9277F5]">PHASE 3 · INTELLIGENT HEALTH &amp; ENVIRONMENTAL ANALYSIS · SIMULATED DATA</div>
          <h1 className="text-2xl font-bold text-[#F4F0FF] flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#9277F5]" />
            Individual Exposure &amp; Baseline Intelligence
          </h1>
          <p className="text-xs text-[#91A1B8]">
            Connects {activeAstronaut.name}&apos;s individual baselines and activity context with surrounding habitat &amp; personal sensors. Possible relationships never imply confirmed medical causation.
          </p>
        </div>

        <button
          onClick={() => setActivePage('alerts')}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#9277F5] to-[#E879C9] text-[#090D19] whitespace-nowrap self-start lg:self-auto"
        >
          View Phase 4 Alerts ({activeFindings.length})
        </button>
      </section>

      {/* Hybrid Individual Baselines + Context + Fixed vs Personal Sensor Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dual Baselines */}
        <div className="cosmic-panel-aubergine rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F4F0FF]">Hybrid Individual Baselines</h2>
            {activeAstronaut.evolvingBaseline.lockedForReview ? (
              <button
                onClick={() => unlockEvolvingBaseline(activeAstronaut.id)}
                className="text-[11px] font-mono text-[#FFC857] flex items-center gap-1 hover:underline"
              >
                <Lock className="w-3 h-3" /> Locked (Review)
              </button>
            ) : (
              <span className="text-[11px] font-mono text-[#43D6A0] flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Adapting
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#090D19]/60 p-3">
              <div className="text-[#658BAA] text-[10px]">PRE-MISSION HR</div>
              <div className="text-lg font-mono tabular-nums font-bold text-[#F3F8FB]">
                {activeAstronaut.preMissionBaseline.heartRate} <span className="text-[11px] font-normal">BPM</span>
              </div>
            </div>
            <div className="rounded-xl bg-[#090D19]/60 p-3">
              <div className="text-[#658BAA] text-[10px]">EVOLVING MISSION HR</div>
              <div className="text-lg font-mono tabular-nums font-bold text-[#C4B5FD]">
                {activeAstronaut.evolvingBaseline.heartRate} <span className="text-[11px] font-normal">BPM</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-[#91A1B8]">
            Current HR:{' '}
            <strong className="font-mono text-[#F3F8FB]">
              {latestWearable?.heartRate ?? 'Unavailable'} BPM
            </strong>{' '}
            · Activity: <strong className="text-[#36D6C4]">{activeAstronaut.activity}</strong>
          </div>
          {activeAstronaut.evolvingBaseline.lockReason && (
            <div className="text-[11px] text-[#FFC857] bg-[#FFC857]/10 rounded-lg p-2">
              {activeAstronaut.evolvingBaseline.lockReason}
            </div>
          )}
        </div>

        {/* Fixed vs Personal Sensors */}
        <div className="cosmic-panel rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F4F0FF]">Fixed vs Personal Environmental Sensors</h2>
          {!latestEnv ? (
            <div className="text-xs text-[#658BAA] py-6 text-center">Awaiting simulated sensor data</div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[#090D19]/60 p-2.5">
                <span className="text-[#91A1B8]">Fixed Habitat AQI</span>
                <span className="font-mono text-[#36D6C4]">{latestEnv.inside.airQuality.value} AQI</span>
              </div>
              <div className="flex justify-between rounded-lg bg-[#090D19]/60 p-2.5">
                <span className="text-[#91A1B8]">Personal Badge Dust</span>
                <span className="font-mono text-[#E879C9]">{latestEnv.personalSensor.dustExposure} mg/m³</span>
              </div>
              <div className="text-[11px] text-[#91A1B8]">
                {latestEnv.personalSensor.discrepancyDetected ? (
                  <span className="text-[#FFC857]">{latestEnv.personalSensor.discrepancyNote}</span>
                ) : (
                  <span className="text-[#43D6A0]">Fixed and personal air sensors are consistent.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Reliability & Exposure Window */}
        <div className="cosmic-panel rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#F4F0FF]">Data Quality &amp; Exposure Window</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-[#090D19]/60 p-3">
              <div className="text-[#658BAA] text-[10px]">EXPOSURE SAMPLES</div>
              <div className="text-lg font-mono tabular-nums font-bold text-[#74C7E8]">
                {envHistoryCurrentLocation.length}
              </div>
            </div>
            <div className="rounded-xl bg-[#090D19]/60 p-3">
              <div className="text-[#658BAA] text-[10px]">SENSOR ISSUES</div>
              <div className={`text-lg font-mono tabular-nums font-bold ${degradedCount > 0 ? 'text-[#FFC857]' : 'text-[#43D6A0]'}`}>
                {degradedCount}
              </div>
            </div>
          </div>
          <div className="text-xs text-[#91A1B8]">
            {degradedCount > 0
              ? 'Missing or unreliable sensor streams are flagged as uncertain and never treated as normal.'
              : 'All wearable and habitat sensor streams validated cleanly.'}
          </div>
        </div>
      </section>

      {/* Active Intelligent Risk Reports (Passed to Phase 4) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#F4F0FF]">
            Active Intelligent Risk Reports (Phase 3 → Phase 4)
          </h2>
          <span className="text-xs font-mono text-[#658BAA]">SIMULATED DATA · NO MEDICAL DIAGNOSIS</span>
        </div>

        {activeFindings.length === 0 ? (
          <div className="cosmic-panel rounded-2xl p-6 text-center space-y-3">
            <div className="text-sm font-medium text-[#43D6A0]">
              No active risk findings detected for {activeAstronaut.name}
            </div>
            <p className="text-xs text-[#91A1B8]">
              Start the simulation or trigger a test scenario to observe how Phase 3 evaluates Environmental-only, Health-only, and Combined concerns.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                onClick={() => runDemoScenario('combined_co2_headache')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#9277F5]/25 text-[#C4B5FD] border border-[#9277F5]/40"
              >
                Test Combined CO₂ + Headache
              </button>
              <button
                onClick={() => runDemoScenario('co2_env_only')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FF9F43]/20 text-[#FF9F43] border border-[#FF9F43]/40"
              >
                Test Environmental-Only Alert
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeFindings.map((f) => {
              const isOpen = expandedId === f.findingId;
              return (
                <div key={f.findingId} className="cosmic-panel rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded border font-semibold ${RISK_STYLE[f.riskClassification]}`}>
                          {f.riskClassification}
                        </span>
                        <span className="text-[#74C7E8]">{f.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#91A1B8]">Score {f.riskScore}/100 (Demo)</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#91A1B8]">Confidence: {f.confidenceLabel}</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#F4F0FF]">{f.title}</h3>
                    </div>

                    <button
                      onClick={() => setExpandedId(isOpen ? null : f.findingId)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-[#F3F8FB] flex items-center gap-1 self-start"
                    >
                      {isOpen ? 'Hide Report' : 'Inspect Full Report'}
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-[#91A1B8] leading-relaxed">{f.explanation}</p>

                  {f.possibleRelationship && (
                    <div className="rounded-xl bg-[#9277F5]/15 border border-[#9277F5]/35 p-3 text-xs text-[#C4B5FD]">
                      <strong>Possible Relationship (Not Causation):</strong> {f.possibleRelationship}
                    </div>
                  )}

                  {f.uncertaintyNotes.length > 0 && (
                    <div className="rounded-xl bg-[#FFC857]/10 border border-[#FFC857]/35 p-3 text-xs text-[#FFC857] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{f.uncertaintyNotes.join(' ')}</div>
                    </div>
                  )}

                  {isOpen && (
                    <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1.5">
                        <div className="font-semibold text-[#F4F0FF]">Report Metadata &amp; Score Basis</div>
                        <div className="text-[#91A1B8]">Finding ID: <span className="font-mono">{f.findingId}</span></div>
                        <div className="text-[#91A1B8]">Astronaut: {f.astronautId} · Location: {f.locationName}</div>
                        <div className="text-[#91A1B8]">Score Formula: {f.riskScoreBreakdown}</div>
                        <div className="text-[#91A1B8]">Exposure Context: {f.exposureHistorySummary}</div>
                      </div>
                      <div className="rounded-xl bg-[#090D19]/60 p-3 space-y-1.5">
                        <div className="font-semibold text-[#F4F0FF]">Recommended Preventive Actions</div>
                        <ul className="list-disc pl-4 text-[#91A1B8] space-y-1">
                          {f.recommendedActions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Analytical History */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#F4F0FF]">Recent Analytical Records</h2>
        {findingHistory.length === 0 ? (
          <div className="text-xs text-[#658BAA]">No historical findings recorded yet.</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {findingHistory
              .slice()
              .reverse()
              .slice(0, 12)
              .map((h, idx) => (
                <div
                  key={`${h.findingId}-${idx}`}
                  className="rounded-xl bg-[#090D19]/55 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[#F3F8FB]">{h.title}</span>
                    <span className="text-[#91A1B8] ml-2">({h.locationName})</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#74C7E8]">
                    {h.riskClassification} · {h.category} · {new Date(h.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
};
