import { useState, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  Tag,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@client/src/components/ui/dialog';
import { parking, favorite } from '@client/src/api/index';
import { getAnonymousId } from '@client/src/utils/storage';
import {
  PARKING_TYPE_LABELS,
  PARKING_TAG_LABELS,
} from '@shared/api.interface';
import type { ParkingDetailResponse } from '@shared/api.interface';

const tagColors: Record<string, string> = {
  free: 'bg-green-100 text-green-700 border-green-200',
  points: 'bg-blue-100 text-blue-700 border-blue-200',
  consumption: 'bg-orange-100 text-orange-700 border-orange-200',
  charging: 'bg-purple-100 text-purple-700 border-purple-200',
  holiday: 'bg-pink-100 text-pink-700 border-pink-200',
  pr: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

interface InfoBlockProps {
  title: string;
  content: string;
  highlightClass?: string;
  icon?: React.ReactNode;
}

const InfoBlock = ({ title, content, highlightClass, icon }: InfoBlockProps) => {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlightClass
          ? highlightClass
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-semibold opacity-80">{title}</span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
};

const StarRating = ({
  value,
  onChange,
  size = 20,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) => {
  const [hover, setHover] = useState<number>(0);
  const display = hover || value;
  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n: number) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
          aria-label={`${n}星`}
        >
          <Star
            size={size}
            className={
              display >= n
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-muted-foreground/30'
            }
          />
        </button>
      ))}
    </div>
  );
};

const DetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const anonymousId = useMemo(() => getAnonymousId(), []);

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useQuery<ParkingDetailResponse>({
    queryKey: ['parkingDetail', id],
    queryFn: () => parking.detail(id || ''),
    enabled: !!id,
  });

  const { data: favStatus, refetch: refetchFav } = useQuery({
    queryKey: ['favoriteStatus', id, anonymousId],
    queryFn: () => favorite.check(id || '', anonymousId),
    enabled: !!id,
  });

  const [ratingValue, setRatingValue] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('匿名用户');
  const [commentContent, setCommentContent] = useState('');

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionContent, setCorrectionContent] = useState('');
  const [correctionSubmitter, setCorrectionSubmitter] = useState('');

  const ratingMutation = useMutation({
    mutationFn: (rating: number) =>
      parking.submitRating({
        parkingId: id || '',
        rating,
        anonymousId,
      }),
    retry: false,
    onSuccess: () => {
      setHasRated(true);
      refetch();
      toast.success('感谢您的评分');
    },
    onError: (err: unknown) => {
      logger.error('提交评分失败', err);
      toast.error('提交失败，请稍后重试');
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      parking.submitComment({
        parkingId: id || '',
        content: commentContent.trim(),
        authorName: commentAuthor.trim() || '匿名用户',
        anonymousId,
      }),
    retry: false,
    onSuccess: () => {
      setCommentContent('');
      refetch();
      toast.success('评论发表成功');
    },
    onError: (err: unknown) => {
      logger.error('提交评论失败', err);
      toast.error('发表失败，请稍后重试');
    },
  });

  const correctionMutation = useMutation({
    mutationFn: () =>
      parking.submitCorrection({
        parkingId: id || '',
        content: correctionContent.trim(),
        submitterName: correctionSubmitter.trim() || undefined,
        anonymousId,
      }),
    retry: false,
    onSuccess: () => {
      setCorrectionContent('');
      setCorrectionSubmitter('');
      setCorrectionOpen(false);
      toast.success('感谢反馈，我们会尽快核实');
    },
    onError: (err: unknown) => {
      logger.error('提交纠错失败', err);
      toast.error('提交失败，请稍后重试');
    },
  });

  const favMutation = useMutation({
    mutationFn: () =>
      favorite.toggle({ parkingId: id || '', anonymousId }),
    retry: false,
    onSuccess: () => {
      refetchFav();
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (err: unknown) => {
      logger.error('收藏操作失败', err);
      toast.error('操作失败，请稍后重试');
    },
  });

  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) {
      toast.error('请输入评论内容');
      return;
    }
    commentMutation.mutate();
  };

  const handleSubmitCorrection = (e: FormEvent) => {
    e.preventDefault();
    if (!correctionContent.trim()) {
      toast.error('请输入纠错内容');
      return;
    }
    correctionMutation.mutate();
  };

  const infoBlocks: InfoBlockProps[] = [];
  if (detail) {
    if (detail.feeStandard) {
      infoBlocks.push({
        title: '收费标准',
        content: detail.feeStandard,
        icon: <Tag size={14} />,
      });
    }
    if (detail.freePolicy) {
      infoBlocks.push({
        title: '免费停车政策',
        content: detail.freePolicy,
        highlightClass: 'bg-green-50 border-green-200 text-green-900',
        icon: <Tag size={14} />,
      });
    }
    if (detail.pointsRule) {
      infoBlocks.push({
        title: '积分兑换规则',
        content: detail.pointsRule,
        highlightClass: 'bg-blue-50 border-blue-200 text-blue-900',
        icon: <Tag size={14} />,
      });
    }
    if (detail.consumptionRule) {
      infoBlocks.push({
        title: '消费满减规则',
        content: detail.consumptionRule,
        highlightClass: 'bg-orange-50 border-orange-200 text-orange-900',
        icon: <Tag size={14} />,
      });
    }
    if (detail.chargingRule) {
      infoBlocks.push({
        title: '充电奖励规则',
        content: detail.chargingRule,
        highlightClass: 'bg-purple-50 border-purple-200 text-purple-900',
        icon: <Tag size={14} />,
      });
    }
    if (detail.holidayRule) {
      infoBlocks.push({
        title: '节假日/工作日活动',
        content: detail.holidayRule,
        highlightClass: 'bg-pink-50 border-pink-200 text-pink-900',
        icon: <Tag size={14} />,
      });
    }
    if (detail.openingHours) {
      infoBlocks.push({
        title: '开放时间',
        content: detail.openingHours,
        icon: <Clock size={14} />,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[480px] px-4 pb-8">
        <div className="flex items-center gap-3 mb-4 -mx-4 px-4 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </Button>
          <Skeleton className="h-6 w-40" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border">
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="mx-auto max-w-[480px] px-4">
        <div className="flex items-center gap-3 mb-4 -mx-4 px-4 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-lg font-semibold">加载失败</h1>
        </div>
        <div className="bg-card rounded-xl p-8 border border-border text-center">
          <p className="text-muted-foreground mb-4">详情加载失败</p>
          <Button onClick={() => refetch()}>
            <RefreshCw size={16} />
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  const isFavorited = favStatus?.favorited ?? false;

  return (
    <div className="mx-auto max-w-[480px] px-4 pb-10">
      {/* Top Nav */}
      <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/90 backdrop-blur-sm -mx-4 px-4 pt-2 pb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-base font-semibold truncate flex-1">
          {detail.name}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => favMutation.mutate()}
          disabled={favMutation.isPending}
          aria-label={isFavorited ? '取消收藏' : '收藏'}
        >
          <Heart
            size={20}
            className={
              isFavorited
                ? 'text-red-500 fill-red-500'
                : 'text-muted-foreground'
            }
          />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Basic Info Card */}
        <div className="bg-card rounded-xl p-4 border border-border" data-ai-section-type="card-list">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold leading-tight flex-1">
              {detail.name}
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {detail.district}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {PARKING_TYPE_LABELS[
                detail.type as keyof typeof PARKING_TYPE_LABELS
              ] || detail.type}
            </span>
          </div>

          {detail.address && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-3">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <span className="break-words">{detail.address}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <StarRating value={detail.avgRating} readOnly size={16} />
            <span className="text-sm font-medium">
              {detail.avgRating > 0 ? detail.avgRating.toFixed(1) : '暂无'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({detail.ratingCount} 人评分)
            </span>
          </div>

          {/* Tags */}
          {detail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
              {detail.tags.map((tag: string) => (
                <span
                  key={tag}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    tagColors[tag] ||
                    'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {PARKING_TAG_LABELS[
                    tag as keyof typeof PARKING_TAG_LABELS
                  ] || tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info Blocks */}
        {infoBlocks.length > 0 && (
          <div className="space-y-3">
            {infoBlocks.map((block: InfoBlockProps, idx: number) => (
              <InfoBlock key={idx} {...block} />
            ))}
          </div>
        )}

        {/* Rating Section */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-sm font-semibold mb-3">给停车场打分</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold">
              {detail.avgRating > 0 ? detail.avgRating.toFixed(1) : '0.0'}
            </span>
            <div>
              <StarRating value={detail.avgRating} readOnly size={14} />
              <p className="text-xs text-muted-foreground mt-0.5">
                {detail.ratingCount} 人评分
              </p>
            </div>
          </div>

          {hasRated ? (
            <p className="text-sm text-green-600 font-medium mt-3">
              感谢您的评分
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                点击星星进行评分
              </p>
              <div className="flex items-center gap-3">
                <StarRating
                  value={ratingValue}
                  onChange={(v: number) => {
                    setRatingValue(v);
                    ratingMutation.mutate(v);
                  }}
                  size={28}
                />
                {ratingMutation.isPending && (
                  <span className="text-xs text-muted-foreground">
                    提交中...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="text-sm font-semibold mb-3">
            用户评论 ({detail.comments.length})
          </h3>

          {detail.comments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              暂无评论，来发表第一条评论
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {detail.comments.map((c) => (
                <div
                  key={c.id}
                  className="border-b border-border last:border-b-0 pb-3 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {c.authorName || '匿名用户'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 break-words">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="space-y-2 pt-3 border-t border-border">
            <Input
              placeholder="昵称（默认匿名用户）"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="说点什么吧..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={commentMutation.isPending || !commentContent.trim()}
              >
                {commentMutation.isPending ? '提交中...' : '发表评论'}
              </Button>
            </div>
          </form>
        </div>

        {/* Correction Entry */}
        <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCorrectionOpen(true)}
            >
              <Edit3 size={16} />
              发现信息有误？提交纠错
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitCorrection}>
              <DialogHeader>
                <DialogTitle>提交纠错</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 my-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    纠错内容 <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="请描述错误的信息和正确的内容..."
                    value={correctionContent}
                    onChange={(e) => setCorrectionContent(e.target.value)}
                    rows={5}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    提交人昵称（选填）
                  </label>
                  <Input
                    placeholder="你的昵称"
                    value={correctionSubmitter}
                    onChange={(e) => setCorrectionSubmitter(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorrectionOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={
                    correctionMutation.isPending ||
                    !correctionContent.trim()
                  }
                >
                  {correctionMutation.isPending ? '提交中...' : '提交'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DetailPage;
