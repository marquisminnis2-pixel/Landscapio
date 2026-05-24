import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as cmsApi from '@/api/cms';
import type {
  CMSCollection,
  CMSField,
  CMSItem,
  CMSItemStatus,
  CMSFieldType,
} from '@/api/cms';

// Re-export types for convenience
export type { CMSCollection, CMSField, CMSItem, CMSItemStatus, CMSFieldType };

interface CMSStore {
  // State
  projectId: string | null;
  collections: CMSCollection[];
  items: CMSItem[];
  isPanelOpen: boolean;
  activeTab: 'collections' | 'fields' | 'items';
  selectedCollectionId: string | null;
  selectedItemId: string | null;
  searchQuery: string;
  filterStatus: CMSItemStatus | 'all';
  isLoading: boolean;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' } | null;

  // Project context
  setProjectId: (projectId: string | null) => void;

  // Panel actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: 'collections' | 'fields' | 'items') => void;

  // Data loading
  loadCollections: () => Promise<void>;
  loadItems: (collectionId: string) => Promise<void>;

  // Collection actions
  createCollection: (name: string, description?: string, fields?: Partial<CMSField>[]) => Promise<CMSCollection | null>;
  updateCollection: (id: string, updates: Partial<CMSCollection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  selectCollection: (id: string | null) => void;
  getCollection: (id: string) => CMSCollection | undefined;

  // Field actions
  addField: (collectionId: string, field: { name: string; type: CMSFieldType; required?: boolean; helpText?: string; placeholder?: string }) => Promise<void>;
  updateField: (collectionId: string, fieldId: string, updates: Partial<CMSField>) => Promise<void>;
  deleteField: (collectionId: string, fieldId: string) => Promise<void>;
  reorderFields: (collectionId: string, fieldIds: string[]) => Promise<void>;

  // Item actions
  createItem: (collectionId: string, fieldData?: Record<string, any>) => Promise<CMSItem | null>;
  updateItem: (itemId: string, updates: { fieldData?: Record<string, any>; status?: CMSItemStatus; slug?: string }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  selectItem: (id: string | null) => void;
  getItem: (id: string) => CMSItem | undefined;
  getItemsByCollection: (collectionId: string) => CMSItem[];
  publishItem: (itemId: string) => Promise<void>;
  unpublishItem: (itemId: string) => Promise<void>;
  archiveItem: (itemId: string) => Promise<void>;

  // Search & Filter
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: CMSItemStatus | 'all') => void;
  getFilteredItems: (collectionId: string) => CMSItem[];

  // Toast
  showToast: (message: string, type: 'success' | 'error') => void;
  clearToast: () => void;

  // Error handling
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCMSStore = create<CMSStore>()(
  immer((set, get) => ({
    // Initial state
    projectId: null,
    collections: [],
    items: [],
    isPanelOpen: false,
    activeTab: 'collections',
    selectedCollectionId: null,
    selectedItemId: null,
    searchQuery: '',
    filterStatus: 'all',
    isLoading: false,
    error: null,
    toast: null,

    // Project context
    setProjectId: (projectId) => {
      set((state) => {
        state.projectId = projectId;
        // Reset CMS state when project changes
        state.collections = [];
        state.items = [];
        state.selectedCollectionId = null;
        state.selectedItemId = null;
      });
      // Load collections for the new project
      if (projectId) {
        get().loadCollections();
      }
    },

    // Panel actions
    openPanel: () => set((state) => { state.isPanelOpen = true; }),
    closePanel: () => set((state) => { state.isPanelOpen = false; }),
    togglePanel: () => set((state) => { state.isPanelOpen = !state.isPanelOpen; }),
    setActiveTab: (tab) => set((state) => { state.activeTab = tab; }),

    // Data loading
    loadCollections: async () => {
      const { projectId } = get();
      if (!projectId) return;

      // Skip if no organization is selected yet
      const orgId = localStorage.getItem('orgId');
      if (!orgId) return;

      set((state) => { state.isLoading = true; });

      try {
        const collections = await cmsApi.getCollections(projectId);
        set((state) => {
          state.collections = collections;
          state.isLoading = false;
        });
      } catch (error: any) {
        console.error('Failed to load collections:', error);
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    loadItems: async (collectionId) => {
      const { projectId } = get();
      if (!projectId) return;

      set((state) => { state.isLoading = true; });

      try {
        const result = await cmsApi.getItems(projectId, collectionId, {
          limit: 100,
        });
        set((state) => {
          // Replace items for this collection
          state.items = state.items.filter(i => i.collectionId !== collectionId);
          state.items.push(...result.items);
          state.isLoading = false;
        });
      } catch (error: any) {
        console.error('Failed to load items:', error);
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    // Collection actions
    createCollection: async (name, description, fields) => {
      const { projectId } = get();
      if (!projectId) {
        get().showToast('No project selected', 'error');
        return null;
      }

      set((state) => { state.isLoading = true; });

      try {
        const collection = await cmsApi.createCollection(projectId, {
          name,
          description,
          fields,
        });

        set((state) => {
          state.collections.push(collection);
          state.selectedCollectionId = collection._id;
          state.activeTab = 'fields';
          state.isLoading = false;
        });

        get().showToast(`Collection "${name}" created`, 'success');
        return collection;
      } catch (error: any) {
        console.error('Failed to create collection:', error);
        set((state) => { state.isLoading = false; });
        get().showToast(error.message || 'Failed to create collection', 'error');
        return null;
      }
    },

    updateCollection: async (id, updates) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.updateCollection(projectId, id, updates);
        set((state) => {
          const index = state.collections.findIndex((c) => c._id === id);
          if (index !== -1) {
            state.collections[index] = updated;
          }
        });
      } catch (error: any) {
        console.error('Failed to update collection:', error);
        get().showToast(error.message || 'Failed to update collection', 'error');
      }
    },

    deleteCollection: async (id) => {
      const { projectId } = get();
      if (!projectId) return;

      const collection = get().collections.find((c) => c._id === id);

      try {
        await cmsApi.deleteCollection(projectId, id);

        set((state) => {
          state.collections = state.collections.filter((c) => c._id !== id);
          state.items = state.items.filter((i) => i.collectionId !== id);
          if (state.selectedCollectionId === id) {
            state.selectedCollectionId = null;
            state.activeTab = 'collections';
          }
        });

        if (collection) {
          get().showToast(`Collection "${collection.name}" deleted`, 'success');
        }
      } catch (error: any) {
        console.error('Failed to delete collection:', error);
        get().showToast(error.message || 'Failed to delete collection', 'error');
      }
    },

    selectCollection: (id) => {
      set((state) => {
        state.selectedCollectionId = id;
        state.selectedItemId = null;
        if (id) {
          state.activeTab = 'items';
        }
      });
      // Load items for the selected collection
      if (id) {
        get().loadItems(id);
      }
    },

    getCollection: (id) => get().collections.find((c) => c._id === id),

    // Field actions
    addField: async (collectionId, field) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const newField = await cmsApi.createField(projectId, collectionId, field);

        set((state) => {
          const collection = state.collections.find((c) => c._id === collectionId);
          if (collection) {
            if (!collection.fields) collection.fields = [];
            collection.fields.push(newField);
          }
        });

        get().showToast('Field added', 'success');
      } catch (error: any) {
        console.error('Failed to add field:', error);
        get().showToast(error.message || 'Failed to add field', 'error');
      }
    },

    updateField: async (collectionId, fieldId, updates) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.updateField(projectId, fieldId, updates);

        set((state) => {
          const collection = state.collections.find((c) => c._id === collectionId);
          if (collection && collection.fields) {
            const fieldIndex = collection.fields.findIndex((f) => f._id === fieldId);
            if (fieldIndex !== -1) {
              collection.fields[fieldIndex] = updated;
            }
          }
        });
      } catch (error: any) {
        console.error('Failed to update field:', error);
        get().showToast(error.message || 'Failed to update field', 'error');
      }
    },

    deleteField: async (collectionId, fieldId) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        await cmsApi.deleteField(projectId, fieldId);

        set((state) => {
          const collection = state.collections.find((c) => c._id === collectionId);
          if (collection && collection.fields) {
            collection.fields = collection.fields.filter((f) => f._id !== fieldId);
          }
        });

        get().showToast('Field deleted', 'success');
      } catch (error: any) {
        console.error('Failed to delete field:', error);
        get().showToast(error.message || 'Failed to delete field', 'error');
      }
    },

    reorderFields: async (collectionId, fieldIds) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const reorderedFields = await cmsApi.reorderFields(projectId, collectionId, fieldIds);

        set((state) => {
          const collection = state.collections.find((c) => c._id === collectionId);
          if (collection) {
            collection.fields = reorderedFields;
          }
        });
      } catch (error: any) {
        console.error('Failed to reorder fields:', error);
        get().showToast(error.message || 'Failed to reorder fields', 'error');
      }
    },

    // Item actions
    createItem: async (collectionId, fieldData = {}) => {
      const { projectId } = get();
      if (!projectId) {
        get().showToast('No project selected', 'error');
        return null;
      }

      try {
        const item = await cmsApi.createItem(projectId, collectionId, { fieldData });

        set((state) => {
          state.items.push(item);
          state.selectedItemId = item._id;
        });

        get().showToast('Item created', 'success');
        return item;
      } catch (error: any) {
        console.error('Failed to create item:', error);
        get().showToast(error.message || 'Failed to create item', 'error');
        return null;
      }
    },

    updateItem: async (itemId, updates) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.updateItem(projectId, itemId, updates);

        set((state) => {
          const index = state.items.findIndex((i) => i._id === itemId);
          if (index !== -1) {
            state.items[index] = updated;
          }
        });
      } catch (error: any) {
        console.error('Failed to update item:', error);
        get().showToast(error.message || 'Failed to update item', 'error');
      }
    },

    deleteItem: async (itemId) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        await cmsApi.deleteItem(projectId, itemId);

        set((state) => {
          state.items = state.items.filter((i) => i._id !== itemId);
          if (state.selectedItemId === itemId) {
            state.selectedItemId = null;
          }
        });

        get().showToast('Item deleted', 'success');
      } catch (error: any) {
        console.error('Failed to delete item:', error);
        get().showToast(error.message || 'Failed to delete item', 'error');
      }
    },

    selectItem: (id) => set((state) => { state.selectedItemId = id; }),

    getItem: (id) => get().items.find((i) => i._id === id),

    getItemsByCollection: (collectionId) =>
      get().items.filter((i) => i.collectionId === collectionId),

    publishItem: async (itemId) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.publishItem(projectId, itemId);

        set((state) => {
          const index = state.items.findIndex((i) => i._id === itemId);
          if (index !== -1) {
            state.items[index] = updated;
          }
        });

        get().showToast('Item published', 'success');
      } catch (error: any) {
        console.error('Failed to publish item:', error);
        get().showToast(error.message || 'Failed to publish item', 'error');
      }
    },

    unpublishItem: async (itemId) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.unpublishItem(projectId, itemId);

        set((state) => {
          const index = state.items.findIndex((i) => i._id === itemId);
          if (index !== -1) {
            state.items[index] = updated;
          }
        });

        get().showToast('Item unpublished', 'success');
      } catch (error: any) {
        console.error('Failed to unpublish item:', error);
        get().showToast(error.message || 'Failed to unpublish item', 'error');
      }
    },

    archiveItem: async (itemId) => {
      const { projectId } = get();
      if (!projectId) return;

      try {
        const updated = await cmsApi.archiveItem(projectId, itemId);

        set((state) => {
          const index = state.items.findIndex((i) => i._id === itemId);
          if (index !== -1) {
            state.items[index] = updated;
          }
        });

        get().showToast('Item archived', 'success');
      } catch (error: any) {
        console.error('Failed to archive item:', error);
        get().showToast(error.message || 'Failed to archive item', 'error');
      }
    },

    // Search & Filter
    setSearchQuery: (query) => set((state) => { state.searchQuery = query; }),
    setFilterStatus: (status) => set((state) => { state.filterStatus = status; }),

    getFilteredItems: (collectionId) => {
      const { items, searchQuery, filterStatus } = get();
      const collection = get().getCollection(collectionId);
      const primaryField = collection?.primaryField || 'name';

      return items
        .filter((item) => {
          if (item.collectionId !== collectionId) return false;
          if (filterStatus !== 'all' && item.status !== filterStatus) return false;
          if (searchQuery) {
            const name = item.fieldData[primaryField]?.toString().toLowerCase() || '';
            if (!name.includes(searchQuery.toLowerCase())) return false;
          }
          return true;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    // Toast
    showToast: (message, type) => {
      set((state) => { state.toast = { message, type }; });
      setTimeout(() => get().clearToast(), 3000);
    },
    clearToast: () => set((state) => { state.toast = null; }),

    // Error handling
    setError: (error) => set((state) => { state.error = error; }),
    setLoading: (loading) => set((state) => { state.isLoading = loading; }),
  }))
);