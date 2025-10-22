import { IsString, IsBoolean, IsObject, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class SimSwapDto {
  @IsBoolean()
  occurred: boolean;

  @IsString()
  ts: string;
}

class ReachabilityDto {
  @IsBoolean()
  reachable: boolean;

  @IsString()
  checked_ts: string;

  @IsOptional()
  @IsString()
  last_activity_ts?: string;
}

class MetadataDto {
  @IsOptional()
  @IsNumber()
  swap_count_30d?: number;

  @IsOptional()
  @IsBoolean()
  opt_out?: boolean;

  @IsOptional()
  @IsString()
  last_contact_ts?: string;
}

export class DormantEventDto {
  @IsString()
  msisdn_hash: string;

  @IsObject()
  @Type(() => SimSwapDto)
  sim_swap: SimSwapDto;

  @IsObject()
  @Type(() => ReachabilityDto)
  old_device_reachability: ReachabilityDto;

  @IsEnum(['consumer', 'business', 'm2m'])
  line_type: 'consumer' | 'business' | 'm2m';

  @IsBoolean()
  fraud_flag: boolean;

  @IsOptional()
  @IsObject()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}

export class CollectSignalsDto {
  @IsString()
  msisdn: string;
}

export class LeadResponseDto {
  @IsString()
  lead_id: string;

  @IsString()
  msisdn_hash: string;

  @IsNumber()
  dormant_score: number;

  @IsBoolean()
  eligible: boolean;

  @IsNumber()
  activation_window_days: number;

  @IsEnum(['send_nudge', 'hold', 'exclude', 'expired'])
  next_action: 'send_nudge' | 'hold' | 'exclude' | 'expired';

  @IsArray()
  @IsString({ each: true })
  exclusions: string[];

  @IsObject()
  signals: {
    days_since_swap: number;
    days_unreachable: number;
    swap_count_30d: number;
  };
}
