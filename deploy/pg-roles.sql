-- 自部署：平台数据层会按用户身份 SET LOCAL ROLE，
-- 匿名请求需要 anon_、登录用户 authenticated_、系统账号 service_role_
CREATE ROLE "anon_" NOLOGIN;
CREATE ROLE "authenticated_" NOLOGIN;
CREATE ROLE "service_role_" NOLOGIN;

GRANT "anon_", "authenticated_", "service_role_" TO parking;

GRANT USAGE ON SCHEMA public TO "anon_", "authenticated_", "service_role_";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO "anon_", "authenticated_", "service_role_";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO "anon_", "authenticated_", "service_role_";
