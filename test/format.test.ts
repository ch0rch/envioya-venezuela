import { describe, it, expect } from 'vitest';
import { formatVes } from '../src/lib/format';

describe('formatVes', () => {
  it('groups thousands and appends Bs', () => {
    expect(formatVes(74800)).toBe('74.800 Bs');
  });
  it('rounds to whole bolívares', () => {
    expect(formatVes(74800.6)).toBe('74.801 Bs');
  });
});
