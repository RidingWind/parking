import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import {
  parkingLot,
  parkingRating,
  parkingComment,
  parkingCorrection,
} from '@server/database/schema';
import type {
  ParkingLot,
  ParkingListResponse,
  ParkingDetailResponse,
  ParkingListQuery,
  CreateRatingRequest,
  CreateCommentRequest,
  CreateCorrectionRequest,
  ParkingComment,
} from '@shared/api.interface';

type ParkingLotRow = typeof parkingLot.$inferSelect;
type ParkingCommentRow = typeof parkingComment.$inferSelect;

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private mapLotRow(row: ParkingLotRow): ParkingLot {
    return {
      id: row.id,
      name: row.name,
      district: row.district,
      address: row.address ?? null,
      type: row.type as ParkingLot['type'],
      feeStandard: row.feeStandard ?? null,
      freePolicy: row.freePolicy ?? null,
      pointsRule: row.pointsRule ?? null,
      consumptionRule: row.consumptionRule ?? null,
      chargingRule: row.chargingRule ?? null,
      holidayRule: row.holidayRule ?? null,
      openingHours: row.openingHours ?? null,
      latitude: row.latitude !== null && row.latitude !== undefined
        ? Number(row.latitude)
        : null,
      longitude: row.longitude !== null && row.longitude !== undefined
        ? Number(row.longitude)
        : null,
      contactPhone: row.contactPhone ?? null,
      status: row.status,
      avgRating: row.avgRating !== null && row.avgRating !== undefined
        ? Number(row.avgRating)
        : 0,
      ratingCount: row.ratingCount ?? 0,
      commentCount: row.commentCount ?? 0,
      tags: (row.tags as string[] | null) ?? [],
    };
  }

  private mapCommentRow(row: ParkingCommentRow): ParkingComment {
    return {
      id: row.id,
      parkingId: row.parkingId,
      content: row.content,
      authorName: row.authorName ?? '匿名用户',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getList(query: ParkingListQuery): Promise<ParkingListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [eq(parkingLot.status, 'approved')];

    if (query.district) {
      conditions.push(eq(parkingLot.district, query.district));
    }
    if (query.type) {
      conditions.push(eq(parkingLot.type, query.type));
    }
    if (query.tags && query.tags.length > 0) {
      // 满足任一标签即匹配：tags && ARRAY[tag1, tag2, ...]::varchar[] 非空交集
      const tagParams = query.tags.map((t: string) => sql`${t}`);
      conditions.push(
        sql<boolean>`${parkingLot.tags} && ARRAY[${sql.join(tagParams, sql`, `)}]::varchar(255)[]`,
      );
    }
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      conditions.push(
        or(
          ilike(parkingLot.name, kw),
          ilike(parkingLot.address, kw),
          ilike(parkingLot.freePolicy, kw),
          ilike(parkingLot.pointsRule, kw),
          ilike(parkingLot.consumptionRule, kw),
          ilike(parkingLot.chargingRule, kw),
          ilike(parkingLot.holidayRule, kw),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(parkingLot)
        .where(whereClause),
      this.db
        .select()
        .from(parkingLot)
        .where(whereClause)
        .orderBy(
          desc(parkingLot.avgRating),
          desc(parkingLot.ratingCount),
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: ParkingLot[] = rows.map((row: ParkingLotRow) =>
      this.mapLotRow(row),
    );

    return { items, total, page, pageSize };
  }

  async getAll(): Promise<{ items: ParkingLot[] }> {
    const rows = await this.db
      .select()
      .from(parkingLot)
      .where(eq(parkingLot.status, 'approved'))
      .orderBy(
        desc(parkingLot.avgRating),
        desc(parkingLot.ratingCount),
      );

    const items: ParkingLot[] = rows.map((row: ParkingLotRow) =>
      this.mapLotRow(row),
    );

    return { items };
  }

  async getDetail(id: string): Promise<ParkingDetailResponse> {
    const lotRows = await this.db
      .select()
      .from(parkingLot)
      .where(eq(parkingLot.id, id))
      .limit(1);

    if (lotRows.length === 0) {
      throw new NotFoundException('停车场不存在');
    }

    const commentRows = await this.db
      .select()
      .from(parkingComment)
      .where(eq(parkingComment.parkingId, id))
      .orderBy(desc(parkingComment.createdAt));

    const lot = this.mapLotRow(lotRows[0]);
    const comments: ParkingComment[] = commentRows.map(
      (row: ParkingCommentRow) => this.mapCommentRow(row),
    );

    return { ...lot, comments };
  }

  async submitRating(
    dto: CreateRatingRequest,
  ): Promise<{ avgRating: number; ratingCount: number }> {
    // 验证停车场存在且已审核
    const lotRows = await this.db
      .select({ id: parkingLot.id })
      .from(parkingLot)
      .where(and(eq(parkingLot.id, dto.parkingId), eq(parkingLot.status, 'approved')))
      .limit(1);

    if (lotRows.length === 0) {
      throw new NotFoundException('停车场不存在或未审核');
    }

    // upsert：同 parkingId + anonymousId 更新评分
    const existing = await this.db
      .select()
      .from(parkingRating)
      .where(
        and(
          eq(parkingRating.parkingId, dto.parkingId),
          eq(parkingRating.anonymousId, dto.anonymousId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(parkingRating)
        .set({ rating: dto.rating })
        .where(eq(parkingRating.id, existing[0].id));
    } else {
      await this.db.insert(parkingRating).values({
        parkingId: dto.parkingId,
        rating: dto.rating,
        anonymousId: dto.anonymousId,
      });
    }

    // 重新计算平均分和总数
    const stats = await this.db
      .select({
        count: count(),
        avg: sql<number>`AVG(${parkingRating.rating})::numeric(3,1)`,
      })
      .from(parkingRating)
      .where(eq(parkingRating.parkingId, dto.parkingId));

    const ratingCount = Number(stats[0]?.count ?? 0);
    const avgRating = stats[0]?.avg !== null && stats[0]?.avg !== undefined
      ? Number(stats[0].avg)
      : 0;

    // 更新 parking_lot
    await this.db
      .update(parkingLot)
      .set({
        avgRating: String(avgRating),
        ratingCount,
      })
      .where(eq(parkingLot.id, dto.parkingId));

    return { avgRating, ratingCount };
  }

  async submitComment(dto: CreateCommentRequest): Promise<void> {
    // 验证停车场存在
    const lotRows = await this.db
      .select({ id: parkingLot.id })
      .from(parkingLot)
      .where(eq(parkingLot.id, dto.parkingId))
      .limit(1);

    if (lotRows.length === 0) {
      throw new NotFoundException('停车场不存在');
    }

    await this.db.insert(parkingComment).values({
      parkingId: dto.parkingId,
      content: dto.content,
      authorName: dto.authorName || '匿名用户',
      anonymousId: dto.anonymousId,
    });

    // 更新评论数
    await this.db
      .update(parkingLot)
      .set({
        commentCount: sql<number>`${parkingLot.commentCount} + 1`,
      })
      .where(eq(parkingLot.id, dto.parkingId));
  }

  async submitCorrection(dto: CreateCorrectionRequest): Promise<void> {
    // 验证停车场存在
    const lotRows = await this.db
      .select({ id: parkingLot.id })
      .from(parkingLot)
      .where(eq(parkingLot.id, dto.parkingId))
      .limit(1);

    if (lotRows.length === 0) {
      throw new NotFoundException('停车场不存在');
    }

    await this.db.insert(parkingCorrection).values({
      parkingId: dto.parkingId,
      content: dto.content,
      fieldName: dto.fieldName ?? null,
      submitterName: dto.submitterName ?? null,
      anonymousId: dto.anonymousId,
      status: 'pending',
    });
  }
}
