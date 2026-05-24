import { useState } from 'react';
import { useCMSStore } from '@/store/useCMSStore';
import { CMSItemStatus } from '@/types/cms.types';
import ItemEditor from './ItemEditor';

const ItemsManager = () => {
  const {
    collections,
    selectedCollectionId,
    selectedItemId,
    selectItem,
    createItem,
    deleteItem,
    publishItem,
    unpublishItem,
    archiveItem,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    getFilteredItems,
  } = useCMSStore();

  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const collection = collections.find((c) => c._id === selectedCollectionId);
  const items = selectedCollectionId ? getFilteredItems(selectedCollectionId) : [];
  const primaryField = collection?.primaryField || 'name';

  // If an item is selected, show the editor
  if (selectedItemId) {
    return <ItemEditor />;
  }

  const handleCreateItem = () => {
    if (selectedCollectionId) {
      createItem(selectedCollectionId);
    }
  };

  const getStatusColor = (status: CMSItemStatus) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/10 text-green-600';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-600';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (status: CMSItemStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Filter */}
      <div className="p-4 space-y-3 border-b border-border-color">
        {/* Create Button */}
        <button
          onClick={handleCreateItem}
          className="w-full px-4 py-3 bg-accent-blue hover:opacity-90 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Item
        </button>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterStatus === status
                  ? 'bg-accent-blue text-white'
                  : 'bg-canvas-bg text-text-secondary hover:text-text-primary'
              }`}
            >
              {status === 'all' ? 'All' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-canvas-bg flex items-center justify-center">
              <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-text-primary font-medium mb-1">
              {searchQuery || filterStatus !== 'all' ? 'No items match your filter' : 'No items yet'}
            </h3>
            <p className="text-text-secondary text-sm">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first item to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const itemName = item.fieldData[primaryField] || 'Untitled';
              // Find first image field for thumbnail
              const imageField = collection?.fields?.find((f) => f.type === 'imageUrl');
              const thumbnail = imageField ? item.fieldData[imageField.slug] : null;

              return (
                <div
                  key={item._id}
                  className="group p-3 rounded-lg border border-border-color hover:border-accent-blue/50 bg-panel-bg transition-colors cursor-pointer"
                  onClick={() => selectItem(item._id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-canvas-bg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary truncate">{itemName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        Updated {new Date(item.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            publishItem(item._id);
                          }}
                          className="p-1.5 rounded hover:bg-green-500/10 transition-colors"
                          title="Publish"
                        >
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      {item.status === 'published' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unpublishItem(item._id);
                          }}
                          className="p-1.5 rounded hover:bg-yellow-500/10 transition-colors"
                          title="Unpublish"
                        >
                          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      {item.status !== 'archived' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveItem(item._id);
                          }}
                          className="p-1.5 rounded hover:bg-border-color transition-colors"
                          title="Archive"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                            setShowDeleteModal(item._id);
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
              );
            })}
          </div>
        )}
      </div>

      {/* Items count */}
      <div className="px-4 py-2 border-t border-border-color text-xs text-text-secondary">
        {items.length} {items.length === 1 ? 'item' : 'items'}
        {(searchQuery || filterStatus !== 'all') && ' (filtered)'}
      </div>

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
                <h3 className="text-lg font-semibold text-text-primary">Delete Item</h3>
                <p className="text-sm text-text-secondary">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete this item? All data will be permanently lost.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                    deleteItem(showDeleteModal);
                  setShowDeleteModal(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Delete Item
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemsManager;