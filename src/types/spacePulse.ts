export type EnvironmentId =
  | 'earth'
  | 'spacecraft'
  | 'iss'
  | 'lunar_rover'
  | 'moon_base'
  | 'mars_transit'
  | 'mars_base';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'stopped';

export type DataQualityStatus =
  | 'Valid'
  | 'Delayed'
  | 'Missing'
  | 'Conflicting'
  | 'Uncertain'
  | 'Potential Sensor Failure';

export type SensorHealthCategory =
  | 'Healthy'
  | 'Degraded'
  | 'Delayed'
  | 'Intermittent'
  | 'Disconnected'
  | 'Low Battery'
  | 'Inconsistent or Implausible'
  | 'Transmission Interrupted'
  | 'Failed or Unavailable';

export type SensorFailureMode =
  | 'none'
  | 'stopped'
  | 'inconsistent'
  | 'frozen'
  | 'disconnected'
  | 'low_battery'
  | 'transmission_interrupted'
  | 'delayed';

export type RiskLevel = 'Advisory' | 'Warning' | 'Critical';
export type RecommendationSeverity = 'Normal' | 'Caution' | 'Warning' | 'Critical' | 'Emergency';
export type ConcernCategory = 'Environmental' | 'Health' | 'Combined';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';
export type RecommendationStatus =
  | 'Active'
  | 'Acknowledged'
  | 'Action In Progress'
  | 'Completed'
  | 'Escalated'
  | 'Resolved';

export type MissionPeriod = 'Pre-Mission' | 'During-Mission' | 'Post-Mission';
export type UserRole = 'astronaut' | 'ground_medical' | 'observer';
export type CommsStatus = 'Connected' | 'Delayed' | 'Limited Connectivity' | 'Offline — Data Queued';

export type ActivityContext = 'Resting' | 'Moderate Work' | 'Exercise' | 'EVA / Suited' | 'Sleeping';

export type SymptomTag =
  | 'Headache'
  | 'Respiratory Discomfort'
  | 'Fatigue'
  | 'Dizziness'
  | 'Nausea'
  | 'Mild Dehydration';

export type EnvironmentDetectionSource =
  | 'manual'
  | 'gps_auto'
  | 'gps_suggested'
  | 'gps_overridden';

export interface LocationProfile {
  id: string;
  environmentId: EnvironmentId;
  name: string;
  sector: string;
  shortDesc: string;
  accentColor: string;
  hasOutsideAtmosphere: boolean;
  outsidePressureLabel?: string;
  baseOutside: {
    radiation: number; // mSv/day
    dust: number | null; // mg/m3 (null if N/A e.g. vacuum orbit)
    temperature: number; // °C
    atmosphericPressure: number | null; // kPa (null if vacuum/N/A)
    atmosphericNote: string;
  };
  baseInside: {
    co2: number; // ppm
    oxygen: number; // %
    airQuality: number; // 0-500 AQI (lower is cleaner)
    temperature: number; // °C
    humidity: number; // %
    pressure: number; // kPa
  };
  applicableSensors: {
    outsideRadiation: boolean;
    outsideDust: boolean;
    outsideTemperature: boolean;
    outsideAtmosphere: boolean;
    insideCo2: boolean;
    insideOxygen: boolean;
    insideAirQuality: boolean;
    insideTemperature: boolean;
    insideHumidity: boolean;
    insidePressure: boolean;
    suitTelemetry: boolean;
  };
}

export interface EnvironmentProfile {
  id: EnvironmentId;
  name: string;
  shortName: string;
  isPrimaryFive: boolean;
  accentHex: string;
  gradientClass: string;
  gravityLabel: string;
  commsProfile: CommsStatus;
  commsDelayLabel: string;
  primaryHazards: string[];
  secondaryHazards: string[];
  affectedSystems: string[];
  mandatorySensors: string[];
  optionalSensors: string[];
  priorityReadings: string[];
  immediateRisks: string[];
  cumulativeRisks: string[];
  evaHandling: string;
  escalationGuidance: string;
}

export interface EnvironmentalEventDef {
  id: string;
  environmentIds: EnvironmentId[];
  title: string;
  summary: string;
  affectedTarget: 'outside' | 'inside' | 'suit';
  severityHint: RiskLevel;
  deltas: {
    outsideRadiation?: number;
    outsideDust?: number;
    outsideTemperature?: number;
    insideCo2?: number;
    insideOxygen?: number;
    insideAirQuality?: number;
    insideTemperature?: number;
    insidePressure?: number;
  };
}

export interface WearableReading {
  timestamp: string;
  astronautId: string;
  heartRate: number | null; // BPM
  spo2: number | null; // %
  bodyTemp: number | null; // °C
  respiratoryRate: number | null; // breaths/min
  motionLevel: number; // 0-100
  activity: ActivityContext;
  ecgRhythm: 'Normal Sinus' | 'Elevated Variability' | 'Irregular Spike' | 'Signal Unavailable';
  ecgPoints: number[];
  dataQuality: Record<string, DataQualityStatus>;
  isSimulated: true;
}

export interface EnvReadingPacket {
  timestamp: string;
  environmentId: EnvironmentId;
  locationId: string;
  locationName: string;
  outside: {
    radiation: { value: number | null; unit: string; applicable: boolean; sensorId: string; quality: DataQualityStatus };
    dust: { value: number | null; unit: string; applicable: boolean; sensorId: string; quality: DataQualityStatus };
    temperature: { value: number | null; unit: string; applicable: boolean; sensorId: string; quality: DataQualityStatus };
    atmosphere: { value: number | null; unit: string; applicable: boolean; note: string; sensorId: string; quality: DataQualityStatus };
  };
  inside: {
    co2: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
    oxygen: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
    airQuality: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
    temperature: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
    humidity: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
    pressure: { value: number | null; unit: string; sensorId: string; quality: DataQualityStatus };
  };
  personalSensor: {
    sensorId: string;
    dustExposure: number | null;
    co2Local: number | null;
    radiationLocal: number | null;
    discrepancyDetected: boolean;
    discrepancyNote?: string;
  };
  suit?: {
    applicable: boolean;
    suitPressureKpa: number | null;
    suitO2Pct: number | null;
    suitCo2Ppm: number | null;
    suitTempC: number | null;
    batteryPct: number;
  };
  isSimulated: true;
}

export interface SensorHealthRecord {
  sensorId: string;
  name: string;
  domain: 'Wearable' | 'Habitat' | 'External' | 'Personal';
  astronautId?: string;
  environmentId: EnvironmentId;
  locationId: string;
  status: SensorHealthCategory;
  failureMode: SensorFailureMode;
  batteryPct: number | null;
  lastValidTimestamp: string | null;
  expectedIntervalSec: number;
  secondsSinceLastValid: number;
  completenessPct: number;
  consistencyOk: boolean;
  plausibilityOk: boolean;
  failureDetectedAt: string | null;
  recoveredAt: string | null;
  safetyCritical: boolean;
}

export interface SensorFailureEventLog {
  id: string;
  sensorId: string;
  sensorName: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationName: string;
  issueType: SensorHealthCategory;
  detectedAt: string;
  recoveredAt: string | null;
  note: string;
  isSimulated: true;
}

export interface AstronautProfile {
  id: string;
  name: string;
  roleTitle: string;
  avatarHue: string;
  missionPeriod: MissionPeriod;
  evaSuited: boolean;
  activity: ActivityContext;
  sleepHoursLastNight: number;
  hydrationLevelPct: number;
  workloadLevel: 'Low' | 'Moderate' | 'High';
  sensitivityNotes: string;
  reportedSymptoms: SymptomTag[];
  preMissionBaseline: {
    heartRate: number;
    spo2: number;
    bodyTemp: number;
    respiratoryRate: number;
  };
  evolvingBaseline: {
    heartRate: number;
    spo2: number;
    bodyTemp: number;
    respiratoryRate: number;
    lockedForReview: boolean;
    lockReason?: string;
  };
  editableOverrides: {
    enabled: boolean;
    heartRate: number;
    spo2: number;
    bodyTemp: number;
    respiratoryRate: number;
  };
  periodSnapshots: {
    preMission: { avgHr: number; avgSpo2: number; avgTemp: number; avgResp: number; radiationCumul: number };
    duringMission: { avgHr: number; avgSpo2: number; avgTemp: number; avgResp: number; radiationCumul: number };
    postMission: { avgHr: number; avgSpo2: number; avgTemp: number; avgResp: number; radiationCumul: number };
  };
}

export interface AnalyticalFinding {
  findingId: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationId: string;
  locationName: string;
  timestamp: string;
  category: ConcernCategory;
  riskClassification: RiskLevel;
  riskScore: number; // 0-100 explainable demonstration index
  riskScoreBreakdown: string;
  title: string;
  explanation: string;
  possibleRelationship: string | null;
  confidenceLabel: 'High' | 'Moderate' | 'Low / Uncertain';
  uncertaintyNotes: string[];
  sensorReliabilityNotes: string[];
  currentHealthSnapshot: Partial<Record<'heartRate' | 'spo2' | 'bodyTemp' | 'respiratoryRate', number | null>>;
  previousHealthSnapshot: Partial<Record<'heartRate' | 'spo2' | 'bodyTemp' | 'respiratoryRate', number | null>>;
  currentEnvSnapshot: Partial<Record<'co2' | 'oxygen' | 'airQuality' | 'temperature' | 'pressure' | 'outsideRadiation' | 'outsideDust', number | null>>;
  previousEnvSnapshot: Partial<Record<'co2' | 'oxygen' | 'airQuality' | 'temperature' | 'pressure' | 'outsideRadiation' | 'outsideDust', number | null>>;
  baselineDeviations: string[];
  exposureHistorySummary: string;
  activityContext: ActivityContext;
  reportedSymptoms: SymptomTag[];
  recommendedActions: string[];
  suggestedRecipients: ('Astronaut' | 'Ground Medical Team')[];
  resolved: boolean;
  isSimulated: true;
}

export interface AlertRecord {
  alertId: string;
  findingId: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationId: string;
  locationName: string;
  level: RiskLevel;
  category: ConcernCategory;
  status: AlertStatus;
  title: string;
  explanation: string;
  possibleRelationship: string | null;
  uncertaintyNotes: string[];
  sensorReliabilityNotes: string[];
  currentHealthSnapshot: AnalyticalFinding['currentHealthSnapshot'];
  previousHealthSnapshot: AnalyticalFinding['previousHealthSnapshot'];
  currentEnvSnapshot: AnalyticalFinding['currentEnvSnapshot'];
  previousEnvSnapshot: AnalyticalFinding['previousEnvSnapshot'];
  reportedSymptoms: SymptomTag[];
  recommendedActions: string[];
  detectedAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  groundTeamNotified: boolean;
  commsDeliveryStatus: 'Delivered (Demo)' | 'Queued Offline' | 'Delayed';
  isSimulated: true;
}

export type RecommendationType =
  | 'Immediate Safety Action'
  | 'Preventive Health Action'
  | 'Environmental Protection'
  | 'Hydration, Nutrition & Recovery'
  | 'Activity Modification'
  | 'Medical Assessment Request'
  | 'Ground / Onboard Medical Escalation'
  | 'Emergency Procedure Access'
  | 'Follow-Up Monitoring'
  | 'Sensor Failure Fallback';

export interface RecommendationRecord {
  recommendationId: string;
  findingId: string;
  alertId: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationId: string;
  locationName: string;
  severity: RecommendationSeverity;
  category: ConcernCategory;
  recommendationType: RecommendationType;
  status: RecommendationStatus;
  title: string;
  whyRecommended: string;
  actionSteps: string[];
  evidenceType: 'Single Reading' | 'Sustained Trend' | 'Multi-Indicator' | 'Uncertain Data' | 'Immediate Safety' | 'Sensor Reliability';
  treatmentBoundaryLabel: 'General Preventive Guidance (Non-Medical)' | 'Mission Protocol / Medical Assessment Recommended' | 'Sensor Reliability Fallback';
  confidenceLabel: 'High' | 'Moderate' | 'Low / Uncertain';
  followUpRequired: string;
  escalationTarget: 'Astronaut' | 'Onboard Medical' | 'Ground Medical Team' | 'Mission Control';
  linkedProcedureId?: string;
  groundNotes: string[];
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  completedAt: string | null;
  commsStatus: 'Delivered (Demo)' | 'Queued Offline' | 'Delayed';
  isSimulated: true;
}

export interface EmergencyProcedure {
  id: string;
  title: string;
  triggerConditions: string;
  category: string;
  steps: string[];
  requiresAck: boolean;
  notifyTarget: string;
  followUpInterval: string;
}

export interface QueuedTransmission {
  id: string;
  type: 'Alert' | 'Recommendation' | 'Health Report' | 'Telemetry Snapshot';
  refId: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationName: string;
  summary: string;
  createdAt: string;
  status: 'Queued' | 'Delivered';
  deliveredAt: string | null;
}

export interface HealthReportRecord {
  id: string;
  reportType: 'Daily' | 'Weekly' | 'Monthly' | 'Event-Triggered';
  scope: 'Individual' | 'Crew-Wide';
  astronautId: string | 'CREW';
  environmentId: EnvironmentId;
  locationName: string;
  periodLabel: string;
  triggerReason: string;
  generatedAt: string;
  overallStatus: RiskLevel | 'Nominal';
  quickSummary: string[];
  detailedAnalysis: {
    physiologicalTrends: string[];
    baselineComparison: string[];
    environmentalExposure: string[];
    recurringSymptoms: string[];
    alertSummary: string[];
    recommendationsSummary: string[];
    dataQualityNotes: string[];
  };
  missingDataNote?: string;
  isSimulated: true;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  astronautId: string;
  environmentId: EnvironmentId;
  locationName: string;
  type: 'Health' | 'Environment' | 'Alert' | 'Recommendation' | 'Sensor' | 'Location' | 'Report';
  severity: RiskLevel | 'Info';
  title: string;
  detail: string;
}
