import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Controller('campaign')
export class CampaignController {
  private readonly logger = new Logger(CampaignController.name);

  constructor(private readonly campaignService: CampaignService) {}

  /**
   * Create a new campaign
   * POST /campaign
   */
  @Post()
  async create(@Body() createDto: CreateCampaignDto) {
    this.logger.log(`Creating campaign: ${createDto.name}`);
    return this.campaignService.create(createDto);
  }

  /**
   * List all campaigns
   * GET /campaign?status=draft&limit=50&offset=0
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.campaignService.findAll({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get campaign by ID
   * GET /campaign/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  /**
   * Update campaign
   * PUT /campaign/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateCampaignDto) {
    return this.campaignService.update(id, updateDto);
  }

  /**
   * Delete/Cancel campaign
   * DELETE /campaign/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.campaignService.delete(id);
  }

  /**
   * Get campaign statistics
   * GET /campaign/:id/stats
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.campaignService.getStats(id);
  }

  /**
   * Start sending campaign
   * POST /campaign/:id/send
   */
  @Post(':id/send')
  async startSending(@Param('id') id: string) {
    this.logger.log(`Starting campaign ${id}`);
    return this.campaignService.startSending(id);
  }
}
