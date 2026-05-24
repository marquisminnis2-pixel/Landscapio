/**
 * CMS Types and Interfaces
 * Aligned with backend API types
 */

// Field types supported by the CMS (matches backend CMSFieldType)
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

// Field settings from backend
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

// Field definition within a collection
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

// Collection definition
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

// Item status
export type CMSItemStatus = 'draft' | 'published' | 'scheduled' | 'archived';

// Single item in a collection
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

// Paginated items response
export interface PaginatedItems {
  items: CMSItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CMS Panel state
export interface CMSPanelState {
  activeTab: 'collections' | 'fields' | 'items';
  selectedCollectionId: string | null;
  selectedItemId: string | null;
  isEditing: boolean;
  searchQuery: string;
  filterStatus: CMSItemStatus | 'all';
}

// Default field templates for quick creation
export const DEFAULT_FIELD_TEMPLATES: Record<string, Partial<CMSField>> = {
  name: {
    name: 'Name',
    slug: 'name',
    type: 'text',
    required: true,
    placeholder: 'Enter name...',
  },
  slug: {
    name: 'Slug',
    slug: 'slug',
    type: 'slug',
    required: true,
    placeholder: 'url-friendly-slug',
  },
  description: {
    name: 'Description',
    slug: 'description',
    type: 'richText',
    required: false,
    placeholder: 'Enter description...',
  },
  image: {
    name: 'Image',
    slug: 'image',
    type: 'imageUrl',
    required: false,
  },
  date: {
    name: 'Date',
    slug: 'date',
    type: 'date',
    required: false,
  },
  featured: {
    name: 'Featured',
    slug: 'featured',
    type: 'boolean',
    required: false,
    defaultValue: false,
  },
};

// Collection templates for quick creation
export const COLLECTION_TEMPLATES: Record<string, { name: string; fields: Partial<CMSField>[] }> = {
  'blog-posts': {
    name: 'Blog Posts',
    fields: [
      { name: 'Title', slug: 'title', type: 'text', required: true },
      { name: 'Slug', slug: 'slug', type: 'slug', required: true },
      { name: 'Featured Image', slug: 'featured-image', type: 'imageUrl', required: false },
      { name: 'Excerpt', slug: 'excerpt', type: 'text', required: false },
      { name: 'Content', slug: 'content', type: 'richText', required: true },
      { name: 'Author', slug: 'author', type: 'text', required: false },
      { name: 'Publish Date', slug: 'publish-date', type: 'date', required: false },
      { name: 'Category', slug: 'category', type: 'select', required: false },
      { name: 'Featured', slug: 'featured', type: 'boolean', required: false, defaultValue: false },
    ],
  },
  'team-members': {
    name: 'Team Members',
    fields: [
      { name: 'Name', slug: 'name', type: 'text', required: true },
      { name: 'Photo', slug: 'photo', type: 'imageUrl', required: false },
      { name: 'Role', slug: 'role', type: 'text', required: false },
      { name: 'Bio', slug: 'bio', type: 'richText', required: false },
      { name: 'Email', slug: 'email', type: 'email', required: false },
      { name: 'LinkedIn', slug: 'linkedin', type: 'url', required: false },
    ],
  },
  'products': {
    name: 'Products',
    fields: [
      { name: 'Name', slug: 'name', type: 'text', required: true },
      { name: 'Slug', slug: 'slug', type: 'slug', required: true },
      { name: 'Image', slug: 'image', type: 'imageUrl', required: false },
      { name: 'Price', slug: 'price', type: 'number', required: true },
      { name: 'Description', slug: 'description', type: 'richText', required: false },
      { name: 'In Stock', slug: 'in-stock', type: 'boolean', required: false, defaultValue: true },
    ],
  },
  'testimonials': {
    name: 'Testimonials',
    fields: [
      { name: 'Quote', slug: 'quote', type: 'richText', required: true },
      { name: 'Author Name', slug: 'author-name', type: 'text', required: true },
      { name: 'Author Title', slug: 'author-title', type: 'text', required: false },
      { name: 'Author Photo', slug: 'author-photo', type: 'imageUrl', required: false },
      { name: 'Company', slug: 'company', type: 'text', required: false },
      { name: 'Rating', slug: 'rating', type: 'number', required: false },
    ],
  },
  'faq': {
    name: 'FAQ',
    fields: [
      { name: 'Question', slug: 'question', type: 'text', required: true },
      { name: 'Answer', slug: 'answer', type: 'richText', required: true },
      { name: 'Category', slug: 'category', type: 'select', required: false },
      { name: 'Order', slug: 'order', type: 'number', required: false },
    ],
  },
};

// Field type metadata for UI
export const FIELD_TYPE_INFO: Record<CMSFieldType, { label: string; icon: string; description: string }> = {
  'text': {
    label: 'Plain Text',
    icon: 'T',
    description: 'Single line of text',
  },
  'richText': {
    label: 'Rich Text',
    icon: 'Aa',
    description: 'Formatted text with headings, lists, links',
  },
  'imageUrl': {
    label: 'Image URL',
    icon: 'img',
    description: 'Link to an image',
  },
  'url': {
    label: 'URL',
    icon: 'url',
    description: 'Web address link',
  },
  'email': {
    label: 'Email',
    icon: '@',
    description: 'Email address',
  },
  'phone': {
    label: 'Phone',
    icon: 'tel',
    description: 'Phone number',
  },
  'number': {
    label: 'Number',
    icon: '#',
    description: 'Numeric value',
  },
  'date': {
    label: 'Date',
    icon: 'cal',
    description: 'Date picker',
  },
  'datetime': {
    label: 'Date & Time',
    icon: 'dt',
    description: 'Date and time picker',
  },
  'boolean': {
    label: 'Switch',
    icon: 'on',
    description: 'True/false toggle',
  },
  'color': {
    label: 'Color',
    icon: 'clr',
    description: 'Color picker',
  },
  'select': {
    label: 'Select',
    icon: 'opt',
    description: 'Dropdown select from choices',
  },
  'multiSelect': {
    label: 'Multi-Select',
    icon: 'opts',
    description: 'Select multiple choices',
  },
  'slug': {
    label: 'Slug',
    icon: 'slg',
    description: 'URL-friendly identifier',
  },
  'reference': {
    label: 'Reference',
    icon: 'ref',
    description: 'Link to another collection item',
  },
  'multiReference': {
    label: 'Multi-Reference',
    icon: 'refs',
    description: 'Link to multiple collection items',
  },
  'file': {
    label: 'File',
    icon: '📎',
    description: 'Upload any file type',
  },
  'gallery': {
    label: 'Gallery',
    icon: '🖼️',
    description: 'Multiple images in a gallery',
  },
};