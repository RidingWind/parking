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
    PlatformModule.forRoot(),
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
