/**
 * Assets API client for file uploads and management.
 */
import { API_BASE } from '@/lib/api';

export interface Asset {
  _id: string;
  orgId: string;
  projectId: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'font' | 'file';
  size: number;
  uploadedAt: string;
}

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

const getOrgId = () => localStorage.getItem('orgId');

/**
 * Upload a file asset.
 */
export async function uploadAsset(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Asset> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectId', projectId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_BASE}/api/${orgId}/assets/upload`);
    xhr.setRequestHeader('Authorization', getAuthHeaders().Authorization);
    xhr.send(formData);
  });
}

/**
 * Get assets for a project.
 */
export async function getAssets(projectId: string): Promise<Asset[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/${orgId}/assets/${projectId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get assets');
  }

  return response.json();
}

/**
 * Delete an asset.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/${orgId}/assets/${assetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete asset');
  }
}