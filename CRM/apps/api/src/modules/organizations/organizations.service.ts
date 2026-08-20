import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
  ) {}

  async findById(id: string) {
    const org = await this.orgModel.findById(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateSettings(
    id: string,
    updates: {
      name?: string;
      officeLatitude?: number;
      officeLongitude?: number;
      allowedRadiusMeters?: number;
      maxAllowedGpsAccuracyMeters?: number;
      maxUnsuccessfulAttempts?: number;
      dailyCallTarget?: number;
      callingSeatLimit?: number;
      recordingRetentionMonths?: number;
      timezone?: string;
    },
  ) {
    const org = await this.orgModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }
}
