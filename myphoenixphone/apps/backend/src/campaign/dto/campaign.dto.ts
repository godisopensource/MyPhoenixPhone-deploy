import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CampaignChannel {
  SMS = 'sms',
  EMAIL = 'email',
  RCS = 'rcs',
  PUSH = 'push',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class TargetFiltersDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tier?: number;

  @IsOptional()
  @IsDateString()
  lastActiveBefore?: string;

  @IsOptional()
  @IsDateString()
  lastActiveAfter?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minScore?: number;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TargetFiltersDto)
  target_filters: TargetFiltersDto;

  @IsString()
  template_id: string; // 'A' | 'B' | 'C' | 'D' from DD-01

  @IsOptional()
  @IsString()
  template_variant?: string;

  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_per_hour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  batch_size?: number;

  @IsOptional()
  @IsString()
  created_by?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

export interface CampaignResponse {
  id: string;
  name: string;
  description?: string;
  target_filters: any;
  estimated_reach?: number;
  template_id: string;
  template_variant?: string;
  channel: string;
  scheduled_at?: Date;
  sent_at?: Date;
  completed_at?: Date;
  max_per_hour: number;
  batch_size: number;
  status: string;
  stats: {
    total_sent: number;
    total_delivered: number;
    total_clicked: number;
    total_converted: number;
    click_rate?: number;
    conversion_rate?: number;
  };
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}
