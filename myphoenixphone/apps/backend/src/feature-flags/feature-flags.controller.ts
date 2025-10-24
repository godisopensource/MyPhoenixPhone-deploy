import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlag } from './feature-flags.service';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  getAllFlags(): FeatureFlag[] {
    return this.featureFlagsService.getAllFlags();
  }

  @Get(':key')
  getFlag(@Param('key') key: string): { enabled: boolean; variant?: string | null } {
    return {
      enabled: this.featureFlagsService.isEnabled(key),
      variant: this.featureFlagsService.getVariant(key),
    };
  }

  @Get(':key/variant/:userId')
  getVariantForUser(
    @Param('key') key: string,
    @Param('userId') userId: string,
  ): { variant: string | null } {
    return {
      variant: this.featureFlagsService.getVariant(key, userId),
    };
  }

  @Put(':key')
  updateFlag(
    @Param('key') key: string,
    @Body() updates: Partial<FeatureFlag>,
  ): { success: boolean } {
    const success = this.featureFlagsService.updateFlag(key, updates);
    return { success };
  }
}
