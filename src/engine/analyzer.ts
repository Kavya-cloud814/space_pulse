import { ENVIRONMENT_PROFILES } from '../data/environments';
import {
  AnalyticalFinding,
  AstronautProfile,
  EnvReadingPacket,
  RiskLevel,
  SensorHealthRecord,
  WearableReading,
} from '../types/spacePulse';

export interface AnalysisInput {
  astronaut: AstronautProfile;
  wearable: WearableReading;
  previousWearable: WearableReading | null;
  env: EnvReadingPacket;
  previousEnv: EnvReadingPacket | null;
  envHistoryForLocation: EnvReadingPacket[];
  wearableHistory: WearableReading[];
  sensorHealth: SensorHealthRecord[];
}

export interface AnalysisOutput {
  findings: AnalyticalFinding[];
  shouldLockEvolvingBaseline: boolean;
  baselineLockReason?: string;
}

export function runHybridAnalysis(input: AnalysisInput): AnalysisOutput {
  const {
    astronaut,
    wearable,
    previousWearable,
    env,
    previousEnv,
    envHistoryForLocation,
    wearableHistory,
    sensorHealth,
  } = input;

  const profile = ENVIRONMENT_PROFILES[env.environmentId];
  const findings: AnalyticalFinding[] = [];
  const now = wearable.timestamp;

  // 1. Sensor Reliability & Uncertainty Audit
  const degradedSensors = sensorHealth.filter((s) => s.status !== 'Healthy');
  const sensorReliabilityNotes = degradedSensors.map(
    (s) => `${s.name} (${s.sensorId}): ${s.status}`
  );
  const insufficientHistory = envHistoryForLocation.length < 3 || wearableHistory.length < 3;

  const currentHealthSnap = {
    heartRate: wearable.heartRate,
    spo2: wearable.spo2,
    bodyTemp: wearable.bodyTemp,
    respiratoryRate: wearable.respiratoryRate,
  };
  const prevHealthSnap = {
    heartRate: previousWearable?.heartRate ?? null,
    spo2: previousWearable?.spo2 ?? null,
    bodyTemp: previousWearable?.bodyTemp ?? null,
    respiratoryRate: previousWearable?.respiratoryRate ?? null,
  };
  const currentEnvSnap = {
    co2: env.inside.co2.value,
    oxygen: env.inside.oxygen.value,
    airQuality: env.inside.airQuality.value,
    temperature: env.inside.temperature.value,
    pressure: env.inside.pressure.value,
    outsideRadiation: env.outside.radiation.value,
    outsideDust: env.outside.dust.value,
  };
  const prevEnvSnap = {
    co2: previousEnv?.inside.co2.value ?? null,
    oxygen: previousEnv?.inside.oxygen.value ?? null,
    airQuality: previousEnv?.inside.airQuality.value ?? null,
    temperature: previousEnv?.inside.temperature.value ?? null,
    pressure: previousEnv?.inside.pressure.value ?? null,
    outsideRadiation: previousEnv?.outside.radiation.value ?? null,
    outsideDust: previousEnv?.outside.dust.value ?? null,
  };

  // 2. Analyze Environmental Changes (Safety-Limit + Rapid-Change)
  const envConcerns: Array<{
    key: string;
    label: string;
    level: RiskLevel;
    score: number;
    detail: string;
    action: string;
  }> = [];

  const co2 = env.inside.co2.quality === 'Valid' ? env.inside.co2.value : null;
  const prevCo2 = previousEnv?.inside.co2.value ?? null;
  if (co2 !== null) {
    if (co2 >= 5000) {
      envConcerns.push({
        key: 'co2_crit',
        label: 'Critical Cabin CO₂ Concentration',
        level: 'Critical',
        score: 88,
        detail: `Habitat CO₂ reached ${co2} ppm (demonstration critical threshold >= 5,000 ppm).`,
        action: 'Switch to backup CO₂ scrubber and verify module ventilation fans immediately.',
      });
    } else if (co2 >= 3000) {
      envConcerns.push({
        key: 'co2_warn',
        label: 'Elevated Cabin CO₂ Concentration',
        level: 'Warning',
        score: 64,
        detail: `Habitat CO₂ rose to ${co2} ppm (demonstration warning limit >= 3,000 ppm).`,
        action: 'Inspect primary CO₂ scrubber airflow and reduce high-exertion crew tasks.',
      });
    } else if (prevCo2 !== null && co2 - prevCo2 >= 450) {
      envConcerns.push({
        key: 'co2_rapid',
        label: 'Rapid Cabin CO₂ Rise',
        level: 'Advisory',
        score: 38,
        detail: `Rapid CO₂ increase of +${co2 - prevCo2} ppm since prior reading (${prevCo2} -> ${co2} ppm).`,
        action: 'Monitor scrubber telemetry closely over upcoming intervals.',
      });
    }
  }

  const rad = env.outside.radiation.quality === 'Valid' ? env.outside.radiation.value : null;
  if (rad !== null) {
    if (rad >= 4.0) {
      envConcerns.push({
        key: 'rad_crit',
        label: 'High External Radiation Flux',
        level: 'Critical',
        score: 91,
        detail: `External radiation reached ${rad} mSv/day in ${env.locationName}.`,
        action: 'Halt exterior EVA and relocate crew to shielded storm shelter per mission protocol.',
      });
    } else if (rad >= 2.2) {
      envConcerns.push({
        key: 'rad_warn',
        label: 'Elevated External Radiation Exposure',
        level: 'Warning',
        score: 62,
        detail: `External radiation elevated to ${rad} mSv/day (above routine ${profile.shortName} baseline).`,
        action: 'Limit unshielded exposure duration and monitor cumulative dosimetry.',
      });
    }
  }

  const pressure = env.inside.pressure.value;
  const o2 = env.inside.oxygen.value;
  if (pressure !== null && (pressure < 92 && env.environmentId !== 'lunar_rover' || pressure < 62)) {
    envConcerns.push({
      key: 'press_crit',
      label: 'Habitat Pressure Drop',
      level: 'Critical',
      score: 94,
      detail: `Inside pressure dropped to ${pressure} kPa (O₂ at ${o2 ?? 'N/A'}%).`,
      action: 'Execute Pressure Integrity Checklist and verify hatch/bulkhead seals immediately.',
    });
  } else if (o2 !== null && o2 < 19.5) {
    envConcerns.push({
      key: 'o2_warn',
      label: 'Reduced Habitat Oxygen Concentration',
      level: 'Warning',
      score: 72,
      detail: `Cabin oxygen concentration declined to ${o2}% (below 19.5% operating threshold).`,
      action: 'Verify O₂ tank supply valve and metabolic consumption balance.',
    });
  }

  const aqi = env.inside.airQuality.value;
  if (aqi !== null && aqi >= 90) {
    envConcerns.push({
      key: 'aq_warn',
      label: 'Habitat Air Quality Degradation',
      level: 'Warning',
      score: 66,
      detail: `Inside air quality index climbed to ${aqi} AQI indicating elevated airborne contaminants.`,
      action: 'Activate secondary HEPA/charcoal filtration and inspect airlock seals.',
    });
  }

  const outDust = env.outside.dust.applicable && env.outside.dust.quality === 'Valid' ? env.outside.dust.value : null;
  if (outDust !== null && outDust >= 2.5) {
    envConcerns.push({
      key: 'out_dust',
      label: 'Elevated External Dust / Particulate Load',
      level: outDust >= 4.5 ? 'Warning' : 'Advisory',
      score: outDust >= 4.5 ? 58 : 34,
      detail: `External dust reached ${outDust} mg/m³ outside ${env.locationName}. Habitat filtration remains isolated.`,
      action: 'Defer exterior EVA / airlock cycling until external particulate load settles.',
    });
  }

  // Personal vs Fixed sensor disagreement
  if (env.personalSensor.discrepancyDetected) {
    envConcerns.push({
      key: 'sensor_discrepancy',
      label: 'Fixed vs Personal Air Sensor Discrepancy',
      level: 'Advisory',
      score: 42,
      detail:
        env.personalSensor.discrepancyNote ??
        'Personal wearable dust sensor disagrees with fixed habitat sensor.',
      action: 'Compare sensor calibration and inspect astronaut immediate workspace before drawing conclusions.',
    });
  }

  // 3. Analyze Astronaut Health (Individual Baselines + Context-Aware Interpretation)
  const healthConcerns: Array<{
    key: string;
    label: string;
    level: RiskLevel;
    score: number;
    detail: string;
    baselineNote: string;
    action: string;
  }> = [];

  const hr = wearable.dataQuality.heartRate === 'Valid' ? wearable.heartRate : null;
  const spo2 = wearable.dataQuality.spo2 === 'Valid' ? wearable.spo2 : null;
  const bodyTemp = wearable.dataQuality.bodyTemp === 'Valid' ? wearable.bodyTemp : null;
  const resp = wearable.respiratoryRate;

  const hrDeltaPre = hr !== null ? hr - astronaut.preMissionBaseline.heartRate : 0;
  const hrDeltaEvolving = hr !== null ? hr - astronaut.evolvingBaseline.heartRate : 0;
  const isExercising = astronaut.activity === 'Exercise';

  let lockBaseline = false;
  let lockReason: string | undefined;

  if (hr !== null) {
    if (isExercising && hr <= 145) {
      // Context-aware: normal exertion during exercise — NO false alarm!
    } else if (!isExercising && hr >= astronaut.preMissionBaseline.heartRate + 32) {
      lockBaseline = true;
      lockReason = `Resting/non-exercise HR (${hr} BPM) rose +${hrDeltaPre} BPM above pre-mission baseline (${astronaut.preMissionBaseline.heartRate} BPM).`;
      healthConcerns.push({
        key: 'hr_crit',
        label: 'Sustained Heart Rate Elevation (Non-Exercise)',
        level: hr >= 118 ? 'Critical' : 'Warning',
        score: hr >= 118 ? 84 : 65,
        detail: `Heart rate is ${hr} BPM during "${astronaut.activity}" (Pre-Mission Baseline: ${astronaut.preMissionBaseline.heartRate} BPM).`,
        baselineNote: `+${hrDeltaPre} BPM vs Pre-Mission · +${hrDeltaEvolving.toFixed(0)} BPM vs Evolving`,
        action: 'Pause strenuous activity, sit/rest, verify wearable contact, and request medical assessment.',
      });
    } else if (!isExercising && hrDeltaPre >= 12) {
      lockBaseline = true;
      lockReason = `Gradual resting HR drift (+${hrDeltaPre} BPM vs Pre-Mission Baseline ${astronaut.preMissionBaseline.heartRate} BPM).`;
      healthConcerns.push({
        key: 'hr_drift',
        label: 'Gradual Resting Heart Rate Drift vs Pre-Mission Baseline',
        level: 'Advisory',
        score: 39,
        detail: `Heart rate (${hr} BPM) shows upward drift relative to pre-mission baseline (${astronaut.preMissionBaseline.heartRate} BPM) even though within broad general bounds.`,
        baselineNote: `+${hrDeltaPre} BPM vs Pre-Mission · Evolving Baseline locked pending review`,
        action: 'Track resting HR trend, check hydration/sleep recovery, and review baseline lock.',
      });
    }
  }

  if (spo2 !== null && spo2 < 94) {
    lockBaseline = true;
    lockReason = lockReason ?? `SpO₂ declined to ${spo2}%.`;
    healthConcerns.push({
      key: 'spo2_low',
      label: 'Reduced Blood Oxygen Saturation (SpO₂)',
      level: spo2 < 90 ? 'Critical' : 'Warning',
      score: spo2 < 90 ? 90 : 68,
      detail: `SpO₂ measured at ${spo2}% (Pre-Mission Baseline: ${astronaut.preMissionBaseline.spo2}%).`,
      baselineNote: `${(spo2 - astronaut.preMissionBaseline.spo2).toFixed(1)}% vs Pre-Mission`,
      action: 'Cross-check pulse oximeter fit, verify cabin/suit O₂, and initiate medical review.',
    });
  }

  if (bodyTemp !== null && (bodyTemp >= 38.0 || bodyTemp <= 35.6)) {
    lockBaseline = true;
    healthConcerns.push({
      key: 'temp_abn',
      label: bodyTemp >= 38.0 ? 'Elevated Body Temperature' : 'Low Body Temperature',
      level: bodyTemp >= 38.7 || bodyTemp <= 35.2 ? 'Critical' : 'Warning',
      score: bodyTemp >= 38.7 ? 83 : 60,
      detail: `Body temperature is ${bodyTemp}°C (Pre-Mission Baseline: ${astronaut.preMissionBaseline.bodyTemp}°C).`,
      baselineNote: `${(bodyTemp - astronaut.preMissionBaseline.bodyTemp).toFixed(1)}°C vs Pre-Mission`,
      action: 'Reduce thermal workload, assess hydration, and schedule crew medical evaluation.',
    });
  }

  if (resp !== null && !isExercising && resp >= 22) {
    healthConcerns.push({
      key: 'resp_high',
      label: 'Elevated Respiratory Rate at Rest',
      level: resp >= 26 ? 'Warning' : 'Advisory',
      score: resp >= 26 ? 61 : 41,
      detail: `Respiratory rate is ${resp} breaths/min during ${astronaut.activity} (Baseline: ${astronaut.preMissionBaseline.respiratoryRate}).`,
      baselineNote: `+${resp - astronaut.preMissionBaseline.respiratoryRate} breaths/min vs Pre-Mission`,
      action: 'Rest and verify surrounding air quality & CO₂ levels.',
    });
  }

  // Hydration / sleep mild preventive concern
  if (
    astronaut.hydrationLevelPct < 70 ||
    astronaut.reportedSymptoms.includes('Mild Dehydration') ||
    astronaut.reportedSymptoms.includes('Fatigue')
  ) {
    healthConcerns.push({
      key: 'hydration_fatigue',
      label: 'Hydration / Recovery Context Flag',
      level: 'Advisory',
      score: 28,
      detail: `Hydration at ${astronaut.hydrationLevelPct}%, sleep ${astronaut.sleepHoursLastNight}h. Context suggests mild recovery/hydration attention.`,
      baselineNote: 'General wellness context indicator',
      action: 'Encourage water or electrolyte intake and scheduled rest period (general preventive guidance).',
    });
  }

  // Adaptive exposure history check for delayed symptoms (e.g. Respiratory Discomfort after dust exposure)
  const priorDustExposure = envHistoryForLocation.some(
    (h) =>
      (h.outside.dust.value ?? 0) >= 1.5 ||
      (h.personalSensor.dustExposure ?? 0) >= 1.5 ||
      h.inside.airQuality.value! >= 75
  );

  // 4. Synthesize Findings (Combined vs Env-Only vs Health-Only)
  const hasEnv = envConcerns.length > 0;
  const hasHealth = healthConcerns.length > 0;
  const hasSymptoms = astronaut.reportedSymptoms.length > 0;

  // Case A: Combined Finding if both env & health/symptoms align plausibly
  if (
    (hasEnv && (hasHealth || hasSymptoms)) ||
    (priorDustExposure && astronaut.reportedSymptoms.includes('Respiratory Discomfort'))
  ) {
    const topEnv = envConcerns[0];
    const topHealth = healthConcerns[0];
    const maxLevel: RiskLevel =
      topEnv?.level === 'Critical' || topHealth?.level === 'Critical'
        ? 'Critical'
        : topEnv?.level === 'Warning' || topHealth?.level === 'Warning'
          ? 'Warning'
          : 'Advisory';

    const combinedScore = Math.min(
      98,
      Math.round(
        ((topEnv?.score ?? 35) * 0.52 + (topHealth?.score ?? 35) * 0.48) +
          (hasSymptoms ? 10 : 0)
      )
    );

    const uncertaintyNotes: string[] = [];
    if (insufficientHistory) uncertaintyNotes.push('Limited historical window (<3 cycles) reduces longitudinal confidence.');
    if (sensorReliabilityNotes.length > 0) uncertaintyNotes.push('One or more sensors degraded; correlation cannot be confirmed.');
    if (env.personalSensor.discrepancyDetected) uncertaintyNotes.push('Fixed and personal air sensors show discrepancy.');

    const relText = priorDustExposure && astronaut.reportedSymptoms.includes('Respiratory Discomfort')
      ? `Possible association: earlier elevated dust/particulate exposure at ${env.locationName} precedes reported respiratory discomfort. Correlation does not confirm causation.`
      : `Possible environmental-health relationship: ${topEnv?.label ?? 'environmental shift'} coincides with ${topHealth?.label ?? astronaut.reportedSymptoms.join(', ')}. Requires medical review; not a confirmed diagnosis.`;

    findings.push({
      findingId: `FND-CMB-${astronaut.id}-${env.locationId}`,
      astronautId: astronaut.id,
      environmentId: env.environmentId,
      locationId: env.locationId,
      locationName: env.locationName,
      timestamp: now,
      category: 'Combined',
      riskClassification: maxLevel,
      riskScore: combinedScore,
      riskScoreBreakdown: `Env (${topEnv?.score ?? 35}) + Physio (${topHealth?.score ?? 35}) + Symptoms (${hasSymptoms ? '+10' : '0'})`,
      title: `Combined Concern: ${topEnv?.label ?? 'Prior Particulate Exposure'} & ${topHealth?.label ?? astronaut.reportedSymptoms.join(' / ')}`,
      explanation: [topEnv?.detail, topHealth?.detail].filter(Boolean).join(' ') || 'Environmental exposure and symptom timing overlap.',
      possibleRelationship: relText,
      confidenceLabel: uncertaintyNotes.length > 0 ? 'Low / Uncertain' : 'Moderate',
      uncertaintyNotes,
      sensorReliabilityNotes,
      currentHealthSnapshot: currentHealthSnap,
      previousHealthSnapshot: prevHealthSnap,
      currentEnvSnapshot: currentEnvSnap,
      previousEnvSnapshot: prevEnvSnap,
      baselineDeviations: healthConcerns.map((h) => h.baselineNote),
      exposureHistorySummary: `${envHistoryForLocation.length} recorded environmental samples at ${env.locationName}${priorDustExposure ? ' (includes prior particulate elevation)' : ''}.`,
      activityContext: astronaut.activity,
      reportedSymptoms: astronaut.reportedSymptoms,
      recommendedActions: [
        ...(topEnv ? [topEnv.action] : []),
        ...(topHealth ? [topHealth.action] : []),
        'Review environmental exposure timeline alongside crew symptoms.',
      ],
      suggestedRecipients: maxLevel === 'Advisory' ? ['Astronaut'] : ['Astronaut', 'Ground Medical Team'],
      resolved: false,
      isSimulated: true,
    });
  } else {
    // Independent Environmental-only findings
    for (const ec of envConcerns) {
      const uncertaintyNotes: string[] = [];
      if (ec.key === 'sensor_discrepancy') {
        uncertaintyNotes.push('Fixed and personal sensors disagree; cause of localized difference unconfirmed.');
      }
      if (sensorReliabilityNotes.length > 0) {
        uncertaintyNotes.push('Degraded sensor telemetry present in current cycle.');
      }

      findings.push({
        findingId: `FND-ENV-${ec.key}-${env.locationId}`,
        astronautId: astronaut.id,
        environmentId: env.environmentId,
        locationId: env.locationId,
        locationName: env.locationName,
        timestamp: now,
        category: 'Environmental',
        riskClassification: ec.level,
        riskScore: ec.score,
        riskScoreBreakdown: `Environment limit/rate-of-change rule (${ec.score}/100)`,
        title: ec.label,
        explanation: `${ec.detail} Astronaut physiological readings remain within normal expected bounds.`,
        possibleRelationship: null,
        confidenceLabel: uncertaintyNotes.length > 0 ? 'Low / Uncertain' : 'High',
        uncertaintyNotes,
        sensorReliabilityNotes,
        currentHealthSnapshot: currentHealthSnap,
        previousHealthSnapshot: prevHealthSnap,
        currentEnvSnapshot: currentEnvSnap,
        previousEnvSnapshot: prevEnvSnap,
        baselineDeviations: [],
        exposureHistorySummary: `${envHistoryForLocation.length} recorded cycles in ${env.locationName}.`,
        activityContext: astronaut.activity,
        reportedSymptoms: astronaut.reportedSymptoms,
        recommendedActions: [ec.action],
        suggestedRecipients: ec.level === 'Advisory' ? ['Astronaut'] : ['Astronaut', 'Ground Medical Team'],
        resolved: false,
        isSimulated: true,
      });
    }

    // Independent Health-only findings
    for (const hc of healthConcerns) {
      const uncertaintyNotes: string[] = [];
      if (insufficientHistory) uncertaintyNotes.push('Insufficient longitudinal history (<3 readings).');
      if (sensorReliabilityNotes.length > 0) uncertaintyNotes.push('Sensor data-quality warning active.');

      findings.push({
        findingId: `FND-HLT-${hc.key}-${astronaut.id}`,
        astronautId: astronaut.id,
        environmentId: env.environmentId,
        locationId: env.locationId,
        locationName: env.locationName,
        timestamp: now,
        category: 'Health',
        riskClassification: hc.level,
        riskScore: hc.score,
        riskScoreBreakdown: `Individual baseline delta & trend (${hc.score}/100)`,
        title: hc.label,
        explanation: `${hc.detail} Surrounding habitat environmental readings remain nominal.`,
        possibleRelationship: null,
        confidenceLabel: uncertaintyNotes.length > 0 ? 'Low / Uncertain' : 'Moderate',
        uncertaintyNotes,
        sensorReliabilityNotes,
        currentHealthSnapshot: currentHealthSnap,
        previousHealthSnapshot: prevHealthSnap,
        currentEnvSnapshot: currentEnvSnap,
        previousEnvSnapshot: prevEnvSnap,
        baselineDeviations: [hc.baselineNote],
        exposureHistorySummary: `Environmental baseline nominal in ${env.locationName}.`,
        activityContext: astronaut.activity,
        reportedSymptoms: astronaut.reportedSymptoms,
        recommendedActions: [hc.action],
        suggestedRecipients: hc.level === 'Advisory' ? ['Astronaut'] : ['Astronaut', 'Ground Medical Team'],
        resolved: false,
        isSimulated: true,
      });
    }
  }

  return {
    findings,
    shouldLockEvolvingBaseline: lockBaseline,
    baselineLockReason: lockReason,
  };
}
