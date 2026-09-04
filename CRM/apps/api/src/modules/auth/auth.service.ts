import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { IAuthUser, LoginDto, RefreshTokenDto } from '@dayaar/shared';
import { getJwtSecret, assertJwtSecretsConfigured } from '../../common/config/jwt-secrets';

function hashJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex');
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    try {
      assertJwtSecretsConfigured();
    } catch (err: any) {
      this.logger.error(`JWT secrets misconfigured: ${err?.message}`);
      throw err;
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    // Validate duration formats early (jsonwebtoken would throw at sign-time)
    for (const [k, v] of [
      ['JWT_EXPIRES_IN', expiresIn],
      ['JWT_REFRESH_EXPIRES_IN', refreshExpiresIn],
    ] as const) {
      if (!/^(\d+[smhdwy]|\d+)$/.test(v)) {
        throw new Error(`${k} has invalid duration "${v}". Use e.g. 15m, 1d, 7d.`);
      }
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been deactivated. Contact an administrator.',
      });
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const tokens = this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        organizationId: user.organizationId.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        employeeCode: user.employeeCode,
        managerId: user.managerId ? user.managerId.toString() : null,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: getJwtSecret('JWT_REFRESH_SECRET'),
        audience: 'dayaar-refresh',
        clockTolerance: 30,
      });
    } catch (err) {
      // Preserve intentional Unauthorized branches below; signature/expiry failures land here
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is expired or invalid',
      });
    }

    if (payload?.typ !== 'refresh' || !payload?.jti || !payload?.sub) {
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is expired or invalid',
      });
    }

    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      // Preserve distinct code for ops (not swallowed as generic)
      throw new UnauthorizedException({
        success: false,
        code: 'USER_INACTIVE',
        message: 'User no longer active or found',
      });
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      // Rotation generation mismatch → possible reuse after logoutAll; nuke all sessions
      this.logger.warn(`Refresh tokenVersion mismatch for user ${user._id} — possible reuse`);
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Session revoked. Please log in again.',
      });
    }

    const jtiHash = hashJti(payload.jti);
    if ((user.revokedRefreshJtis || []).includes(jtiHash)) {
      // Reuse detected: refresh token already rotated/consumed → revoke all
      this.logger.warn(`Refresh token reuse detected for user ${user._id}; revoking all sessions`);
      await this.userModel.updateOne(
        { _id: user._id },
        { $inc: { tokenVersion: 1 }, $set: { revokedRefreshJtis: [] } },
      );
      throw new UnauthorizedException({
        success: false,
        code: 'REUSE_DETECTED',
        message: 'Session reuse detected. All sessions revoked — please log in again.',
      });
    }

    // Rotation: mark old jti consumed (cap array), issue new pair
    const nextRevoked = [...(user.revokedRefreshJtis || []), jtiHash].slice(-50);
    await this.userModel.updateOne({ _id: user._id }, { $set: { revokedRefreshJtis: nextRevoked } });

    const tokens = this.generateTokens(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    try {
      if (refreshToken) {
        const payload: any = this.jwtService.verify(refreshToken, {
          secret: getJwtSecret('JWT_REFRESH_SECRET'),
          audience: 'dayaar-refresh',
          clockTolerance: 30,
          ignoreExpiration: true,
        });
        if (payload?.jti) {
          await this.userModel.updateOne(
            { _id: userId },
            { $addToSet: { revokedRefreshJtis: hashJti(payload.jti) } },
          );
          return { success: true, message: 'Logged out successfully' };
        }
      }
    } catch {
      /* fall through to generic success to avoid oracle */
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $inc: { tokenVersion: 1 }, $set: { revokedRefreshJtis: [] } },
    );
    return { success: true, message: 'All sessions revoked' };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async authenticateAccessToken(token: string): Promise<IAuthUser> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: getJwtSecret('JWT_SECRET'),
        audience: 'dayaar-access',
        clockTolerance: 30,
      });
      if (payload?.typ && payload.typ !== 'access') {
        throw new UnauthorizedException('Access token is expired or invalid');
      }
      const user = await this.userModel
        .findById(payload.sub)
        .select('_id organizationId name email role employeeCode managerId isActive tokenVersion');

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is inactive or not found');
      }
      if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        throw new UnauthorizedException('Session revoked. Please log in again.');
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
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Access token is expired or invalid');
    }
  }

  generateTokens(user: UserDocument) {
    const base = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
      employeeCode: user.employeeCode,
      tokenVersion: (user as any).tokenVersion ?? 0,
    };

    const accessToken = this.jwtService.sign(
      { ...base, jti: randomUUID(), typ: 'access' },
      {
        secret: getJwtSecret('JWT_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        audience: 'dayaar-access',
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...base, jti: randomUUID(), typ: 'refresh' },
      {
        secret: getJwtSecret('JWT_REFRESH_SECRET'),
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        audience: 'dayaar-refresh',
      },
    );

    return { accessToken, refreshToken };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}
