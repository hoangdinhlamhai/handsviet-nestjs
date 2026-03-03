import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) return true;

        const { user } = context.switchToHttp().getRequest();
        if (!user) return false;

        // Role hierarchy: SUPER_ADMIN > CLINIC_OWNER > STAFF > CUSTOMER
        const roleHierarchy: Record<Role, number> = {
            [Role.SUPER_ADMIN]: 100,
            [Role.CLINIC_OWNER]: 50,
            [Role.STAFF]: 25,
            [Role.CUSTOMER]: 10,
        };

        const userRoleLevel = roleHierarchy[user.role as Role] || 0;
        return requiredRoles.some(role => userRoleLevel >= roleHierarchy[role]);
    }
}
