import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_ASTRONAUTS } from '../data/crewDefaults';
import { ENVIRONMENT_PROFILES, ENVIRONMENTAL_EVENTS, LOCATIONS } from '../data/environments';
import { syncAlertsAndRecommendations } from '../engine/alertsAndCare';
import { runHybridAnalysis } from '../engine/analyzer';
import { buildHealthReport } from '../engine/reporting';
import { createInitialSensorHealth, generateSimulationTick } from '../engine/simulator';
import {
  ActivityContext,
  AlertRecord,
  AnalyticalFinding,
  AstronautProfile,
  CommsStatus,
  EnvReadingPacket,
  EnvironmentDetectionSource,
  EnvironmentId,
  HealthReportRecord,
  LocationProfile,
  MissionPeriod,
  QueuedTransmission,
  RecommendationRecord,
  RecommendationStatus,
  SensorFailureEventLog,
  SensorFailureMode,
  SensorHealthRecord,
  SimulationStatus,
  SymptomTag,
  TimelineEvent,
  UserRole,
  WearableReading,
} from '../types/spacePulse';

export type AppPage = 'environment' | 'monitor' | 'analysis' | 'alerts' | 'reports';

export interface GpsDetectionState {
  status: 'idle' | 'detecting' | 'suggested' | 'confirmed' | 'unavailable' | 'ambiguous';
  rawCoords?: { lat: number; lng: number; accuracy: number };
  suggestedEnvironmentId?: EnvironmentId;
  suggestedLocationId?: string;
  message: string;
}

interface SpacePulseContextValue {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // Intro walkthrough (auto-shows only once before first simulation)
  showIntroModal: boolean;
  openIntroModal: () => void;
  closeIntroModal: () => void;

  // Environment & Location (Phase 1 & 2)
  currentEnvironmentId: EnvironmentId;
  currentLocationId: string;
  currentLocation: LocationProfile;
  detectionSource: EnvironmentDetectionSource;
  gpsState: GpsDetectionState;
  detectWithBrowserGps: () => void;
  simulateGpsSuggestion: (envId: EnvironmentId, ambiguous?: boolean) => void;
  confirmSuggestedEnvironment: () => void;
  changeLocation: (locationId: string, source?: EnvironmentDetectionSource) => void;

  // Simulation controls (Phase 1)
  simStatus: SimulationStatus;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  stepSimulationOnce: () => void;

  // Environmental Events (Phase 1)
  activeEventIds: string[];
  returningToNormal: boolean;
  triggerEnvironmentalEvent: (eventId: string) => void;
  returnToNormalConditions: () => void;

  // Astronaut & Editable Health Conditions
  astronauts: AstronautProfile[];
  activeAstronautId: string;
  activeAstronaut: AstronautProfile;
  setActiveAstronautId: (id: string) => void;
  updateAstronautHealth: (
    astronautId: string,
    updater: (prev: AstronautProfile) => AstronautProfile
  ) => void;
  toggleSymptom: (symptom: SymptomTag) => void;
  setActivityContext: (activity: ActivityContext) => void;
  setMissionPeriod: (period: MissionPeriod) => void;
  unlockEvolvingBaseline: (astronautId: string) => void;

  // Readings & History (Separated by Location for Env, by Astronaut for Health)
  latestWearable: WearableReading | null;
  wearableHistory: WearableReading[];
  latestEnv: EnvReadingPacket | null;
  envHistoryAll: EnvReadingPacket[];
  envHistoryCurrentLocation: EnvReadingPacket[];
  visitedLocationIds: string[];

  // Sensor Health & Failure Detection (Phase 5)
  sensorHealth: SensorHealthRecord[];
  sensorFailureLog: SensorFailureEventLog[];
  setSensorFailureMode: (sensorId: string, mode: SensorFailureMode) => void;

  // Phase 3 Analytical Findings
  activeFindings: AnalyticalFinding[];
  findingHistory: AnalyticalFinding[];
  personalSensorMismatchDemo: boolean;
  setPersonalSensorMismatchDemo: (v: boolean) => void;
  gradualHrDriftDemo: boolean;
  setGradualHrDriftDemo: (v: boolean) => void;

  // Phase 4 Alerts & Phase 5 Recommendations + Comms Queue
  alerts: AlertRecord[];
  recommendations: RecommendationRecord[];
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeRecommendation: (recId: string) => void;
  updateRecommendationStatus: (recId: string, status: RecommendationStatus) => void;
  addGroundMedicalNote: (recId: string, note: string) => void;
  commsStatus: CommsStatus;
  setCommsStatus: (status: CommsStatus) => void;
  commsQueue: QueuedTransmission[];
  completedProcedureSteps: Record<string, number[]>;
  toggleProcedureStep: (procId: string, stepIndex: number) => void;

  // Phase 6 Reports & Timeline
  reports: HealthReportRecord[];
  generateReportNow: (type: HealthReportRecord['reportType'], scope: HealthReportRecord['scope'], reason?: string) => void;
  timelineEvents: TimelineEvent[];

  // One-Click Verification Scenario Runner
  runDemoScenario: (scenarioId: string) => void;
}

const SpacePulseContext = createContext<SpacePulseContextValue | null>(null);

const INTRO_SEEN_KEY = 'space_pulse_intro_seen_v1';

export const SpacePulseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<AppPage>('environment');
  const [userRole, setUserRole] = useState<UserRole>('astronaut');

  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const hasAutoPromptedRef = useRef<boolean>(false);

  const [currentLocationId, setCurrentLocationId] = useState<string>('mars_alpha');
  const currentLocation = useMemo(
    () => LOCATIONS.find((l) => l.id === currentLocationId) ?? LOCATIONS[0],
    [currentLocationId]
  );
  const currentEnvironmentId = currentLocation.environmentId;

  const [detectionSource, setDetectionSource] = useState<EnvironmentDetectionSource>('manual');
  const [gpsState, setGpsState] = useState<GpsDetectionState>({
    status: 'idle',
    message: 'Use device GPS as an environment-detection aid, or select your mission environment manually below.',
  });

  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [activeEventIds, setActiveEventIds] = useState<string[]>([]);
  const [returningToNormal, setReturningToNormal] = useState<boolean>(false);
  const [eventBlendFactor, setEventBlendFactor] = useState<number>(1);

  const [astronauts, setAstronauts] = useState<AstronautProfile[]>(INITIAL_ASTRONAUTS);
  const [activeAstronautId, setActiveAstronautId] = useState<string>('SP-01');
  const activeAstronaut = useMemo(
    () => astronauts.find((a) => a.id === activeAstronautId) ?? astronauts[0],
    [astronauts, activeAstronautId]
  );

  const [wearableHistory, setWearableHistory] = useState<WearableReading[]>([]);
  const [envHistoryAll, setEnvHistoryAll] = useState<EnvReadingPacket[]>([]);
  const [sensorHealth, setSensorHealth] = useState<SensorHealthRecord[]>(() =>
    createInitialSensorHealth('SP-01', LOCATIONS[0])
  );
  const [sensorFailureLog, setSensorFailureLog] = useState<SensorFailureEventLog[]>([]);

  const [personalSensorMismatchDemo, setPersonalSensorMismatchDemo] = useState(false);
  const [gradualHrDriftDemo, setGradualHrDriftDemo] = useState(false);

  const [activeFindings, setActiveFindings] = useState<AnalyticalFinding[]>([]);
  const [findingHistory, setFindingHistory] = useState<AnalyticalFinding[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);

  const [commsStatus, setCommsStatus] = useState<CommsStatus>('Delayed');
  const [commsQueue, setCommsQueue] = useState<QueuedTransmission[]>([]);
  const [completedProcedureSteps, setCompletedProcedureSteps] = useState<Record<string, number[]>>({});

  const [reports, setReports] = useState<HealthReportRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  const tickCountRef = useRef<number>(0);

  // Sync comms profile when environment changes
  useEffect(() => {
    const profile = ENVIRONMENT_PROFILES[currentEnvironmentId];
    setCommsStatus(profile.commsProfile);
  }, [currentEnvironmentId]);

  // Seed initial simulated Phase 6 Daily report once readings exist, without creating duplicates
  const pushTimeline = useCallback((ev: Omit<TimelineEvent, 'id'>) => {
    setTimelineEvents((prev) => [
      { ...ev, id: `TL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev.slice(0, 80),
    ]);
  }, []);

  // Core simulation cycle
  const executeTick = useCallback(
    (overrideLocationId?: string, overrideEvents?: string[], overrideBlend?: number) => {
      const targetLocId = overrideLocationId ?? currentLocationId;
      const targetLocation = LOCATIONS.find((l) => l.id === targetLocId) ?? LOCATIONS[0];
      const targetEvents = overrideEvents ?? activeEventIds;
      const targetBlend = overrideBlend ?? eventBlendFactor;

      tickCountRef.current += 1;

      const prevWearable =
        wearableHistory.filter((w) => w.astronautId === activeAstronaut.id).slice(-1)[0] ?? null;
      const envForLoc = envHistoryAll.filter((e) => e.locationId === targetLocId);
      const prevEnv = envForLoc.slice(-1)[0] ?? null;

      const tickOut = generateSimulationTick({
        astronaut: activeAstronaut,
        locationId: targetLocId,
        activeEventIds: targetEvents,
        eventBlendFactor: targetBlend,
        previousWearable: prevWearable,
        previousEnv: prevEnv,
        sensorHealth,
        personalSensorMismatchDemo,
        gradualHrDriftDemo,
        tickCount: tickCountRef.current,
      });

      const nextWearableHist = [...wearableHistory.slice(-119), tickOut.wearable];
      const nextEnvAll = [...envHistoryAll.slice(-179), tickOut.env];
      const nextEnvForLoc = nextEnvAll.filter((e) => e.locationId === targetLocId);

      setWearableHistory(nextWearableHist);
      setEnvHistoryAll(nextEnvAll);
      setSensorHealth(tickOut.updatedSensors);

      if (tickOut.newFailureEvents.length > 0) {
        setSensorFailureLog((prev) => [...tickOut.newFailureEvents, ...prev].slice(0, 60));
        for (const sf of tickOut.newFailureEvents) {
          pushTimeline({
            timestamp: sf.recoveredAt ?? sf.detectedAt,
            astronautId: sf.astronautId,
            environmentId: sf.environmentId,
            locationName: sf.locationName,
            type: 'Sensor',
            severity: sf.recoveredAt ? 'Info' : 'Warning',
            title: sf.recoveredAt ? `Sensor Recovered: ${sf.sensorName}` : `Sensor Issue: ${sf.sensorName} (${sf.issueType})`,
            detail: sf.note,
          });
        }
      }

      // Phase 3: Run Hybrid Analysis
      const analysisOut = runHybridAnalysis({
        astronaut: activeAstronaut,
        wearable: tickOut.wearable,
        previousWearable: prevWearable,
        env: tickOut.env,
        previousEnv: prevEnv,
        envHistoryForLocation: nextEnvForLoc,
        wearableHistory: nextWearableHist.filter((w) => w.astronautId === activeAstronaut.id),
        sensorHealth: tickOut.updatedSensors,
      });

      setActiveFindings(analysisOut.findings);

      if (analysisOut.findings.length > 0) {
        setFindingHistory((prev) => {
          const map = new Map(prev.map((p) => [`${p.findingId}-${p.timestamp.slice(0, 16)}`, p]));
          for (const f of analysisOut.findings) {
            map.set(`${f.findingId}-${f.timestamp.slice(0, 16)}`, f);
          }
          return Array.from(map.values()).slice(-60);
        });
      }

      // Update / Lock Evolving Baseline
      setAstronauts((prev) =>
        prev.map((a) => {
          if (a.id !== activeAstronaut.id) return a;
          if (analysisOut.shouldLockEvolvingBaseline) {
            return {
              ...a,
              evolvingBaseline: {
                ...a.evolvingBaseline,
                lockedForReview: true,
                lockReason: analysisOut.baselineLockReason,
              },
            };
          }
          if (!a.evolvingBaseline.lockedForReview && tickOut.wearable.heartRate !== null && a.activity === 'Resting') {
            const nextHr = Number((a.evolvingBaseline.heartRate * 0.92 + tickOut.wearable.heartRate * 0.08).toFixed(1));
            return {
              ...a,
              evolvingBaseline: { ...a.evolvingBaseline, heartRate: nextHr },
            };
          }
          return a;
        })
      );

      // Phase 4 & 5: Sync Alerts, Recommendations & Comms Queue
      const synced = syncAlertsAndRecommendations({
        activeFindings: analysisOut.findings,
        currentLocationId: targetLocId,
        currentEnvironmentId: targetLocation.environmentId,
        commsStatus,
        existingAlerts: alerts,
        existingRecommendations: recommendations,
        existingQueue: commsQueue,
      });

      setAlerts(synced.alerts);
      setRecommendations(synced.recommendations);
      setCommsQueue(synced.queue);

      // Auto event-triggered Phase 6 report on Critical findings (deduplicated per finding)
      const critFinding = analysisOut.findings.find((f) => f.riskClassification === 'Critical');
      if (critFinding) {
        setReports((prevReports) => {
          const alreadyExists = prevReports.some(
            (r) => r.reportType === 'Event-Triggered' && r.triggerReason.includes(critFinding.findingId)
          );
          if (alreadyExists) return prevReports;
          const rpt = buildHealthReport({
            reportType: 'Event-Triggered',
            scope: 'Individual',
            astronaut: activeAstronaut,
            allAstronauts: astronauts,
            location: targetLocation,
            wearableHistory: nextWearableHist.filter((w) => w.astronautId === activeAstronaut.id),
            envHistory: nextEnvForLoc,
            alerts: synced.alerts,
            recommendations: synced.recommendations,
            sensorFailures: sensorFailureLog,
            triggerReason: `Critical finding ${critFinding.findingId}: ${critFinding.title}`,
          });
          return [rpt, ...prevReports].slice(0, 40);
        });
      }

      // Gradually return event blend to 0 if returningToNormal
      if (returningToNormal) {
        setEventBlendFactor((prev) => {
          const next = Math.max(0, Number((prev - 0.28).toFixed(2)));
          if (next === 0) {
            setReturningToNormal(false);
            setActiveEventIds([]);
          }
          return next;
        });
      }
    },
    [
      activeAstronaut,
      activeEventIds,
      alerts,
      astronauts,
      commsQueue,
      commsStatus,
      currentLocationId,
      envHistoryAll,
      eventBlendFactor,
      gradualHrDriftDemo,
      personalSensorMismatchDemo,
      pushTimeline,
      recommendations,
      returningToNormal,
      sensorFailureLog,
      sensorHealth,
      wearableHistory,
    ]
  );

  // Keep latest executeTick in ref so a single clean interval runs without overlapping timers
  const tickRef = useRef(executeTick);
  useEffect(() => {
    tickRef.current = executeTick;
  }, [executeTick]);

  useEffect(() => {
    if (simStatus !== 'running') return;
    const id = window.setInterval(() => {
      tickRef.current();
    }, 3000);
    return () => window.clearInterval(id);
  }, [simStatus]);

  // First-time intro walkthrough trigger (only once!)
  const maybeShowFirstTimeIntro = useCallback(() => {
    if (hasAutoPromptedRef.current) return;
    const seen = typeof window !== 'undefined' ? window.localStorage.getItem(INTRO_SEEN_KEY) : '1';
    if (!seen) {
      hasAutoPromptedRef.current = true;
      setShowIntroModal(true);
    }
  }, []);

  useEffect(() => {
    if (activePage === 'monitor') {
      maybeShowFirstTimeIntro();
    }
  }, [activePage, maybeShowFirstTimeIntro]);

  const openIntroModal = useCallback(() => setShowIntroModal(true), []);
  const closeIntroModal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(INTRO_SEEN_KEY, '1');
    }
    setShowIntroModal(false);
  }, []);

  const startSimulation = useCallback(() => {
    const seen = typeof window !== 'undefined' ? window.localStorage.getItem(INTRO_SEEN_KEY) : '1';
    if (!seen && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      setShowIntroModal(true);
    }
    setSimStatus('running');
    tickRef.current();
  }, []);

  const pauseSimulation = useCallback(() => {
    setSimStatus('paused');
  }, []);

  const resumeSimulation = useCallback(() => {
    setSimStatus('running');
    tickRef.current();
  }, []);

  const stopSimulation = useCallback(() => {
    setSimStatus('stopped');
  }, []);

  const stepSimulationOnce = useCallback(() => {
    tickRef.current();
  }, []);

  // Location change: Clear old location active events, initialize fresh environmental cycle, preserve old history!
  const changeLocation = useCallback(
    (locationId: string, source: EnvironmentDetectionSource = 'manual') => {
      const nextLoc = LOCATIONS.find((l) => l.id === locationId);
      if (!nextLoc) return;

      setCurrentLocationId(nextLoc.id);
      setDetectionSource(source);
      setActiveEventIds([]);
      setReturningToNormal(false);
      setEventBlendFactor(1);

      // Update sensor IDs for new location while keeping wearable failure modes if any
      setSensorHealth((prev) => {
        const fresh = createInitialSensorHealth(activeAstronaut.id, nextLoc);
        return fresh.map((f) => {
          const existingWearable = prev.find((p) => p.domain === 'Wearable' && p.name === f.name);
          return existingWearable ? { ...f, failureMode: existingWearable.failureMode, status: existingWearable.status } : f;
        });
      });

      pushTimeline({
        timestamp: new Date().toISOString(),
        astronautId: activeAstronaut.id,
        environmentId: nextLoc.environmentId,
        locationName: nextLoc.name,
        type: 'Location',
        severity: 'Info',
        title: `Moved to ${nextLoc.name}`,
        detail: `Environment switched to ${ENVIRONMENT_PROFILES[nextLoc.environmentId].name}. Previous location records preserved separately.`,
      });

      // Trigger fresh initial environmental reading cycle for the new location
      window.setTimeout(() => {
        tickRef.current(nextLoc.id, [], 1);
      }, 40);
    },
    [activeAstronaut.id, pushTimeline]
  );

  // Browser GPS aid
  const detectWithBrowserGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState({
        status: 'unavailable',
        message: 'Device GPS / geolocation is unavailable in this browser. Please select your mission environment manually.',
      });
      return;
    }
    setGpsState({ status: 'detecting', message: 'Requesting device GPS coordinates as environment-detection aid...' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 25000) {
          setGpsState({
            status: 'ambiguous',
            rawCoords: { lat: latitude, lng: longitude, accuracy: Math.round(accuracy) },
            suggestedEnvironmentId: 'earth',
            suggestedLocationId: 'earth_jsc',
            message: `Low GPS accuracy (±${Math.round(accuracy / 1000)} km). Suggested Environment: Earth — Please Confirm or override.`,
          });
        } else {
          setGpsState({
            status: 'suggested',
            rawCoords: { lat: latitude, lng: longitude, accuracy: Math.round(accuracy) },
            suggestedEnvironmentId: 'earth',
            suggestedLocationId: 'earth_jsc',
            message: `GPS detected terrestrial coordinates (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°). Suggested Environment: Earth (Pre/Post-Mission) — Please Confirm.`,
          });
        }
      },
      () => {
        setGpsState({
          status: 'unavailable',
          message: 'GPS permission declined or unavailable. Please choose your mission environment manually or test a GPS preset.',
        });
      },
      { timeout: 6000 }
    );
  }, []);

  const simulateGpsSuggestion = useCallback((envId: EnvironmentId, ambiguous = false) => {
    const firstLoc = LOCATIONS.find((l) => l.environmentId === envId) ?? LOCATIONS[0];
    const envName = ENVIRONMENT_PROFILES[envId].name;
    setGpsState({
      status: ambiguous ? 'ambiguous' : 'suggested',
      suggestedEnvironmentId: envId,
      suggestedLocationId: firstLoc.id,
      message: ambiguous
        ? `Ambiguous signal near boundary. Suggested Environment: ${envName} — Please Confirm.`
        : `Suggested Environment: ${envName} — Please Confirm.`,
    });
  }, []);

  const confirmSuggestedEnvironment = useCallback(() => {
    if (!gpsState.suggestedLocationId || !gpsState.suggestedEnvironmentId) return;
    changeLocation(gpsState.suggestedLocationId, 'gps_auto');
    setGpsState((prev) => ({
      ...prev,
      status: 'confirmed',
      message: `Current Environment: ${ENVIRONMENT_PROFILES[gpsState.suggestedEnvironmentId!].shortName} — Detected Automatically Using GPS.`,
    }));
  }, [changeLocation, gpsState.suggestedEnvironmentId, gpsState.suggestedLocationId]);

  const triggerEnvironmentalEvent = useCallback(
    (eventId: string) => {
      const def = ENVIRONMENTAL_EVENTS.find((e) => e.id === eventId);
      if (!def) return;
      setReturningToNormal(false);
      setEventBlendFactor(1);
      setActiveEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
      pushTimeline({
        timestamp: new Date().toISOString(),
        astronautId: activeAstronaut.id,
        environmentId: currentEnvironmentId,
        locationName: currentLocation.name,
        type: 'Environment',
        severity: def.severityHint,
        title: `Simulated Event: ${def.title}`,
        detail: def.summary,
      });
      if (simStatus !== 'running') {
        setSimStatus('running');
      }
      window.setTimeout(() => tickRef.current(currentLocationId, [...activeEventIds, eventId], 1), 30);
    },
    [activeAstronaut.id, activeEventIds, currentEnvironmentId, currentLocation.name, currentLocationId, pushTimeline, simStatus]
  );

  const returnToNormalConditions = useCallback(() => {
    if (activeEventIds.length === 0) return;
    setReturningToNormal(true);
    pushTimeline({
      timestamp: new Date().toISOString(),
      astronautId: activeAstronaut.id,
      environmentId: currentEnvironmentId,
      locationName: currentLocation.name,
      type: 'Environment',
      severity: 'Info',
      title: 'Returning to Normal Simulated Conditions',
      detail: `Gradually restoring nominal readings in ${currentLocation.name}.`,
    });
  }, [activeAstronaut.id, activeEventIds.length, currentEnvironmentId, currentLocation.name, pushTimeline]);

  const updateAstronautHealth = useCallback(
    (astronautId: string, updater: (prev: AstronautProfile) => AstronautProfile) => {
      setAstronauts((prev) => prev.map((a) => (a.id === astronautId ? updater(a) : a)));
    },
    []
  );

  const toggleSymptom = useCallback(
    (symptom: SymptomTag) => {
      updateAstronautHealth(activeAstronaut.id, (prev) => {
        const exists = prev.reportedSymptoms.includes(symptom);
        return {
          ...prev,
          reportedSymptoms: exists
            ? prev.reportedSymptoms.filter((s) => s !== symptom)
            : [...prev.reportedSymptoms, symptom],
        };
      });
    },
    [activeAstronaut.id, updateAstronautHealth]
  );

  const setActivityContext = useCallback(
    (activity: ActivityContext) => {
      updateAstronautHealth(activeAstronaut.id, (prev) => ({
        ...prev,
        activity,
        evaSuited: activity === 'EVA / Suited' ? true : prev.evaSuited,
      }));
    },
    [activeAstronaut.id, updateAstronautHealth]
  );

  const setMissionPeriod = useCallback(
    (missionPeriod: MissionPeriod) => {
      updateAstronautHealth(activeAstronaut.id, (prev) => ({ ...prev, missionPeriod }));
    },
    [activeAstronaut.id, updateAstronautHealth]
  );

  const unlockEvolvingBaseline = useCallback(
    (astronautId: string) => {
      updateAstronautHealth(astronautId, (prev) => ({
        ...prev,
        evolvingBaseline: { ...prev.evolvingBaseline, lockedForReview: false, lockReason: undefined },
      }));
    },
    [updateAstronautHealth]
  );

  const setSensorFailureMode = useCallback((sensorId: string, mode: SensorFailureMode) => {
    setSensorHealth((prev) =>
      prev.map((s) => (s.sensorId === sensorId ? { ...s, failureMode: mode } : s))
    );
    window.setTimeout(() => tickRef.current(), 30);
  }, []);

  // Phase 4 & 5 Controls
  const acknowledgeAlert = useCallback((alertId: string) => {
    const now = new Date().toISOString();
    setAlerts((prev) =>
      prev.map((a) =>
        a.alertId === alertId && a.status === 'Active'
          ? { ...a, status: 'Acknowledged', acknowledgedAt: now, updatedAt: now }
          : a
      )
    );
  }, []);

  const acknowledgeRecommendation = useCallback((recId: string) => {
    const now = new Date().toISOString();
    setRecommendations((prev) =>
      prev.map((r) =>
        r.recommendationId === recId && r.status === 'Active'
          ? { ...r, status: 'Acknowledged', acknowledgedAt: now, updatedAt: now }
          : r
      )
    );
  }, []);

  const updateRecommendationStatus = useCallback((recId: string, status: RecommendationStatus) => {
    const now = new Date().toISOString();
    setRecommendations((prev) =>
      prev.map((r) =>
        r.recommendationId === recId
          ? {
              ...r,
              status,
              completedAt: status === 'Completed' || status === 'Resolved' ? now : r.completedAt,
              updatedAt: now,
            }
          : r
      )
    );
  }, []);

  const addGroundMedicalNote = useCallback((recId: string, note: string) => {
    if (!note.trim()) return;
    const stamped = `${new Date().toLocaleTimeString()} — ${note.trim()}`;
    setRecommendations((prev) =>
      prev.map((r) =>
        r.recommendationId === recId ? { ...r, groundNotes: [...r.groundNotes, stamped] } : r
      )
    );
  }, []);

  const toggleProcedureStep = useCallback((procId: string, stepIndex: number) => {
    setCompletedProcedureSteps((prev) => {
      const current = prev[procId] ?? [];
      const next = current.includes(stepIndex)
        ? current.filter((i) => i !== stepIndex)
        : [...current, stepIndex];
      return { ...prev, [procId]: next };
    });
  }, []);

  const envHistoryCurrentLocation = useMemo(
    () => envHistoryAll.filter((e) => e.locationId === currentLocationId),
    [envHistoryAll, currentLocationId]
  );

  const visitedLocationIds = useMemo(
    () => Array.from(new Set(envHistoryAll.map((e) => e.locationId))),
    [envHistoryAll]
  );

  const latestWearable = useMemo(
    () => wearableHistory.filter((w) => w.astronautId === activeAstronautId).slice(-1)[0] ?? null,
    [wearableHistory, activeAstronautId]
  );

  const latestEnv = useMemo(
    () => envHistoryCurrentLocation.slice(-1)[0] ?? null,
    [envHistoryCurrentLocation]
  );

  const generateReportNow = useCallback(
    (type: HealthReportRecord['reportType'], scope: HealthReportRecord['scope'], reason?: string) => {
      const rpt = buildHealthReport({
        reportType: type,
        scope,
        astronaut: activeAstronaut,
        allAstronauts: astronauts,
        location: currentLocation,
        wearableHistory: wearableHistory.filter((w) => w.astronautId === activeAstronaut.id),
        envHistory: envHistoryCurrentLocation,
        alerts,
        recommendations,
        sensorFailures: sensorFailureLog,
        triggerReason: reason ?? `Manual ${type} report request`,
      });
      setReports((prev) => [rpt, ...prev].slice(0, 40));
      pushTimeline({
        timestamp: rpt.generatedAt,
        astronautId: scope === 'Crew-Wide' ? 'CREW' : activeAstronaut.id,
        environmentId: currentEnvironmentId,
        locationName: currentLocation.name,
        type: 'Report',
        severity: 'Info',
        title: `${type} ${scope} Report Generated`,
        detail: rpt.triggerReason,
      });
    },
    [
      activeAstronaut,
      alerts,
      astronauts,
      currentEnvironmentId,
      currentLocation,
      envHistoryCurrentLocation,
      pushTimeline,
      recommendations,
      sensorFailureLog,
      wearableHistory,
    ]
  );

  // Flush queue automatically when commsStatus switches to Connected
  useEffect(() => {
    if (commsStatus === 'Connected') {
      const now = new Date().toISOString();
      setCommsQueue((prev) =>
        prev.map((q) => (q.status === 'Queued' ? { ...q, status: 'Delivered', deliveredAt: now } : q))
      );
      setAlerts((prev) =>
        prev.map((a) =>
          a.commsDeliveryStatus !== 'Delivered (Demo)' ? { ...a, commsDeliveryStatus: 'Delivered (Demo)' } : a
        )
      );
    }
  }, [commsStatus]);

  // One-click demonstration scenarios for judges
  const runDemoScenario = useCallback(
    (scenarioId: string) => {
      setPersonalSensorMismatchDemo(false);
      setGradualHrDriftDemo(false);
      setSensorHealth((prev) => prev.map((s) => ({ ...s, failureMode: 'none' })));

      if (scenarioId === 'normal') {
        setActiveEventIds([]);
        updateAstronautHealth(activeAstronaut.id, (p) => ({
          ...p,
          activity: 'Resting',
          reportedSymptoms: [],
          hydrationLevelPct: 88,
          editableOverrides: { ...p.editableOverrides, enabled: false },
        }));
      } else if (scenarioId === 'co2_env_only') {
        setActiveEventIds(['spacecraft_co2_rise']);
        updateAstronautHealth(activeAstronaut.id, (p) => ({
          ...p,
          activity: 'Resting',
          reportedSymptoms: [],
          editableOverrides: { ...p.editableOverrides, enabled: false },
        }));
      } else if (scenarioId === 'combined_co2_headache') {
        setActiveEventIds(['spacecraft_co2_rise']);
        updateAstronautHealth(activeAstronaut.id, (p) => ({
          ...p,
          activity: 'Resting',
          reportedSymptoms: ['Headache'],
          editableOverrides: {
            enabled: true,
            heartRate: 98,
            spo2: 96.2,
            bodyTemp: 37.1,
            respiratoryRate: 21,
          },
        }));
      } else if (scenarioId === 'exercise_context') {
        setActiveEventIds([]);
        updateAstronautHealth(activeAstronaut.id, (p) => ({
          ...p,
          activity: 'Exercise',
          reportedSymptoms: [],
          editableOverrides: {
            enabled: true,
            heartRate: 122,
            spo2: 98.4,
            bodyTemp: 37.3,
            respiratoryRate: 24,
          },
        }));
      } else if (scenarioId === 'sensor_discrepancy') {
        setPersonalSensorMismatchDemo(true);
      } else if (scenarioId === 'sensor_failure') {
        const hrId = sensorHealth.find((s) => s.sensorId.startsWith('WRB-HR'))?.sensorId;
        if (hrId) {
          setSensorHealth((prev) =>
            prev.map((s) => (s.sensorId === hrId ? { ...s, failureMode: 'stopped' } : s))
          );
        }
      } else if (scenarioId === 'gradual_hr_drift') {
        setGradualHrDriftDemo(true);
        updateAstronautHealth(activeAstronaut.id, (p) => ({
          ...p,
          activity: 'Resting',
          editableOverrides: { ...p.editableOverrides, enabled: false },
        }));
      }

      setSimStatus('running');
      window.setTimeout(() => tickRef.current(), 60);
    },
    [activeAstronaut.id, sensorHealth, updateAstronautHealth]
  );

  const value: SpacePulseContextValue = {
    activePage,
    setActivePage,
    userRole,
    setUserRole,
    showIntroModal,
    openIntroModal,
    closeIntroModal,
    currentEnvironmentId,
    currentLocationId,
    currentLocation,
    detectionSource,
    gpsState,
    detectWithBrowserGps,
    simulateGpsSuggestion,
    confirmSuggestedEnvironment,
    changeLocation,
    simStatus,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    stepSimulationOnce,
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
    setMissionPeriod,
    unlockEvolvingBaseline,
    latestWearable,
    wearableHistory,
    latestEnv,
    envHistoryAll,
    envHistoryCurrentLocation,
    visitedLocationIds,
    sensorHealth,
    sensorFailureLog,
    setSensorFailureMode,
    activeFindings,
    findingHistory,
    personalSensorMismatchDemo,
    setPersonalSensorMismatchDemo,
    gradualHrDriftDemo,
    setGradualHrDriftDemo,
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
    reports,
    generateReportNow,
    timelineEvents,
    runDemoScenario,
  };

  return <SpacePulseContext.Provider value={value}>{children}</SpacePulseContext.Provider>;
};

export function useSpacePulse(): SpacePulseContextValue {
  const ctx = useContext(SpacePulseContext);
  if (!ctx) throw new Error('useSpacePulse must be used within SpacePulseProvider');
  return ctx;
}
