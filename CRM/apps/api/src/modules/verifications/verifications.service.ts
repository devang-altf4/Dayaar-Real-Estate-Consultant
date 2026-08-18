import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LeadVerification,
  LeadVerificationDocument,
} from '../../database/schemas/lead-verification.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import {
  VerificationStatus,
  MismatchSeverity,
  MismatchType,
  LeadStatus,
  Role,
  IAuthUser,
  CreateLeadVerificationTaskDto,
  SubmitVerificationDispositionDto,
  ReviewVerificationMismatchDto,
  ISanitizedVerificationLead,
} from '@dayaar/shared';

@Injectable()
export class VerificationsService {
  private readonly logger = new Logger(VerificationsService.name);

  constructor(
    @InjectModel(LeadVerification.name)
    private verificationModel: Model<LeadVerificationDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Spawns a non-mutating secret verification task for a lead marked NOT_INTERESTED.
   * Does NOT alter the primary lead's assignment or public history.
   */
  async createVerificationTask(dto: CreateLeadVerificationTaskDto, organizationId: string, user: IAuthUser) {
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(dto.leadId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status !== LeadStatus.NOT_INTERESTED) {
      throw new BadRequestException('Verification tasks can only be spawned for NOT_INTERESTED leads');
    }

    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      if (
        !lead.assignedEmployeeId ||
        !teamIds.some(
          (id) => id.toString() === lead.assignedEmployeeId?.toString(),
        )
      ) {
        throw new ForbiddenException(
          'Managers can only create verification tasks for their team leads.',
        );
      }
    }

    const duplicate = await this.verificationModel.exists({
      organizationId: new Types.ObjectId(organizationId),
      leadId: lead._id,
      status: {
        $in: [
          VerificationStatus.PENDING_ASSIGNMENT,
          VerificationStatus.ASSIGNED,
          VerificationStatus.REVIEW_REQUIRED,
        ],
      },
    });
    if (duplicate) {
      throw new BadRequestException(
        'An active verification task already exists for this lead.',
      );
    }

    if (dto.verificationEmployeeId) {
      await this.assertValidVerifier(
        dto.verificationEmployeeId,
        organizationId,
        user,
        lead.assignedEmployeeId?.toString(),
      );
    }

    // Flag lead as under secret verification internally
    lead.isUnderSecretVerification = true;
    await lead.save();

    const verification = new this.verificationModel({
      organizationId: new Types.ObjectId(organizationId),
      leadId: lead._id,
      originalEmployeeId: lead.assignedEmployeeId,
      originalDisposition: lead.status,
      originalReason: lead.notInterestedReason,
      originalReasonDetails: lead.notInterestedReasonDetails,
      verificationEmployeeId: dto.verificationEmployeeId
        ? new Types.ObjectId(dto.verificationEmployeeId)
        : null,
      status: dto.verificationEmployeeId
        ? VerificationStatus.ASSIGNED
        : VerificationStatus.PENDING_ASSIGNMENT,
      isMismatch: false,
    });

    await verification.save();

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'LeadVerification',
      entityId: verification._id.toString(),
      action: 'CREATE_VERIFICATION_TASK',
      metadata: { leadId: lead._id.toString(), originalReason: lead.notInterestedReason },
    });

    return verification;
  }

  /**
   * Assigns a verification task to Employee B (the secondary verifier).
   */
  async assignVerifier(
    verificationId: string,
    verifierEmployeeId: string,
    organizationId: string,
    user: IAuthUser,
  ) {
    const verification = await this.verificationModel.findOne({
      _id: new Types.ObjectId(verificationId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!verification) {
      throw new NotFoundException('Verification task not found');
    }

    await this.assertManagerOwnsVerification(verification, user);
    await this.assertValidVerifier(
      verifierEmployeeId,
      organizationId,
      user,
      verification.originalEmployeeId?.toString(),
    );

    // Ensure verifier is not the original caller
    if (verification.originalEmployeeId?.toString() === verifierEmployeeId) {
      throw new BadRequestException('Verifier cannot be the same employee who originally marked the lead Not Interested');
    }

    verification.verificationEmployeeId = new Types.ObjectId(verifierEmployeeId) as any;
    verification.status = VerificationStatus.ASSIGNED;
    await verification.save();

    return verification;
  }

  /**
   * Fetches Employee B's verification queue.
   * CRITICAL SECURITY RULE: Uses a strictly sanitized projection.
   * Strips all prior employee notes, original caller identity, prior recordings, and QA flags.
   */
  async getVerifierQueue(user: IAuthUser): Promise<ISanitizedVerificationLead[]> {
    const verifications = await this.verificationModel
      .find({
        organizationId: new Types.ObjectId(user.organizationId),
        verificationEmployeeId: new Types.ObjectId(user.id),
        status: VerificationStatus.ASSIGNED,
      })
      .populate('leadId');

    return verifications
      .filter((v) => v.leadId)
      .map((v) => {
        const lead = v.leadId as any;
        return {
          _id: v._id.toString(),
          verificationId: v._id.toString(),
          name: lead.name,
          phone: lead.phone,
          alternatePhone: lead.alternatePhone,
          email: lead.email,
          source: lead.source,
          project: lead.project,
          attemptCount: 0, // Appears as a fresh lead to Employee B
          createdAt: lead.createdAt,
        } as any;
      });
  }

  /**
   * Submits Employee B's independent disposition and runs automated mismatch detection.
   */
  async submitVerificationDisposition(
    dto: SubmitVerificationDispositionDto,
    organizationId: string,
    user: IAuthUser,
  ) {
    const verification = await this.verificationModel.findOne({
      _id: new Types.ObjectId(dto.verificationId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!verification) {
      throw new NotFoundException('Verification task not found');
    }

    if (verification.verificationEmployeeId?.toString() !== user.id) {
      throw new ForbiddenException('You are not the assigned verifier for this task');
    }
    if (verification.status !== VerificationStatus.ASSIGNED) {
      throw new BadRequestException(
        'This verification task has already been submitted or is not active.',
      );
    }

    verification.verificationDisposition = dto.disposition;
    verification.verificationReason = dto.reason || null;
    verification.verificationReasonDetails = dto.reasonDetails || null;
    verification.verifierNotes = dto.verifierNotes || null;
    verification.completedAt = new Date();

    // Automated Mismatch Detection Engine
    // Original was NOT_INTERESTED. If Verifier finds them INTERESTED, HOT, WARM, or SITE_VISIT -> DISPOSITION_MISMATCH
    const positiveOutcomes = [
      LeadStatus.INTERESTED,
      LeadStatus.HOT,
      LeadStatus.WARM,
      LeadStatus.SITE_VISIT,
      LeadStatus.NEGOTIATION,
      LeadStatus.BOOKED,
    ];

    if (positiveOutcomes.includes(dto.disposition)) {
      verification.isMismatch = true;
      verification.mismatchType = MismatchType.DISPOSITION_MISMATCH;
      verification.mismatchSeverity = MismatchSeverity.HIGH;
      verification.status = VerificationStatus.REVIEW_REQUIRED;
      this.logger.warn(
        `DISPOSITION MISMATCH detected on verification ${verification._id}: Original: ${verification.originalDisposition} (${verification.originalReason}) vs Verifier: ${dto.disposition}`,
      );
    } else {
      verification.isMismatch = false;
      verification.status = VerificationStatus.COMPLETED;
    }

    await verification.save();

    // Clear secret verification flag on master lead
    await this.leadModel.updateOne(
      {
        _id: verification.leadId,
        organizationId: new Types.ObjectId(organizationId),
      },
      { $set: { isUnderSecretVerification: false } },
    );

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'LeadVerification',
      entityId: verification._id.toString(),
      action: 'SUBMIT_VERIFICATION',
      metadata: {
        isMismatch: verification.isMismatch,
        mismatchType: verification.mismatchType,
        verifierDisposition: dto.disposition,
      },
    });

    return {
      success: true,
      isMismatch: verification.isMismatch,
      status: verification.status,
    };
  }

  /**
   * Manager & Admin review dashboard for all verification tasks & mismatches.
   */
  async getVerificationMismatches(user: IAuthUser, status?: VerificationStatus) {
    const filter: any = {
      organizationId: new Types.ObjectId(user.organizationId),
    };
    const andConditions: Record<string, unknown>[] = [];
    if (user.role === Role.MANAGER) {
      andConditions.push({
        originalEmployeeId: { $in: await this.getManagerTeamIds(user) },
      });
    }
    if (status) {
      filter.status = status;
    } else {
      // Default: return all that require review or have mismatches
      andConditions.push({
        $or: [
          { isMismatch: true },
          { status: VerificationStatus.REVIEW_REQUIRED },
        ],
      });
    }
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    return this.verificationModel
      .find(filter)
      .populate('leadId', 'name phone project')
      .populate('originalEmployeeId', 'name email employeeCode')
      .populate('verificationEmployeeId', 'name email employeeCode')
      .sort({ createdAt: -1 });
  }

  /**
   * Manager resolves / closes a mismatch review.
   */
  async reviewMismatch(dto: ReviewVerificationMismatchDto, organizationId: string, user: IAuthUser) {
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Only managers and admins can review QA mismatches');
    }

    const verification = await this.verificationModel.findOne({
      _id: new Types.ObjectId(dto.verificationId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!verification) {
      throw new NotFoundException('Verification task not found');
    }
    await this.assertManagerOwnsVerification(verification, user);

    verification.status = VerificationStatus.CLOSED;
    verification.managerReviewNotes = dto.managerNotes || null;
    await verification.save();

    // If manager accepted verifier's positive outcome, reassign lead to verifier and set interested
    if (dto.resolutionAction === 'ACCEPT_VERIFIER') {
      await this.leadModel.updateOne(
        {
          _id: verification.leadId,
          organizationId: new Types.ObjectId(organizationId),
        },
        { $set: {
          assignedEmployeeId: verification.verificationEmployeeId,
          status: (verification.verificationDisposition as LeadStatus) || LeadStatus.INTERESTED,
          notInterestedReason: null,
          notInterestedReasonDetails: null,
        } },
      );
    }

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'LeadVerification',
      entityId: verification._id.toString(),
      action: 'REVIEW_MISMATCH',
      metadata: { action: dto.resolutionAction, notes: dto.managerNotes },
    });

    return verification;
  }

  private async getManagerTeamIds(user: IAuthUser): Promise<Types.ObjectId[]> {
    const team = await this.userModel
      .find({
        organizationId: new Types.ObjectId(user.organizationId),
        managerId: new Types.ObjectId(user.id),
        role: Role.EMPLOYEE,
        isActive: true,
      })
      .select('_id');
    return team.map((member) => member._id);
  }

  private async assertManagerOwnsVerification(
    verification: LeadVerificationDocument,
    user: IAuthUser,
  ) {
    if (user.role !== Role.MANAGER) {
      return;
    }
    const teamIds = await this.getManagerTeamIds(user);
    if (
      !verification.originalEmployeeId ||
      !teamIds.some(
        (id) => id.toString() === verification.originalEmployeeId?.toString(),
      )
    ) {
      throw new ForbiddenException(
        'Managers can only manage verification tasks for their team.',
      );
    }
  }

  private async assertValidVerifier(
    verifierEmployeeId: string,
    organizationId: string,
    user: IAuthUser,
    originalEmployeeId?: string,
  ) {
    if (verifierEmployeeId === originalEmployeeId) {
      throw new BadRequestException(
        'Verifier cannot be the employee whose disposition is being checked.',
      );
    }
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(verifierEmployeeId),
      organizationId: new Types.ObjectId(organizationId),
      role: Role.EMPLOYEE,
      isActive: true,
    };
    if (user.role === Role.MANAGER) {
      filter.managerId = new Types.ObjectId(user.id);
    }
    const verifier = await this.userModel.exists(filter);
    if (!verifier) {
      throw new ForbiddenException(
        'Verifier must be an active employee in your organization and team.',
      );
    }
  }
}
