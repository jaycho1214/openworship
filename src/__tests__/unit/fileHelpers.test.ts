import {
  basename,
  isImageFile,
  isPdfFile,
  isOcrFile,
  getFileMimeType,
  MAX_OCR_FILE_SIZE,
} from '../../renderer/shared/utils/fileHelpers';

// Helper to create a mock File object
function createMockFile(
  name: string,
  type: string = '',
  size: number = 0,
): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

// ── basename ─────────────────────────────────────────────────────────────

describe('basename', () => {
  it('extracts filename from Unix path', () => {
    expect(basename('/home/user/documents/file.txt')).toBe('file.txt');
  });

  it('extracts filename from Windows path', () => {
    expect(basename('C:\\Users\\user\\file.txt')).toBe('file.txt');
  });

  it('handles filename with no path', () => {
    expect(basename('file.txt')).toBe('file.txt');
  });

  it('handles path with mixed separators', () => {
    expect(basename('/home/user\\documents/file.txt')).toBe('file.txt');
  });

  it('handles empty string', () => {
    expect(basename('')).toBe('');
  });

  it('handles path ending with separator (returns original)', () => {
    // pop() returns '' which is falsy, so || returns the original path
    expect(basename('/home/user/')).toBe('/home/user/');
  });

  it('handles deeply nested path', () => {
    expect(basename('/a/b/c/d/e/f.png')).toBe('f.png');
  });
});

// ── isImageFile ──────────────────────────────────────────────────────────

describe('isImageFile', () => {
  it('returns true for image/ MIME types', () => {
    expect(isImageFile(createMockFile('photo.jpg', 'image/jpeg'))).toBe(true);
    expect(isImageFile(createMockFile('photo.png', 'image/png'))).toBe(true);
    expect(isImageFile(createMockFile('photo.webp', 'image/webp'))).toBe(true);
    expect(isImageFile(createMockFile('photo.gif', 'image/gif'))).toBe(true);
  });

  it('returns true for image extensions when MIME is empty', () => {
    expect(isImageFile(createMockFile('photo.jpg', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.jpeg', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.png', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.gif', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.webp', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.bmp', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.tiff', ''))).toBe(true);
    expect(isImageFile(createMockFile('photo.tif', ''))).toBe(true);
  });

  it('returns true for uppercase extensions', () => {
    expect(isImageFile(createMockFile('PHOTO.JPG', ''))).toBe(true);
    expect(isImageFile(createMockFile('PHOTO.PNG', ''))).toBe(true);
  });

  it('returns false for non-image files', () => {
    expect(isImageFile(createMockFile('doc.pdf', 'application/pdf'))).toBe(
      false,
    );
    expect(isImageFile(createMockFile('doc.txt', 'text/plain'))).toBe(false);
    expect(isImageFile(createMockFile('video.mp4', 'video/mp4'))).toBe(false);
  });

  it('returns false for files with no extension and no MIME', () => {
    expect(isImageFile(createMockFile('noext', ''))).toBe(false);
  });
});

// ── isPdfFile ────────────────────────────────────────────────────────────

describe('isPdfFile', () => {
  it('returns true for application/pdf MIME type', () => {
    expect(isPdfFile(createMockFile('doc.pdf', 'application/pdf'))).toBe(true);
  });

  it('returns true for .pdf extension when MIME is empty', () => {
    expect(isPdfFile(createMockFile('doc.pdf', ''))).toBe(true);
  });

  it('returns true for uppercase .PDF extension', () => {
    expect(isPdfFile(createMockFile('DOC.PDF', ''))).toBe(true);
  });

  it('returns false for non-PDF files', () => {
    expect(isPdfFile(createMockFile('photo.jpg', 'image/jpeg'))).toBe(false);
    expect(isPdfFile(createMockFile('doc.txt', 'text/plain'))).toBe(false);
  });
});

// ── isOcrFile ────────────────────────────────────────────────────────────

describe('isOcrFile', () => {
  it('returns true for image files', () => {
    expect(isOcrFile(createMockFile('photo.jpg', 'image/jpeg'))).toBe(true);
  });

  it('returns true for PDF files', () => {
    expect(isOcrFile(createMockFile('doc.pdf', 'application/pdf'))).toBe(true);
  });

  it('returns false for non-OCR files', () => {
    expect(isOcrFile(createMockFile('doc.txt', 'text/plain'))).toBe(false);
    expect(isOcrFile(createMockFile('video.mp4', 'video/mp4'))).toBe(false);
  });
});

// ── getFileMimeType ──────────────────────────────────────────────────────

describe('getFileMimeType', () => {
  it('returns file.type when available', () => {
    expect(getFileMimeType(createMockFile('a.jpg', 'image/jpeg'))).toBe(
      'image/jpeg',
    );
    expect(getFileMimeType(createMockFile('a.txt', 'text/plain'))).toBe(
      'text/plain',
    );
  });

  it('returns application/pdf for .pdf with empty type', () => {
    expect(getFileMimeType(createMockFile('doc.pdf', ''))).toBe(
      'application/pdf',
    );
  });

  it('falls back to image/png for unknown files with empty type', () => {
    expect(getFileMimeType(createMockFile('unknown', ''))).toBe('image/png');
    expect(getFileMimeType(createMockFile('file.xyz', ''))).toBe('image/png');
  });
});

// ── MAX_OCR_FILE_SIZE ────────────────────────────────────────────────────

describe('MAX_OCR_FILE_SIZE', () => {
  it('equals 40 MB', () => {
    expect(MAX_OCR_FILE_SIZE).toBe(40 * 1024 * 1024);
  });
});
