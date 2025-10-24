import { Controller, Get } from '@nestjs/common';
import { PhoneModelsService } from './phone-models.service';

@Controller('phone-models')
export class PhoneModelsController {
  constructor(private readonly service: PhoneModelsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }
}
