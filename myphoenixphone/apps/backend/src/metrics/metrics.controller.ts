import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { metricsRegistry } from './metrics.middleware';

@Controller()
export class MetricsController {
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    // prom-client Registry has contentType and metrics(): string | Promise<string>
    const contentType: string = metricsRegistry.contentType ?? 'text/plain';
    res.setHeader('Content-Type', contentType);
    const body = await metricsRegistry.metrics();
    return res.send(body);
  }
}
