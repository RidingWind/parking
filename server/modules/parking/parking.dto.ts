import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PARKING_TYPES } from '@shared/api.interface';

export class ParkingListQueryDto {
  @IsOptional()
  @Transform(({ obj, key, value }) =>
    obj[key as string] === '' ? undefined : value,
  )
  @IsString()
  district?: string;

  @IsOptional()
  @Transform(({ obj, key, value }) =>
    obj[key as string] === '' ? undefined : value,
  )
  @IsString()
  @IsIn(PARKING_TYPES)
  type?: 'mall' | 'roadside' | 'public' | 'pr' | 'charging' | 'hospital';

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @Transform(({ obj, key, value }) =>
    obj[key as string] === '' ? undefined : value,
  )
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateRatingDto {
  @IsString()
  @IsNotEmpty()
  parkingId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsNotEmpty()
  anonymousId!: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  parkingId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  authorName!: string;

  @IsString()
  @IsNotEmpty()
  anonymousId!: string;
}

export class CreateCorrectionDto {
  @IsString()
  @IsNotEmpty()
  parkingId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  fieldName?: string;

  @IsOptional()
  @IsString()
  submitterName?: string;

  @IsString()
  @IsNotEmpty()
  anonymousId!: string;
}
