type AnalyticsProperties = Record<string, unknown>;

const disabledAnalytics = {
  capture: (_eventName: string, _properties?: AnalyticsProperties) => {},
  captureException: (_error: unknown) => {},
  people: {
    set: (_properties: AnalyticsProperties) => {},
  },
};

/** Analytics is intentionally disabled in FeltDB Builder. */
export function useAnalytics() {
  return disabledAnalytics;
}

export type AnalyticsClient = typeof disabledAnalytics;
