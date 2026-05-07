import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTES_KEY } from './auth.constants';

export const Public = () => SetMetadata(PUBLIC_ROUTES_KEY, true);
