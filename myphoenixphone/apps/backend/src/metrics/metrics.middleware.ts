import { Injectable, NestMiddleware } from '@nestjs/common';

import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

type HttpLabelName = 'method' | 'route' | 'status';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry });

const httpRequestCounter = new Counter<HttpLabelName>({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

const httpRequestDuration = new Histogram<HttpLabelName>({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationSec = Number(end - start) / 1e9;
      const routeLabel = req.baseUrl || req.path || '/';
      const labels: Record<HttpLabelName, string> = {
        method: req.method,
        route: routeLabel,
        status: String(res.statusCode),
      };
      httpRequestCounter.inc(labels);
      httpRequestDuration.observe(labels, durationSec);
    });
    next();
  }
}
