import { ENVIRONMENT_PROFILES } from '../data/environments';
import {
  AlertRecord,
  AstronautProfile,
  EnvReadingPacket,
  HealthReportRecord,
  LocationProfile,
  RecommendationRecord,
  SensorFailureEventLog,
  WearableReading,
} from '../types/spacePulse';

export function buildHealthReport(params: {
  reportType: HealthReportRecord['reportType'];
  scope: HealthReportRecord['scope'];
  astronaut: AstronautProfile;
  allAstronauts: AstronautProfile[];
  location: LocationProfile;
  wearableHistory: WearableReading[];
  envHistory: EnvReadingPacket[];
  alerts: AlertRecord[];
  recommendations: RecommendationRecord[];
  sensorFailures: SensorFailureEventLog[];
  triggerReason: string;
}): HealthReportRecord {
  const {
    reportType,
    scope,
    astronaut,
    allAstronauts,
    location,
    wearableHistory,
    envHistory,
    alerts,
    recommendations,
    sensorFailures,
    triggerReason,
  } = params;

  const envProfile = ENVIRONMENT_PROFILES[location.environmentId];
  const now = new Date().toISOString();

  if (scope === 'Crew-Wide') {
    const symptomCounts = new Map<string, number>();
    for (const member of allAstronauts) {
      for (const s of member.reportedSymptoms) {
        symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1);
      }
    }
    const recurringSymptoms = Array.from(symptomCounts.entries())
      .filter(([, count]) => count >= 1)
      .map(([sym, count]) => `${sym}: reported by ${count} of ${allAstronauts.length} crew members (aggregated pattern — no medical diagnosis implied).`);

    const activeAlerts = alerts.filter((a) => a.status !== 'Resolved');
    const critCount = activeAlerts.filter((a) => a.level === 'Critical').length;
    const warnCount = activeAlerts.filter((a) => a.level === 'Warning').length;
    const advCount = activeAlerts.filter((a) => a.level === 'Advisory').length;

    return {
      id: `RPT-CREW-${reportType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      reportType,
      scope: 'Crew-Wide',
      astronautId: 'CREW',
      environmentId: location.environmentId,
      locationName: location.name,
      periodLabel: `${reportType} Crew Summary (${envProfile.shortName})`,
      triggerReason,
      generatedAt: now,
      overallStatus: critCount > 0 ? 'Critical' : warnCount > 0 ? 'Warning' : advCount > 0 ? 'Advisory' : 'Nominal',
      quickSummary: [
        `Monitored crew: ${allAstronauts.length} astronauts (Aggregated de-identified view).`,
        `Active alerts: ${critCount} Critical · ${warnCount} Warning · ${advCount} Advisory.`,
        recurringSymptoms[0] ?? 'No shared crew-wide symptom clusters detected.',
        `Active environment: ${envProfile.name} (${location.name}).`,
      ],
      detailedAnalysis: {
        physiologicalTrends: [
          `Crew resting HR average remains within ${Math.round(allAstronauts.reduce((s, a) => s + a.evolvingBaseline.heartRate, 0) / allAstronauts.length)} BPM simulated range.`,
        ],
        baselineComparison: [
          'Individual pre-mission vs evolving baseline deltas remain restricted to authorized medical records.',
        ],
        environmentalExposure: [
          `Shared station/base telemetry logged ${envHistory.length} cycles at ${location.name}.`,
        ],
        recurringSymptoms:
          recurringSymptoms.length > 0 ? recurringSymptoms : ['No recurring crew-wide symptoms logged.'],
        alertSummary: [
          `Total recorded alerts across mission: ${alerts.length} (${activeAlerts.length} active).`,
        ],
        recommendationsSummary: [
          `${recommendations.filter((r) => r.status !== 'Resolved').length} active preventive recommendations across crew.`,
        ],
        dataQualityNotes: [
          `${sensorFailures.filter((sf) => !sf.recoveredAt).length} unresolved sensor reliability events.`,
        ],
      },
      isSimulated: true,
    };
  }

  const astroAlerts = alerts.filter((a) => a.astronautId === astronaut.id);
  const activeAstroAlerts = astroAlerts.filter((a) => a.status !== 'Resolved');
  const astroRecs = recommendations.filter((r) => r.astronautId === astronaut.id);
  const validHr = wearableHistory.map((w) => w.heartRate).filter((v): v is number => v !== null);
  const avgHr = validHr.length ? (validHr.reduce((a, b) => a + b, 0) / validHr.length).toFixed(1) : 'Unavailable';
  const validSpo2 = wearableHistory.map((w) => w.spo2).filter((v): v is number => v !== null);
  const avgSpo2 = validSpo2.length ? (validSpo2.reduce((a, b) => a + b, 0) / validSpo2.length).toFixed(1) : 'Unavailable';

  const latestEnv = envHistory[envHistory.length - 1];
  const overallStatus = activeAstroAlerts.some((a) => a.level === 'Critical')
    ? 'Critical'
    : activeAstroAlerts.some((a) => a.level === 'Warning')
      ? 'Warning'
      : activeAstroAlerts.some((a) => a.level === 'Advisory')
        ? 'Advisory'
        : 'Nominal';

  return {
    id: `RPT-${astronaut.id}-${reportType.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    reportType,
    scope: 'Individual',
    astronautId: astronaut.id,
    environmentId: location.environmentId,
    locationName: location.name,
    periodLabel: `${reportType} Report · ${astronaut.missionPeriod}`,
    triggerReason,
    generatedAt: now,
    overallStatus,
    quickSummary: [
      `Astronaut ${astronaut.name} (${astronaut.id}) · Period: ${astronaut.missionPeriod}.`,
      `Location: ${envProfile.name} — ${location.name}.`,
      `Simulated Avg HR: ${avgHr} BPM (Pre-Mission Baseline ${astronaut.preMissionBaseline.heartRate} BPM) · Avg SpO₂: ${avgSpo2}%.`,
      `Active alerts: ${activeAstroAlerts.length} · Reported symptoms: ${astronaut.reportedSymptoms.length ? astronaut.reportedSymptoms.join(', ') : 'None'}.`,
    ],
    detailedAnalysis: {
      physiologicalTrends: [
        `Collected ${wearableHistory.length} simulated wearable samples in session.`,
        `Current activity context: ${astronaut.activity} · Hydration: ${astronaut.hydrationLevelPct}% · Sleep: ${astronaut.sleepHoursLastNight}h.`,
      ],
      baselineComparison: [
        `Pre-Mission Baseline: HR ${astronaut.preMissionBaseline.heartRate} BPM, SpO₂ ${astronaut.preMissionBaseline.spo2}%, Temp ${astronaut.preMissionBaseline.bodyTemp}°C.`,
        `Evolving Mission Baseline: HR ${astronaut.evolvingBaseline.heartRate} BPM (${astronaut.evolvingBaseline.lockedForReview ? 'LOCKED for medical review' : 'Active adaptation'}).`,
      ],
      environmentalExposure: [
        latestEnv
          ? `Latest habitat CO₂: ${latestEnv.inside.co2.value ?? 'Unavailable'} ppm · O₂: ${latestEnv.inside.oxygen.value ?? 'N/A'}% · External Radiation: ${latestEnv.outside.radiation.value ?? 'Unavailable'} mSv/day.`
          : 'Awaiting simulated environmental readings for current location.',
      ],
      recurringSymptoms:
        astronaut.reportedSymptoms.length > 0
          ? astronaut.reportedSymptoms.map((s) => `Reported symptom: ${s}`)
          : ['No active symptoms reported.'],
      alertSummary:
        astroAlerts.length > 0
          ? astroAlerts.slice(0, 6).map((a) => `[${a.level} · ${a.status}] ${a.title} (${a.locationName})`)
          : ['No alerts triggered for this astronaut.'],
      recommendationsSummary:
        astroRecs.length > 0
          ? astroRecs.slice(0, 5).map((r) => `[${r.severity}] ${r.title}: ${r.actionSteps[0] ?? ''}`)
          : ['Continue routine monitoring schedule.'],
      dataQualityNotes:
        sensorFailures.length > 0
          ? sensorFailures.slice(0, 4).map((sf) => `${sf.sensorName}: ${sf.issueType} (${sf.recoveredAt ? 'Recovered' : 'Active'})`)
          : ['All sensors healthy during reporting interval.'],
    },
    missingDataNote:
      wearableHistory.length < 3 ? 'Incomplete reporting window (<3 simulated sensor packets collected).' : undefined,
    isSimulated: true,
  };
}

// Generate a clean, valid PDF binary Blob without external libraries or popups
export function createPdfBlobFromReport(report: HealthReportRecord): Blob {
  const lines: string[] = [
    'SPACE PULSE - SIMULATED DATA HEALTH REPORT',
    '============================================================',
    `Report ID: ${report.id}`,
    `Type: ${report.reportType} (${report.scope})`,
    `Subject: ${report.astronautId}`,
    `Environment & Location: ${report.environmentId} / ${report.locationName}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Overall Status: ${report.overallStatus} | Trigger: ${report.triggerReason}`,
    '',
    'QUICK SUMMARY:',
    ...report.quickSummary.map((l) => `- ${l}`),
    '',
    'BASELINE & PHYSIOLOGICAL TRENDS:',
    ...report.detailedAnalysis.baselineComparison.map((l) => `- ${l}`),
    ...report.detailedAnalysis.physiologicalTrends.map((l) => `- ${l}`),
    '',
    'ENVIRONMENTAL EXPOSURE & ALERTS:',
    ...report.detailedAnalysis.environmentalExposure.map((l) => `- ${l}`),
    ...report.detailedAnalysis.alertSummary.map((l) => `- ${l}`),
    '',
    'RECOMMENDATIONS & DATA QUALITY:',
    ...report.detailedAnalysis.recommendationsSummary.map((l) => `- ${l}`),
    ...report.detailedAnalysis.dataQualityNotes.map((l) => `- ${l}`),
    '',
    'NOTICE: SIMULATED DATA FOR EDUCATIONAL DEMONSTRATION ONLY.',
  ];

  const sanitize = (text: string) =>
    text
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  let contentStream = 'BT\n/F1 10 Tf\n48 750 Td\n14 TL\n';
  lines.slice(0, 45).forEach((line, idx) => {
    const safe = sanitize(line).slice(0, 88);
    if (idx === 0) contentStream += `(${safe}) Tj\n`;
    else contentStream += `T* (${safe}) Tj\n`;
  });
  contentStream += 'ET';

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function createCsvExportBlob(params: {
  astronautId: string;
  wearableHistory: WearableReading[];
  envHistory: EnvReadingPacket[];
  includePersonalDetails: boolean;
}): Blob {
  const { astronautId, wearableHistory, envHistory, includePersonalDetails } = params;
  const rows: string[] = [
    'DataLabel,Timestamp,RecordType,AstronautOrScope,Environment,Location,Metric,Value,Unit,QualityStatus',
  ];

  if (includePersonalDetails) {
    for (const w of wearableHistory) {
      if (w.astronautId !== astronautId) continue;
      rows.push(`SIMULATED DATA,${w.timestamp},Wearable,${w.astronautId},Mission,Wearable,HeartRate,${w.heartRate ?? 'Missing'},BPM,${w.dataQuality.heartRate ?? 'Valid'}`);
      rows.push(`SIMULATED DATA,${w.timestamp},Wearable,${w.astronautId},Mission,Wearable,SpO2,${w.spo2 ?? 'Missing'},%,${w.dataQuality.spo2 ?? 'Valid'}`);
      rows.push(`SIMULATED DATA,${w.timestamp},Wearable,${w.astronautId},Mission,Wearable,BodyTemp,${w.bodyTemp ?? 'Missing'},C,${w.dataQuality.bodyTemp ?? 'Valid'}`);
      rows.push(`SIMULATED DATA,${w.timestamp},Wearable,${w.astronautId},Mission,Wearable,RespRate,${w.respiratoryRate ?? 'Missing'},breaths/min,${w.dataQuality.respiratoryRate ?? 'Valid'}`);
    }
  }

  for (const e of envHistory) {
    rows.push(`SIMULATED DATA,${e.timestamp},Habitat,CrewEnvironment,${e.environmentId},"${e.locationName}",CO2,${e.inside.co2.value ?? 'Missing'},ppm,${e.inside.co2.quality}`);
    rows.push(`SIMULATED DATA,${e.timestamp},Habitat,CrewEnvironment,${e.environmentId},"${e.locationName}",Oxygen,${e.inside.oxygen.value ?? 'Missing'},%,${e.inside.oxygen.quality}`);
    rows.push(`SIMULATED DATA,${e.timestamp},Habitat,CrewEnvironment,${e.environmentId},"${e.locationName}",Pressure,${e.inside.pressure.value ?? 'Missing'},kPa,${e.inside.pressure.quality}`);
    rows.push(`SIMULATED DATA,${e.timestamp},Outside,CrewEnvironment,${e.environmentId},"${e.locationName}",ExternalRadiation,${e.outside.radiation.value ?? 'NotApplicable'},mSv/day,${e.outside.radiation.quality}`);
  }

  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}
