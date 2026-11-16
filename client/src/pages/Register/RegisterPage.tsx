import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Store, MapPin, Phone, Clock, FileText, CheckCircle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Button } from '@client/src/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { registration } from '@client/src/api';
import { getAnonymousId } from '@client/src/utils/storage';
import {
  DISTRICTS,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  type ParkingType,
} from '@shared/api.interface';

const registrationSchema = z.object({
  name: z.string().min(1, '请输入停车场名称'),
  district: z.string().min(1, '请选择所属区县'),
  address: z.string().min(1, '请输入详细地址'),
  type: z.string().min(1, '请选择停车场类型'),
  feeStandard: z.string().optional(),
  freePolicy: z.string().optional(),
  pointsRule: z.string().optional(),
  consumptionRule: z.string().optional(),
  chargingRule: z.string().optional(),
  holidayRule: z.string().optional(),
  openingHours: z.string().optional(),
  latitude: z
    .string()
    .optional()
    .refine(
      (v) => v === '' || v === undefined || !isNaN(Number(v)),
      '纬度必须是数字',
    ),
  longitude: z
    .string()
    .optional()
    .refine(
      (v) => v === '' || v === undefined || !isNaN(Number(v)),
      '经度必须是数字',
    ),
  merchantName: z.string().min(1, '请输入商户名称'),
  contactName: z.string().min(1, '请输入联系人姓名'),
  contactPhone: z.string().min(1, '请输入联系电话'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const defaultValues: RegistrationFormData = {
  name: '',
  district: '',
  address: '',
  type: '',
  feeStandard: '',
  freePolicy: '',
  pointsRule: '',
  consumptionRule: '',
  chargingRule: '',
  holidayRule: '',
  openingHours: '',
  latitude: '',
  longitude: '',
  merchantName: '',
  contactName: '',
  contactPhone: '',
};

const RegisterPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues,
  });

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const anonymousId = getAnonymousId();
      const latNum = data.latitude ? Number(data.latitude) : undefined;
      const lngNum = data.longitude ? Number(data.longitude) : undefined;

      await registration.submit({
        name: data.name,
        district: data.district,
        address: data.address,
        type: data.type as ParkingType,
        feeStandard: data.feeStandard || undefined,
        freePolicy: data.freePolicy || undefined,
        pointsRule: data.pointsRule || undefined,
        consumptionRule: data.consumptionRule || undefined,
        chargingRule: data.chargingRule || undefined,
        holidayRule: data.holidayRule || undefined,
        openingHours: data.openingHours || undefined,
        latitude: latNum,
        longitude: lngNum,
        contactName: data.contactName || undefined,
        contactPhone: data.contactPhone || undefined,
        merchantName: data.merchantName || undefined,
        anonymousId,
      });

      toast.success('提交成功，等待审核');
      form.reset(defaultValues);
      setSubmitted(true);
    } catch (error) {
      logger.error('提交登记失败', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || '提交失败，请稍后重试');
    }
  };

  return (
    <div className="pb-28">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-semibold">商户自助登记</h1>
        <p className="text-xs text-muted-foreground mt-1">
          审核通过后将展示在停车场列表
        </p>
      </div>

      {submitted && (
        <div className="mx-4 mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <CheckCircle size={18} className="shrink-0" />
          <span className="text-sm">您已提交登记，审核结果将在1-3个工作日内反馈</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
          {/* 基本信息 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Store size={16} className="text-primary" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      停车场名称
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入停车场名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      所属区县
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择区县" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DISTRICTS.map((district: string) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      详细地址
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入详细地址" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      停车场类型
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择停车场类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PARKING_TYPES.map((type: ParkingType) => (
                          <SelectItem key={type} value={type}>
                            {PARKING_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 停车情报 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                停车情报
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="feeStandard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">收费标准</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：首小时8元，后续5元/小时"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="freePolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">免费停车政策</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：会员每日首2小时免费"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointsRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">积分兑换规则</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：100积分兑换1小时"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consumptionRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">消费满减规则</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：消费满200免1小时"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chargingRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">充电奖励规则</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：充电满30分钟免2小时停车费"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="holidayRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">节假日/工作日活动</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="例如：周末全天5折"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openingHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm flex items-center gap-1">
                      <Clock size={12} className="text-muted-foreground" />
                      开放时间
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例如：07:00-23:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 位置坐标 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin size={16} className="text-primary" />
                位置坐标
              </CardTitle>
              <p className="text-xs text-muted-foreground -mt-1">
                选填，用于地图标注
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-sm">纬度</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" placeholder="31.2304" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-sm">经度</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" placeholder="121.4737" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 商户信息 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone size={16} className="text-primary" />
                商户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="merchantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      商户名称
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入商户名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      联系人姓名
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系人姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      联系电话
                      <span aria-hidden="true" className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 底部提交按钮 */}
          <div className="fixed bottom-[60px] left-0 right-0 p-4 bg-background border-t border-border z-10">
            <div className="max-w-[480px] mx-auto">
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? '提交中...' : '提交登记'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RegisterPage;
