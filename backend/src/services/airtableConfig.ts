import Client from '../models/Client';

export interface ClientAirtableConfig {
  apiKey: string;
  baseId: string;
  blogTrackerTable: string;
  socialPostsTable: string;
}

export async function getClientAirtableConfig(clientId: string): Promise<ClientAirtableConfig> {
  if (!clientId) {
    throw new Error('clientId is required to resolve Airtable config');
  }
  const client = await Client.findById(clientId).lean();
  if (!client) {
    throw new Error(`Client ${clientId} not found`);
  }
  return {
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: client.airtableBaseId || '',
    blogTrackerTable: client.airtableBlogTrackerTable || 'Blog Tracker',
    socialPostsTable: client.airtableSocialPostsTable || 'Social Posts Tracker',
  };
}

export function isAirtableConfigured(cfg: ClientAirtableConfig): boolean {
  return Boolean(cfg.apiKey && cfg.apiKey !== 'your_airtable_api_key_here' && cfg.baseId);
}
