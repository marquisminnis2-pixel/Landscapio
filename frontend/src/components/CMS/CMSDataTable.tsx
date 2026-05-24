import { useEffect, useState } from 'react';
import { useCMSStore } from '@/store/useCMSStore';
import type { CMSItem, CMSField } from '@/store/useCMSStore';

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-[#10B981]/20 text-[#34D399]',
  draft: 'bg-white/10 text-white/50',
  archived: 'bg-orange-500/20 text-orange-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
};

function formatFieldValue(value: any, type: string): string {
  if (value === undefined || value === null) return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'date' || type === 'datetime') {
    try { return new Date(value).toLocaleDateString(); } catch { return String(value); }
  }
  if (type === 'imageUrl' || type === 'url') {
    return value ? '🔗 Link' : '—';
  }
  if (type === 'richText') {
    const stripped = String(value).replace(/<[^>]*>/g, '').slice(0, 60);
    return stripped || '—';
  }
  const str = String(value);
  return str.length > 60 ? str.slice(0, 60) + '…' : str;
}

interface CMSDataTableProps {
  collectionId: string;
}

export default function CMSDataTable({ collectionId }: CMSDataTableProps) {
  const {
    collections,
    getFilteredItems,
    loadItems,
    createItem,
    deleteItem,
    publishItem,
    unpublishItem,
    selectItem,
    openPanel,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    isLoading,
  } = useCMSStore();

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const collection = collections.find((c) => c._id === collectionId);
  const fields: CMSField[] = collection?.fields || [];
  const displayFields = fields.slice(0, 5); // Show up to 5 field columns
  const items: CMSItem[] = getFilteredItems(collectionId);

  useEffect(() => {
    if (collectionId) loadItems(collectionId);
  }, [collectionId]);

  const handleNewItem = async () => {
    const item = await createItem(collectionId);
    if (item) {
      selectItem(item._id);
      setActiveTab('items');
      openPanel();
    }
  };

  const handleEditItem = (item: CMSItem) => {
    selectItem(item._id);
    setActiveTab('items');
    openPanel();
  };

  const handleDelete = async (itemId: string) => {
    await deleteItem(itemId);
    setConfirmDelete(null);
  };

  if (!collection) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
        Loading collection...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-color flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{collection.name}</h2>
          <p className="text-xs text-white/40">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs bg-panel-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-[#34D399] w-48"
            />
          </div>
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs bg-panel-bg border border-border-color rounded-lg text-text-secondary px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#34D399]"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          {/* New Item */}
          <button
            onClick={handleNewItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#0d9e6e] text-white text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            <div className="animate-spin w-5 h-5 border-2 border-[#34D399] border-t-transparent rounded-full mr-2" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <p className="text-sm">No items yet</p>
            <button
              onClick={handleNewItem}
              className="text-[#34D399] hover:text-[#10B981] text-sm transition-colors"
            >
              + Create your first item
            </button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-color bg-panel-bg sticky top-0 z-10">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/40 uppercase tracking-wider w-24">Status</th>
                {displayFields.map((field) => (
                  <th key={field._id} className="text-left px-4 py-2.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">
                    {field.name}
                  </th>
                ))}
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/40 uppercase tracking-wider">Updated</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  onClick={() => handleEditItem(item)}
                  className="border-b border-border-color hover:bg-panel-bg cursor-pointer group transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize ${STATUS_COLORS[item.status] || 'bg-white/10 text-white/50'}`}>
                      {item.status}
                    </span>
                  </td>
                  {displayFields.map((field) => (
                    <td key={field._id} className="px-4 py-2.5 text-xs text-text-secondary max-w-[200px] truncate">
                      {formatFieldValue(item.fieldData[field.slug], field.type)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-xs text-white/30">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status === 'draft' ? (
                        <button
                          onClick={() => publishItem(item._id)}
                          className="p-1 rounded hover:bg-[#10B981]/20 text-[#34D399] transition-colors"
                          title="Publish"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      ) : item.status === 'published' ? (
                        <button
                          onClick={() => unpublishItem(item._id)}
                          className="p-1 rounded hover:bg-orange-500/20 text-orange-400 transition-colors"
                          title="Unpublish"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      ) : null}
                      <button
                        onClick={() => setConfirmDelete(item._id)}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-panel-bg border border-border-color rounded-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-text-primary mb-2">Delete item?</h3>
            <p className="text-xs text-white/50 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs rounded-lg border border-border-color text-white/50 hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}