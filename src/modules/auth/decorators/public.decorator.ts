import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from '@/shared/constants';

/**
 * Marks an endpoint as publicly accessible.
 */
export const Public = () => SetMetadata(AUTH_METADATA.PUBLIC, true);
