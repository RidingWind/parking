import {
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PARKING_TYPES } from '@shared/api.interface';
import type { CreateRegistrationRequest } from '@shared/api.interface';

export class CreateRegistrationDto implements CreateRegistrationRequest {
  @IsString()
  name!: string;

  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  address!: string;

  @IsOptional()
  @IsIn(PARKING_TYPES)
  type!: 'mall' | 'roadside' | 'public' | 'pr' | 'charging' | 'hospital';

  @IsOptional()
  @IsString()
  feeStandard?: string;

  @IsOptional()
  @IsString()
  freePolicy?: string;

  @IsOptional()
  @IsString()
  pointsRule?: string;

  @IsOptional()
  @IsString()
  consumptionRule?: string;

  @IsOptional()
  @IsString()
  chargingRule?: string;

  @IsOptional()
  @IsString()
  holidayRule?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  merchantName?: string;

  @IsString()
  anonymousId!: string;
}

export class RegistrationMineQueryDto {
  @IsString()
  anonymousId!: string;
}
