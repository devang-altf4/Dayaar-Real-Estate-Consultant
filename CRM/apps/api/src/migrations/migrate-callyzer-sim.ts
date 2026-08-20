import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable.');

  const organizations = db.collection('organizations');
  const users = db.collection('users');
  const devices = db.collection('androidDevices');
  const attempts = db.collection('callAttempts');

  const summary = {
    organizationsMissingCallingSettings: await organizations.countDocuments({
      $or: [
        { callingSeatLimit: { $exists: false } },
        { recordingRetentionMonths: { $exists: false } },
        { timezone: { $exists: false } },
      ],
    }),
    usersMissingCallingSeatFlag: await users.countDocuments({ callingEnabled: { $exists: false } }),
    devicesWithLegacyCaptureCapabilities: await devices.countDocuments({
      $or: [
        { 'capabilities.canReadCallLogs': true },
        { 'capabilities.canSyncRecordings': true },
      ],
    }),
    legacyCallAttempts: await attempts.countDocuments({
      $or: [
        { provider: { $ne: 'CALLYZER_SIM' } },
        { origin: { $exists: false } },
        { syncStatus: { $exists: false } },
        { phoneNumber: { $exists: false } },
        { dialedAt: { $exists: false } },
      ],
    }),
    legacyAttemptsWithoutAnyPhone: await attempts.countDocuments({
      phoneNumber: { $exists: false },
      phoneNumberDialed: { $exists: false },
    }),
  };
  process.stdout.write(`${JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...summary }, null, 2)}\n`);

  if (!apply) {
    process.stdout.write('No changes written. Re-run with --apply after reviewing this report.\n');
    return;
  }

  await Promise.all([
    organizations.updateMany(
      { callingSeatLimit: { $exists: false } },
      { $set: { callingSeatLimit: 10 } },
    ),
    organizations.updateMany(
      { recordingRetentionMonths: { $exists: false } },
      { $set: { recordingRetentionMonths: 9 } },
    ),
    organizations.updateMany(
      { timezone: { $exists: false } },
      { $set: { timezone: 'Asia/Kolkata' } },
    ),
    users.updateMany(
      { callingEnabled: { $exists: false } },
      { $set: { callingEnabled: false } },
    ),
    devices.updateMany(
      {},
      {
        $set: {
          'capabilities.canReadCallLogs': false,
          'capabilities.canSyncRecordings': false,
        },
      },
    ),
  ]);

  await attempts.updateMany(
    {},
    [
      {
        $set: {
          provider: 'CALLYZER_SIM',
          origin: {
            $ifNull: [
              '$origin',
              { $cond: [{ $ne: [{ $ifNull: ['$callCommandId', null] }, null] }, 'WEB', 'ANDROID'] },
            ],
          },
          syncStatus: {
            $ifNull: [
              '$syncStatus',
              { $cond: [{ $ne: [{ $ifNull: ['$providerCallId', null] }, null] }, 'MATCHED', 'PENDING'] },
            ],
          },
          phoneNumber: { $ifNull: ['$phoneNumber', '$phoneNumberDialed'] },
          dialedAt: { $ifNull: ['$dialedAt', { $ifNull: ['$startedAt', '$createdAt'] }] },
          duration: { $ifNull: ['$duration', { $ifNull: ['$durationSeconds', null] }] },
          connected: {
            $ifNull: ['$connected', { $gt: [{ $ifNull: ['$durationSeconds', 0] }, 2] }],
          },
          callDate: { $ifNull: ['$callDate', { $ifNull: ['$startedAt', '$createdAt'] }] },
          status: { $cond: [{ $eq: ['$status', 'CONNECTED'] }, 'COMPLETED', '$status'] },
          recordingStatus: {
            $switch: {
              branches: [
                { case: { $eq: ['$recordingStatus', 'NONE'] }, then: 'NO_RECORDING' },
                { case: { $eq: ['$recordingStatus', 'AVAILABLE'] }, then: 'FAILED' },
              ],
              default: { $ifNull: ['$recordingStatus', 'NO_RECORDING'] },
            },
          },
        },
      },
    ],
  );

  process.stdout.write('Migration applied. Calling seats remain disabled until an admin assigns them.\n');
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
