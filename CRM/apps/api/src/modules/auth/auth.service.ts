import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { IAuthUser, LoginDto, RefreshTokenDto } from '@dayaar/shared';
import { getJwtSecret } from '../../common/config/jwt-secrets';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

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
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: getJwtSecret('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException({
          success: false,
          code: 'INVALID_REFRESH_TOKEN',
          message: 'User no longer active or found',
        });
      }

      const tokens = this.generateTokens(user);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (err) {
      throw new UnauthorizedException({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is expired or invalid',
      });
    }
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
        secret:
          getJwtSecret('JWT_SECRET'),
      });
      const user = await this.userModel
        .findById(payload.sub)
        .select('_id organizationId name email role employeeCode managerId isActive');

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is inactive or not found');
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
    } catch {
      throw new UnauthorizedException('Access token is expired or invalid');
    }
  }

  generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
      employeeCode: user.employeeCode,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: getJwtSecret('JWT_SECRET'),
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: getJwtSecret('JWT_REFRESH_SECRET'),
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return { accessToken, refreshToken };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}
