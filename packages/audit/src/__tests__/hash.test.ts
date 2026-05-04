/**
 * Hash-Determinismus-Test.
 *
 * Der gesalzene SHA256 muss für gleiche Inputs gleiche Outputs liefern und
 * für unterschiedliche Inputs unterschiedliche. Salt rotiert jährlich; bis
 * zur Rotation müssen Audit-Korrelationen über mehrere Requests funktionieren.
 */
import { describe, expect, it } from 'vitest';
import { hashForAudit } from '../index';

describe('hashForAudit', () => {
  it('produces a 64-char hex string', () => {
    const hash = hashForAudit('1.2.3.4');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashForAudit('alice@example.com')).toBe(hashForAudit('alice@example.com'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashForAudit('1.2.3.4')).not.toBe(hashForAudit('1.2.3.5'));
  });

  it('does not contain the raw input in the output (sanity)', () => {
    const ip = '192.168.1.42';
    const hash = hashForAudit(ip);
    expect(hash).not.toContain(ip);
  });
});
