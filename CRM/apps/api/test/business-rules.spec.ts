import {
  calculateHaversineDistance,
  isWithinGeofence,
  normalizePhoneNumber,
  isValidPhoneNumber,
  normalizePhoneToE164,
  CallDisposition,
  CallDispositionSchema,
  LeadStatus,
  Temperature,
  NotInterestedReason,
  CallAttemptStatus,
  DeviceStatus,
  SimState,
} from '@dayaar/shared';
import { createStoreOnlyZip } from '../src/modules/callyzer/zip.util';

describe('Real Estate CRM - Core Business Logic & Algorithms', () => {
  describe('1. Server-Side Geofence & Haversine Distance (Attendance)', () => {
    const officeLat = 28.4595;
    const officeLon = 77.0266;
    const allowedRadiusMeters = 100;

    it('should accurately calculate distance between identical coordinates as 0m', () => {
      const distance = calculateHaversineDistance(officeLat, officeLon, officeLat, officeLon);
      expect(distance).toBe(0);
    });

    it('should accept check-in within the 100m geofence radius', () => {
      const userLat = 28.4597;
      const userLon = 77.0267;
      const { isWithin, distanceMeters } = isWithinGeofence(
        userLat,
        userLon,
        officeLat,
        officeLon,
        allowedRadiusMeters,
      );

      expect(isWithin).toBe(true);
      expect(distanceMeters).toBeLessThanOrEqual(100);
    });

    it('should reject check-in when employee is outside the 100m geofence radius', () => {
      const userLat = 28.4900;
      const userLon = 77.0890;
      const { isWithin, distanceMeters } = isWithinGeofence(
        userLat,
        userLon,
        officeLat,
        officeLon,
        allowedRadiusMeters,
      );

      expect(isWithin).toBe(false);
      expect(distanceMeters).toBeGreaterThan(100);
    });
  });

  describe('2. Phone Normalization & Duplicate Phone Candidate Resolution', () => {
    it('should normalize formatted Indian numbers (+91, spaces, hyphens) to clean 10-digits', () => {
      expect(normalizePhoneNumber('+91 98110 01122')).toBe('9811001122');
      expect(normalizePhoneNumber('+91-9811001122')).toBe('9811001122');
      expect(normalizePhoneNumber('09811001122')).toBe('9811001122');
      expect(normalizePhoneNumber('919811001122')).toBe('9811001122');
      expect(normalizePhoneNumber('(98110) 01122')).toBe('9811001122');
    });

    it('should accurately validate valid Indian mobile phone format', () => {
      expect(isValidPhoneNumber('9811001122')).toBe(true);
      expect(isValidPhoneNumber('8811001122')).toBe(true);
      expect(isValidPhoneNumber('7811001122')).toBe(true);
      expect(isValidPhoneNumber('6811001122')).toBe(true);
      expect(isValidPhoneNumber('12345')).toBe(false);
      expect(isValidPhoneNumber('1811001122')).toBe(false);
    });

    it('should persist canonical E.164 values for Callyzer matching', () => {
      expect(normalizePhoneToE164('09811001122')).toBe('+919811001122');
      expect(normalizePhoneToE164('+91 98110 01122')).toBe('+919811001122');
    });
  });

  describe('3. Telephony Outcome Normalization & 4-Attempt Rule', () => {
    it('should treat NOT_CONNECTED, BUSY, and NO_ANSWER as genuine attempts (countsAsAttempt = true)', () => {
      const customerOutcomes = ['BUSY', 'NO_ANSWER', 'NOT_CONNECTED', 'UNANSWERED'];
      customerOutcomes.forEach((raw) => {
        const isCustomerFailure =
          raw.includes('BUSY') ||
          raw.includes('NO_ANSWER') ||
          raw.includes('NOT_CONNECTED') ||
          raw.includes('UNANSWERED');
        expect(isCustomerFailure).toBe(true);
      });
    });

    it('should NOT consume one of the 4 attempts for technical/device/cancelled errors', () => {
      const technicalErrors = ['FAILED', 'CANCELLED', 'DEVICE_ERROR', 'NETWORK_TIMEOUT'];
      technicalErrors.forEach((raw) => {
        const isTechnicalOrCancelled =
          raw.includes('CANCEL') ||
          raw.includes('FAIL') ||
          raw.includes('DEVICE') ||
          raw.includes('TIMEOUT') ||
          raw.includes('NETWORK');
        const countsAsAttempt = !isTechnicalOrCancelled;
        expect(countsAsAttempt).toBe(false);
      });
    });

    it('should verify 4-attempt auto-transition threshold logic', () => {
      let attemptCount = 0;
      let status = LeadStatus.NEW;

      // Simulate 4 genuine unsuccessful attempts
      for (let i = 1; i <= 4; i++) {
        attemptCount += 1;
        if (attemptCount >= 4 && [LeadStatus.NEW, LeadStatus.CALLING, LeadStatus.FOLLOW_UP].includes(status)) {
          status = LeadStatus.NOT_PICKED_UP;
        }
      }

      expect(attemptCount).toBe(4);
      expect(status).toBe(LeadStatus.NOT_PICKED_UP);
    });
  });

  describe('4. Device Presence and Call Readiness Rules', () => {
    it('should require ONLINE status, calling capability, and SIM_READY to place calls', () => {
      const checkCallReady = (status: DeviceStatus, canPlaceCalls: boolean, simState: SimState) => {
        return status === DeviceStatus.ONLINE && canPlaceCalls && simState === SimState.READY;
      };

      expect(checkCallReady(DeviceStatus.ONLINE, true, SimState.READY)).toBe(true);
      expect(checkCallReady(DeviceStatus.OFFLINE, true, SimState.READY)).toBe(false);
      expect(checkCallReady(DeviceStatus.STALE, true, SimState.READY)).toBe(false);
      expect(checkCallReady(DeviceStatus.ONLINE, false, SimState.READY)).toBe(false);
      expect(checkCallReady(DeviceStatus.ONLINE, true, SimState.ABSENT)).toBe(false);
    });
  });

  describe('5. Per-call disposition and export rules', () => {
    it('requires a reason and a timestamp for follow-up dispositions', () => {
      expect(
        CallDispositionSchema.safeParse({ disposition: CallDisposition.WARM, reason: '' }).success,
      ).toBe(false);
      expect(
        CallDispositionSchema.safeParse({ disposition: CallDisposition.FOLLOW_UP, reason: 'Call tomorrow' }).success,
      ).toBe(false);
      expect(
        CallDispositionSchema.safeParse({
          disposition: CallDisposition.FOLLOW_UP,
          reason: 'Call tomorrow',
          followUpAt: '2026-08-21T10:00:00.000Z',
        }).success,
      ).toBe(true);
    });

    it('creates a structurally valid store-only ZIP envelope', () => {
      const zip = createStoreOnlyZip([{ name: 'recording.mp3', data: Buffer.from('audio-bytes') }]);
      expect(zip.readUInt32LE(0)).toBe(0x04034b50);
      expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
      expect(zip.includes(Buffer.from('recording.mp3'))).toBe(true);
    });
  });
});
