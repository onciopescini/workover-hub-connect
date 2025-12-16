import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { PhotoUploader } from './PhotoUploader';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/sre-logger', () => ({
  sreLogger: {
    error: jest.fn(),
  },
}));

// Mock URL APIs
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('PhotoUploader', () => {
  const defaultProps = {
    photoFiles: [],
    photoPreviewUrls: [],
    setPhotoFiles: jest.fn(),
    setPhotoPreviewUrls: jest.fn(),
    uploadingPhotos: false,
    setUploadingPhotos: jest.fn(),
    processingJobs: [],
    setProcessingJobs: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles file drop gracefully even if files property is missing in event', () => {
    render(<PhotoUploader {...defaultProps} />);

    const dropZone = screen.getByText(/Carica le tue foto/i).closest('div');

    // Simulate drop without files
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: null,
      },
    });

    expect(defaultProps.setPhotoFiles).not.toHaveBeenCalled();
  });

  it('handles uploading valid files', () => {
    render(<PhotoUploader {...defaultProps} />);

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const dropZone = screen.getByText(/Carica le tue foto/i).closest('div');

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(defaultProps.setPhotoFiles).toHaveBeenCalledWith(expect.arrayContaining([file]));
    expect(toast.success).toHaveBeenCalled();
  });

  it('handles undefined photoFiles prop gracefully', () => {
    const propsWithUndefined = {
      ...defaultProps,
      photoFiles: undefined as any,
      photoPreviewUrls: undefined as any,
    };

    render(<PhotoUploader {...propsWithUndefined} />);

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const dropZone = screen.getByText(/Carica le tue foto/i).closest('div');

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(propsWithUndefined.setPhotoFiles).toHaveBeenCalledWith([file]);
  });
});
