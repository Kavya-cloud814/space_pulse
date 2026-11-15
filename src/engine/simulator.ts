import { ENVIRONMENTAL_EVENTS, LOCATIONS } from '../data/environments';
import {
  AstronautProfile,
  DataQualityStatus,
  EnvReadingPacket,
  LocationProfile,
  SensorFailureEventLog,
  SensorFailureMode,
  SensorHealthCategory,
  SensorHealthRecord,
  WearableReading,
} from '../types/spacePulse';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function jitter(magnitude: number): number {
  return (Math.random() - 0.5) * 2 * magnitude;
}

export function generateEcgWaveform(
  heartRate: number | null,
  irregular: boolean,
  unavailable: boolean
): { points: number[]; rhythm: WearableReading['ecgRhythm'] } {
  const count = 48;
  if (unavailable || heartRate === null) {
    return {
      points: Array.from({ length: count }, () => 0),
      rhythm: 'Signal Unavailable',
    };
  }
  const points: number[] = [];
  const beatSpan = Math.max(10, Math.round((60 / clamp(heartRate, 40, 180)) * 16));
  for (let i = 0; i < count; i++) {
    const phase = (i % beatSpan) / beatSpan;
    let y = 0;
    if (phase > 0.12 && phase < 0.22) y = 0.16; // P wave
    else if (phase >= 0.28 && phase < 0.32) y = -0.22; // Q
    else if (phase >= 0.32 && phase < 0.38) y = irregular ? 1.15 : 0.95; // R spike
    else if (phase >= 0.38 && phase < 0.43) y = -0.35; // S
    else if (phase >= 0.55 && phase < 0.7) y = 0.25; // T wave
    else y = jitter(0.03);
    if (irregular && i % 13 === 0) {
      y += jitter(0.32);
    }
    points.push(Number(y.toFixed(3)));
  }
  const rhythm: WearableReading['ecgRhythm'] = irregular
    ? 'Irregular Spike'
    : heartRate > 105 || heartRate < 52
      ? 'Elevated Variability'
      : 'Normal Sinus';
  return { points, rhythm };
}

export function createInitialSensorHealth(
  astronautId: string,
  location: LocationProfile
): SensorHealthRecord[] {
  const now = new Date().toISOString();
  const baseSensors: Array<Omit<SensorHealthRecord, 'environmentId' | 'locationId'>> = [
    {
      sensorId: `WRB-HR-${astronautId}`,
      name: 'Wearable Heart Rate & ECG',
      domain: 'Wearable',
      astronautId,
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: 92,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: true,
    },
    {
      sensorId: `WRB-SPO2-${astronautId}`,
      name: 'Wearable Pulse Oximeter (SpO₂)',
      domain: 'Wearable',
      astronautId,
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: 89,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: true,
    },
    {
      sensorId: `WRB-TEMP-${astronautId}`,
      name: 'Core Body Temperature Patch',
      domain: 'Wearable',
      astronautId,
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: 94,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: false,
    },
    {
      sensorId: `ENV-CO2-${location.id.toUpperCase()}`,
      name: 'Habitat CO₂ & Gas Analyzer',
      domain: 'Habitat',
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: null,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: true,
    },
    {
      sensorId: `ENV-EXT-${location.id.toUpperCase()}`,
      name: 'External Radiation & Dust Array',
      domain: 'External',
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: null,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: true,
    },
    {
      sensorId: `PRS-BADGE-${astronautId}`,
      name: 'Personal Environmental Dosimeter',
      domain: 'Personal',
      astronautId,
      status: 'Healthy',
      failureMode: 'none',
      batteryPct: 85,
      lastValidTimestamp: now,
      expectedIntervalSec: 3,
      secondsSinceLastValid: 0,
      completenessPct: 100,
      consistencyOk: true,
      plausibilityOk: true,
      failureDetectedAt: null,
      recoveredAt: null,
      safetyCritical: false,
    },
  ];

  return baseSensors.map((s) => ({
    ...s,
    environmentId: location.environmentId,
    locationId: location.id,
  }));
}

function mapFailureModeToHealth(mode: SensorFailureMode): {
  status: SensorHealthCategory;
  quality: DataQualityStatus;
} {
  switch (mode) {
    case 'stopped':
      return { status: 'Failed or Unavailable', quality: 'Missing' };
    case 'inconsistent':
      return { status: 'Inconsistent or Implausible', quality: 'Uncertain' };
    case 'frozen':
      return { status: 'Degraded', quality: 'Potential Sensor Failure' };
    case 'disconnected':
      return { status: 'Disconnected', quality: 'Missing' };
    case 'low_battery':
      return { status: 'Low Battery', quality: 'Valid' };
    case 'transmission_interrupted':
      return { status: 'Transmission Interrupted', quality: 'Delayed' };
    case 'delayed':
      return { status: 'Delayed', quality: 'Delayed' };
    default:
      return { status: 'Healthy', quality: 'Valid' };
  }
}

export interface SimulationTickInput {
  astronaut: AstronautProfile;
  locationId: string;
  activeEventIds: string[];
  eventBlendFactor: number; // 0..1 (1 = full event, decays toward 0 on Return to Normal)
  previousWearable: WearableReading | null;
  previousEnv: EnvReadingPacket | null;
  sensorHealth: SensorHealthRecord[];
  personalSensorMismatchDemo: boolean;
  gradualHrDriftDemo: boolean;
  tickCount: number;
}

export interface SimulationTickOutput {
  wearable: WearableReading;
  env: EnvReadingPacket;
  updatedSensors: SensorHealthRecord[];
  newFailureEvents: SensorFailureEventLog[];
}

export function generateSimulationTick(input: SimulationTickInput): SimulationTickOutput {
  const {
    astronaut,
    locationId,
    activeEventIds,
    eventBlendFactor,
    previousWearable,
    previousEnv,
    sensorHealth,
    personalSensorMismatchDemo,
    gradualHrDriftDemo,
    tickCount,
  } = input;

  const location = LOCATIONS.find((l) => l.id === locationId) ?? LOCATIONS[0];
  const now = new Date().toISOString();

  // Compute activity offsets for realistic physiological response
  const activityHrOffset =
    astronaut.activity === 'Exercise'
      ? 46
      : astronaut.activity === 'EVA / Suited'
        ? 22
        : astronaut.activity === 'Moderate Work'
          ? 10
          : astronaut.activity === 'Sleeping'
            ? -8
            : 0;

  const activityRespOffset =
    astronaut.activity === 'Exercise'
      ? 9
      : astronaut.activity === 'EVA / Suited'
        ? 4
        : astronaut.activity === 'Moderate Work'
          ? 2
          : astronaut.activity === 'Sleeping'
            ? -2
            : 0;

  const activityTempOffset =
    astronaut.activity === 'Exercise' ? 0.5 : astronaut.activity === 'EVA / Suited' ? 0.25 : 0;

  const motionLevel =
    astronaut.activity === 'Exercise'
      ? Math.round(clamp(82 + jitter(10), 65, 98))
      : astronaut.activity === 'EVA / Suited'
        ? Math.round(clamp(58 + jitter(12), 40, 75))
        : astronaut.activity === 'Moderate Work'
          ? Math.round(clamp(42 + jitter(10), 25, 60))
          : astronaut.activity === 'Resting'
            ? Math.round(clamp(12 + jitter(6), 3, 22))
            : Math.round(clamp(3 + jitter(3), 0, 8));

  // Evaluate sensor health states
  const hrSensor = sensorHealth.find((s) => s.sensorId.startsWith('WRB-HR'));
  const spo2Sensor = sensorHealth.find((s) => s.sensorId.startsWith('WRB-SPO2'));
  const tempSensor = sensorHealth.find((s) => s.sensorId.startsWith('WRB-TEMP'));
  const co2Sensor = sensorHealth.find((s) => s.sensorId.startsWith('ENV-CO2'));
  const extSensor = sensorHealth.find((s) => s.sensorId.startsWith('ENV-EXT'));

  const hrMap = mapFailureModeToHealth(hrSensor?.failureMode ?? 'none');
  const spo2Map = mapFailureModeToHealth(spo2Sensor?.failureMode ?? 'none');
  const tempMap = mapFailureModeToHealth(tempSensor?.failureMode ?? 'none');
  const co2Map = mapFailureModeToHealth(co2Sensor?.failureMode ?? 'none');
  const extMap = mapFailureModeToHealth(extSensor?.failureMode ?? 'none');

  // Target vitals (overrides OR simulated)
  const driftOffset = gradualHrDriftDemo ? Math.min(18, 8 + tickCount * 0.6) : 0;
  let hrVal: number | null = astronaut.editableOverrides.enabled
    ? astronaut.editableOverrides.heartRate
    : Number(clamp(astronaut.preMissionBaseline.heartRate + activityHrOffset + driftOffset + jitter(2.6), 44, 175).toFixed(0));

  let spo2Val: number | null = astronaut.editableOverrides.enabled
    ? astronaut.editableOverrides.spo2
    : Number(clamp(astronaut.preMissionBaseline.spo2 + jitter(0.35), 88, 100).toFixed(1));

  let tempVal: number | null = astronaut.editableOverrides.enabled
    ? astronaut.editableOverrides.bodyTemp
    : Number(clamp(astronaut.preMissionBaseline.bodyTemp + activityTempOffset + jitter(0.12), 35.4, 39.8).toFixed(1));

  let respVal: number | null = astronaut.editableOverrides.enabled
    ? astronaut.editableOverrides.respiratoryRate
    : Number(clamp(astronaut.preMissionBaseline.respiratoryRate + activityRespOffset + jitter(1.1), 9, 34).toFixed(0));

  // Apply sensor failure modes cleanly without inventing normal replacements
  if (hrSensor?.failureMode === 'stopped' || hrSensor?.failureMode === 'disconnected') {
    hrVal = null;
  } else if (hrSensor?.failureMode === 'frozen' && previousWearable?.heartRate != null) {
    hrVal = previousWearable.heartRate;
  } else if (hrSensor?.failureMode === 'inconsistent') {
    hrVal = tickCount % 2 === 0 ? 188 : 34; // Implausible alternating spikes
  }

  if (spo2Sensor?.failureMode === 'stopped' || spo2Sensor?.failureMode === 'disconnected') {
    spo2Val = null;
  } else if (spo2Sensor?.failureMode === 'inconsistent') {
    spo2Val = tickCount % 2 === 0 ? 79.2 : 99.8;
  }

  if (tempSensor?.failureMode === 'stopped' || tempSensor?.failureMode === 'disconnected') {
    tempVal = null;
  } else if (tempSensor?.failureMode === 'frozen') {
    tempVal = previousWearable?.bodyTemp ?? 36.7;
  }

  const ecgIrregular =
    hrSensor?.failureMode === 'inconsistent' ||
    (hrVal !== null && astronaut.activity !== 'Exercise' && hrVal > astronaut.preMissionBaseline.heartRate + 26);
  const ecg = generateEcgWaveform(
    hrVal,
    ecgIrregular,
    hrVal === null || hrSensor?.failureMode === 'transmission_interrupted'
  );

  const wearable: WearableReading = {
    timestamp: now,
    astronautId: astronaut.id,
    heartRate: hrVal,
    spo2: spo2Val,
    bodyTemp: tempVal,
    respiratoryRate: respVal,
    motionLevel,
    activity: astronaut.activity,
    ecgRhythm: ecg.rhythm,
    ecgPoints: ecg.points,
    dataQuality: {
      heartRate: hrMap.quality,
      spo2: spo2Map.quality,
      bodyTemp: tempMap.quality,
      respiratoryRate: hrMap.quality === 'Missing' ? 'Uncertain' : 'Valid',
    },
    isSimulated: true,
  };

  // Step 1: Generate ALL environmental sensor values for the selected location before filtering
  const activeEvents = ENVIRONMENTAL_EVENTS.filter(
    (ev) => activeEventIds.includes(ev.id) && ev.environmentIds.includes(location.environmentId)
  );

  let dRad = 0;
  let dDust = 0;
  let dOutTemp = 0;
  let dCo2 = 0;
  let dO2 = 0;
  let dAq = 0;
  let dInTemp = 0;
  let dPress = 0;

  for (const ev of activeEvents) {
    const f = eventBlendFactor;
    dRad += (ev.deltas.outsideRadiation ?? 0) * f;
    dDust += (ev.deltas.outsideDust ?? 0) * f;
    dOutTemp += (ev.deltas.outsideTemperature ?? 0) * f;
    dCo2 += (ev.deltas.insideCo2 ?? 0) * f;
    dO2 += (ev.deltas.insideOxygen ?? 0) * f;
    dAq += (ev.deltas.insideAirQuality ?? 0) * f;
    dInTemp += (ev.deltas.insideTemperature ?? 0) * f;
    dPress += (ev.deltas.insidePressure ?? 0) * f;
  }

  // Smoothly blend from previous readings if same location, otherwise fresh cycle
  const sameLocation = previousEnv?.locationId === location.id;
  const smooth = (prev: number | null | undefined, target: number, alpha = 0.55) =>
    sameLocation && prev != null ? prev + (target - prev) * alpha : target;

  const rawOutRad =
    extSensor?.failureMode === 'stopped' || extSensor?.failureMode === 'disconnected'
      ? null
      : Number(
          clamp(
            smooth(previousEnv?.outside.radiation.value, location.baseOutside.radiation + dRad) + jitter(0.03),
            0.005,
            15
          ).toFixed(3)
        );

  const rawOutDust =
    extSensor?.failureMode === 'stopped' || extSensor?.failureMode === 'disconnected'
      ? null
      : location.baseOutside.dust === null
        ? 0
        : Number(
            clamp(
              smooth(previousEnv?.outside.dust.value, location.baseOutside.dust + dDust) + jitter(0.04),
              0.01,
              12
            ).toFixed(2)
          );

  const rawOutTemp = Number(
    clamp(
      smooth(previousEnv?.outside.temperature.value, location.baseOutside.temperature + dOutTemp) + jitter(0.8),
      -200,
      140
    ).toFixed(1)
  );

  const rawOutAtm =
    location.baseOutside.atmosphericPressure === null
      ? null
      : Number(clamp(location.baseOutside.atmosphericPressure + jitter(0.01), 0.1, 105).toFixed(2));

  let rawCo2: number | null =
    co2Sensor?.failureMode === 'stopped' || co2Sensor?.failureMode === 'disconnected'
      ? null
      : Math.round(
          clamp(
            smooth(previousEnv?.inside.co2.value, location.baseInside.co2 + dCo2) + jitter(24),
            350,
            9500
          )
        );
  if (co2Sensor?.failureMode === 'frozen' && previousEnv?.inside.co2.value != null) {
    rawCo2 = previousEnv.inside.co2.value;
  } else if (co2Sensor?.failureMode === 'inconsistent') {
    rawCo2 = tickCount % 2 === 0 ? 7800 : 120;
  }

  const rawO2 = Number(
    clamp(smooth(previousEnv?.inside.oxygen.value, location.baseInside.oxygen + dO2) + jitter(0.08), 14, 24).toFixed(1)
  );
  const rawAq = Math.round(
    clamp(smooth(previousEnv?.inside.airQuality.value, location.baseInside.airQuality + dAq) + jitter(2), 5, 320)
  );
  const rawInTemp = Number(
    clamp(
      smooth(previousEnv?.inside.temperature.value, location.baseInside.temperature + dInTemp) + jitter(0.15),
      15,
      36
    ).toFixed(1)
  );
  const rawHumidity = Math.round(
    clamp(smooth(previousEnv?.inside.humidity.value, location.baseInside.humidity) + jitter(1.2), 20, 80)
  );
  const rawPressure = Number(
    clamp(
      smooth(previousEnv?.inside.pressure.value, location.baseInside.pressure + dPress) + jitter(0.12),
      55,
      106
    ).toFixed(1)
  );

  // Step 2 & 3: Collect and filter for applicable location sensors
  const app = location.applicableSensors;
  const personalDust = personalSensorMismatchDemo
    ? Number((2.45 + jitter(0.18)).toFixed(2))
    : Number(clamp((rawAq / 80) + jitter(0.05), 0.05, 4.5).toFixed(2));
  const fixedDustBaseline = Number((rawAq / 80).toFixed(2));
  const discrepancy =
    personalSensorMismatchDemo || Math.abs(personalDust - fixedDustBaseline) > 1.2;

  const env: EnvReadingPacket = {
    timestamp: now,
    environmentId: location.environmentId,
    locationId: location.id,
    locationName: location.name,
    outside: {
      radiation: {
        value: app.outsideRadiation ? rawOutRad : null,
        unit: 'mSv/day',
        applicable: app.outsideRadiation,
        sensorId: `EXT-RAD-${location.id.toUpperCase()}`,
        quality: extMap.quality,
      },
      dust: {
        value: app.outsideDust ? rawOutDust : null,
        unit: 'mg/m³',
        applicable: app.outsideDust,
        sensorId: `EXT-DUST-${location.id.toUpperCase()}`,
        quality: app.outsideDust ? extMap.quality : 'Valid',
      },
      temperature: {
        value: app.outsideTemperature ? rawOutTemp : null,
        unit: '°C',
        applicable: app.outsideTemperature,
        sensorId: `EXT-TEMP-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
      atmosphere: {
        value: app.outsideAtmosphere ? rawOutAtm : null,
        unit: 'kPa',
        applicable: app.outsideAtmosphere,
        note: location.baseOutside.atmosphericNote,
        sensorId: `EXT-ATM-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
    },
    inside: {
      co2: {
        value: rawCo2,
        unit: 'ppm',
        sensorId: `HAB-CO2-${location.id.toUpperCase()}`,
        quality: co2Map.quality,
      },
      oxygen: {
        value: rawO2,
        unit: '%',
        sensorId: `HAB-O2-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
      airQuality: {
        value: rawAq,
        unit: 'AQI',
        sensorId: `HAB-AQ-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
      temperature: {
        value: rawInTemp,
        unit: '°C',
        sensorId: `HAB-TEMP-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
      humidity: {
        value: rawHumidity,
        unit: '%RH',
        sensorId: `HAB-HUM-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
      pressure: {
        value: rawPressure,
        unit: 'kPa',
        sensorId: `HAB-PRS-${location.id.toUpperCase()}`,
        quality: 'Valid',
      },
    },
    personalSensor: {
      sensorId: `PRS-BADGE-${astronaut.id}`,
      dustExposure: personalDust,
      co2Local: rawCo2 !== null ? Math.round(rawCo2 + jitter(35)) : null,
      radiationLocal: rawOutRad !== null ? Number((rawOutRad * (astronaut.evaSuited ? 0.95 : 0.35)).toFixed(3)) : null,
      discrepancyDetected: discrepancy,
      discrepancyNote: discrepancy
        ? `Personal badge detects elevated local particulates (${personalDust} mg/m³) while fixed habitat air sensor reads nominal (${rawAq} AQI).`
        : undefined,
    },
    suit:
      app.suitTelemetry || astronaut.evaSuited
        ? {
            applicable: true,
            suitPressureKpa: astronaut.evaSuited ? Number((29.6 + jitter(0.25)).toFixed(1)) : null,
            suitO2Pct: astronaut.evaSuited ? Number((99.2 + jitter(0.2)).toFixed(1)) : null,
            suitCo2Ppm: astronaut.evaSuited ? Math.round(520 + jitter(35)) : null,
            suitTempC: astronaut.evaSuited ? Number((21.4 + jitter(0.4)).toFixed(1)) : null,
            batteryPct: astronaut.evaSuited ? Math.max(22, 94 - (tickCount % 30)) : 100,
          }
        : {
            applicable: false,
            suitPressureKpa: null,
            suitO2Pct: null,
            suitCo2Ppm: null,
            suitTempC: null,
            batteryPct: 100,
          },
    isSimulated: true,
  };

  // Update sensor health status & log failures/recoveries
  const newFailureEvents: SensorFailureEventLog[] = [];
  const updatedSensors = sensorHealth.map((s) => {
    const mapped = mapFailureModeToHealth(s.failureMode);
    const isFailed = s.failureMode !== 'none';
    const wasFailed = s.status !== 'Healthy';

    if (isFailed && !wasFailed) {
      newFailureEvents.push({
        id: `SF-${Date.now()}-${s.sensorId}`,
        sensorId: s.sensorId,
        sensorName: s.name,
        astronautId: astronaut.id,
        environmentId: location.environmentId,
        locationName: location.name,
        issueType: mapped.status,
        detectedAt: now,
        recoveredAt: null,
        note: `Simulated ${mapped.status} state detected on ${s.name}. Missing/unreliable readings excluded from normal baseline.`,
        isSimulated: true,
      });
    } else if (!isFailed && wasFailed) {
      newFailureEvents.push({
        id: `SR-${Date.now()}-${s.sensorId}`,
        sensorId: s.sensorId,
        sensorName: s.name,
        astronautId: astronaut.id,
        environmentId: location.environmentId,
        locationName: location.name,
        issueType: 'Healthy',
        detectedAt: s.failureDetectedAt ?? now,
        recoveredAt: now,
        note: `${s.name} recovered and resumed valid simulated telemetry.`,
        isSimulated: true,
      });
    }

    return {
      ...s,
      environmentId: location.environmentId,
      locationId: location.id,
      status: mapped.status,
      batteryPct:
        s.batteryPct === null
          ? null
          : s.failureMode === 'low_battery'
            ? 11
            : s.failureMode === 'disconnected'
              ? s.batteryPct
              : Math.max(45, s.batteryPct),
      lastValidTimestamp:
        s.failureMode === 'stopped' || s.failureMode === 'disconnected'
          ? s.lastValidTimestamp
          : now,
      secondsSinceLastValid:
        s.failureMode === 'stopped' || s.failureMode === 'disconnected'
          ? s.secondsSinceLastValid + 3
          : s.failureMode === 'delayed' || s.failureMode === 'transmission_interrupted'
            ? 14
            : 0,
      completenessPct:
        s.failureMode === 'stopped' || s.failureMode === 'disconnected'
          ? 0
          : s.failureMode === 'inconsistent'
            ? 62
            : 100,
      consistencyOk: s.failureMode !== 'inconsistent' && s.failureMode !== 'frozen',
      plausibilityOk: s.failureMode !== 'inconsistent',
      failureDetectedAt: isFailed ? s.failureDetectedAt ?? now : null,
      recoveredAt: !isFailed && wasFailed ? now : s.recoveredAt,
    };
  });

  return { wearable, env, updatedSensors, newFailureEvents };
}
