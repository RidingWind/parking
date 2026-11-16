import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ParkingService } from './parking.service';
import {
  ParkingListQueryDto,
  CreateRatingDto,
  CreateCommentDto,
  CreateCorrectionDto,
} from './parking.dto';
import type {
  ParkingListResponse,
  ParkingDetailResponse,
  ParkingLot,
} from '@shared/api.interface';

@Controller('api/parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  async getList(
    @Query() query: ParkingListQueryDto,
  ): Promise<ParkingListResponse> {
    return this.parkingService.getList(query);
  }

  @Get('all')
  async getAll(): Promise<{ items: ParkingLot[] }> {
    return this.parkingService.getAll();
  }

  @Get(':id')
  async getDetail(
    @Param('id') id: string,
  ): Promise<ParkingDetailResponse> {
    return this.parkingService.getDetail(id);
  }

  @Post('rating')
  @HttpCode(HttpStatus.OK)
  async submitRating(
    @Body() dto: CreateRatingDto,
  ): Promise<{ avgRating: number; ratingCount: number }> {
    return this.parkingService.submitRating(dto);
  }

  @Post('comment')
  @HttpCode(HttpStatus.CREATED)
  async submitComment(@Body() dto: CreateCommentDto): Promise<void> {
    await this.parkingService.submitComment(dto);
  }

  @Post('correction')
  @HttpCode(HttpStatus.CREATED)
  async submitCorrection(@Body() dto: CreateCorrectionDto): Promise<void> {
    await this.parkingService.submitCorrection(dto);
  }
}
