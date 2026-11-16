import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import ParkingCard from '@client/src/components/ParkingCard';
import { parking } from '@client/src/api';
import { haversineDistance } from '@client/src/utils/distance';
import type { ParkingLot } from '@shared/api.interface';

type LocationState = 'idle' | 'loading' | 'success' | 'error';

interface ParkingWithDistance {
  parking: ParkingLot;
  distance: number | null;
}

const NearbyPage = () => {
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['parking', 'all'],
    queryFn: async () => parking.getAll(),
    enabled: false,
  });

  const requestLocation = useCallback(() => {
    setLocationState('loading');
    setErrorMsg('');

    if (!navigator.geolocation) {
      setLocationState('error');
      setErrorMsg('当前浏览器不支持定位功能');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setLocationState('success');
        // 定位成功后拉取数据
        try {
          await refetch();
        } catch {
          // refetch 的错误走 isError
        }
      },
      (err) => {
        setLocationState('error');
        const messages: Record<number, string> = {
          1: '定位权限被拒绝，请在浏览器设置中允许定位',
          2: '无法获取位置信息，请稍后重试',
          3: '定位超时，请重试',
        };
        setErrorMsg(messages[err.code] || '定位失败，请重试');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [refetch]);

  const sortedList = useMemo<ParkingWithDistance[]>(() => {
    if (!data?.items || !coords) return [];
    const withDistance = data.items.map((p) => {
      if (p.latitude != null && p.longitude != null) {
        return {
          parking: p,
          distance: haversineDistance(
            coords.lat,
            coords.lon,
            p.latitude,
            p.longitude,
          ),
        };
      }
      return { parking: p, distance: null };
    });
    withDistance.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return withDistance;
  }, [data, coords]);

  const noCoordCount = useMemo(
    () => sortedList.filter((item) => item.distance === null).length,
    [sortedList],
  );

  const showList = locationState === 'success' && !isLoading && sortedList.length > 0;
  const showEmpty = locationState === 'success' && !isLoading && !isError && sortedList.length === 0;

  return (
    <div className="p-4 pb-6">
      <h1 className="text-lg font-semibold mb-1">附近停车场</h1>
      <p className="text-xs text-muted-foreground mb-5">
        定位后按距离从近到远展示周边停车场
      </p>

      <div className="flex flex-col items-center mb-6">
        <button
          onClick={requestLocation}
          disabled={locationState === 'loading'}
          aria-label={coords ? '重新定位' : '点击定位'}
          className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {locationState === 'loading' ? (
            <Loader2 size={28} className="animate-spin" />
          ) : coords ? (
            <RefreshCw size={28} />
          ) : (
            <Navigation size={28} />
          )}
          <span className="text-xs font-medium">
            {locationState === 'loading'
              ? '定位中...'
              : coords
                ? '重新定位'
                : '点击定位'}
          </span>
        </button>

        <div className="mt-3 text-center min-h-[20px]">
          {locationState === 'idle' && (
            <p className="text-xs text-muted-foreground">
              点击按钮开始定位
            </p>
          )}
          {locationState === 'loading' && (
            <p className="text-xs text-muted-foreground">正在获取位置...</p>
          )}
          {locationState === 'success' && coords && (
            <p className="text-xs text-muted-foreground">
              已定位 · {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </p>
          )}
          {locationState === 'error' && (
            <p className="text-xs text-destructive flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-sm text-muted-foreground mb-3">数据加载失败</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      )}

      {showEmpty && (
        <div className="bg-card rounded-xl p-10 text-center border border-border">
          <p className="text-sm text-muted-foreground">附近暂无停车场数据</p>
        </div>
      )}

      {showList && (
        <>
          {noCoordCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-orange-700">
                ⓘ 部分停车场暂无坐标信息，已排在列表末尾
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {sortedList.map(({ parking, distance }) => (
              <ParkingCard
                key={parking.id}
                parking={parking}
                distance={distance ?? undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NearbyPage;
