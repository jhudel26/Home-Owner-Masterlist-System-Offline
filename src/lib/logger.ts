type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private isDev = process.env.NODE_ENV !== "production";

  private format(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): LogPayload {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    if (error) {
      if (error instanceof Error) {
        payload.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        payload.error = {
          message: String(error),
        };
      }
    }

    return payload;
  }

  private output(payload: LogPayload) {
    if (this.isDev) {
      const prefix = `[${payload.timestamp}] [${payload.level.toUpperCase()}]: ${payload.message}`;
      if (payload.level === "error") {
        console.error(prefix, payload.context || "", payload.error || "");
      } else if (payload.level === "warn") {
        console.warn(prefix, payload.context || "");
      } else {
        console.log(prefix, payload.context || "");
      }
    } else {
      // In production, emit JSON line for structured aggregation (Sentry/CloudWatch/Datadog)
      console.log(JSON.stringify(payload));
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.output(this.format("debug", message, context));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.output(this.format("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown) {
    this.output(this.format("warn", message, context, error));
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown) {
    this.output(this.format("error", message, context, error));
  }
}

export const logger = new Logger();
