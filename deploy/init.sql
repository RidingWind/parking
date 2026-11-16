-- =============================================================
-- 上海停车情报站 · 数据库初始化脚本
-- 适用于 PostgreSQL 14+，需在应用首次启动前执行一次
-- 用法：psql "$SUDA_DATABASE_URL" -f deploy/init.sql
-- 说明：schema.ts 使用了平台自定义复合类型 user_profile / file_attachment，
--       自部署需先建好这两个类型，否则建表会失败。
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 平台自定义类型：user_profile（单字段复合类型）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_profile') THEN
    CREATE TYPE user_profile AS (user_id varchar);
  END IF;
END $$;

-- 平台自定义类型：file_attachment（两字段复合类型）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_attachment') THEN
    CREATE TYPE file_attachment AS (bucket_id varchar, file_path varchar);
  END IF;
END $$;

-- ============================ 停车场主表 ============================
CREATE TABLE IF NOT EXISTS parking_lot (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              varchar(255) NOT NULL,
  district          varchar(50)  NOT NULL,
  address           varchar(500),
  type              varchar(50)  NOT NULL DEFAULT 'mall',
  fee_standard      text,
  free_policy       text,
  points_rule       text,
  consumption_rule  text,
  charging_rule     text,
  holiday_rule      text,
  opening_hours     varchar(255),
  latitude          numeric,
  longitude         numeric,
  contact_phone     varchar(50),
  status            varchar(20)  NOT NULL DEFAULT 'approved',
  avg_rating        numeric      DEFAULT '0',
  rating_count      integer      DEFAULT 0,
  comment_count     integer      DEFAULT 0,
  tags              varchar(255)[] DEFAULT '{}'::varchar(255)[],

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END)
);

CREATE INDEX IF NOT EXISTS idx_parking_lot_district ON parking_lot (district);
CREATE INDEX IF NOT EXISTS idx_parking_lot_type     ON parking_lot (type);
CREATE INDEX IF NOT EXISTS idx_parking_lot_status   ON parking_lot (status);
CREATE INDEX IF NOT EXISTS idx_parking_lot_tags     ON parking_lot USING gin (tags);

-- ============================ 评分表 ============================
CREATE TABLE IF NOT EXISTS parking_rating (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id        uuid NOT NULL,
  rating            smallint NOT NULL,
  anonymous_id      varchar(100),

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),

  CONSTRAINT parking_rating_parking_id_fkey FOREIGN KEY (parking_id)
    REFERENCES parking_lot (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_parking_rating_parking_id ON parking_rating (parking_id);

-- ============================ 评论表 ============================
CREATE TABLE IF NOT EXISTS parking_comment (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id        uuid NOT NULL,
  content           text NOT NULL,
  author_name       varchar(100) DEFAULT '匿名用户',
  anonymous_id      varchar(100),

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),

  CONSTRAINT parking_comment_parking_id_fkey FOREIGN KEY (parking_id)
    REFERENCES parking_lot (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_parking_comment_parking_id ON parking_comment (parking_id);

-- ============================ 纠错表 ============================
CREATE TABLE IF NOT EXISTS parking_correction (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id        uuid NOT NULL,
  content           text NOT NULL,
  field_name        varchar(100),
  status            varchar(20) NOT NULL DEFAULT 'pending',
  submitter_name    varchar(100),
  anonymous_id      varchar(100),

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),

  CONSTRAINT parking_correction_parking_id_fkey FOREIGN KEY (parking_id)
    REFERENCES parking_lot (id) ON DELETE CASCADE
);

-- ============================ 商户登记表 ============================
CREATE TABLE IF NOT EXISTS merchant_registration (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              varchar(255) NOT NULL,
  district          varchar(50)  NOT NULL,
  address           varchar(500),
  type              varchar(50)  NOT NULL DEFAULT 'mall',
  fee_standard      text,
  free_policy       text,
  points_rule       text,
  consumption_rule  text,
  charging_rule     text,
  holiday_rule      text,
  opening_hours     varchar(255),
  latitude          numeric,
  longitude         numeric,
  contact_name      varchar(100),
  contact_phone     varchar(50),
  merchant_name     varchar(255),
  status            varchar(20) NOT NULL DEFAULT 'pending',
  anonymous_id      varchar(100),

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END)
);

-- ============================ 收藏表 ============================
CREATE TABLE IF NOT EXISTS parking_favorite (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_id        uuid NOT NULL,
  anonymous_id      varchar(100),

  _created_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),
  _updated_at       timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by       user_profile   DEFAULT (CASE WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL END),

  CONSTRAINT parking_favorite_parking_id_fkey FOREIGN KEY (parking_id)
    REFERENCES parking_lot (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_favorite_parking_anon
  ON parking_favorite (parking_id, anonymous_id);
