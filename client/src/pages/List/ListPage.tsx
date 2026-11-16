import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Badge } from '@client/src/components/ui/badge';
import ParkingCard from '@client/src/components/ParkingCard';
import { parking } from '@client/src/api';
import {
  DISTRICTS,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  PARKING_TAGS,
  PARKING_TAG_LABELS,
  type ParkingTag,
  type ParkingType,
} from '@shared/api.interface';

const PAGE_SIZE = 20;

const ListPage = () => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  const [district, setDistrict] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<
    Awaited<ReturnType<typeof parking.list>>['items']
  >([]);
  const [hasMore, setHasMore] = useState(true);

  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setKeyword(value);
      if (debounceTimer) window.clearTimeout(debounceTimer);
      const timer = window.setTimeout(() => {
        setDebouncedKeyword(value);
        setPage(1);
        setAllItems([]);
        setHasMore(true);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const queryKey = useMemo(
    () => ['parking', 'list', district, type, selectedTags, debouncedKeyword],
    [district, type, selectedTags, debouncedKeyword],
  );

  const queryKeyFingerprint = useMemo(
    () => `${district}|${type}|${selectedTags.join(',')}|${debouncedKeyword}`,
    [district, type, selectedTags, debouncedKeyword],
  );

  const [loadedPages, setLoadedPages] = useState(0);
  const [lastFingerprint, setLastFingerprint] = useState(queryKeyFingerprint);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: async () => {
      const res = await parking.list({
        district: district || undefined,
        type: (type as ParkingType) || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        keyword: debouncedKeyword || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      return res;
    },
    enabled: page > 0,
  });

  useEffect(() => {
    if (!data) return;
    // 筛选条件变化时重置累计
    if (lastFingerprint !== queryKeyFingerprint) {
      setAllItems(data.items);
      setLoadedPages(1);
      setLastFingerprint(queryKeyFingerprint);
    } else if (loadedPages < page) {
      // 新的一页数据到达，追加
      setAllItems((prev) => [...prev, ...data.items]);
      setLoadedPages(page);
    }
    setHasMore(page * PAGE_SIZE < data.total);
  }, [data, page, loadedPages, lastFingerprint, queryKeyFingerprint]);

  const handleFilterChange = useCallback(() => {
    setPage(1);
    setAllItems([]);
    setHasMore(true);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const showEmpty = !isLoading && allItems.length === 0;

  return (
    <div className="p-4 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="搜索停车场名称"
            value={keyword}
            onChange={handleKeywordChange}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Button
          variant={filterOpen ? 'default' : 'outline'}
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setFilterOpen((v) => !v)}
          aria-label="筛选"
        >
          <Filter size={18} />
        </Button>
      </div>

      {filterOpen && (
        <div className="bg-card rounded-xl p-4 border border-border mb-3 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              区县
            </label>
            <Select
              value={district}
              onValueChange={(val) => {
                setDistrict(val);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="全部区县" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              类型
            </label>
            <Select
              value={type}
              onValueChange={(val) => {
                setType(val);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {PARKING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PARKING_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {PARKING_TAGS.map((tag: ParkingTag) => {
                const active = selectedTags.includes(tag);
                return (
                  <Badge
                    key={tag}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => {
                      toggleTag(tag);
                      handleFilterChange();
                    }}
                  >
                    {PARKING_TAG_LABELS[tag]}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isLoading && allItems.length === 0 && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-card rounded-xl p-8 text-center border border-border">
          <p className="text-sm text-muted-foreground mb-3">加载失败</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      )}

      {showEmpty && !isError && (
        <div className="bg-card rounded-xl p-10 text-center border border-border">
          <p className="text-sm text-muted-foreground">未找到相关停车场</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            尝试调整筛选条件或搜索关键词
          </p>
        </div>
      )}

      {allItems.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {allItems.map((item) => (
              <ParkingCard key={item.id} parking={item} />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            {hasMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full max-w-[200px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground py-2">没有更多了</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ListPage;
