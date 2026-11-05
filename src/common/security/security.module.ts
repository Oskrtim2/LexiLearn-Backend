import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HashingService } from './hashing.service.js';
import { TokenService } from './token.service.js';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [TokenService, HashingService],
  exports: [TokenService, HashingService, JwtModule],
})
export class SecurityModule {}
