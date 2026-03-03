import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
    sub: string;
    email?: string | null;
    role: string;
}

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id: payload.sub } });
    }

    async register(data: { email: string; password: string; name: string; phone?: string }) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new ConflictException('Email already exists');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                phone: data.phone,
                isVerified: true,
            },
        });

        return this.generateTokens(user);
    }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return this.generateTokens(user);
    }

    async loginWithZalo(zaloData: { zaloId: string; name?: string; avatar?: string }) {
        let user = await this.prisma.user.findUnique({ where: { zaloId: zaloData.zaloId } });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    zaloId: zaloData.zaloId,
                    name: zaloData.name,
                    avatar: zaloData.avatar,
                    authProvider: 'ZALO',
                    isVerified: true,
                },
            });
        } else {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    ...(zaloData.name && { name: zaloData.name }),
                    ...(zaloData.avatar && { avatar: zaloData.avatar }),
                },
            });
        }

        return this.generateTokens(user);
    }

    private generateTokens(user: User) {
        const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload as any);
        const refreshToken = this.jwtService.sign(payload as any, {
            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        } as any);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role,
            },
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, phone: true, name: true,
                avatar: true, role: true, isVerified: true, createdAt: true,
            },
        });
        if (!user) throw new UnauthorizedException('User not found');
        return user;
    }
}
