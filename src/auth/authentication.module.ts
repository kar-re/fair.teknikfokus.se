import { Module } from '@nestjs/common';
import { CompanyAuthService } from './services/company_auth.service';
import { CompanyAuthController} from './controllers/company_auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUserEntity } from './models/company_user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from './guards/jwt.guard';
import { JwtStrategy } from './guards/jwt.strategy';
import { StudentAuthService } from './services/student_auth.service';
import { StudentAuthController} from './controllers/student_auth.controller';
import { StudentUserEntity } from './models/student_user.entity';

@Module({
  imports: [JwtModule.registerAsync({
    useFactory: () => ({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' },
    }),
  }) ,
  TypeOrmModule.forFeature([CompanyUserEntity, StudentUserEntity])],
  providers: [CompanyAuthService,StudentAuthService,JwtGuard, JwtStrategy],
  controllers: [CompanyAuthController, StudentAuthController]
})
export class AuthenticationModule {}
