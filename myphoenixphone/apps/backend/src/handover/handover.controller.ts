import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HandoverService, ColissimoLabel, StoreDepositCode } from './handover.service';

@Controller('handover')
export class HandoverController {
  private readonly logger = new Logger(HandoverController.name);

  constructor(private readonly handoverService: HandoverService) {}

  /**
   * POST /handover/ship
   * Generate a prepaid Colissimo shipping label
   * Request: { lead_id: string }
   * Response: ColissimoLabel with tracking number and PDF
   */
  @Post('ship')
  async generateShippingLabel(
    @Body() body: { lead_id: string },
  ): Promise<{ success: boolean; data: ColissimoLabel }> {
    try {
      if (!body.lead_id) {
        throw new HttpException(
          { error: 'lead_id is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Generating shipping label for lead: ${body.lead_id}`);

      const label = await this.handoverService.generateColissimoLabel(body.lead_id);

      // Record the handover
      await this.handoverService.recordHandover(body.lead_id, 'ship', {
        tracking_number: label.tracking_number,
      });

      return {
        success: true,
        data: label,
      };
    } catch (error) {
      this.logger.error('Failed to generate shipping label', error);
      throw new HttpException(
        { error: error instanceof Error ? error.message : 'Failed to generate label' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /handover/store
   * Generate a store deposit code + QR code
   * Request: { lead_id: string, store_id?: string }
   * Response: StoreDepositCode with code and QR code
   */
  @Post('store')
  async generateStoreDepositCode(
    @Body() body: { lead_id: string; store_id?: string; phone_number?: string; latitude?: number; longitude?: number },
  ): Promise<{ success: boolean; data: StoreDepositCode; geofence_verified?: boolean }> {
    try {
      if (!body.lead_id) {
        throw new HttpException(
          { error: 'lead_id is required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Generating store deposit code for lead: ${body.lead_id}`);

      // Optionally verify device is near store using Orange Network APIs
      let geofenceVerified = true;
      if (body.phone_number && body.latitude && body.longitude) {
        geofenceVerified = await this.handoverService.verifyDeviceNearStore(
          body.phone_number,
          body.latitude,
          body.longitude,
          2000, // 2km radius
        );

        this.logger.log(
          `Geofence verification for store: ${geofenceVerified}`,
        );
      }

      const depositCode = await this.handoverService.generateStoreDepositCode(
        body.lead_id,
        body.store_id,
      );

      // Record the handover
      await this.handoverService.recordHandover(body.lead_id, 'store', {
        store_code: depositCode.code,
      });

      return {
        success: true,
        data: depositCode,
        geofence_verified: geofenceVerified,
      };
    } catch (error) {
      this.logger.error('Failed to generate store deposit code', error);
      throw new HttpException(
        { error: error instanceof Error ? error.message : 'Failed to generate code' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /handover/donate
   * Record a donation/recycle choice
   * Request: { lead_id: string, organization: string, reference?: string }
   */
  @Post('donate')
  async recordDonation(
    @Body() body: { lead_id: string; organization: string; reference?: string },
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!body.lead_id || !body.organization) {
        throw new HttpException(
          { error: 'lead_id and organization are required' },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Recording donation for lead: ${body.lead_id} to ${body.organization}`,
      );

      await this.handoverService.recordHandover(body.lead_id, 'donate', {
        organization: body.organization,
        reference: body.reference,
      });

      return {
        success: true,
        message: `Device donation recorded for ${body.organization}`,
      };
    } catch (error) {
      this.logger.error('Failed to record donation', error);
      throw new HttpException(
        { error: error instanceof Error ? error.message : 'Failed to record donation' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /handover/:leadId/history
   * Get handover history for a lead
   */
  @Get(':leadId/history')
  async getHandoverHistory(
    @Param('leadId') leadId: string,
  ): Promise<{ data: any }> {
    try {
      this.logger.log(`Fetching handover history for lead: ${leadId}`);

      const history = await this.handoverService.getHandoverHistory(leadId);

      return {
        data: history,
      };
    } catch (error) {
      this.logger.error('Failed to fetch handover history', error);
      throw new HttpException(
        { error: error instanceof Error ? error.message : 'Failed to fetch history' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /handover/health
   * Simple health check
   */
  @Get('health')
  health() {
    return { status: 'ok', service: 'handover' };
  }
}
