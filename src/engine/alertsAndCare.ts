import {
  AlertRecord,
  AnalyticalFinding,
  CommsStatus,
  EnvironmentId,
  QueuedTransmission,
  RecommendationRecord,
  RecommendationSeverity,
  RecommendationType,
} from '../types/spacePulse';

function mapRiskToRecommendationSeverity(level: AnalyticalFinding['riskClassification']): RecommendationSeverity {
  if (level === 'Critical') return 'Critical';
  if (level === 'Warning') return 'Warning';
  return 'Caution';
}

function inferRecommendationMeta(finding: AnalyticalFinding): {
  type: RecommendationType;
  boundary: RecommendationRecord['treatmentBoundaryLabel'];
  procedureId?: string;
  escalation: RecommendationRecord['escalationTarget'];
} {
  const titleLower = finding.title.toLowerCase();
  if (titleLower.includes('hydration') || titleLower.includes('recovery')) {
    return {
      type: 'Hydration, Nutrition & Recovery',
      boundary: 'General Preventive Guidance (Non-Medical)',
      escalation: 'Astronaut',
    };
  }
  if (titleLower.includes('radiation')) {
    return {
      type: 'Emergency Procedure Access',
      boundary: 'Mission Protocol / Medical Assessment Recommended',
      procedureId: 'proc_radiation',
      escalation: finding.riskClassification === 'Critical' ? 'Mission Control' : 'Ground Medical Team',
    };
  }
  if (titleLower.includes('co₂') || titleLower.includes('co2') || titleLower.includes('air quality')) {
    return {
      type: 'Environmental Protection',
      boundary: 'Mission Protocol / Medical Assessment Recommended',
      procedureId: 'proc_co2',
      escalation: finding.riskClassification === 'Advisory' ? 'Astronaut' : 'Ground Medical Team',
    };
  }
  if (titleLower.includes('pressure') || titleLower.includes('oxygen')) {
    return {
      type: 'Immediate Safety Action',
      boundary: 'Mission Protocol / Medical Assessment Recommended',
      procedureId: 'proc_suit_pressure',
      escalation: 'Mission Control',
    };
  }
  if (titleLower.includes('dust') || titleLower.includes('discrepancy')) {
    return {
      type: 'Environmental Protection',
      boundary: 'Mission Protocol / Medical Assessment Recommended',
      procedureId: 'proc_dust',
      escalation: finding.riskClassification === 'Advisory' ? 'Astronaut' : 'Ground Medical Team',
    };
  }
  return {
    type: finding.riskClassification === 'Critical' ? 'Ground / Onboard Medical Escalation' : 'Medical Assessment Request',
    boundary: 'Mission Protocol / Medical Assessment Recommended',
    procedureId: 'proc_physio',
    escalation: finding.riskClassification === 'Advisory' ? 'Astronaut' : 'Ground Medical Team',
  };
}

export function syncAlertsAndRecommendations(params: {
  activeFindings: AnalyticalFinding[];
  currentLocationId: string;
  currentEnvironmentId: EnvironmentId;
  commsStatus: CommsStatus;
  existingAlerts: AlertRecord[];
  existingRecommendations: RecommendationRecord[];
  existingQueue: QueuedTransmission[];
}): {
  alerts: AlertRecord[];
  recommendations: RecommendationRecord[];
  queue: QueuedTransmission[];
} {
  const {
    activeFindings,
    currentLocationId,
    commsStatus,
    existingAlerts,
    existingRecommendations,
    existingQueue,
  } = params;

  const now = new Date().toISOString();
  const deliveryStatus: AlertRecord['commsDeliveryStatus'] =
    commsStatus === 'Connected'
      ? 'Delivered (Demo)'
      : commsStatus === 'Delayed'
        ? 'Delayed'
        : 'Queued Offline';

  const activeFindingIds = new Set(activeFindings.map((f) => f.findingId));
  const newQueueItems: QueuedTransmission[] = [];

  // 1. Update or Resolve existing alerts for the CURRENT location (preserve other locations untouched)
  const alertsMap = new Map<string, AlertRecord>();
  for (const a of existingAlerts) {
    if (a.locationId === currentLocationId && a.status !== 'Resolved' && !activeFindingIds.has(a.findingId)) {
      alertsMap.set(a.findingId, {
        ...a,
        status: 'Resolved',
        resolvedAt: now,
        updatedAt: now,
      });
    } else {
      alertsMap.set(a.findingId, a);
    }
  }

  // 2. Create or update alerts from active Phase 3 findings
  for (const f of activeFindings) {
    const prev = alertsMap.get(f.findingId);
    const groundTeamNotified = f.riskClassification === 'Warning' || f.riskClassification === 'Critical';

    if (prev && prev.status !== 'Resolved') {
      // Update existing alert in place (never create duplicate!)
      alertsMap.set(f.findingId, {
        ...prev,
        level: f.riskClassification,
        title: f.title,
        explanation: f.explanation,
        possibleRelationship: f.possibleRelationship,
        uncertaintyNotes: f.uncertaintyNotes,
        sensorReliabilityNotes: f.sensorReliabilityNotes,
        currentHealthSnapshot: f.currentHealthSnapshot,
        previousHealthSnapshot: f.previousHealthSnapshot,
        currentEnvSnapshot: f.currentEnvSnapshot,
        previousEnvSnapshot: f.previousEnvSnapshot,
        reportedSymptoms: f.reportedSymptoms,
        recommendedActions: f.recommendedActions,
        groundTeamNotified: prev.groundTeamNotified || groundTeamNotified,
        commsDeliveryStatus: deliveryStatus,
        updatedAt: now,
      });
    } else {
      const alertId = `ALT-${Date.now().toString().slice(-6)}-${f.findingId.slice(-6)}`;
      const created: AlertRecord = {
        alertId,
        findingId: f.findingId,
        astronautId: f.astronautId,
        environmentId: f.environmentId,
        locationId: f.locationId,
        locationName: f.locationName,
        level: f.riskClassification,
        category: f.category,
        status: 'Active',
        title: f.title,
        explanation: f.explanation,
        possibleRelationship: f.possibleRelationship,
        uncertaintyNotes: f.uncertaintyNotes,
        sensorReliabilityNotes: f.sensorReliabilityNotes,
        currentHealthSnapshot: f.currentHealthSnapshot,
        previousHealthSnapshot: f.previousHealthSnapshot,
        currentEnvSnapshot: f.currentEnvSnapshot,
        previousEnvSnapshot: f.previousEnvSnapshot,
        reportedSymptoms: f.reportedSymptoms,
        recommendedActions: f.recommendedActions,
        detectedAt: now,
        updatedAt: now,
        acknowledgedAt: null,
        resolvedAt: null,
        groundTeamNotified,
        commsDeliveryStatus: deliveryStatus,
        isSimulated: true,
      };
      alertsMap.set(f.findingId, created);

      if (commsStatus !== 'Connected') {
        newQueueItems.push({
          id: `QUE-${Date.now()}-${alertId}`,
          type: 'Alert',
          refId: alertId,
          astronautId: f.astronautId,
          environmentId: f.environmentId,
          locationName: f.locationName,
          summary: `${f.riskClassification} ${f.category} Alert: ${f.title}`,
          createdAt: now,
          status: 'Queued',
          deliveredAt: null,
        });
      }
    }
  }

  // 3. Sync Phase 5 Recommendations directly from Phase 3 + Phase 4 (deduplicated by findingId)
  const recMap = new Map<string, RecommendationRecord>();
  for (const r of existingRecommendations) {
    if (r.locationId === currentLocationId && r.status !== 'Resolved' && !activeFindingIds.has(r.findingId)) {
      recMap.set(r.findingId, {
        ...r,
        status: 'Resolved',
        updatedAt: now,
      });
    } else {
      recMap.set(r.findingId, r);
    }
  }

  for (const f of activeFindings) {
    const linkedAlert = alertsMap.get(f.findingId);
    if (!linkedAlert) continue;

    const prevRec = recMap.get(f.findingId);
    const meta = inferRecommendationMeta(f);
    const severity = mapRiskToRecommendationSeverity(f.riskClassification);

    if (prevRec && prevRec.status !== 'Resolved') {
      recMap.set(f.findingId, {
        ...prevRec,
        severity,
        title: f.title,
        whyRecommended: f.explanation,
        actionSteps: f.recommendedActions,
        confidenceLabel: f.confidenceLabel,
        commsStatus: deliveryStatus,
        updatedAt: now,
      });
    } else {
      const recId = `REC-${Date.now().toString().slice(-6)}-${f.findingId.slice(-6)}`;
      recMap.set(f.findingId, {
        recommendationId: recId,
        findingId: f.findingId,
        alertId: linkedAlert.alertId,
        astronautId: f.astronautId,
        environmentId: f.environmentId,
        locationId: f.locationId,
        locationName: f.locationName,
        severity,
        category: f.category,
        recommendationType: meta.type,
        status: 'Active',
        title: f.title,
        whyRecommended: f.explanation,
        actionSteps: f.recommendedActions,
        evidenceType:
          f.uncertaintyNotes.length > 0
            ? 'Uncertain Data'
            : f.category === 'Combined'
              ? 'Multi-Indicator'
              : 'Sustained Trend',
        treatmentBoundaryLabel: meta.boundary,
        confidenceLabel: f.confidenceLabel,
        followUpRequired:
          severity === 'Critical'
            ? 'Continuous telemetry check every 30–60s until resolved.'
            : 'Re-evaluate readings over next 3 simulation cycles.',
        escalationTarget: meta.escalation,
        linkedProcedureId: meta.procedureId,
        groundNotes: [],
        createdAt: now,
        updatedAt: now,
        acknowledgedAt: null,
        completedAt: null,
        commsStatus: deliveryStatus,
        isSimulated: true,
      });

      if (commsStatus !== 'Connected') {
        newQueueItems.push({
          id: `QUE-${Date.now()}-${recId}`,
          type: 'Recommendation',
          refId: recId,
          astronautId: f.astronautId,
          environmentId: f.environmentId,
          locationName: f.locationName,
          summary: `${severity} Care Guidance: ${f.title}`,
          createdAt: now,
          status: 'Queued',
          deliveredAt: null,
        });
      }
    }
  }

  // Flush queued items if communication is Connected
  const updatedQueue = [...existingQueue, ...newQueueItems].map((q) =>
    commsStatus === 'Connected' && q.status === 'Queued'
      ? { ...q, status: 'Delivered' as const, deliveredAt: now }
      : q
  );

  return {
    alerts: Array.from(alertsMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    recommendations: Array.from(recMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    queue: updatedQueue,
  };
}
