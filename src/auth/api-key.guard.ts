import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * If API_KEY env is set, require header `x-api-key` (or Authorization: Bearer <key>).
 * If API_KEY is empty, guard allows all (local dev convenience).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const expected = process.env.API_KEY?.trim();
    if (!expected) {
      // Auth disabled when no key configured
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const headerKey = req.headers['x-api-key'];
    const auth = req.headers['authorization'];
    const bearer =
      auth?.startsWith('Bearer ') || auth?.startsWith('bearer ')
        ? auth.slice(7).trim()
        : undefined;
    const provided = (headerKey ?? bearer)?.trim();

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}
