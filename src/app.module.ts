import path from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { DataSource } from 'typeorm';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';

import { AuthModule } from './modules/auth/auth.module.ts';
import { HealthCheckerModule } from './modules/health-checker/health-checker.module.ts';
import { PostModule } from './modules/post/post.module.ts';
import { UserModule } from './modules/user/user.module.ts';
import { ApiConfigService } from './shared/services/api-config.service.ts';
import { SharedModule } from './shared/shared.module.ts';

@Module({
  imports: [
    AuthModule,
    UserModule,
    PostModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ApiConfigService) => ({
        throttlers: [configService.throttlerConfigs],
      }),
      inject: [ApiConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ApiConfigService) =>
        configService.postgresConfig,
      inject: [ApiConfigService],
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }

        // Reuse existing DataSource on Vite HMR hot reload
        const existingDs = getDataSourceByName('default');
        if (existingDs?.isInitialized) {
          /*
           * HMR re-transpiles entity modules on every reload, so classes
           * like UserEntity get a new identity each time. The reused
           * DataSource still has metadata keyed to the old class objects,
           * so @InjectRepository(UserEntity) on the new class would miss —
           * rebuild metadata against the freshly-imported entities.
           */
          existingDs.setOptions(options);
          await (
            existingDs as unknown as { buildMetadatas: () => Promise<void> }
          ).buildMetadatas();

          return existingDs;
        }
        if (existingDs) {
          return existingDs.initialize();
        }

        const dataSource = addTransactionalDataSource(new DataSource(options));

        /*
         * vite-plugin-node's Nest adapter (server/nest.js) closes the
         * previous Nest app on the next request after an HMR reload, which
         * tears down whichever DataSource that app's container resolves —
         * the shared singleton reused above. That close is unrelated to
         * this DataSource's actual lifecycle, so no-op it in dev.
         */
        if (process.env.NODE_ENV === 'development') {
          dataSource.destroy = () => Promise.resolve();
        }

        return dataSource;
      },
    }),
    // eslint-disable-next-line canonical/id-match
    I18nModule.forRootAsync({
      useFactory: (configService: ApiConfigService) => ({
        fallbackLanguage: configService.fallbackLanguage,
        loaderOptions: {
          path: path.join(import.meta.dirname, 'i18n/'),
          watch: configService.isDevelopment,
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
      imports: [SharedModule],
      inject: [ApiConfigService],
    }),
    HealthCheckerModule,
  ],
  providers: [],
})
export class AppModule {}
