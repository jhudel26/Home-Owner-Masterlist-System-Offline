import { logger } from "../logger";

/**
 * Analytics and monitoring configuration
 * These utilities support the local analytics system stored in MySQL.
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

/**
 * Analytics client that can be extended with external services
 */
class AnalyticsClient {
  private isEnabled: boolean;
  private hasAnalyticsPermission: boolean = false;

  constructor() {
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
  }

  /**
   * Set whether the current user has analytics permission
   * This should be called after authentication
   */
  setPermission(hasPermission: boolean) {
    this.hasAnalyticsPermission = hasPermission;
  }

  /**
   * Check if analytics can be tracked (enabled + permission)
   */
  private canTrack(): boolean {
    return this.isEnabled && this.hasAnalyticsPermission;
  }

  /**
   * Track a custom event
   */
  track(event: string, properties?: Record<string, unknown>, userId?: string) {
    if (!this.canTrack()) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      userId,
      timestamp: new Date().toISOString(),
    };

    logger.info("Analytics event tracked", { event, properties, userId, timestamp: analyticsEvent.timestamp });

    // Page views are sent to the local MySQL analytics endpoint.
    // This client handles custom event tracking with permission-based access control
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, details?: Record<string, unknown>, userId?: string) {
    this.track(`user_action:${action}`, details, userId);
  }

  /**
   * Track API call
   */
  trackApiCall(endpoint: string, method: string, duration: number, status: number, userId?: string) {
    this.track("api_call", {
      endpoint,
      method,
      duration_ms: duration,
      status,
    }, userId);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>, userId?: string) {
    this.track("error", {
      error_name: error.name,
      error_message: error.message,
      ...context,
    }, userId);

    // Note: For production error tracking, consider integrating with Sentry or similar service
    // This client logs errors locally with context for debugging
  }

  /**
   * Track page view
   */
  trackPageView(path: string, userId?: string) {
    this.track("page_view", { path }, userId);
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetric[]) {
    if (!this.canTrack()) return;

    logger.info("Performance metrics tracked", { metrics });

    // Web vitals remain local-only unless explicitly sent to the local analytics endpoint.
    // This method logs performance metrics for custom monitoring
  }
}

export const analytics = new AnalyticsClient();

/**
 * Performance monitoring utilities
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return fn().finally(() => {
    const duration = performance.now() - startTime;
    logger.debug(`Performance: ${name}`, { duration_ms: duration });
    
    // Track slow operations (> 1 second)
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${name}`, { duration_ms: duration });
    }
  });
}

/**
 * Measure synchronous performance
 */
export function measurePerformanceSync<T>(name: string, fn: () => T): T {
  const startTime = performance.now();
  const result = fn();
  const duration = performance.now() - startTime;
  
  logger.debug(`Performance: ${name}`, { duration_ms: duration });
  
  if (duration > 100) {
    logger.warn(`Slow sync operation detected: ${name}`, { duration_ms: duration });
  }
  
  return result;
}

/**
 * Web Vitals monitoring hook
 * Call this in your app layout or a client component
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: PerformanceEntry[];
}) {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  };

  analytics.trackPerformance([performanceMetric]);

  // Log poor performance
  if (metric.rating === "poor") {
    logger.warn(`Poor Web Vital: ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}
