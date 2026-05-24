import { useCMSStore } from '@/store/useCMSStore';
import CollectionsManager from './CollectionsManager';
import FieldsEditor from './FieldsEditor';
import ItemsManager from './ItemsManager';

const CMSPanel = () => {
  const {
    isPanelOpen,
    closePanel,
    activeTab,
    setActiveTab,
    selectedCollectionId,
    collections,
    toast,
    clearToast,
  } = useCMSStore();

  const selectedCollection = collections.find((c) => c._id === selectedCollectionId);

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closePanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-panel-bg border-l border-border-color shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-canvas-bg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <h2 className="text-lg font-semibold text-text-primary">CMS</h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded hover:bg-border-color transition-colors"
            title="Close panel"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-color">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === 'collections'
                ? 'text-accent-blue'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Collections
            {activeTab === 'collections' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            disabled={!selectedCollectionId}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'fields'
                ? 'text-accent-blue'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Fields
            {selectedCollection && (
              <span className="ml-1 text-xs text-text-secondary">
                ({(selectedCollection.fields || []).length})
              </span>
            )}
            {activeTab === 'fields' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('items')}
            disabled={!selectedCollectionId}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'items'
                ? 'text-accent-blue'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Items
            {activeTab === 'items' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
            )}
          </button>
        </div>

        {/* Breadcrumb */}
        {selectedCollection && activeTab !== 'collections' && (
          <div className="px-4 py-2 bg-canvas-bg/50 border-b border-border-color flex items-center gap-2 text-sm">
            <button
              onClick={() => setActiveTab('collections')}
              className="text-text-secondary hover:text-accent-blue transition-colors"
            >
              Collections
            </button>
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-text-primary font-medium">{selectedCollection.name}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'collections' && <CollectionsManager />}
          {activeTab === 'fields' && selectedCollectionId && <FieldsEditor />}
          {activeTab === 'items' && selectedCollectionId && <ItemsManager />}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-4 left-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between ${
              toast.type === 'success'
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button onClick={clearToast} className="p-1 hover:bg-white/20 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default CMSPanel;