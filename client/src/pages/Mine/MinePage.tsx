import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { User, Heart, FileText, MapPin, ChevronRight } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Card,
  CardContent,
} from '@client/src/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@client/src/components/ui/empty';
import ParkingCard from '@client/src/components/ParkingCard';
import { favorite, registration } from '@client/src/api';
import { getAnonymousId } from '@client/src/utils/storage';
import {
  REGISTRATION_STATUSES,
  PARKING_TYPE_LABELS,
  type MerchantRegistration,
  type RegistrationStatus,
} from '@shared/api.interface';

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const STATUS_COLORS: Record<RegistrationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const maskId = (id: string): string => {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MinePage = () => {
  const [activeTab, setActiveTab] = useState('favorites');
  const navigate = useNavigate();
  const anonymousId = getAnonymousId();
  const displayId = maskId(anonymousId);

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', anonymousId],
    queryFn: () => favorite.list(anonymousId),
  });

  const { data: registrationsData, isLoading: registrationsLoading } = useQuery({
    queryKey: ['registrations', anonymousId],
    queryFn: () => registration.mine(anonymousId),
  });

  const favorites = favoritesData?.items ?? [];
  const registrations = registrationsData?.items ?? [];

  return (
    <div className="pb-20">
      {/* 用户信息区 */}
      <div className="px-4 pt-4 pb-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base">匿名用户</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                ID: {displayId}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            当前为匿名身份，数据保存在本地设备。清除浏览器数据会丢失收藏和登记记录。
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="favorites" className="flex items-center gap-1.5">
            <Heart size={14} />
            <span>我的收藏</span>
          </TabsTrigger>
          <TabsTrigger value="registrations" className="flex items-center gap-1.5">
            <FileText size={14} />
            <span>我的登记</span>
          </TabsTrigger>
        </TabsList>

        {/* 我的收藏 */}
        <TabsContent value="favorites" className="mt-0">
          {favoritesLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : favorites.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Heart size={24} />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>还没有收藏的停车场</EmptyTitle>
                  <EmptyDescription>快去发现更多优惠停车场吧</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" size="sm" onClick={() => navigate('/list')}>
                  去逛逛
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-3">
              {favorites.map((item) => (
                <ParkingCard key={item.id} parking={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 我的登记 */}
        <TabsContent value="registrations" className="mt-0">
          {registrationsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : registrations.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <FileText size={24} />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>还没有登记记录</EmptyTitle>
                  <EmptyDescription>
                    您是商户？快来登记您的停车场信息
                  </EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                  去登记
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-3">
              {registrations.map((item: MerchantRegistration) => {
                const status = item.status;
                const isValidStatus = REGISTRATION_STATUSES.includes(
                  status as RegistrationStatus,
                );
                const statusKey = isValidStatus
                  ? (status as RegistrationStatus)
                  : 'pending';
                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate('/register')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-sm flex-1 line-clamp-1">
                          {item.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-normal ${STATUS_COLORS[statusKey]}`}
                        >
                          {STATUS_LABELS[statusKey]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin size={12} className="shrink-0" />
                        <span>{item.district}</span>
                        <span className="mx-1">·</span>
                        <span>
                          {PARKING_TYPE_LABELS[item.type as keyof typeof PARKING_TYPE_LABELS] || item.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>提交时间：{formatDate(item.createdAt)}</span>
                        <ChevronRight size={14} className="text-muted-foreground/50" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MinePage;
