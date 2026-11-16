import { IsString } from 'class-validator';
import type { FavoriteRequest } from '@shared/api.interface';

export class ToggleFavoriteDto implements FavoriteRequest {
  @IsString()
  parkingId!: string;

  @IsString()
  anonymousId!: string;
}

export class FavoriteListQueryDto {
  @IsString()
  anonymousId!: string;
}

export class FavoriteCheckQueryDto {
  @IsString()
  parkingId!: string;

  @IsString()
  anonymousId!: string;
}
