import { Types } from 'mongoose';
import { DeviceStatus, SimState } from '@dayaar/shared';
import { DevicesService } from '../src/modules/devices/devices.service';

describe('Device pairing durability', () => {
  const buildContext = (save: jest.Mock) => {
    const session = {
      _id: new Types.ObjectId(),
      organizationId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
    };
    const device = {
      deviceId: 'physical-device-1',
      deviceName: 'Android handset',
      manufacturer: 'Android',
      appVersion: '1.0.0',
      fcmToken: 'existing-fcm-token',
      authTokenHash: null,
      simState: SimState.READY,
      simOperator: 'Carrier',
      status: DeviceStatus.ONLINE,
      capabilities: { canPlaceCalls: true, canReadCallLogs: false, canSyncRecordings: false },
      lastSeenAt: new Date(),
      pairedAt: new Date(),
      revokedAt: null,
      isPrimaryCallingDevice: false,
      set: jest.fn(),
      save,
    };
    const deviceModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      exists: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(device),
      }),
    };
    const pairingModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue(session),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const service = new DevicesService(deviceModel as any, pairingModel as any);
    const dto = {
      pairingCode: '123456',
      pairingToken: '1f9c182c-6f6a-4ef0-b90b-e9598f576ba8',
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      manufacturer: device.manufacturer,
      model: 'Phone',
      appVersion: device.appVersion,
      fcmToken: 'new-fcm-token',
      simState: SimState.READY,
      simOperator: device.simOperator,
      capabilities: device.capabilities,
    };
    return { service, session, pairingModel, dto };
  };

  it('releases the one-time session when device persistence fails', async () => {
    const failure = new Error('device write failed');
    const { service, session, pairingModel, dto } = buildContext(
      jest.fn().mockRejectedValue(failure),
    );

    await expect(service.claimPairing(dto)).rejects.toBe(failure);
    expect(pairingModel.updateOne).toHaveBeenCalledWith(
      { _id: session._id, isClaimed: true },
      { $set: { isClaimed: false } },
    );
  });

  it('keeps the one-time session claimed after a successful device save', async () => {
    const { service, pairingModel, dto } = buildContext(jest.fn().mockResolvedValue(undefined));

    const result = await service.claimPairing(dto);

    expect(result.deviceId).toBe(dto.deviceId);
    expect(result.deviceAuthToken).toBeTruthy();
    expect(result.pairedAt).toBeTruthy();
    expect(result.lastSeenAt).toBeTruthy();
    expect(pairingModel.updateOne).not.toHaveBeenCalled();
  });
});
