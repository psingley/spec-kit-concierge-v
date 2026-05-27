import { describe, expect, it, vi } from 'vitest';
import { parseConciergeStepTrailer } from './trailers';

describe('parseConciergeStepTrailer', () => {
  it('matches keys case-insensitively', () => {
    expect(parseConciergeStepTrailer('CONCIERGE-STEP: specify:pass')).toMatchObject({
      found: true,
      step: 'specify',
      status: 'pass'
    });
  });

  it('keeps exact values as exact interpretation', () => {
    expect(parseConciergeStepTrailer('Concierge-Step: specify:pass')).toMatchObject({
      found: true,
      step: 'specify',
      status: 'pass',
      interpretation: 'exact'
    });
  });

  it('normalizes casing and whitespace in values', () => {
    expect(parseConciergeStepTrailer('Concierge-Step:  Specify : PASS  ')).toMatchObject({
      found: true,
      step: 'specify',
      status: 'pass',
      interpretation: 'normalized'
    });
  });

  it('accepts partial values with warnings', () => {
    expect(parseConciergeStepTrailer('Concierge-Step: specify')).toMatchObject({
      found: true,
      step: 'specify',
      status: 'unknown',
      interpretation: 'partial',
      warnings: ['partial Concierge-Step trailer recovered with missing status']
    });
    expect(parseConciergeStepTrailer('Concierge-Step: : pass')).toMatchObject({
      found: true,
      step: 'unknown',
      status: 'pass',
      interpretation: 'partial'
    });
  });

  it('uses last-trailer-wins for duplicates', () => {
    expect(
      parseConciergeStepTrailer('Concierge-Step: specify:fail\nConcierge-Step: plan:pass')
    ).toMatchObject({
      found: true,
      step: 'plan',
      status: 'pass'
    });
  });

  it('warns for superseded duplicates', () => {
    const logger = { warn: vi.fn() };

    expect(
      parseConciergeStepTrailer('Concierge-Step: specify:fail\nConcierge-Step: plan:pass', {
        commitSha: 'abc123',
        logger
      }).warnings
    ).toEqual(['superseded duplicate Concierge-Step trailer in abc123']);
    expect(logger.warn).toHaveBeenCalledWith(
      {
        commitSha: 'abc123',
        warning: 'superseded duplicate Concierge-Step trailer in abc123'
      },
      'concierge step trailer recovery warning'
    );
  });

  it('silently skips commits without trailers', () => {
    expect(parseConciergeStepTrailer('ordinary commit body')).toEqual({
      found: false,
      warnings: []
    });
  });

  it('never throws for hostile input', () => {
    expect(() => parseConciergeStepTrailer({ hostile: true })).not.toThrow();
    expect(parseConciergeStepTrailer({ hostile: true })).toEqual({ found: false, warnings: [] });
  });
});
