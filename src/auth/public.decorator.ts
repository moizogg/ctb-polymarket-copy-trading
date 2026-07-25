import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Mark route as public (no API key required). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
