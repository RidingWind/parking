export const PARKING_TYPES = ['mall', 'roadside', 'public', 'pr', 'charging', 'hospital'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];
export const isParkingType = (v: string): v is ParkingType =>
  (PARKING_TYPES as readonly string[]).includes(v);
export const PARKING_TYPE_LABELS: Record<ParkingType, string> = {
  mall: '商场',
  roadside: '路侧',
  public: '公共',
  pr: 'P+R换乘',
  charging: '充电站',
  hospital: '医院',
};

export const DISTRICTS = [
  '黄浦', '闵行', '徐汇', '长宁', '杨浦', '浦东', '静安',
  '虹口', '普陀', '宝山', '嘉定', '青浦', '松江', '奉贤',
] as const;
export type District = (typeof DISTRICTS)[number];
export const isDistrict = (v: string): v is District =>
  (DISTRICTS as readonly string[]).includes(v);

export const PARKING_TAGS = [
  'free', 'points', 'consumption', 'charging', 'holiday', 'pr',
] as const;
export type ParkingTag = (typeof PARKING_TAGS)[number];
export const isParkingTag = (v: string): v is ParkingTag =>
  (PARKING_TAGS as readonly string[]).includes(v);
export const PARKING_TAG_LABELS: Record<ParkingTag, string> = {
  free: '免费停车',
  points: '积分兑换',
  consumption: '消费满减',
  charging: '充电奖励',
  holiday: '节假日活动',
  pr: 'P+R换乘',
};

export const CORRECTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface ParkingLot {
  id: string;
  name: string;
  district: string;
  address: string | null;
  type: ParkingType;
  feeStandard: string | null;
  freePolicy: string | null;
  pointsRule: string | null;
  consumptionRule: string | null;
  chargingRule: string | null;
  holidayRule: string | null;
  openingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  status: string;
  avgRating: number;
  ratingCount: number;
  commentCount: number;
  tags: string[];
}

export interface ParkingListQuery {
  district?: string;
  type?: ParkingType;
  tags?: string[];
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ParkingListResponse {
  items: ParkingLot[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ParkingDetailResponse extends ParkingLot {
  comments: ParkingComment[];
}

export interface ParkingComment {
  id: string;
  parkingId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface CreateRatingRequest {
  parkingId: string;
  rating: number;
  anonymousId: string;
}

export interface CreateCommentRequest {
  parkingId: string;
  content: string;
  authorName: string;
  anonymousId: string;
}

export interface CreateCorrectionRequest {
  parkingId: string;
  content: string;
  fieldName?: string;
  submitterName?: string;
  anonymousId: string;
}

export interface CreateRegistrationRequest {
  name: string;
  district: string;
  address: string;
  type: ParkingType;
  feeStandard?: string;
  freePolicy?: string;
  pointsRule?: string;
  consumptionRule?: string;
  chargingRule?: string;
  holidayRule?: string;
  openingHours?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  merchantName?: string;
  anonymousId: string;
}

export interface MerchantRegistration {
  id: string;
  name: string;
  district: string;
  address: string | null;
  type: ParkingType;
  status: RegistrationStatus;
  createdAt: string;
}

export interface FavoriteRequest {
  parkingId: string;
  anonymousId: string;
}

export interface FavoriteItem extends ParkingLot {
  favoritedAt: string;
}

export interface RegistrationListResponse {
  items: MerchantRegistration[];
}

export interface FavoriteListResponse {
  items: FavoriteItem[];
}

export interface FavoriteStatusResponse {
  favorited: boolean;
}
