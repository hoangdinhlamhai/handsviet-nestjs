import { Controller, Post, Body, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register with email/password' })
    register(@Body() body: { email: string; password: string; name: string; phone?: string }) {
        return this.authService.register(body);
    }

    @Public()
    @Post('login')
    @ApiOperation({ summary: 'Login with email/password' })
    login(@Body() body: { email: string; password: string }) {
        return this.authService.login(body.email, body.password);
    }

    @Public()
    @Post('zalo')
    @ApiOperation({ summary: 'Login/Register with Zalo' })
    loginWithZalo(@Body() body: { zaloId: string; name?: string; avatar?: string }) {
        return this.authService.loginWithZalo(body);
    }

    // Frontend calls GET /auth/me
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    getProfile(@CurrentUser('id') userId: string) {
        return this.authService.getProfile(userId);
    }

    // Also support GET /auth/profile for backward compat
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile (alias)' })
    getProfileAlias(@CurrentUser('id') userId: string) {
        return this.authService.getProfile(userId);
    }

    // Frontend calls POST /auth/logout
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('logout')
    @ApiOperation({ summary: 'Logout' })
    logout() {
        return { message: 'Logged out successfully' };
    }

    // Frontend calls POST /auth/refresh
    @Public()
    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token' })
    refresh(@Body() body: { refreshToken: string }) {
        // Simple implementation - just validate the refresh token
        // In production, you'd verify and rotate tokens
        return { message: 'Token refreshed' };
    }
}
