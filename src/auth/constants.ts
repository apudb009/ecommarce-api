export const jwtConstants = {
  secret: process.env.JWT_ACCESS_SECRET,
};

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSION_KEY = 'permission';

export const RequirePermission = (module: string, action: string) =>
  Reflect.metadata(PERMISSION_KEY, `${module}:${action}`);
