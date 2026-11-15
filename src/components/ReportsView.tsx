import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download, FileText, Lock, Shield, Users } from 'lucide-react';
import { useSpacePulse } from '../context/SpacePulseContext';
import { createCsvExportBlob, createPdfBlobFromReport } from '../engine/reporting';
import { MissionPeriod, UserRole } from '../types/spacePulse';

export const ReportsView: React.FC = () => {
  const {
    userRole,
    setUserRole,
    astronauts,
    activeAstronaut,
    setActiveAstronautId,
    setMissionPeriod,
    wearableHistory,
    envHistoryAll,
    reports,
    generateReportNow,
    timelineEvents,
    alerts,
  } = useSpacePulse();

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');

  const canAccessIndividualRecords = userRole === 'ground_medical' || userRole === 'astronaut';

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Crew-wide recurring symptom aggregation
  const crewSymptoms = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of astronauts) {
      for (const s of a.reportedSymptoms) {
        map.set(s, (map.get(s) ?? 0) + 1);
      }
    }
    return Array.from(map.entries());
  }, [astronauts]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'ALL') return timelineEvents;
    return timelineEvents.filter((t) => t.type === timelineFilter);
  }, [timelineEvents, timelineFilter]);

  return (
    <div className="space-y-6">
      {/* Header + Role Privacy Switcher */}
      <section className="cosmic-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#36D6C4]">
            PHASE 6 · CONTINUOUS MONITORING &amp; HEALTH REPORTING · SIMULATED DATA
          </div>
          <h1 className="text-2xl font-bold text-[#F4F0FF]">
            Long-Term Records, Crew Overview &amp; Mission Reports
          </h1>
          <p className="text-xs text-[#91A1B8]">
            Tracks Pre-Mission, During-Mission, and Post-Mission records while enforcing role-based medical privacy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Shield className="w-4 h-4 text-[#9277F5]" />
          <select
            aria-label="Access Role"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="rounded-lg bg-[#090D19]/80 border border-white/15 px-3 py-2 text-xs text-[#F3F8FB]"
          >
            <option value="astronaut">Role: Astronaut ({activeAstronaut.id})</option>
            <option value="ground_medical">Role: Authorized Ground Medical</option>
            <option value="observer">Role: Restricted Observer (Crew Aggregated Only)</option>
          </select>
        </div>
      </section>

      {/* Crew-Wide Aggregated Overview */}
      <section className="cosmic-panel-ocean rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#36D6C4]" />
            Crew-Wide Aggregated Overview (Privacy-Preserving)
          </h2>
          <span className="text-xs font-mono text-[#91A1B8]">{astronauts.length} Astronauts Monitored</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-[#090D19]/60 p-3">
            <div className="text-[#658BAA] text-[10px]">ACTIVE ADVISORY</div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#43D6A0]">
              {alerts.filter((a) => a.level === 'Advisory' && a.status !== 'Resolved').length}
            </div>
          </div>
          <div className="rounded-xl bg-[#090D19]/60 p-3">
            <div className="text-[#658BAA] text-[10px]">ACTIVE WARNING</div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#FFC857]">
              {alerts.filter((a) => a.level === 'Warning' && a.status !== 'Resolved').length}
            </div>
          </div>
          <div className="rounded-xl bg-[#090D19]/60 p-3">
            <div className="text-[#658BAA] text-[10px]">ACTIVE CRITICAL</div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#FF5874]">
              {alerts.filter((a) => a.level === 'Critical' && a.status !== 'Resolved').length}
            </div>
          </div>
          <div className="rounded-xl bg-[#090D19]/60 p-3">
            <div className="text-[#658BAA] text-[10px]">ENV SAMPLES LOGGED</div>
            <div className="text-2xl font-mono tabular-nums font-bold text-[#74C7E8]">
              {envHistoryAll.length}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#090D19]/50 p-3.5 text-xs text-[#91A1B8]">
          <strong className="text-[#F3F8FB]">Crew Pattern Check: </strong>
          {crewSymptoms.length === 0
            ? 'No recurring shared symptoms reported across crew.'
            : crewSymptoms
                .map(([sym, count]) => `${sym} (${count}/${astronauts.length} crew)`)
                .join(' · ') + ' — Highlighted for Ground Medical review without assuming shared diagnosis.'}
        </div>
      </section>

      {/* Individual Health Records & Pre / During / Post-Mission Comparison (Privacy Gated) */}
      <section className="cosmic-panel-aubergine rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#F4F0FF]">
            Individual Long-Term Records (Pre / During / Post-Mission)
          </h2>
          {canAccessIndividualRecords && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                aria-label="Select Astronaut Record"
                value={activeAstronaut.id}
                onChange={(e) => setActiveAstronautId(e.target.value)}
                className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-[#F3F8FB]"
              >
                {astronauts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} · {a.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Mission Record Period"
                value={activeAstronaut.missionPeriod}
                onChange={(e) => setMissionPeriod(e.target.value as MissionPeriod)}
                className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-[#F3F8FB]"
              >
                <option value="Pre-Mission">Period: Pre-Mission</option>
                <option value="During-Mission">Period: During-Mission</option>
                <option value="Post-Mission">Period: Post-Mission</option>
              </select>
            </div>
          )}
        </div>

        {!canAccessIndividualRecords ? (
          <div className="rounded-xl bg-[#090D19]/70 border border-[#FFC857]/40 p-6 text-center space-y-2">
            <Lock className="w-6 h-6 text-[#FFC857] mx-auto" />
            <div className="text-sm font-semibold text-[#F4F0FF]">
              Individual Astronaut Medical Records Restricted
            </div>
            <p className="text-xs text-[#91A1B8]">
              Switch role to Authorized Ground Medical or Astronaut to view personal physiological histories and individual exports.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {[
              { title: 'Pre-Mission', snap: activeAstronaut.periodSnapshots.preMission, color: '#43D6A0' },
              { title: 'During-Mission', snap: activeAstronaut.periodSnapshots.duringMission, color: '#36D6C4' },
              { title: 'Post-Mission', snap: activeAstronaut.periodSnapshots.postMission, color: '#9277F5' },
            ].map((period) => (
              <div key={period.title} className="rounded-xl bg-[#090D19]/60 border border-white/10 p-4 space-y-2">
                <div className="font-semibold text-sm" style={{ color: period.color }}>
                  {period.title}
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A1B8]">Avg Heart Rate</span>
                  <span className="font-mono tabular-nums text-[#F3F8FB]">{period.snap.avgHr} BPM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A1B8]">Avg SpO₂</span>
                  <span className="font-mono tabular-nums text-[#F3F8FB]">{period.snap.avgSpo2}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A1B8]">Avg Body Temp</span>
                  <span className="font-mono tabular-nums text-[#F3F8FB]">{period.snap.avgTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#91A1B8]">Cumulative Rad</span>
                  <span className="font-mono tabular-nums text-[#FF9F43]">{period.snap.radiationCumul} mSv</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Automated Report Generation + PDF & CSV Exports */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[#F4F0FF] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#74C7E8]" />
            Automated &amp; On-Demand Health Reports
          </h2>

          <div className="flex flex-wrap gap-2 text-xs">
            {canAccessIndividualRecords && (
              <>
                <button
                  onClick={() => generateReportNow('Daily', 'Individual')}
                  className="px-3 py-1.5 rounded-lg bg-[#36D6C4]/20 text-[#36D6C4] border border-[#36D6C4]/40 font-medium"
                >
                  + Daily Report
                </button>
                <button
                  onClick={() => generateReportNow('Weekly', 'Individual')}
                  className="px-3 py-1.5 rounded-lg bg-[#668BFF]/20 text-[#74C7E8] border border-[#668BFF]/40 font-medium"
                >
                  + Weekly Report
                </button>
                <button
                  onClick={() => generateReportNow('Monthly', 'Individual')}
                  className="px-3 py-1.5 rounded-lg bg-[#9277F5]/20 text-[#C4B5FD] border border-[#9277F5]/40 font-medium"
                >
                  + Monthly Report
                </button>
              </>
            )}
            <button
              onClick={() => generateReportNow('Daily', 'Crew-Wide')}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[#F3F8FB] font-medium"
            >
              + Crew-Wide Summary
            </button>
            <button
              onClick={() => {
                const csv = createCsvExportBlob({
                  astronautId: activeAstronaut.id,
                  wearableHistory,
                  envHistory: envHistoryAll,
                  includePersonalDetails: canAccessIndividualRecords,
                });
                triggerDownload(csv, `space-pulse-${canAccessIndividualRecords ? activeAstronaut.id : 'crew'}-telemetry.csv`);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#43D6A0] text-[#090D19] font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-xl bg-[#090D19]/50 p-5 text-center text-xs text-[#658BAA]">
            Generate a Daily, Weekly, Monthly, or Crew-Wide report above—or trigger a Critical alert to create an automatic Event-Triggered report.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((rpt) => {
              const lockedOut = rpt.scope === 'Individual' && !canAccessIndividualRecords;
              const isExpanded = expandedReportId === rpt.id;
              return (
                <div key={rpt.id} className="rounded-xl bg-[#090D19]/65 border border-white/10 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-mono text-[#74C7E8]">
                        {rpt.reportType.toUpperCase()} · {rpt.scope.toUpperCase()} · {rpt.overallStatus.toUpperCase()} · SIMULATED DATA
                      </div>
                      <h3 className="text-sm font-semibold text-[#F4F0FF]">
                        {lockedOut ? 'Individual Health Report (Restricted)' : `${rpt.periodLabel} — ${rpt.locationName}`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {!lockedOut && (
                        <>
                          <button
                            onClick={() => {
                              const pdf = createPdfBlobFromReport(rpt);
                              triggerDownload(pdf, `${rpt.id}.pdf`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#E879C9]/20 text-[#E879C9] border border-[#E879C9]/40 text-xs font-semibold flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                          <button
                            onClick={() => setExpandedReportId(isExpanded ? null : rpt.id)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-[#F3F8FB] flex items-center gap-1"
                          >
                            {isExpanded ? 'Quick View' : 'Detailed Analysis'}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {lockedOut ? (
                    <div className="text-xs text-[#FFC857]">Switch to Authorized Ground Medical or Astronaut role to inspect this report.</div>
                  ) : (
                    <>
                      <ul className="list-disc pl-4 text-xs text-[#91A1B8] space-y-1">
                        {rpt.quickSummary.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>

                      {isExpanded && (
                        <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#91A1B8]">
                          <div className="space-y-1">
                            <div className="font-semibold text-[#F4F0FF]">Baselines &amp; Physiology</div>
                            {rpt.detailedAnalysis.baselineComparison.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                            {rpt.detailedAnalysis.physiologicalTrends.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold text-[#F4F0FF]">Exposure, Alerts &amp; Care</div>
                            {rpt.detailedAnalysis.environmentalExposure.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                            {rpt.detailedAnalysis.alertSummary.map((l, i) => (
                              <div key={i}>{l}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Chronological Health & Environmental Timeline */}
      <section className="cosmic-panel rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#F4F0FF]">Chronological Mission Timeline</h2>
          <select
            aria-label="Filter timeline"
            value={timelineFilter}
            onChange={(e) => setTimelineFilter(e.target.value)}
            className="rounded-lg bg-[#090D19] border border-white/15 px-2.5 py-1.5 text-xs text-[#F3F8FB]"
          >
            <option value="ALL">All Events</option>
            <option value="Environment">Environment</option>
            <option value="Location">Location Changes</option>
            <option value="Sensor">Sensor Health</option>
            <option value="Report">Reports</option>
          </select>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="text-xs text-[#658BAA]">Timeline events will appear as you switch bases, run simulations, or trigger events.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredTimeline.map((ev) => (
              <div key={ev.id} className="rounded-xl bg-[#090D19]/55 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-[#F4F0FF]">{ev.title}</span>
                  <span className="text-[#91A1B8] ml-2">{ev.detail}</span>
                </div>
                <span className="font-mono text-[11px] text-[#74C7E8]">
                  {ev.locationName} · {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
