import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthUser } from '@dayaar/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof IAuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IAuthUser;
    return data ? user?.[data] : user;
  },
);
