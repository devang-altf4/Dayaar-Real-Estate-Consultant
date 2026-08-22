import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { Role, CreateUserDto, IAuthUser, UpdateUserDto } from '@dayaar/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
  ) {}

  async findAll(organizationId: string, role?: Role, managerId?: string) {
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };
    if (role) {
      filter.role = role;
    }
    if (managerId) {
      filter.managerId = new Types.ObjectId(managerId);
    }

    return this.userModel
      .find(filter)
      .select('-passwordHash')
      .populate('managerId', 'name email employeeCode')
      .sort({ createdAt: -1 });
  }

  async findById(id: string, organizationId?: string) {
    const filter: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }
    const user = await this.userModel.findOne(filter).select('-passwordHash').populate('managerId', 'name email employeeCode');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAccessibleById(id: string, user: IAuthUser) {
    if (user.role === Role.EMPLOYEE && id !== user.id) {
      throw new ForbiddenException('Employees can only access their own profile.');
    }

    if (user.role === Role.MANAGER && id !== user.id) {
      const teamMember = await this.userModel
        .findOne({
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(user.organizationId),
          managerId: new Types.ObjectId(user.id),
        })
        .select('-passwordHash')
        .populate('managerId', 'name email employeeCode');
      if (!teamMember) {
        throw new ForbiddenException('Managers can only access their own team.');
      }
      return teamMember;
    }

    return this.findById(id, user.organizationId);
  }

  async findTeamMembers(managerId: string, organizationId: string) {
    return this.userModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        managerId: new Types.ObjectId(managerId),
        isActive: true,
      })
      .select('-passwordHash')
      .sort({ name: 1 });
  }

  /**
   * Minimal cross-team employee list (id/name/active/manager only) for the
   * lead-import distribution picker. Deliberately excludes contact details.
   */
  async findOrgEmployeesMinimal(organizationId: string) {
    return this.userModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.EMPLOYEE,
      })
      .select('_id name isActive managerId')
      .sort({ name: 1 });
  }

  async create(dto: CreateUserDto, organizationId: string) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const existingCode = await this.userModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      employeeCode: dto.employeeCode.toUpperCase(),
    });
    if (existingCode) {
      throw new ConflictException('Employee code is already in use in this organization');
    }

    if (dto.managerId) {
      await this.assertValidManager(dto.managerId, organizationId);
    }

    if (dto.callingEnabled) {
      await this.assertCallingSeatAvailable(organizationId);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = new this.userModel({
      organizationId: new Types.ObjectId(organizationId),
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      employeeCode: dto.employeeCode.toUpperCase().trim(),
      passwordHash,
      role: dto.role,
      managerId: dto.managerId ? new Types.ObjectId(dto.managerId) : null,
      isActive: true,
      callingEnabled: dto.callingEnabled,
    });

    await user.save();
    return this.findById(user._id.toString(), organizationId);
  }

  async updateUser(
    id: string,
    organizationId: string,
    updates: UpdateUserDto,
  ) {
    const updatePayload: any = {};
    if (updates.name) updatePayload.name = updates.name.trim();
    if (updates.phone) updatePayload.phone = updates.phone.trim();
    if (updates.role) updatePayload.role = updates.role;
    if (updates.managerId !== undefined) {
      if (updates.managerId) {
        await this.assertValidManager(updates.managerId, organizationId);
      }
      updatePayload.managerId = updates.managerId ? new Types.ObjectId(updates.managerId) : null;
    }
    if (updates.isActive !== undefined) updatePayload.isActive = updates.isActive;
    if (updates.callingEnabled !== undefined) {
      if (updates.callingEnabled) {
        const existingUser = await this.userModel.findOne({
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
        });
        if (!existingUser?.callingEnabled) {
          await this.assertCallingSeatAvailable(organizationId);
        }
      }
      updatePayload.callingEnabled = updates.callingEnabled;
    }
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.passwordHash = await bcrypt.hash(updates.password, salt);
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
      { $set: updatePayload },
      { new: true },
    ).select('-passwordHash');

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async assertValidManager(managerId: string, organizationId: string) {
    const manager = await this.userModel.exists({
      _id: new Types.ObjectId(managerId),
      organizationId: new Types.ObjectId(organizationId),
      role: Role.MANAGER,
      isActive: true,
    });
    if (!manager) {
      throw new BadRequestException(
        'Manager must be an active manager in the same organization.',
      );
    }
  }

  private async assertCallingSeatAvailable(organizationId: string) {
    const [organization, activeSeats] = await Promise.all([
      this.orgModel.findById(organizationId).select('callingSeatLimit'),
      this.userModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        callingEnabled: true,
        isActive: true,
      }),
    ]);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    if (activeSeats >= organization.callingSeatLimit) {
      throw new ConflictException({
        code: 'CALLING_SEAT_LIMIT_REACHED',
        message: `All ${organization.callingSeatLimit} calling seats are in use.`,
      });
    }
  }
}
