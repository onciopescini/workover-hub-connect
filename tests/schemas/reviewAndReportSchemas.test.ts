import { ReviewFormSchema } from '@/schemas/reviewSchema';
import { ReportFormSchema } from '@/schemas/reportSchema';
import {
  createMockReviewForm,
  createMockReportForm,
  createTooLongString,
} from '../factories/mockData';

describe('Review and Report Schemas', () => {
  describe('ReviewFormSchema', () => {
    it('should validate review with content', () => {
      const validData = createMockReviewForm();
      const result = ReviewFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate review without content', () => {
      const data = createMockReviewForm({ content: null });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all rating values', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const data = createMockReviewForm({ rating });
        const result = ReviewFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject rating less than 1', () => {
      const data = createMockReviewForm({ rating: 0 });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject rating greater than 5', () => {
      const data = createMockReviewForm({ rating: 6 });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 500 characters', () => {
      const data = createMockReviewForm({
        content: createTooLongString(500),
      });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should trim content whitespace', () => {
      const data = createMockReviewForm({
        content: '  Ottima esperienza  ',
      });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Ottima esperienza');
      }
    });

    it('should transform empty content to null', () => {
      const data = createMockReviewForm({ content: '   ' });
      const result = ReviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBeNull();
      }
    });
  });

  describe('ReportFormSchema', () => {
    it('should validate report with description', () => {
      const validData = createMockReportForm();
      const result = ReportFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate report without description', () => {
      const data = createMockReportForm({ description: undefined });
      const result = ReportFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty reason', () => {
      const data = createMockReportForm({ reason: '' });
      const result = ReportFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 500 characters', () => {
      const data = createMockReportForm({
        description: createTooLongString(500),
      });
      const result = ReportFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should trim description whitespace', () => {
      const data = createMockReportForm({
        description: '  Descrizione con spazi  ',
      });
      const result = ReportFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Descrizione con spazi');
      }
    });

    it('should transform empty description to undefined', () => {
      const data = createMockReportForm({ description: '   ' });
      const result = ReportFormSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });
  });
});
