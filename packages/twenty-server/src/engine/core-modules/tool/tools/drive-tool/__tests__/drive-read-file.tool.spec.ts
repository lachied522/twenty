import { DriveReadFileInputZodSchema } from 'src/engine/core-modules/tool/tools/drive-tool/drive-read-file.tool';

describe('DriveReadFileInputZodSchema', () => {
  it('accepts a virtual path', () => {
    expect(
      DriveReadFileInputZodSchema.safeParse({
        path: '/personal/notes.md',
      }).success,
    ).toBe(true);
  });

  it('accepts a Drive item fileId so the service can resolve virtualPath', () => {
    expect(
      DriveReadFileInputZodSchema.safeParse({
        fileId: '62c5bf6b-6a56-4199-ba04-69da359e13c3',
      }).success,
    ).toBe(true);
  });

  it('rejects a non-uuid fileId', () => {
    expect(
      DriveReadFileInputZodSchema.safeParse({
        fileId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });
});
