import { useState } from 'react';
import { useCMSStore } from '@/store/useCMSStore';
import { COLLECTION_TEMPLATES } from '@/types/cms.types';

const CollectionsManager = () => {
  const {
    collections,
    selectedCollectionId,
    selectCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    getItemsByCollection,
  } = useCMSStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleCreate = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim(), selectedTemplate || undefined);
      setNewCollectionName('');
      setSelectedTemplate('');
      setShowCreateModal(false);
    }
  };

  const handleRename = (id: string) => {
    if (editingName.trim()) {
      updateCollection(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDelete = (id: string) => {
    deleteCollection(id);
    setShowDeleteModal(null);
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  return (
    <div className="p-4">
      {/* Create Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full px-4 py-3 bg-accent-blue hover:opacity-90 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Collection
      </button>

      {/* Collections List */}
      {collections.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-canvas-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-text-primary font-medium mb-1">No collections yet</h3>
          <p className="text-text-secondary text-sm">
            Create your first collection to start managing content
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => {
            const itemCount = getItemsByCollection(collection._id).length;
            const isSelected = selectedCollectionId === collection._id;
            const isEditing = editingId === collection._id;

            return (
              <div
                key={collection._id}
                className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border-color hover:border-accent-blue/50 hover:bg-canvas-bg'
                }`}
                onClick={() => !isEditing && selectCollection(collection._id)}
              >
                <div className="flex items-center justify-between">
                  {isEditing ? (
                      <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(collection._id);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      onBlur={() => handleRename(collection._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 bg-canvas-bg border border-border-color rounded text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-accent-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="font-medium text-text-primary truncate">{collection.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-text-secondary bg-canvas-bg px-2 py-0.5 rounded">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(collection._id, collection.name);
                        }}
                        className="p-1.5 rounded hover:bg-border-color transition-colors"
                        title="Rename"
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(collection._id);
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collection info */}
                <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                  <span>{(collection.fields || []).length} fields</span>
                  <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-panel-bg border border-border-color rounded-xl shadow-2xl z-50 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create Collection</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g., Blog Posts, Team Members"
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Start from Template (optional)
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                >
                  <option value="">Blank Collection</option>
                  {Object.entries(COLLECTION_TEMPLATES).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.name} ({template.fields.length} fields)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCollectionName('');
                  setSelectedTemplate('');
                }}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 rounded-lg bg-accent-blue hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Collection
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-panel-bg border border-border-color rounded-xl shadow-2xl z-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Delete Collection</h3>
                <p className="text-sm text-text-secondary">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete this collection? All items within this collection will also be permanently deleted.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionsManager;