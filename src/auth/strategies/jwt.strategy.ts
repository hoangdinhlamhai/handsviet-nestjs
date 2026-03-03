import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private authService: AuthService,
    ) {
        const secret = configService.get<string>('jwt.secret');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        } as any);
    }

    async validate(payload: JwtPayload) {
        const user = await this.authService.validateJwtPayload(payload);
        if (!user || !user.isActive) throw new UnauthorizedException('Invalid token');
        return user;
    }
}
