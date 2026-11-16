import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@client/src/components/ui/select';
import ParkingCard from '@client/src/components/ParkingCard';
import { parking } from '@client/src/api';
import {
  DISTRICTS,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  PARKING_TAGS,
  PARKING_TAG_LABELS,
} from '@shared/api.interface';
import type { ParkingLot, ParkingType, ParkingTag } from '@shared/api.interface';

const PAGE_SIZE = 10;
const MAP_CENTER: [number, number] = [31.2304, 121.4737];
const MAP_ZOOM = 11;

const HomePage = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Search & filter state
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [district, setDistrict] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Map state
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // --- Debounced search ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // --- Parking list (paginated) ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: listLoading,
  } = useInfiniteQuery({
    queryKey: [
      'parking-list',
      district === 'all' ? '' : district,
      type === 'all' ? '' : type,
      selectedTags,
      debouncedKeyword,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params: Parameters<typeof parking.list>[0] = {
        page: pageParam as number,
        pageSize: PAGE_SIZE,
      };
      if (district !== 'all') params.district = district;
      if (type !== 'all') params.type = type as ParkingType;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      return parking.list(params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pageSize, total } = lastPage;
      const loaded = page * pageSize;
      return loaded < total ? page + 1 : undefined;
    },
    retry: false,
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // --- All parking lots (for map markers) ---
  const { data: allParkingData } = useQuery({
    queryKey: ['parking-all'],
    queryFn: () => parking.getAll(),
    retry: false,
  });

  // --- Tag toggle ---
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // --- Init Leaflet map ---
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    setMapLoading(true);
    setMapError(null);
    setMapReady(false);

    try {
      const map = L.map(mapContainerRef.current, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });

      // 瓦片源：OpenStreetMap 在国内访问不稳定（实测 503/超时），改用高德公开瓦片（无需 Key）。
      // 只取栅格底图，不带业务数据，符合免费/免申请 Key 的使用诉求。
      L.tileLayer(
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        {
          subdomains: '1234',
          maxZoom: 18,
          attribution: '&copy; 高德地图',
        }
      ).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      setMapReady(true);
      setMapLoading(false);
    } catch (err) {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : '地图加载失败';
      logger.warn('Leaflet map init failed', msg);
      setMapError(msg);
      setMapLoading(false);
    }

    return () => {
      cancelled = true;
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --- Add markers when map ready + data available ---
  useEffect(() => {
    if (!mapReady || !markersLayerRef.current || !allParkingData?.items) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const itemsWithCoords = allParkingData.items.filter(
      (p: ParkingLot) => p.longitude !== null && p.latitude !== null
    );

    const customIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="background:#2563eb;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    for (const p of itemsWithCoords) {
      try {
        const marker = L.marker([p.latitude!, p.longitude!], {
          icon: customIcon,
          title: p.name,
        });
        const summary =
          p.freePolicy ||
          p.pointsRule ||
          p.consumptionRule ||
          p.chargingRule ||
          p.holidayRule ||
          p.feeStandard ||
          '查看详情';
        const typeLabel =
          PARKING_TYPE_LABELS[p.type as keyof typeof PARKING_TYPE_LABELS] ||
          p.type;
        const content = `
          <div style="padding:4px 2px;min-width:200px;">
            <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${p.name}</div>
            <div style="font-size:12px;color:#666;margin-bottom:6px;">${p.district} · ${typeLabel}</div>
            <div style="font-size:12px;color:#f97316;margin-bottom:8px;line-height:1.4;">${summary}</div>
            <a href="/detail/${p.id}" data-parking-id="${p.id}" style="font-size:12px;color:#2563eb;text-decoration:none;">查看详情 →</a>
          </div>
        `;
        marker.bindPopup(content, {
          maxWidth: 280,
          className: 'parking-popup',
        });
        layer.addLayer(marker);
      } catch (e) {
        logger.warn('Failed to create marker for', p.name, e);
      }
    }
  }, [mapReady, allParkingData]);

  // --- Handle popup link click (prevent default, use navigate) ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-parking-id]') as HTMLAnchorElement | null;
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) navigate(href);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [navigate]);

  // --- Tag pill styling ---
  const tagColors: Record<string, string> = {
    free: 'bg-green-100 text-green-700 border-green-200',
    points: 'bg-blue-100 text-blue-700 border-blue-200',
    consumption: 'bg-orange-100 text-orange-700 border-orange-200',
    charging: 'bg-purple-100 text-purple-700 border-purple-200',
    holiday: 'bg-pink-100 text-pink-700 border-pink-200',
    pr: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[480px] mx-auto px-4 pb-24 pt-4">
        {/* Title & search row */}
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-lg font-semibold flex-1">上海停车情报站</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索停车场名称、地址、优惠"
            className="pl-9 pr-9 h-10 text-sm"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清空搜索"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter row 1: district + type */}
        <div className="flex gap-2 mb-3">
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="选择区县" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部区县</SelectItem>
              {DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {PARKING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PARKING_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter row 2: tags horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto mb-3 -mx-4 px-4 pb-1 scrollbar-none">
          {PARKING_TAGS.map((tag: ParkingTag) => {
            const active = selectedTags.includes(tag);
            const base = tagColors[tag] || '';
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? `${base} ring-2 ring-offset-1 ring-primary/30`
                    : 'bg-background text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {PARKING_TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>

        {/* Map area：容器必须常驻渲染，否则首次 effect 拿不到 ref 会永远停在加载态 */}
        <div className="relative bg-card rounded-xl border border-border overflow-hidden mb-3">
          <div ref={mapContainerRef} className="w-full h-[300px] bg-muted/50" />
          {mapLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/80 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <p className="text-xs">地图加载中...</p>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-card">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <MapPin size={24} />
              </div>
              <p className="text-sm text-destructive mb-1">地图加载失败</p>
              <p className="text-xs text-muted-foreground mb-2">{mapError}</p>
            </div>
          )}
        </div>

        {/* List section */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">
            全部停车场
            {!listLoading && total > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                ({total})
              </span>
            )}
          </h2>
        </div>

        {/* Parking list */}
        {listLoading && allItems.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <Skeleton className="h-4 w-2/3 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-1/2 mb-3" />
                <div className="flex gap-1 mb-2">
                  <Skeleton className="h-5 w-14 rounded" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <div className="bg-card rounded-xl p-8 border border-border text-center text-muted-foreground text-sm">
            没有找到匹配的停车场
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allItems.map((p: ParkingLot) => (
              <ParkingCard key={p.id} parking={p} />
            ))}
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </Button>
            )}
            {!hasNextPage && allItems.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-2">
                没有更多了
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default HomePage;
