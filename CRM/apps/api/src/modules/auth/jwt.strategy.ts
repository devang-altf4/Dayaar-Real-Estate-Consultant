import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { IAuthUser } from '@dayaar/shared';
import { getJwtSecret } from '../../common/config/jwt-secrets';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  employeeCode: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<IAuthUser> {
    const user = await this.userModel.findById(payload.sub).select('_id organizationId name email role employeeCode managerId isActive');
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        success: false,
        code: 'USER_INACTIVE_OR_NOT_FOUND',
        message: 'User account is inactive or not found',
      });
    }

    return {
      id: user._id.toString(),
      organizationId: user.organizationId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
      managerId: user.managerId ? user.managerId.toString() : null,
    };
  }
}
