import { RecordingsService } from '../src/modules/callyzer/recordings.service';

/**
 * A call the lead-only policy discards never reaches durable storage, so the
 * provider copy is the only one that exists. Removing it is the whole cleanup.
 */
describe('RecordingsService.purgeProviderRecording', () => {
  const buildService = (removeRecording: jest.Mock) =>
    new RecordingsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { removeRecording } as any,
      { enqueue: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

  it('asks Callyzer to delete the provider recording', async () => {
    const removeRecording = jest.fn().mockResolvedValue(undefined);

    await buildService(removeRecording).purgeProviderRecording('provider-call-9');

    expect(removeRecording).toHaveBeenCalledWith('provider-call-9');
  });

  it('ignores an empty provider id instead of calling the provider', async () => {
    const removeRecording = jest.fn().mockResolvedValue(undefined);

    await buildService(removeRecording).purgeProviderRecording('');

    expect(removeRecording).not.toHaveBeenCalled();
  });

  it('propagates provider failures so the queue retries the job', async () => {
    const removeRecording = jest.fn().mockRejectedValue(new Error('Callyzer rate limit reached.'));

    await expect(
      buildService(removeRecording).purgeProviderRecording('provider-call-9'),
    ).rejects.toThrow('Callyzer rate limit reached.');
  });
});
