import { describe, expect, test } from 'bun:test';
import { runBot } from './bot';

describe('complete run', () => {
  test('a deterministic naturalist forages, builds, divides and forms a colony', () => {
    const report = runBot(4, 420);
    expect(report.objectiveTimes.mito).toBeDefined();
    expect(report.objectiveTimes.er).toBeDefined();
    expect(report.objectiveTimes.divide).toBeDefined();
    expect(report.generation).toBeGreaterThanOrEqual(2);
    expect(report.organelles).toContain('lysosome');
  }, 60_000);

  test('the same seed replays identically', () => {
    const a = runBot(9, 60);
    const b = runBot(9, 60);
    expect(a.time).toBe(b.time);
    expect(a.eaten).toBe(b.eaten);
    expect(a.organelles).toEqual(b.organelles);
  }, 60_000);
});
