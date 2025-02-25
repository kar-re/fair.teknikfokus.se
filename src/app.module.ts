import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './auth/authentication.module';
import { CompanyProfileModule } from './company-profile/company-profile.module';
import { StudentProfileModule } from './student-profile/student-profile.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true}),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(<string>process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthenticationModule,
    CompanyProfileModule,
    StudentProfileModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
