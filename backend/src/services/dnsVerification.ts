import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

export interface DNSVerificationResult {
  verified: boolean;
  method: 'cname' | 'txt' | 'a';
  expectedValue: string;
  actualValue?: string;
  error?: string;
}

/**
 * Verify a domain's CNAME record points to the expected target
 */
export async function verifyCNAME(
  domain: string,
  expectedCname: string
): Promise<DNSVerificationResult> {
  try {
    const records = await resolveCname(domain);

    // CNAME records should resolve to our expected target
    const normalized = records.map(r => r.toLowerCase().replace(/\.$/, ''));
    const expectedNormalized = expectedCname.toLowerCase().replace(/\.$/, '');

    const verified = normalized.some(r => r === expectedNormalized || r.endsWith('.' + expectedNormalized));

    return {
      verified,
      method: 'cname',
      expectedValue: expectedCname,
      actualValue: records.join(', '),
      error: verified ? undefined : `CNAME points to ${records.join(', ')}, expected ${expectedCname}`,
    };
  } catch (error: any) {
    // ENODATA means no CNAME record exists
    // ENOTFOUND means domain doesn't exist
    return {
      verified: false,
      method: 'cname',
      expectedValue: expectedCname,
      error: error.code === 'ENODATA'
        ? 'No CNAME record found'
        : error.code === 'ENOTFOUND'
        ? 'Domain not found'
        : `DNS lookup failed: ${error.message}`,
    };
  }
}

/**
 * Verify a TXT record contains the expected verification token
 */
export async function verifyTXT(
  domain: string,
  verificationToken: string
): Promise<DNSVerificationResult> {
  try {
    // TXT verification records are typically at _genesis-verify.domain.com
    const verificationDomain = `_genesis-verify.${domain}`;
    const records = await resolveTxt(verificationDomain);

    // TXT records come as arrays of strings (for long records split into chunks)
    const flatRecords = records.map(r => r.join(''));
    const verified = flatRecords.some(r => r === verificationToken);

    return {
      verified,
      method: 'txt',
      expectedValue: verificationToken,
      actualValue: flatRecords.join(', '),
      error: verified ? undefined : `TXT record not found. Add: ${verificationToken}`,
    };
  } catch (error: any) {
    return {
      verified: false,
      method: 'txt',
      expectedValue: verificationToken,
      error: error.code === 'ENODATA'
        ? `No TXT record found at _genesis-verify.${domain}`
        : error.code === 'ENOTFOUND'
        ? 'Domain not found'
        : `DNS lookup failed: ${error.message}`,
    };
  }
}

/**
 * Verify an A record points to our IP addresses (for apex domains)
 */
export async function verifyARecord(
  domain: string,
  expectedIPs: string[]
): Promise<DNSVerificationResult> {
  try {
    const records = await resolve4(domain);

    // Check if any of the A records match our expected IPs
    const verified = records.some(ip => expectedIPs.includes(ip));

    return {
      verified,
      method: 'a',
      expectedValue: expectedIPs.join(' or '),
      actualValue: records.join(', '),
      error: verified ? undefined : `A record points to ${records.join(', ')}, expected one of: ${expectedIPs.join(', ')}`,
    };
  } catch (error: any) {
    return {
      verified: false,
      method: 'a',
      expectedValue: expectedIPs.join(' or '),
      error: error.code === 'ENODATA'
        ? 'No A record found'
        : error.code === 'ENOTFOUND'
        ? 'Domain not found'
        : `DNS lookup failed: ${error.message}`,
    };
  }
}

/**
 * Verify domain ownership based on verification method
 */
export async function verifyDomain(
  domain: string,
  verificationMethod: 'dns_cname' | 'dns_txt' | 'file',
  expectedCname?: string,
  verificationToken?: string,
  isApex?: boolean
): Promise<DNSVerificationResult> {
  // For apex domains, we need to check A records since CNAME isn't allowed at apex
  if (isApex && verificationMethod === 'dns_cname') {
    // Genesis hosting IPs (these would be your actual server IPs in production)
    const genesisIPs = process.env.GENESIS_HOSTING_IPS?.split(',') || ['127.0.0.1'];
    return verifyARecord(domain, genesisIPs);
  }

  switch (verificationMethod) {
    case 'dns_cname':
      if (!expectedCname) {
        return {
          verified: false,
          method: 'cname',
          expectedValue: '',
          error: 'No expected CNAME configured',
        };
      }
      return verifyCNAME(domain, expectedCname);

    case 'dns_txt':
      if (!verificationToken) {
        return {
          verified: false,
          method: 'txt',
          expectedValue: '',
          error: 'No verification token configured',
        };
      }
      return verifyTXT(domain, verificationToken);

    case 'file':
      // File verification would require an HTTP request to check
      // /.well-known/genesis-verify.txt on the domain
      // For now, return not implemented
      return {
        verified: false,
        method: 'txt',
        expectedValue: verificationToken || '',
        error: 'File verification not yet implemented',
      };

    default:
      return {
        verified: false,
        method: 'cname',
        expectedValue: '',
        error: `Unknown verification method: ${verificationMethod}`,
      };
  }
}

/**
 * Check if a domain is resolvable (exists in DNS)
 */
export async function isDomainResolvable(domain: string): Promise<boolean> {
  try {
    // Try to resolve any record type
    await Promise.any([
      resolve4(domain),
      resolveCname(domain),
    ]);
    return true;
  } catch {
    return false;
  }
}