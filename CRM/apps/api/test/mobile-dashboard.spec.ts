import { ForbiddenException } from '@nestjs/common';
import { CallOrigin, Role } from '@dayaar/shared';
import { Types } from 'mongoose';
import { DevicePrincipal } from '../src/common/interfaces/device-principal.interface';
import { MobileService } from '../src/modules/mobile/mobile.service';

describe('MobileService', () => {
  const organizationId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const principal: DevicePrincipal = {
    id: new Types.ObjectId().toString(),
    deviceId: 'employee-phone',
    userId,
    organizationId,
  };

  const buildService = (role: Role = Role.EMPLOYEE) => {
    const employee = {
      _id: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      name: 'Mobile Employee',
      email: 'employee@example.com',
      phone: '+919811001122',
      employeeCode: 'EMP001',
      role,
      managerId: null,
      callingEnabled: true,
    };
    const userQuery = {
      select: jest.fn().mockResolvedValue(employee),
    };
    const userModel = {
      findOne: jest.fn().mockReturnValue(userQuery),
    };
    const leadQuery = {
      sort: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
    };
    const leadModel = {
      find: jest.fn().mockReturnValue(leadQuery),
    };
    const analyticsService = {
      getEmployeePerformance: jest.fn().mockResolvedValue({ callsMadeToday: 2 }),
    };
    const leadQueueService = {
      getDailyQueue: jest.fn().mockResolvedValue({ queue: [] }),
      getDailyTargetProgress: jest.fn().mockResolvedValue({ remainingCalls: 298 }),
    };
    const callingService = {
      initiateCall: jest.fn().mockResolvedValue({ callAttemptId: 'attempt-1' }),
    };
    const service = new MobileService(
      leadModel as any,
      userModel as any,
      analyticsService as any,
      leadQueueService as any,
      callingService as any,
    );

    return {
      service,
      userModel,
      leadModel,
      leadQuery,
      analyticsService,
      leadQueueService,
      callingService,
    };
  };

  it('rejects authenticated devices whose active user is not an employee', async () => {
    const { service, leadModel, analyticsService } = buildService(Role.MANAGER);

    await expect(service.getDashboard(principal)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(leadModel.find).not.toHaveBeenCalled();
    expect(analyticsService.getEmployeePerformance).not.toHaveBeenCalled();
  });

  it('pins dashboard leads and dependent reads to the device employee', async () => {
    const { service, userModel, leadModel, leadQuery, analyticsService, leadQueueService } =
      buildService();

    const result = await service.getDashboard(principal);

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      isActive: true,
    });
    expect(leadModel.find).toHaveBeenCalledWith({
      organizationId: new Types.ObjectId(organizationId),
      assignedEmployeeId: new Types.ObjectId(userId),
    });
    expect(leadQuery.sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(analyticsService.getEmployeePerformance).toHaveBeenCalledWith(
      expect.objectContaining({ id: userId, organizationId, role: Role.EMPLOYEE }),
    );
    expect(leadQueueService.getDailyQueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: userId, organizationId }),
      300,
    );
    expect(leadQueueService.getDailyTargetProgress).toHaveBeenCalledWith(
      expect.objectContaining({ id: userId, organizationId }),
    );
    expect(result.employee).toMatchObject({
      id: userId,
      organizationId,
      phone: '+919811001122',
      callingEnabled: true,
    });
  });

  it('forces calls initiated by a device to use the Android origin', async () => {
    const { service, callingService } = buildService();
    const leadId = new Types.ObjectId().toString();

    await service.initiateCall(leadId, principal);

    expect(callingService.initiateCall).toHaveBeenCalledWith(
      leadId,
      CallOrigin.ANDROID,
      expect.objectContaining({ id: userId, organizationId }),
    );
  });
});
