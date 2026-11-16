import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc } from 'drizzle-orm';
import { merchantRegistration } from '@server/database/schema';
import type { CreateRegistrationRequest, MerchantRegistration, RegistrationListResponse } from '@shared/api.interface';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async create(dto: CreateRegistrationRequest): Promise<void> {
    await this.db.insert(merchantRegistration).values({
      name: dto.name,
      district: dto.district,
      address: dto.address,
      type: dto.type ?? 'mall',
      feeStandard: dto.feeStandard,
      freePolicy: dto.freePolicy,
      pointsRule: dto.pointsRule,
      consumptionRule: dto.consumptionRule,
      chargingRule: dto.chargingRule,
      holidayRule: dto.holidayRule,
      openingHours: dto.openingHours,
      latitude: dto.latitude !== undefined ? String(dto.latitude) : undefined,
      longitude: dto.longitude !== undefined ? String(dto.longitude) : undefined,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      merchantName: dto.merchantName,
      anonymousId: dto.anonymousId,
      status: 'pending',
    });
  }

  async getMine(anonymousId: string): Promise<RegistrationListResponse> {
    const rows = await this.db
      .select({
        id: merchantRegistration.id,
        name: merchantRegistration.name,
        district: merchantRegistration.district,
        address: merchantRegistration.address,
        type: merchantRegistration.type,
        status: merchantRegistration.status,
        createdAt: merchantRegistration.createdAt,
      })
      .from(merchantRegistration)
      .where(eq(merchantRegistration.anonymousId, anonymousId))
      .orderBy(desc(merchantRegistration.createdAt));

    const items: MerchantRegistration[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      district: row.district,
      address: row.address,
      type: row.type as MerchantRegistration['type'],
      status: row.status as MerchantRegistration['status'],
      createdAt: row.createdAt.toISOString(),
    }));

    return { items };
  }
}
