import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc } from 'drizzle-orm';
import { parkingFavorite, parkingLot } from '@server/database/schema';
import type {
  FavoriteRequest,
  FavoriteItem,
  FavoriteListResponse,
  FavoriteStatusResponse,
  ParkingType,
} from '@shared/api.interface';

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class FavoriteService {
  private readonly logger = new Logger(FavoriteService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async toggle(dto: FavoriteRequest): Promise<FavoriteStatusResponse> {
    const existing = await this.db
      .select({ id: parkingFavorite.id })
      .from(parkingFavorite)
      .where(
        and(
          eq(parkingFavorite.parkingId, dto.parkingId),
          eq(parkingFavorite.anonymousId, dto.anonymousId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .delete(parkingFavorite)
        .where(eq(parkingFavorite.id, existing[0].id));
      return { favorited: false };
    }

    try {
      await this.db.insert(parkingFavorite).values({
        parkingId: dto.parkingId,
        anonymousId: dto.anonymousId,
      });
    } catch (error) {
      const code = extractPostgresErrorCode(error);
      if (code === '23505') {
        return { favorited: true };
      }
      throw error;
    }
    return { favorited: true };
  }

  async getList(anonymousId: string): Promise<FavoriteListResponse> {
    const rows = await this.db
      .select({
        id: parkingLot.id,
        name: parkingLot.name,
        district: parkingLot.district,
        address: parkingLot.address,
        type: parkingLot.type,
        feeStandard: parkingLot.feeStandard,
        freePolicy: parkingLot.freePolicy,
        pointsRule: parkingLot.pointsRule,
        consumptionRule: parkingLot.consumptionRule,
        chargingRule: parkingLot.chargingRule,
        holidayRule: parkingLot.holidayRule,
        openingHours: parkingLot.openingHours,
        latitude: parkingLot.latitude,
        longitude: parkingLot.longitude,
        contactPhone: parkingLot.contactPhone,
        status: parkingLot.status,
        avgRating: parkingLot.avgRating,
        ratingCount: parkingLot.ratingCount,
        commentCount: parkingLot.commentCount,
        tags: parkingLot.tags,
        favoritedAt: parkingFavorite.createdAt,
      })
      .from(parkingFavorite)
      .innerJoin(parkingLot, eq(parkingFavorite.parkingId, parkingLot.id))
      .where(
        and(
          eq(parkingFavorite.anonymousId, anonymousId),
          eq(parkingLot.status, 'approved'),
        ),
      )
      .orderBy(desc(parkingFavorite.createdAt));

    const items: FavoriteItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      district: row.district,
      address: row.address,
      type: row.type as ParkingType,
      feeStandard: row.feeStandard,
      freePolicy: row.freePolicy,
      pointsRule: row.pointsRule,
      consumptionRule: row.consumptionRule,
      chargingRule: row.chargingRule,
      holidayRule: row.holidayRule,
      openingHours: row.openingHours,
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      contactPhone: row.contactPhone,
      status: row.status,
      avgRating: Number(row.avgRating),
      ratingCount: row.ratingCount,
      commentCount: row.commentCount,
      tags: row.tags ?? [],
      favoritedAt: row.favoritedAt.toISOString(),
    }));

    return { items };
  }

  async check(parkingId: string, anonymousId: string): Promise<FavoriteStatusResponse> {
    const rows = await this.db
      .select({ id: parkingFavorite.id })
      .from(parkingFavorite)
      .where(
        and(
          eq(parkingFavorite.parkingId, parkingId),
          eq(parkingFavorite.anonymousId, anonymousId),
        ),
      )
      .limit(1);

    return { favorited: rows.length > 0 };
  }
}
