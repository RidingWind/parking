#!/usr/bin/env python3
"""把旧版单文件应用的 seed-parkings.json 转成 parking_lot 的 INSERT 语句。

用法（在服务器上）：
    python3 import-legacy-seed.py /opt/sh-parking/data/seed-parkings.json > /tmp/seed.sql
    docker exec -i parking-db psql -U parking -d parking -v ON_ERROR_STOP=1 < /tmp/seed.sql
"""
import json
import sys


def q(value):
    """SQL 字符串字面量；None 输出 NULL。"""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def pick_type(row):
    name = row.get("name", "")
    area = row.get("area") or ""
    if "P+R" in name or "P+R" in area:
        return "pr"
    if "医院" in name or "门诊" in name:
        return "hospital"
    if "充电" in name:
        return "charging"
    if "路边" in name or "道路" in name or "路侧" in name:
        return "roadside"
    if "公共" in name:
        return "public"
    return "mall"


def activities_text(row):
    parts = []
    for act in row.get("activities") or []:
        parts.append(
            "{title}（{period}）：{detail}".format(
                title=act.get("title", ""),
                period=act.get("period", ""),
                detail=act.get("detail", ""),
            )
        )
    return "；".join(parts) or None


def main(path):
    rows = json.load(open(path, encoding="utf-8"))
    print("SET ROLE parking;")
    for row in rows:
        is_free = (row.get("fee_model") or "paid") == "free"
        values = [
            q(row.get("name")),
            q(row.get("district")),
            q(row.get("address")),
            q(pick_type(row)),
            q(None if is_free else row.get("fee_detail")),
            q(row.get("fee_detail") if is_free else None),
            q(row.get("points_detail")),
            "NULL",
            q(row.get("charging_detail")),
            q(activities_text(row)),
            q(row.get("open_hours")),
            str(row["lat"]) if row.get("lat") is not None else "NULL",
            str(row["lng"]) if row.get("lng") is not None else "NULL",
            q(row.get("contact")),
            "'approved'",
        ]
        print(
            "INSERT INTO parking_lot (name, district, address, type, fee_standard, "
            "free_policy, points_rule, consumption_rule, charging_rule, holiday_rule, "
            "opening_hours, latitude, longitude, contact_phone, status) VALUES ("
            + ", ".join(values)
            + ");"
        )


if __name__ == "__main__":
    main(sys.argv[1])
