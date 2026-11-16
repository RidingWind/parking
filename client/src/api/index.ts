import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ParkingListQuery,
  ParkingListResponse,
  ParkingDetailResponse,
  CreateRatingRequest,
  CreateCommentRequest,
  CreateCorrectionRequest,
  CreateRegistrationRequest,
  FavoriteRequest,
  FavoriteItem,
  MerchantRegistration,
} from '@shared/api.interface';

export const parking = {
  async list(params: ParkingListQuery): Promise<ParkingListResponse> {
    const query = new URLSearchParams();
    if (params.district) query.set('district', params.district);
    if (params.type) query.set('type', params.type);
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach((t: string) => query.append('tags', t));
    }
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const res = await axiosForBackend.get(`/api/parking?${query.toString()}`);
    return res.data;
  },

  async detail(id: string): Promise<ParkingDetailResponse> {
    const res = await axiosForBackend.get(`/api/parking/${id}`);
    return res.data;
  },

  async submitRating(data: CreateRatingRequest): Promise<{ avgRating: number; ratingCount: number }> {
    const res = await axiosForBackend.post('/api/parking/rating', data);
    return res.data;
  },

  async submitComment(data: CreateCommentRequest): Promise<void> {
    const res = await axiosForBackend.post('/api/parking/comment', data);
    return res.data;
  },

  async submitCorrection(data: CreateCorrectionRequest): Promise<void> {
    const res = await axiosForBackend.post('/api/parking/correction', data);
    return res.data;
  },

  async getAll(): Promise<ParkingListResponse> {
    const res = await axiosForBackend.get('/api/parking/all');
    return res.data;
  },
};

export const registration = {
  async submit(data: CreateRegistrationRequest): Promise<void> {
    const res = await axiosForBackend.post('/api/registration', data);
    return res.data;
  },

  async mine(anonymousId: string): Promise<{ items: MerchantRegistration[] }> {
    const res = await axiosForBackend.get(`/api/registration/mine?anonymousId=${encodeURIComponent(anonymousId)}`);
    return res.data;
  },
};

export const favorite = {
  async toggle(data: FavoriteRequest): Promise<{ favorited: boolean }> {
    const res = await axiosForBackend.post('/api/favorite/toggle', data);
    return res.data;
  },

  async list(anonymousId: string): Promise<{ items: FavoriteItem[] }> {
    const res = await axiosForBackend.get(`/api/favorite?anonymousId=${encodeURIComponent(anonymousId)}`);
    return res.data;
  },

  async check(parkingId: string, anonymousId: string): Promise<{ favorited: boolean }> {
    const res = await axiosForBackend.get(
      `/api/favorite/check?parkingId=${encodeURIComponent(parkingId)}&anonymousId=${encodeURIComponent(anonymousId)}`
    );
    return res.data;
  },
};

export { logger };
