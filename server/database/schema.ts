/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { foreignKey, index, integer, numeric, pgTable, smallint, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const parkingFavorite = pgTable("parking_favorite", {
  id: uuid("id").primaryKey().defaultRandom(),
  parkingId: uuid("parking_id").notNull(),
  anonymousId: varchar("anonymous_id", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_parking_favorite_parking_anon").on(table.parkingId, table.anonymousId),
  foreignKey({
    columns: [table.parkingId],
    foreignColumns: [parkingLot.id],
    name: "parking_favorite_parking_id_fkey",
  }).onDelete("cascade"),
]);

export const merchantRegistration = pgTable("merchant_registration", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  district: varchar("district", { length: 50 }).notNull(),
  address: varchar("address", { length: 500 }),
  type: varchar("type", { length: 50 }).notNull().default('mall'),
  feeStandard: text("fee_standard"),
  freePolicy: text("free_policy"),
  pointsRule: text("points_rule"),
  consumptionRule: text("consumption_rule"),
  chargingRule: text("charging_rule"),
  holidayRule: text("holiday_rule"),
  openingHours: varchar("opening_hours", { length: 255 }),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  contactName: varchar("contact_name", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  merchantName: varchar("merchant_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  anonymousId: varchar("anonymous_id", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const parkingCorrection = pgTable("parking_correction", {
  id: uuid("id").primaryKey().defaultRandom(),
  parkingId: uuid("parking_id").notNull(),
  content: text("content").notNull(),
  fieldName: varchar("field_name", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  submitterName: varchar("submitter_name", { length: 100 }),
  anonymousId: varchar("anonymous_id", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.parkingId],
    foreignColumns: [parkingLot.id],
    name: "parking_correction_parking_id_fkey",
  }).onDelete("cascade"),
]);

export const parkingComment = pgTable("parking_comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  parkingId: uuid("parking_id").notNull(),
  content: text("content").notNull(),
  authorName: varchar("author_name", { length: 100 }).default('匿名用户'),
  anonymousId: varchar("anonymous_id", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_parking_comment_parking_id").on(table.parkingId),
  foreignKey({
    columns: [table.parkingId],
    foreignColumns: [parkingLot.id],
    name: "parking_comment_parking_id_fkey",
  }).onDelete("cascade"),
]);

export const parkingRating = pgTable("parking_rating", {
  id: uuid("id").primaryKey().defaultRandom(),
  parkingId: uuid("parking_id").notNull(),
  rating: smallint("rating").notNull(),
  anonymousId: varchar("anonymous_id", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_parking_rating_parking_id").on(table.parkingId),
  foreignKey({
    columns: [table.parkingId],
    foreignColumns: [parkingLot.id],
    name: "parking_rating_parking_id_fkey",
  }).onDelete("cascade"),
]);

export const parkingLot = pgTable("parking_lot", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  district: varchar("district", { length: 50 }).notNull(),
  address: varchar("address", { length: 500 }),
  type: varchar("type", { length: 50 }).notNull().default('mall'),
  feeStandard: text("fee_standard"),
  freePolicy: text("free_policy"),
  pointsRule: text("points_rule"),
  consumptionRule: text("consumption_rule"),
  chargingRule: text("charging_rule"),
  holidayRule: text("holiday_rule"),
  openingHours: varchar("opening_hours", { length: 255 }),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  contactPhone: varchar("contact_phone", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default('approved'),
  avgRating: numeric("avg_rating").default('0'),
  ratingCount: integer("rating_count").default(0),
  commentCount: integer("comment_count").default(0),
  tags: varchar("tags", { length: 255 }).array().default(sql`{}'::character varying(255)[]`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_parking_lot_district").on(table.district),
  index("idx_parking_lot_type").on(table.type),
  index("idx_parking_lot_status").on(table.status),
  index("idx_parking_lot_tags").using("gin", table.tags),
]);

// table aliases
export const merchantRegistrationTable = merchantRegistration;
export const parkingCommentTable = parkingComment;
export const parkingCorrectionTable = parkingCorrection;
export const parkingFavoriteTable = parkingFavorite;
export const parkingLotTable = parkingLot;
export const parkingRatingTable = parkingRating;
