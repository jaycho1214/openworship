import { successResponse, errorResponse } from '../../shared/types/ipc';

// ── successResponse ──────────────────────────────────────────────────────

describe('successResponse', () => {
  it('creates success response without data', () => {
    const response = successResponse();
    expect(response).toEqual({ success: true });
    expect(response.success).toBe(true);
  });

  it('creates success response with data', () => {
    const response = successResponse({ id: '123', name: 'test' });
    expect(response).toEqual({
      success: true,
      data: { id: '123', name: 'test' },
    });
  });

  it('creates success response with string data', () => {
    const response = successResponse('hello');
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', 'hello');
  });

  it('creates success response with number data', () => {
    const response = successResponse(42);
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', 42);
  });

  it('creates success response with array data', () => {
    const response = successResponse([1, 2, 3]);
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', [1, 2, 3]);
  });

  it('creates success response with null data', () => {
    const response = successResponse(null);
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', null);
  });

  it('creates success response with boolean data', () => {
    const response = successResponse(true);
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', true);
  });
});

// ── errorResponse ────────────────────────────────────────────────────────

describe('errorResponse', () => {
  it('creates error response with message', () => {
    const response = errorResponse('Something went wrong');
    expect(response).toEqual({
      success: false,
      error: 'Something went wrong',
    });
  });

  it('has success: false', () => {
    const response = errorResponse('fail');
    expect(response.success).toBe(false);
  });

  it('preserves the error string exactly', () => {
    const response = errorResponse('Error: SQLITE_CONSTRAINT');
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error', 'Error: SQLITE_CONSTRAINT');
  });

  it('handles empty error string', () => {
    const response = errorResponse('');
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error', '');
  });
});

// ── Type discrimination ──────────────────────────────────────────────────

describe('IpcResponse type discrimination', () => {
  it('success response has data property', () => {
    const response = successResponse('data');
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data', 'data');
  });

  it('error response has error property', () => {
    const response = errorResponse('fail');
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error', 'fail');
  });

  it('success response without data has no data property', () => {
    const response = successResponse();
    expect(response.success).toBe(true);
    expect(response).not.toHaveProperty('data');
  });
});
