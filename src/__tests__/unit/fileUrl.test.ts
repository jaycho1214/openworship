import { toFileUrl, toAppMediaUrl } from '../../renderer/shared/utils/fileUrl';

// ── toFileUrl ────────────────────────────────────────────────────────────

describe('toFileUrl', () => {
  it('converts Unix path to file:// URL', () => {
    expect(toFileUrl('/home/user/file.txt')).toBe('file:///home/user/file.txt');
  });

  it('converts Windows path with backslashes', () => {
    expect(toFileUrl('C:\\Users\\user\\file.txt')).toBe(
      'file:///C:/Users/user/file.txt',
    );
  });

  it('handles Windows drive letter with forward slashes', () => {
    expect(toFileUrl('D:/data/image.png')).toBe('file:///D:/data/image.png');
  });

  it('returns empty string for empty input', () => {
    expect(toFileUrl('')).toBe('');
  });

  it('handles path with spaces', () => {
    expect(toFileUrl('/home/user/my files/doc.pdf')).toBe(
      'file:///home/user/my files/doc.pdf',
    );
  });

  it('handles lowercase drive letter', () => {
    expect(toFileUrl('c:\\folder\\file.txt')).toBe(
      'file:///c:/folder/file.txt',
    );
  });
});

// ── toAppMediaUrl ────────────────────────────────────────────────────────

describe('toAppMediaUrl', () => {
  it('converts Unix path to app://media URL', () => {
    expect(toAppMediaUrl('/home/user/video.mp4')).toBe(
      'app://media/home/user/video.mp4',
    );
  });

  it('encodes special characters in path segments', () => {
    expect(toAppMediaUrl('/home/user/my file.mp4')).toBe(
      'app://media/home/user/my%20file.mp4',
    );
  });

  it('preserves Windows drive letter without encoding colon', () => {
    expect(toAppMediaUrl('C:\\Users\\file.mp4')).toBe(
      'app://media/C:/Users/file.mp4',
    );
  });

  it('returns input unchanged if already app:// URL', () => {
    const url = 'app://media/test.mp4';
    expect(toAppMediaUrl(url)).toBe(url);
  });

  it('returns input unchanged if already file:// URL', () => {
    const url = 'file:///home/test.mp4';
    expect(toAppMediaUrl(url)).toBe(url);
  });

  it('handles path with special characters', () => {
    const result = toAppMediaUrl('/path/to/file (1).mp4');
    expect(result).toContain('file%20(1).mp4');
  });
});
