/**
 * CMS API client for content management.
 */
import { API_BASE } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type CMSFieldType =
  | 'text'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'imageUrl'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'select'
  | 'multiSelect'
  | 'slug'
  | 'reference'
  | 'multiReference'
  | 'file'
  | 'gallery';

export type CMSItemStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface CMSFieldSettings {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  referenceTo?: string;
  sourceField?: string;
  allowedFormats?: string[];
  maxSizeKB?: number;
  allowedExtensions?: string[];
}

export interface CMSField {
  _id: string;
  collectionId: string;
  name: string;
  slug: string;
  type: CMSFieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: any;
  settings: CMSFieldSettings;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CMSCollection {
  _id: string;
  orgId: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  primaryField: string;
  enableDrafts: boolean;
  enableScheduling: boolean;
  defaultSortField: string;
  defaultSortDirection: 'asc' | 'desc';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Populated fields
  fields?: CMSField[];
  fieldCount?: number;
  itemCount?: number;
}

export interface CMSItem {
  _id: string;
  collectionId: string;
  orgId: string;
  projectId: string;
  slug: string;
  status: CMSItemStatus;
  fieldData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledFor?: string;
  createdBy: string;
  updatedBy: string;
  // Populated fields
  collection?: CMSCollection;
  fields?: CMSField[];
}

export interface PaginatedItems {
  items: CMSItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// HELPERS
// ============================================

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

const getOrgId = () => localStorage.getItem('orgId');

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

// ============================================
// COLLECTION API
// ============================================

/**
 * Get all collections for a project.
 */
export async function getCollections(projectId: string): Promise<CMSCollection[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections`,
    { headers: getAuthHeaders() }
  );

  return handleResponse<CMSCollection[]>(response);
}

/**
 * Get a single collection with its fields.
 */
export async function getCollection(projectId: string, collectionId: string): Promise<CMSCollection> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}`,
    { headers: getAuthHeaders() }
  );

  return handleResponse<CMSCollection>(response);
}

/**
 * Create a new collection.
 */
export async function createCollection(
  projectId: string,
  data: {
    name: string;
    description?: string;
    fields?: Partial<CMSField>[];
  }
): Promise<CMSCollection> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSCollection>(response);
}

/**
 * Update a collection.
 */
export async function updateCollection(
  projectId: string,
  collectionId: string,
  data: Partial<CMSCollection>
): Promise<CMSCollection> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSCollection>(response);
}

/**
 * Delete a collection.
 */
export async function deleteCollection(projectId: string, collectionId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  await handleResponse<{ message: string }>(response);
}

// ============================================
// FIELD API
// ============================================

/**
 * Get all fields for a collection.
 */
export async function getFields(projectId: string, collectionId: string): Promise<CMSField[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}/fields`,
    { headers: getAuthHeaders() }
  );

  return handleResponse<CMSField[]>(response);
}

/**
 * Create a new field.
 */
export async function createField(
  projectId: string,
  collectionId: string,
  data: {
    name: string;
    type: CMSFieldType;
    required?: boolean;
    helpText?: string;
    placeholder?: string;
    defaultValue?: any;
    settings?: CMSFieldSettings;
  }
): Promise<CMSField> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}/fields`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSField>(response);
}

/**
 * Update a field.
 */
export async function updateField(
  projectId: string,
  fieldId: string,
  data: Partial<CMSField>
): Promise<CMSField> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/fields/${fieldId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSField>(response);
}

/**
 * Delete a field.
 */
export async function deleteField(projectId: string, fieldId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/fields/${fieldId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  await handleResponse<{ message: string }>(response);
}

/**
 * Reorder fields.
 */
export async function reorderFields(
  projectId: string,
  collectionId: string,
  fieldIds: string[]
): Promise<CMSField[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}/fields/reorder`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fieldIds }),
    }
  );

  return handleResponse<CMSField[]>(response);
}

// ============================================
// ITEM API
// ============================================

/**
 * Get items for a collection with pagination and filtering.
 */
export async function getItems(
  projectId: string,
  collectionId: string,
  options?: {
    status?: CMSItemStatus | 'all';
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
): Promise<PaginatedItems> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const params = new URLSearchParams();
  if (options?.status && options.status !== 'all') params.set('status', options.status);
  if (options?.search) params.set('search', options.search);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);

  const queryString = params.toString();
  const url = `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}/items${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers: getAuthHeaders() });

  return handleResponse<PaginatedItems>(response);
}

/**
 * Get a single item.
 */
export async function getItem(projectId: string, itemId: string): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}`,
    { headers: getAuthHeaders() }
  );

  return handleResponse<CMSItem>(response);
}

/**
 * Create a new item.
 */
export async function createItem(
  projectId: string,
  collectionId: string,
  data: {
    fieldData?: Record<string, any>;
    status?: CMSItemStatus;
  }
): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/collections/${collectionId}/items`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSItem>(response);
}

/**
 * Update an item.
 */
export async function updateItem(
  projectId: string,
  itemId: string,
  data: {
    fieldData?: Record<string, any>;
    status?: CMSItemStatus;
  }
): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  return handleResponse<CMSItem>(response);
}

/**
 * Delete an item.
 */
export async function deleteItem(projectId: string, itemId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  await handleResponse<{ message: string }>(response);
}

/**
 * Publish an item.
 */
export async function publishItem(projectId: string, itemId: string): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}/publish`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  return handleResponse<CMSItem>(response);
}

/**
 * Unpublish an item.
 */
export async function unpublishItem(projectId: string, itemId: string): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}/unpublish`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  return handleResponse<CMSItem>(response);
}

/**
 * Archive an item.
 */
export async function archiveItem(projectId: string, itemId: string): Promise<CMSItem> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `${API_BASE}/api/orgs/${orgId}/projects/${projectId}/cms/items/${itemId}/archive`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  return handleResponse<CMSItem>(response);
}