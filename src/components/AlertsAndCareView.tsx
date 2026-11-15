import React, { useMemo, useState } from 'react';
import { Bell, CheckCircle2, ClipboardCheck, Radio, ShieldAlert, Stethoscope } from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';
import { EMERGENCY_PROCEDURES } from '../data/environments';
import { AlertStatus, CommsStatus, ConcernCategory, RiskLevel } from '../types/spacePulse';

const LEVEL_COLORS: Record<RiskLevel, string> = {
  Advisory: 'text-[#43D6A0] border-[#43D6A0]/40 bg-[#43D6A0]/10',
  Warning: 'text-[#FFC857] border-[#FFC857]/40 bg-[#FFC857]/10',
  Critical: 'text-[#FF5874] border-[#FF5874]/50 bg-[#FF5874]/15',
};

const COMMS_OPTIONS: CommsStatus[] = [
  'Connected',
  'Delayed',
  'Limited Connectivity',
  'Offline — Data Queued',
];

export const AlertsAndCareView: React.FC = () => {
  const {
    alerts,
    recommendations,
    acknowledgeAlert,
    acknowledgeRecommendation,
    updateRecommendationStatus,
    addGroundMedicalNote,
    commsStatus,
    setCommsStatus,
    commsQueue,
    completedProcedureSteps,
    toggleProcedureStep,
    currentLocationId,
  } = useSpacePulse();

  const [levelFilter, setLevelFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [catFilter, setCatFilter] = useState<'ALL' | ConcernCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertStatus>('ALL');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [openProcId, setOpenProcId] = useState<string>(EMERGENCY_PROCEDURES[0].id);

  const activeCurrentAlerts = useMemo(
    () => alerts.filter((a) => a.locationId === currentLocationId && a.status !== 'Resolved'),
    [alerts, currentLocationId]
  );

  const groundAlerts = useMemo(
    () => alerts.filter((a) => (a.level === 'Warning' || a.level === 'Critical') && a.status !== 'Resolved'),
    [alerts]
  );

  const filteredHistory = useMemo(() => {
    return alerts.filter((a) => {
      if (levelFilter !== 'ALL' && a.level !== levelFilter) return false;
      if (catFilter !== 'ALL' && a.category !== catFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      return true;
    });
  }, [alerts, levelFilter, catFilter, statusFilter]);

  const queuedCount = commsQueue.filter((q) => q.status === 'Queued').length;

  return (
    <div className="space-y-6">
      {/* Comms Delay & Offline Queue Banner (Phase 5) */}
      <section className="cosmic-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#74C7E8]">
            PHASE 4 &amp; 5 · AUTOMATED ALERTS &amp; PREVENTIVE CARE · SIMULATED DATA (IN-APP DEMO ONLY)
          </div>
          <h1 className="text-2xl font-bold text-[#F4F0FF]">
            Notifications, Preventive Care &amp; Emergency Support
          </h1>
          <p className="text-xs text-[#91A1B8]">
            Powered directly by Phase 3 findings. No real ground personnel or emergency services are contacted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Radio className="w-4 h-4 text-[#36D6C4]" />
          <select
            aria-label="Communication Link Status"
            value={commsStatus}
            onChange={(e) => setCommsStatus(e.target.value as CommsStatus)}
            className="rounded-lg bg-[#090D19]/80 border border-white/15 px-3 py-2 text-xs text-[#F3F8FB]"
          >
            {COMMS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                Comms: {c}
              </option>
            ))}
          </select>
          <span className="text-xs font-mono text-[#FFC857]">
            Queued: {queuedCount}
          </span>
        </div>
      </section>

      {/* Two-Column: Astronaut Notifications vs Ground Medical Team Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Astronaut Notification Panel (Levels 1, 2, 3) */}
        <div className="cosmic-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#36D6C4]" />
              Astronaut Notifications (Levels 1–3)
            </h2>
            <span className="text-xs font-mono text-[#91A1B8]">{activeCurrentAlerts.length} active</span>
          </div>

          {activeCurrentAlerts.length === 0 ? (
            <div className="rounded-xl bg-[#090D19]/50 p-6 text-center text-xs text-[#658BAA]">
              No active notifications at current location.
            </div>
          ) : (
            <div className="space-y-3">
              {activeCurrentAlerts.map((a) => (
                <div key={a.alertId} className="rounded-xl bg-[#090D19]/65 border border-white/10 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${LEVEL_COLORS[a.level]}`}>
                      {a.level} · {a.category}
                    </span>
                    <span className="text-[11px] font-mono text-[#91A1B8]">
                      {a.status} · {a.commsDeliveryStatus}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-[#F4F0FF]">{a.title}</div>
                  <p className="text-xs text-[#91A1B8]">{a.explanation}</p>

                  {a.possibleRelationship && (
                    <div className="text-[11px] text-[#C4B5FD] bg-[#9277F5]/10 rounded-lg p-2">
                      {a.possibleRelationship}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#74C7E8]">
                    <span>
                      {a.astronautId} · {a.locationName} · {new Date(a.detectedAt).toLocaleTimeString()}
                    </span>
                    {a.status === 'Active' ? (
                      <button
                        onClick={() => acknowledgeAlert(a.alertId)}
                        className="px-3 py-1 rounded-lg bg-[#36D6C4] text-[#090D19] font-semibold"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-[#43D6A0] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged (Not Resolved)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ground Medical Team Panel (Levels 2 & 3 Only) */}
        <div className="cosmic-panel-aubergine rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#E879C9]" />
              Ground Medical Team Panel (Levels 2 &amp; 3)
            </h2>
            <span className="text-[11px] font-mono text-[#E879C9]">IN-APP DEMO</span>
          </div>

          {groundAlerts.length === 0 ? (
            <div className="rounded-xl bg-[#090D19]/50 p-6 text-center text-xs text-[#658BAA]">
              No Warning or Critical escalations queued for Ground Medical Team.
            </div>
          ) : (
            <div className="space-y-3">
              {groundAlerts.map((a) => {
                const linkedRec = recommendations.find((r) => r.alertId === a.alertId);
                return (
                  <div key={a.alertId} className="rounded-xl bg-[#090D19]/65 border border-[#E879C9]/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className={a.level === 'Critical' ? 'text-[#FF5874] font-semibold' : 'text-[#FFC857] font-semibold'}>
                        {a.level.toUpperCase()} ESCALATION · {a.astronautId}
                      </span>
                      <span className="text-[#91A1B8]">{a.commsDeliveryStatus}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#F4F0FF]">{a.title}</div>
                    <div className="text-xs text-[#91A1B8]">{a.explanation}</div>
                    {a.sensorReliabilityNotes.length > 0 && (
                      <div className="text-[11px] text-[#FFC857]">
                        Data quality note: {a.sensorReliabilityNotes.join(', ')}
                      </div>
                    )}

                    {linkedRec && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="text-[11px] text-[#74C7E8]">
                          Care Status: {linkedRec.status} · Astronaut Ack: {linkedRec.acknowledgedAt ? 'Yes' : 'Pending'}
                        </div>
                        {linkedRec.groundNotes.map((gn, idx) => (
                          <div key={idx} className="text-[11px] text-[#C4B5FD] bg-white/5 rounded px-2 py-1">
                            Medical Note: {gn}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add mission-approved ground guidance..."
                            value={noteDrafts[linkedRec.recommendationId] ?? ''}
                            onChange={(e) =>
                              setNoteDrafts((d) => ({ ...d, [linkedRec.recommendationId]: e.target.value }))
                            }
                            className="flex-1 rounded-lg bg-[#17243D] border border-white/15 px-2.5 py-1.5 text-xs text-[#F3F8FB]"
                          />
                          <button
                            onClick={() => {
                              addGroundMedicalNote(
                                linkedRec.recommendationId,
                                noteDrafts[linkedRec.recommendationId] ?? ''
                              );
                              setNoteDrafts((d) => ({ ...d, [linkedRec.recommendationId]: '' }));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#E879C9] text-[#090D19] text-xs font-semibold"
                          >
                            Log Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Phase 5 Preventive Recommendations */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FFC857]" />
            Preventive Recommendations (Phase 5)
          </h2>
          <span className="text-xs text-[#91A1B8]">Follows strict treatment boundaries — no diagnosis or prescriptions</span>
        </div>

        {recommendations.filter((r) => r.status !== 'Resolved').length === 0 ? (
          <div className="rounded-xl bg-[#090D19]/50 p-5 text-center text-xs text-[#658BAA]">
            No active recommendations. Routine monitoring normal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations
              .filter((r) => r.status !== 'Resolved')
              .map((rec) => (
                <div key={rec.recommendationId} className="rounded-xl bg-[#090D19]/65 border border-white/10 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-[#FF9F43] font-semibold">
                      {rec.severity.toUpperCase()} · {rec.recommendationType}
                    </span>
                    <span className="text-[#74C7E8]">{rec.status}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#F4F0FF]">{rec.title}</div>
                  <div className="text-[11px] text-[#36D6C4] font-medium">{rec.treatmentBoundaryLabel}</div>
                  <ul className="list-disc pl-4 text-xs text-[#91A1B8] space-y-1">
                    {rec.actionSteps.map((st, idx) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-[#658BAA]">Follow-up: {rec.followUpRequired}</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rec.status === 'Active' && (
                      <button
                        onClick={() => acknowledgeRecommendation(rec.recommendationId)}
                        className="px-3 py-1.5 rounded-lg bg-[#36D6C4] text-[#090D19] text-xs font-semibold"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => updateRecommendationStatus(rec.recommendationId, 'Action In Progress')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-[#F3F8FB]"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateRecommendationStatus(rec.recommendationId, 'Completed')}
                      className="px-3 py-1.5 rounded-lg bg-[#43D6A0]/20 text-[#43D6A0] text-xs font-semibold"
                    >
                      Action Completed
                    </button>
                    {rec.linkedProcedureId && (
                      <button
                        onClick={() => setOpenProcId(rec.linkedProcedureId!)}
                        className="px-3 py-1.5 rounded-lg bg-[#9277F5]/20 text-[#C4B5FD] text-xs font-medium"
                      >
                        Open Checklist
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Offline-Accessible Emergency Procedures */}
      <section className="cosmic-panel-ocean rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#36D6C4]" />
            Offline Emergency Procedures (Mission-Approved Reference)
          </h2>
          <span className="text-[11px] font-mono text-[#43D6A0]">AVAILABLE OFFLINE</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {EMERGENCY_PROCEDURES.map((proc) => (
              <button
                key={proc.id}
                onClick={() => setOpenProcId(proc.id)}
                className={`w-full text-left rounded-xl p-3 text-xs border transition-colors ${
                  openProcId === proc.id
                    ? 'bg-[#36D6C4]/20 border-[#36D6C4] text-[#F4F0FF]'
                    : 'bg-[#090D19]/50 border-white/10 text-[#91A1B8] hover:text-[#F3F8FB]'
                }`}
              >
                <div className="font-semibold">{proc.title}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{proc.category}</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-xl bg-[#090D19]/65 border border-white/10 p-4 space-y-3">
            {(() => {
              const proc = EMERGENCY_PROCEDURES.find((p) => p.id === openProcId) ?? EMERGENCY_PROCEDURES[0];
              const done = completedProcedureSteps[proc.id] ?? [];
              return (
                <>
                  <div>
                    <div className="text-[11px] font-mono text-[#36D6C4]">
                      MISSION-APPROVED REFERENCE · {proc.category.toUpperCase()}
                    </div>
                    <h3 className="text-lg font-semibold text-[#F4F0FF]">{proc.title}</h3>
                    <p className="text-xs text-[#91A1B8] mt-1">Trigger: {proc.triggerConditions}</p>
                  </div>

                  <div className="space-y-2">
                    {proc.steps.map((step, i) => {
                      const checked = done.includes(i);
                      return (
                        <label
                          key={i}
                          className={`flex items-start gap-2.5 rounded-lg p-2.5 text-xs cursor-pointer border ${
                            checked
                              ? 'bg-[#43D6A0]/10 border-[#43D6A0]/40 text-[#F3F8FB]'
                              : 'bg-white/5 border-white/10 text-[#91A1B8]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProcedureStep(proc.id, i)}
                            className="mt-0.5 accent-[#36D6C4]"
                          />
                          <span>{step}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-[#74C7E8] pt-2 border-t border-white/10">
                    Escalate to: {proc.notifyTarget} · Follow-up: {proc.followUpInterval}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Filterable Alert History */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#F4F0FF]">Alert &amp; Notification History</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              aria-label="Filter by alert level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as 'ALL' | RiskLevel)}
              className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-[#F3F8FB]"
            >
              <option value="ALL">All Levels</option>
              <option value="Advisory">Advisory</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
            <select
              aria-label="Filter by concern category"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as 'ALL' | ConcernCategory)}
              className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-[#F3F8FB]"
            >
              <option value="ALL">All Categories</option>
              <option value="Environmental">Environmental</option>
              <option value="Health">Health</option>
              <option value="Combined">Combined</option>
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AlertStatus)}
              className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-[#F3F8FB]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-xs text-[#658BAA]">No alerts match the selected filters.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredHistory.map((a) => (
              <div
                key={a.alertId}
                className="rounded-xl bg-[#090D19]/55 border border-white/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-[#F4F0FF]">{a.title}</span>
                  <span className="text-[#91A1B8] ml-2">
                    {a.astronautId} · {a.locationName}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#74C7E8]">
                  {a.level} · {a.category} · {a.status} · {new Date(a.detectedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
