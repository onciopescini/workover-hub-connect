/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

// Mock the logger
jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleAsyncError: jest.fn((fn) => fn())
  })
}));

describe('useAsyncOperation', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should handle successful operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockData = { id: 1, name: 'test' };

    await act(async () => {
      await result.current.execute(() => Promise.resolve(mockData));
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle failed operation', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockError = new Error('Test error');

    await act(async () => {
      await result.current.execute(() => Promise.reject(mockError));
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.isError).toBe(true);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should reset state correctly', async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const mockData = { id: 1, name: 'test' };

    // First execute an operation
    await act(async () => {
      await result.current.execute(() => Promise.resolve(mockData));
    });

    expect(result.current.data).toEqual(mockData);

    // Then reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });
});