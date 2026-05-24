import crypto from 'crypto';
import https from 'https';
import { Domain } from '../models/hosting.index';

// Let's Encrypt ACME endpoints
const ACME_DIRECTORY_URL = process.env.ACME_DIRECTORY_URL || 'https://acme-v02.api.letsencrypt.org/directory';
const ACME_STAGING_URL = 'https://acme-staging-v02.api.letsencrypt.org/directory';

// Use staging in development
const isProduction = process.env.NODE_ENV === 'production';

export interface SSLCertificate {
  certificate: string;
  privateKey: string;
  chain: string;
  expiresAt: Date;
  issuedAt: Date;
  domain: string;
}

export interface SSLProvisioningResult {
  success: boolean;
  certificate?: SSLCertificate;
  error?: string;
  challengeType?: 'http-01' | 'dns-01';
  challengeToken?: string;
  challengeResponse?: string;
}

/**
 * SSL Certificate Provisioning Service
 * Handles Let's Encrypt certificate provisioning via ACME protocol
 */
class SSLProvisioningService {
  private accountKey: crypto.KeyObject | null = null;
  private accountUrl: string | null = null;

  /**
   * Initialize the ACME account (creates or retrieves existing)
   */
  async initializeAccount(): Promise<void> {
    // In production, load account key from secure storage
    // For now, generate a new one (in real implementation, persist this)
    const { privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    this.accountKey = privateKey;

    console.log('ACME account initialized');
  }

  /**
   * Request a new SSL certificate for a domain
   */
  async requestCertificate(domainName: string): Promise<SSLProvisioningResult> {
    try {
      // Find the domain record
      const domain = await Domain.findOne({ domain: domainName });
      if (!domain) {
        return { success: false, error: 'Domain not found' };
      }

      if (domain.status !== 'active') {
        return { success: false, error: 'Domain must be verified before SSL provisioning' };
      }

      // Update SSL status to provisioning
      domain.sslStatus = 'provisioning';
      await domain.save();

      // In a real implementation, this would:
      // 1. Create an ACME order for the domain
      // 2. Handle the HTTP-01 or DNS-01 challenge
      // 3. Finalize the order and download the certificate
      // 4. Store the certificate securely

      // For now, simulate the provisioning process
      const result = await this.simulateProvisioning(domain);

      if (result.success && result.certificate) {
        domain.sslStatus = 'active';
        domain.sslExpiresAt = result.certificate.expiresAt;
        domain.sslProvider = 'letsencrypt';
        await domain.save();

        console.log(`SSL certificate provisioned for ${domainName}`);
      } else {
        domain.sslStatus = 'failed';
        await domain.save();
      }

      return result;
    } catch (error: any) {
      console.error('SSL provisioning error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate SSL provisioning (for development)
   * In production, replace with actual ACME implementation
   */
  private async simulateProvisioning(domain: any): Promise<SSLProvisioningResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a self-signed certificate for development
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    // In production, this would be the actual Let's Encrypt certificate
    const certificate: SSLCertificate = {
      certificate: `-----BEGIN CERTIFICATE-----\n[Certificate for ${domain.domain}]\n-----END CERTIFICATE-----`,
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
      chain: `-----BEGIN CERTIFICATE-----\n[Intermediate Certificate]\n-----END CERTIFICATE-----`,
      expiresAt,
      issuedAt: now,
      domain: domain.domain,
    };

    return {
      success: true,
      certificate,
      challengeType: 'http-01',
    };
  }

  /**
   * Renew an expiring certificate
   */
  async renewCertificate(domainName: string): Promise<SSLProvisioningResult> {
    console.log(`Renewing certificate for ${domainName}`);
    return this.requestCertificate(domainName);
  }

  /**
   * Check and renew certificates expiring within threshold
   */
  async checkAndRenewExpiringCertificates(daysThreshold: number = 30): Promise<void> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringDomains = await Domain.find({
      sslStatus: 'active',
      sslExpiresAt: { $lte: thresholdDate },
    });

    console.log(`Found ${expiringDomains.length} domains with expiring certificates`);

    for (const domain of expiringDomains) {
      try {
        await this.renewCertificate(domain.domain);
      } catch (error) {
        console.error(`Failed to renew certificate for ${domain.domain}:`, error);
      }
    }
  }

  /**
   * Revoke a certificate (e.g., when domain is removed)
   */
  async revokeCertificate(domainName: string): Promise<boolean> {
    try {
      const domain = await Domain.findOne({ domain: domainName });
      if (!domain) {
        return false;
      }

      // In production, call ACME revoke endpoint
      domain.sslStatus = 'pending';
      domain.sslExpiresAt = undefined;
      await domain.save();

      console.log(`Certificate revoked for ${domainName}`);
      return true;
    } catch (error) {
      console.error('Certificate revocation error:', error);
      return false;
    }
  }

  /**
   * Get HTTP-01 challenge response for a domain
   * Used by the challenge endpoint to respond to Let's Encrypt
   */
  async getHttpChallengeResponse(token: string): Promise<string | null> {
    // In production, store and retrieve challenge responses
    // This would be called by /.well-known/acme-challenge/:token endpoint
    return null;
  }

  /**
   * Generate DNS-01 challenge TXT record value
   */
  generateDnsChallengeValue(token: string, accountKey: crypto.KeyObject): string {
    // Create key authorization
    const thumbprint = this.getJwkThumbprint(accountKey);
    const keyAuthorization = `${token}.${thumbprint}`;

    // DNS-01 requires base64url(SHA-256(keyAuthorization))
    const hash = crypto.createHash('sha256').update(keyAuthorization).digest();
    return this.base64url(hash);
  }

  /**
   * Get JWK thumbprint for account key
   */
  private getJwkThumbprint(key: crypto.KeyObject): string {
    const jwk = key.export({ format: 'jwk' });
    const orderedJwk = { crv: (jwk as any).crv, kty: jwk.kty, x: (jwk as any).x, y: (jwk as any).y };
    const json = JSON.stringify(orderedJwk);
    const hash = crypto.createHash('sha256').update(json).digest();
    return this.base64url(hash);
  }

  /**
   * Base64url encode
   */
  private base64url(buffer: Buffer): string {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// Singleton instance
let sslService: SSLProvisioningService | null = null;

export function getSSLService(): SSLProvisioningService {
  if (!sslService) {
    sslService = new SSLProvisioningService();
  }
  return sslService;
}

/**
 * Background job to check and renew expiring certificates
 * Should be called by a cron job or scheduler
 */
export async function runCertificateRenewalJob(): Promise<void> {
  console.log('Running certificate renewal job...');
  const service = getSSLService();
  await service.checkAndRenewExpiringCertificates(30);
  console.log('Certificate renewal job complete');
}

/**
 * Provision SSL for a newly verified domain
 */
export async function provisionSSLForDomain(domainName: string): Promise<SSLProvisioningResult> {
  const service = getSSLService();
  return service.requestCertificate(domainName);
}