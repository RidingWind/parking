import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { ParkingModule } from './modules/parking/parking.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { FavoriteModule } from './modules/favorite/favorite.module';

@Module({
  imports: [
    // 自部署说明：
    // 1) 平台模式下 PlatformModule 会强制校验平台基础域名，缺失时启动即报错，
    //    因此部署时必须设置 FORCE_AUTHN_INNERAPI_DOMAIN（可填自身域名）。
    // 2) 平台 CSRF 中间件依赖平台下发的 cookie，脱离平台后 /api/* 会被 403 拦截，
    //    默认关闭，如需开启设置 ENABLE_CSRF=true。
    PlatformModule.forRoot({
      enableCsrf: process.env.ENABLE_CSRF === 'true',
    }),
    // ====== @route-section: business-modules START ======
    ParkingModule,
    RegistrationModule,
    FavoriteModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
