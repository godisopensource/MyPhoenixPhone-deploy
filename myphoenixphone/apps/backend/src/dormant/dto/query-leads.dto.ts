import { IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum LeadStatus {
  ELIGIBLE = 'eligible',
  CONTACTED = 'contacted',
  RESPONDED = 'responded',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
}

export class QueryLeadsDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  tier?: number;

  @IsOptional()
  @IsDateString()
  lastActiveBefore?: string;

  @IsOptional()
  @IsDateString()
  lastActiveAfter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 100;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;
}

export interface LeadListResponse {
  leads: any[];
  total: number;
  limit: number;
  offset: number;
  filters: {
    status?: string;
    tier?: number;
    lastActiveBefore?: string;
    lastActiveAfter?: string;
  };
}

export interface DormantStatsResponse {
  total_leads: number;
  by_status: {
    eligible: number;
    contacted: number;
    responded: number;
    converted: number;
    expired: number;
  };
  by_tier: {
    tier_0: number;
    tier_1: number;
    tier_2: number;
    tier_3: number;
    tier_4: number;
    tier_5: number;
  };
  value_distribution: {
    total_potential_value: number;
    average_value: number;
    median_value: number;
  };
  conversion_funnel: {
    eligible: number;
    contacted: number;
    responded: number;
    converted: number;
    conversion_rate: number;
  };
}
