import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { ToggleFavoriteDto, FavoriteListQueryDto, FavoriteCheckQueryDto } from './favorite.dto';

@Controller('api/favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post('toggle')
  async toggle(@Body() dto: ToggleFavoriteDto) {
    return this.favoriteService.toggle(dto);
  }

  @Get()
  async getList(@Query() query: FavoriteListQueryDto) {
    return this.favoriteService.getList(query.anonymousId);
  }

  @Get('check')
  async check(@Query() query: FavoriteCheckQueryDto) {
    return this.favoriteService.check(query.parkingId, query.anonymousId);
  }
}
