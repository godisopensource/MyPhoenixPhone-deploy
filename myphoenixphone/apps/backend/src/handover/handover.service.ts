import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

export interface ColissimoLabel {
  tracking_number: string;
  pdf_url: string;
  label_base64?: string;
  expiry_date: string;
  carrier: 'colissimo';
}

export interface StoreDepositCode {
  code: string;
  qr_code_url: string;
  qr_code_svg?: string;
  store_id?: string;
  expires_at: string;
}

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);
  private isDev = process.env.NODE_ENV !== 'production';

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a prepaid Colissimo shipping label
   * In DEV mode: Simulates label generation with mock tracking number
   * In PROD: Integrates with Colissimo API
   */
  async generateColissimoLabel(leadId: string): Promise<ColissimoLabel> {
    this.logger.log(`Generating Colissimo label for lead: ${leadId}`);

    // Generate tracking number (Colissimo format: starts with 3S)
    const trackingNumber = `3S${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Generate expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    if (this.isDev) {
      // DEV MODE: Simulate label generation
      this.logger.debug(`[DEV MODE] Generated mock Colissimo label: ${trackingNumber}`);

      // Generate a simple mock PDF label as base64
      const mockPdfBase64 = await this.generateMockPdfLabel(trackingNumber);

      return {
        tracking_number: trackingNumber,
        pdf_url: `data:application/pdf;base64,${mockPdfBase64}`,
        label_base64: mockPdfBase64,
        expiry_date: expiryDate.toISOString(),
        carrier: 'colissimo',
      };
    }

    // PRODUCTION MODE: Call real Colissimo API
    try {
      const label = await this.callColissimoApi(trackingNumber);
      return {
        tracking_number: label.tracking_number || trackingNumber,
        pdf_url: label.pdf_url || '',
        label_base64: label.label_base64,
        expiry_date: expiryDate.toISOString(),
        carrier: 'colissimo',
      };
    } catch (error) {
      this.logger.error('Failed to generate Colissimo label', error);
      // Fallback: Return mock label in case of API error
      return {
        tracking_number: trackingNumber,
        pdf_url: `https://colissimo.mock/label/${trackingNumber}`,
        expiry_date: expiryDate.toISOString(),
        carrier: 'colissimo',
      };
    }
  }

  /**
   * Generate a store deposit code + QR code
   * QR code encodes: store code + expiry timestamp
   */
  async generateStoreDepositCode(leadId: string, storeId?: string): Promise<StoreDepositCode> {
    this.logger.log(`Generating store deposit code for lead: ${leadId}`);

    // Generate unique store code (format: ORANGE + timestamp + random)
    const code = `ORANGE${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Expiry: 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create QR code data
    const qrData = JSON.stringify({
      code,
      lead_id: leadId,
      store_id: storeId,
      expires_at: expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });

    try {
      // Generate QR code as both data URL and SVG
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });

      const qrCodeSvg = await QRCode.toString(qrData, {
        errorCorrectionLevel: 'H',
        type: 'svg',
        width: 300,
        margin: 2,
      });

      if (this.isDev) {
        this.logger.debug(`[DEV MODE] Generated store code: ${code}`);
      }

      return {
        code,
        qr_code_url: qrCodeDataUrl,
        qr_code_svg: qrCodeSvg,
        store_id: storeId,
        expires_at: expiresAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate QR code', error);
      throw new Error('QR code generation failed');
    }
  }

  /**
   * Store handover record in database
   * Tracks: shipping labels, store deposits, donation references
   */
  async recordHandover(
    leadId: string,
    handoverType: 'ship' | 'store' | 'donate',
    data: {
      tracking_number?: string;
      store_code?: string;
      organization?: string;
      reference?: string;
    },
  ) {
    this.logger.log(`Recording ${handoverType} handover for lead: ${leadId}`);

    // In DEV mode, skip database if not available
    if (this.isDev && !process.env.DATABASE_URL) {
      this.logger.debug(`[DEV MODE] Skipping database recording (no DATABASE_URL)`);
      return {
        id: leadId,
        converted: true,
        converted_at: new Date(),
        signals: {
          handover: {
            type: handoverType,
            ...data,
            recorded_at: new Date().toISOString(),
          },
        },
      };
    }

    // Find lead
    const lead = await (this.prisma as any).lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // Update lead with handover info and mark as converted
    const handoverData = {
      type: handoverType,
      ...data,
      recorded_at: new Date().toISOString(),
    };

    const updatedLead = await (this.prisma as any).lead.update({
      where: { id: leadId },
      data: {
        converted: true,
        converted_at: new Date(),
        // Store handover info in signals JSON
        signals: {
          ...((lead.signals as any) || {}),
          handover: handoverData,
        } as any,
      },
    });

    this.logger.log(`Handover recorded for lead: ${leadId}`);
    return updatedLead;
  }

  /**
   * Generate mock PDF label (DEV MODE)
   * Creates a simple text-based PDF representation in base64
   */
  private async generateMockPdfLabel(trackingNumber: string): Promise<string> {
    // Simple mock PDF content (this is NOT a real PDF, just a text representation)
    const mockContent = `
COLISSIMO PREPAID LABEL
=======================
Tracking: ${trackingNumber}
Generated: ${new Date().toISOString()}
Valid for 30 days

This is a mock label for development.
In production, this would be a real PDF from Colissimo API.

Recipient: Lead/Customer
Service: MyPhoenixPhone - Device Trade-In
Weight: Not specified
Value: Estimated per form

Print and attach this label to your package.
    `;

    // Convert to base64
    return Buffer.from(mockContent).toString('base64');
  }

  /**
   * Call real Colissimo API (PRODUCTION)
   * Requires COLISSIMO_API_KEY and COLISSIMO_ACCOUNT_NUMBER env vars
   */
  private async callColissimoApi(trackingNumber: string): Promise<Partial<ColissimoLabel>> {
    const apiKey = process.env.COLISSIMO_API_KEY;
    const accountNumber = process.env.COLISSIMO_ACCOUNT_NUMBER;

    if (!apiKey || !accountNumber) {
      throw new Error('Missing Colissimo API credentials');
    }

    // Mock implementation (replace with real API call)
    this.logger.debug('Calling Colissimo API with tracking number:', trackingNumber);

    // Example: POST to https://api.colissimo.fr/shipment/v1/labels
    // With authentication and tracking number
    // This would return PDF bytes which we convert to base64

    return {
      tracking_number: trackingNumber,
      pdf_url: `https://colissimo.fr/label/${trackingNumber}`,
    };
  }

  /**
   * Verify device location using Orange Network APIs (CAMARA Geofencing)
   * Used for store deposit validation - ensure customer is near store
   */
  async verifyDeviceNearStore(
    phoneNumber: string,
    storeLatitude: number,
    storeLongitude: number,
    radiusMeters: number = 2000, // 2km default radius
  ): Promise<boolean> {
    this.logger.log(
      `Verifying device location for store deposit: ${phoneNumber} near (${storeLatitude}, ${storeLongitude})`,
    );

    if (this.isDev) {
      // DEV MODE: Simulate geofencing
      this.logger.debug('[DEV MODE] Geofencing verification simulated - returning true');
      // In dev, simulate 80% success rate
      return Math.random() > 0.2;
    }

    try {
      // Call Orange Network APIs for Device Location Verification
      const isNearStore = await this.callOrangeLocationApi(
        phoneNumber,
        storeLatitude,
        storeLongitude,
        radiusMeters,
      );

      this.logger.log(`Device location verification result: ${isNearStore}`);
      return isNearStore;
    } catch (error) {
      this.logger.error('Failed to verify device location', error);
      // Fallback: Allow store deposit if location check fails
      return true;
    }
  }

  /**
   * Call Orange Network APIs - Device Location Verification
   * Requires ORANGE_NETWORK_API_KEY
   * Uses CAMARA standard endpoint
   */
  private async callOrangeLocationApi(
    phoneNumber: string,
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<boolean> {
    const apiKey = process.env.ORANGE_NETWORK_API_KEY;

    if (!apiKey) {
      this.logger.warn('Missing ORANGE_NETWORK_API_KEY - location verification disabled');
      return true; // Fallback to allow
    }

    try {
      // Orange Network APIs endpoint for Device Location Verification
      // Reference: https://developer.orange.com/apis/device-location-verification-camara
      const url = 'https://api.orange.com/camaraV1/device-location-verification/verify';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+33${phoneNumber.substring(1)}`,
          latitude,
          longitude,
          radius: radiusMeters,
          maxAge: 3600, // Data max 1 hour old
        }),
      });

      if (!response.ok) {
        this.logger.error(`Orange Location API error: ${response.status} ${response.statusText}`);
        return true; // Fallback
      }

      const data = (await response.json()) as any;
      // Response contains: { verificationResult: "TRUE" | "FALSE" }
      return data.verificationResult === 'TRUE' || data.verificationResult === true;
    } catch (error) {
      this.logger.error('Orange Location API call failed', error);
      return true; // Fallback to allow if API unavailable
    }
  }

  /**
   * Get handover history for a lead
   */
  async getHandoverHistory(leadId: string) {
    const lead = await (this.prisma as any).lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    const signals = (lead.signals as any) || {};
    return signals.handover || null;
  }
}
