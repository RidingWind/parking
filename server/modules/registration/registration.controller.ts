import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { CreateRegistrationDto, RegistrationMineQueryDto } from './registration.dto';

@Controller('api/registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRegistrationDto) {
    await this.registrationService.create(dto);
  }

  @Get('mine')
  async getMine(@Query() query: RegistrationMineQueryDto) {
    return this.registrationService.getMine(query.anonymousId);
  }
}
