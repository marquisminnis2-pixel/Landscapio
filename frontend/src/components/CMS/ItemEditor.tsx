import { useState, useEffect, useCallback, useRef } from 'react';
import { useCMSStore } from '@/store/useCMSStore';
import { FIELD_TYPE_INFO } from '@/types/cms.types';
import type { CMSField, CMSItemStatus, CMSCollection } from '@/api/cms';
import { uploadAsset } from '@/api/assets';

/**
 * Landscapio CMS Item Editor
 * A full-width two-column layout for editing CMS items
 * Design: Left main content area with field cards, Right sidebar with metadata
 */

const ItemEditor = () => {
  const {
    collections,
    selectedCollectionId,
    selectedItemId,
    selectItem,
    getItem,
    updateItem,
    publishItem,
    unpublishItem,
    deleteItem,
    showToast,
  } = useCMSStore();

  const collection = collections.find((c) => c._id === selectedCollectionId);
  const item = selectedItemId ? getItem(selectedItemId) : null;

  const [fieldData, setFieldData] = useState<Record<string, any>>({});
  const [itemSlug, setItemSlug] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Initialize field data from item
  useEffect(() => {
    if (item) {
      setFieldData(item.fieldData || {});
      setItemSlug(item.slug || '');
      setIsDirty(false);
    }
  }, [item]);

  if (!collection || !item) return null;

  const handleFieldChange = (fieldSlug: string, value: any) => {
    setFieldData((prev) => ({ ...prev, [fieldSlug]: value }));
    setIsDirty(true);

    // Auto-generate slug from primary field if slug is empty
    const primaryField = collection.primaryField || 'name';
    if (fieldSlug === primaryField && !itemSlug) {
      const autoSlug = generateSlug(value);
      setItemSlug(autoSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    setItemSlug(generateSlug(value));
    setIsDirty(true);
  };

  const generateSlug = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  };

  const handleSave = () => {
    updateItem(item._id, { fieldData, slug: itemSlug });
    setIsDirty(false);
    showToast('Item saved', 'success');
  };

  const handlePublish = () => {
    handleSave();
    publishItem(item._id);
  };

  const handleUnpublish = () => {
    unpublishItem(item._id);
  };

  const handleDelete = () => {
    deleteItem(item._id);
    selectItem(null);
    setShowDeleteModal(false);
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to go back?')) {
        selectItem(null);
      }
    } else {
      selectItem(null);
    }
  };

  const primaryField = collection.primaryField || 'name';
  const itemName = fieldData[primaryField] || 'Untitled';

  // Group fields by category
  const fields = collection.fields || [];
  const basicFields = fields.filter(f => ['text', 'slug', 'email', 'phone', 'url'].includes(f.type));
  const contentFields = fields.filter(f => ['richText'].includes(f.type));
  const mediaFields = fields.filter(f => ['imageUrl', 'file', 'gallery'].includes(f.type));
  const dataFields = fields.filter(f => ['number', 'date', 'datetime', 'boolean', 'color', 'select', 'multiSelect'].includes(f.type));
  const referenceFields = fields.filter(f => ['reference', 'multiReference'].includes(f.type));

  return (
    <div className="flex flex-col h-full bg-canvas-bg">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-panel-bg border-b border-border-color">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-canvas-bg transition-colors"
            title="Back to items"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text-primary">{itemName}</h2>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {collection.name} &middot; Last edited {new Date(item.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-yellow-500 font-medium px-2 py-1 bg-yellow-500/10 rounded">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Draft
          </button>
          {item.status === 'draft' ? (
            <button
              onClick={handlePublish}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Publish
            </button>
          ) : item.status === 'published' ? (
            <button
              onClick={handleUnpublish}
              className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-colors"
            >
              Unpublish
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Content Area - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Field Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Basic Information Card */}
            {basicFields.length > 0 && (
              <FieldCard title="Basic Information" icon="info">
                <div className="space-y-4">
                  {basicFields.sort((a, b) => a.order - b.order).map((field) => (
                    <FieldInput
                      key={field._id}
                      field={field}
                      value={fieldData[field.slug]}
                      onChange={(value) => handleFieldChange(field.slug, value)}
                      collection={collection}
                      projectId={item.projectId}
                    />
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Content Card */}
            {contentFields.length > 0 && (
              <FieldCard title="Content" icon="content">
                <div className="space-y-4">
                  {contentFields.sort((a, b) => a.order - b.order).map((field) => (
                    <FieldInput
                      key={field._id}
                      field={field}
                      value={fieldData[field.slug]}
                      onChange={(value) => handleFieldChange(field.slug, value)}
                      collection={collection}
                      projectId={item.projectId}
                    />
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Media Card */}
            {mediaFields.length > 0 && (
              <FieldCard title="Media & Assets" icon="media">
                <div className="space-y-4">
                  {mediaFields.sort((a, b) => a.order - b.order).map((field) => (
                    <FieldInput
                      key={field._id}
                      field={field}
                      value={fieldData[field.slug]}
                      onChange={(value) => handleFieldChange(field.slug, value)}
                      collection={collection}
                      projectId={item.projectId}
                    />
                  ))}
                </div>
              </FieldCard>
            )}

            {/* Data Fields Card */}
            {dataFields.length > 0 && (
              <FieldCard title="Properties" icon="data">
                <div className="grid grid-cols-2 gap-4">
                  {dataFields.sort((a, b) => a.order - b.order).map((field) => (
                    <FieldInput
                      key={field._id}
                      field={field}
                      value={fieldData[field.slug]}
                      onChange={(value) => handleFieldChange(field.slug, value)}
                      collection={collection}
                      projectId={item.projectId}
                    />
                  ))}
                </div>
              </FieldCard>
            )}

            {/* References Card */}
            {referenceFields.length > 0 && (
              <FieldCard title="References" icon="link">
                <div className="space-y-4">
                  {referenceFields.sort((a, b) => a.order - b.order).map((field) => (
                    <FieldInput
                      key={field._id}
                      field={field}
                      value={fieldData[field.slug]}
                      onChange={(value) => handleFieldChange(field.slug, value)}
                      collection={collection}
                      projectId={item.projectId}
                    />
                  ))}
                </div>
              </FieldCard>
            )}
          </div>
        </div>

        {/* Right Sidebar - Metadata */}
        <div className="w-80 border-l border-border-color bg-panel-bg overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* URL & Slug Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">URL Slug</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary">/</span>
                  <input
                    type="text"
                    value={itemSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="url-slug"
                    className="flex-1 px-2 py-1.5 bg-canvas-bg border border-border-color rounded text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div className="p-2 bg-canvas-bg rounded border border-border-color">
                  <p className="text-xs text-text-secondary break-all">
                    yoursite.com/{collection.slug}/{itemSlug || 'url-slug'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Publishing</h3>
              <div className="p-3 bg-canvas-bg rounded-lg border border-border-color space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Status</span>
                  <StatusBadge status={item.status} />
                </div>
                {item.publishedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Published</span>
                    <span className="text-sm text-text-primary">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {item.scheduledFor && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Scheduled</span>
                    <span className="text-sm text-text-primary">
                      {new Date(item.scheduledFor).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Created</span>
                  <span className="text-text-primary">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Updated</span>
                  <span className="text-text-primary">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Item ID</span>
                  <span className="text-text-primary font-mono text-xs">
                    {item._id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border-color">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full px-3 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          itemName={itemName}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: CMSItemStatus }) => {
  const config = {
    published: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20', dot: 'bg-green-500' },
    draft: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
    scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', dot: 'bg-blue-500' },
    archived: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20', dot: 'bg-gray-500' },
  };
  const c = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Field Card Component
const FieldCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => {
  const icons: Record<string, React.ReactNode> = {
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    content: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    media: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    data: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    link: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  };

  return (
    <div className="bg-panel-bg rounded-xl border border-border-color overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-color bg-canvas-bg/30">
        <span className="text-text-secondary">{icons[icon]}</span>
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// Delete Modal Component
const DeleteModal = ({ itemName, onCancel, onConfirm }: { itemName: string; onCancel: () => void; onConfirm: () => void }) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-panel-bg border border-border-color rounded-xl shadow-2xl z-50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Delete Item</h3>
          <p className="text-sm text-text-secondary">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Are you sure you want to delete "<span className="text-text-primary font-medium">{itemName}</span>"? All data will be permanently lost.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          Delete Item
        </button>
      </div>
    </div>
  </>
);

// Field Input Component with enhanced features
interface FieldInputProps {
  field: CMSField;
  value: any;
  onChange: (value: any) => void;
  collection: CMSCollection;
  projectId?: string;
}

const FieldInput = ({ field, value, onChange, collection, projectId }: FieldInputProps) => {
  const typeInfo = FIELD_TYPE_INFO[field.type];
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!projectId) {
      console.error('No projectId for upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const asset = await uploadAsset(projectId, file, (progress) => {
        setUploadProgress(progress);
      });

      // For gallery type, append to array; otherwise set directly
      if (field.type === 'gallery') {
        const currentImages = Array.isArray(value) ? value : [];
        onChange([...currentImages, asset.url]);
      } else {
        onChange(asset.url);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [projectId, field.type, value, onChange]);

  // Drag and drop handlers for file uploads
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // For gallery, upload all files; for others, just the first
      if (field.type === 'gallery') {
        Array.from(files).forEach(file => handleFileUpload(file));
      } else {
        handleFileUpload(files[0]);
      }
    }
  }, [field.type, handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (field.type === 'gallery') {
        Array.from(files).forEach(file => handleFileUpload(file));
      } else {
        handleFileUpload(files[0]);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [field.type, handleFileUpload]);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all"
          />
        );

      case 'slug':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder={field.placeholder || 'url-friendly-slug'}
              className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue font-mono text-sm"
            />
            <div className="text-xs text-text-secondary">
              Preview: yoursite.com/{collection.slug}/{value || 'slug'}
            </div>
          </div>
        );

      case 'richText':
        return (
          <div className="space-y-2">
            {/* Simple toolbar */}
            <div className="flex items-center gap-1 p-1 bg-canvas-bg border border-border-color rounded-lg">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-border-color transition-colors text-text-secondary"
                title="Bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-border-color transition-colors text-text-secondary"
                title="Italic"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M19 4h-9M14 20H5M15 4L9 20" />
                </svg>
              </button>
              <div className="w-px h-4 bg-border-color mx-1" />
              <button
                type="button"
                className="p-1.5 rounded hover:bg-border-color transition-colors text-text-secondary"
                title="Heading"
              >
                <span className="text-xs font-bold">H</span>
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-border-color transition-colors text-text-secondary"
                title="List"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-border-color transition-colors text-text-secondary"
                title="Link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </button>
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder || 'Write your content here...'}
              rows={8}
              className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue resize-y min-h-[150px]"
            />
          </div>
        );

      case 'imageUrl':
        return (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />
            {isUploading ? (
              <div className="border-2 border-dashed border-accent-blue rounded-lg p-8 text-center bg-accent-blue/5">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-blue animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <p className="text-sm text-accent-blue font-medium">Uploading... {uploadProgress}%</p>
                  <div className="w-48 h-1.5 bg-canvas-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : value ? (
              <div className="relative group rounded-lg overflow-hidden border border-border-color">
                <img src={value} alt="" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => window.open(value, '_blank')}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="View full size"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Replace image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onChange('')}
                    className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                    title="Remove image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border-color hover:border-accent-blue/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-canvas-bg flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-text-secondary">PNG, JPG, GIF, SVG, WebP</p>
                </div>
              </div>
            )}
            <input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste image URL..."
              className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue text-sm"
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            min={field.settings?.min}
            max={field.settings?.max}
            step={field.settings?.step}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '+1 (555) 000-0000'}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'https://'}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange(!value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-accent-blue' : 'bg-border-color'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-text-secondary">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 h-12 rounded-lg border border-border-color cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="flex-1 px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue font-mono uppercase"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="">Select an option...</option>
            {field.settings?.options?.map((choice: string) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        );

      case 'multiSelect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((v: string) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-sm"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => onChange(selectedValues.filter((x: string) => x !== v))}
                    className="hover:text-red-500"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedValues.includes(e.target.value)) {
                  onChange([...selectedValues, e.target.value]);
                }
              }}
              className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
            >
              <option value="">Add an option...</option>
              {field.settings?.options
                ?.filter((opt: string) => !selectedValues.includes(opt))
                .map((choice: string) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
            </select>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept={field.settings?.allowedExtensions?.map(ext => `.${ext}`).join(',') || '*'}
              className="hidden"
            />
            {isUploading ? (
              <div className="border-2 border-dashed border-accent-blue rounded-lg p-6 text-center bg-accent-blue/5">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-blue animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <p className="text-sm text-accent-blue font-medium">Uploading... {uploadProgress}%</p>
                  <div className="w-48 h-1.5 bg-canvas-bg rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              </div>
            ) : value ? (
              <div className="p-3 bg-canvas-bg border border-border-color rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{value.split('/').pop() || 'File'}</p>
                    <p className="text-xs text-text-secondary truncate">{value}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => window.open(value, '_blank')}
                      className="p-1.5 rounded hover:bg-border-color transition-colors"
                      title="View file"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded hover:bg-border-color transition-colors"
                      title="Replace file"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onChange('')}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border-color hover:border-accent-blue/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-canvas-bg flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-text-secondary">
                    {field.settings?.allowedExtensions?.length
                      ? `Allowed: ${field.settings.allowedExtensions.join(', ')}`
                      : 'Any file type'}
                    {field.settings?.maxSizeKB && ` (Max ${Math.round(field.settings.maxSizeKB / 1024)}MB)`}
                  </p>
                </div>
              </div>
            )}
            <input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste file URL..."
              className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue text-sm"
            />
          </div>
        );

      case 'gallery':
        const galleryImages = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((imgUrl: string, idx: number) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border-color">
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => window.open(imgUrl, '_blank')}
                        className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onChange(galleryImages.filter((_: string, i: number) => i !== idx))}
                        className="p-1.5 rounded bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isUploading ? (
              <div className="border-2 border-dashed border-accent-blue rounded-lg p-4 text-center bg-accent-blue/5">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-5 h-5 text-accent-blue animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-xs text-accent-blue font-medium">Uploading... {uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border-color hover:border-accent-blue/50'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-xs text-text-secondary">
                    Click to upload or drag images
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Or paste image URL..."
                className="flex-1 px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      onChange([...galleryImages, input.value.trim()]);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                  if (input?.value.trim()) {
                    onChange([...galleryImages, input.value.trim()]);
                    input.value = '';
                  }
                }}
                className="px-3 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-text-secondary">
              {galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''} in gallery
            </p>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2.5 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-canvas-bg flex items-center justify-center text-xs font-mono text-text-secondary">
            {typeInfo?.icon || '?'}
          </span>
          {field.name}
          {field.required && <span className="text-red-400">*</span>}
        </label>
      </div>
      {renderInput()}
      {field.helpText && (
        <p className="text-xs text-text-secondary">{field.helpText}</p>
      )}
    </div>
  );
};

export default ItemEditor;