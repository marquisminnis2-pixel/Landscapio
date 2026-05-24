import { useBuilderStore } from '@/store/useBuilderStore';
import { useCMSStore } from '@/store/useCMSStore';
import type { CMSCollection, CMSField } from '@/api/cms';
import SpacingControl from './controls/SpacingControl';
import TypographyControl from './controls/TypographyControl';
import LayoutControl from './controls/LayoutControl';
import SizeControl from './controls/SizeControl';
import BackgroundControl from './controls/BackgroundControl';
import BorderControl from './controls/BorderControl';
import BehaviorControl from './controls/BehaviorControl';
import InteractionControl from './controls/InteractionControl';
import TemplateStylePanel from './TemplateStylePanel';

const StylePanel = () => {
  const { selectedElementId, findElementById, wrapElement, duplicateElement, deleteElement, isTemplateMode } = useBuilderStore();

  // In template mode, use the template-specific style panel
  if (isTemplateMode) {
    return <TemplateStylePanel />;
  }

  const selectedElement = selectedElementId ? findElementById(selectedElementId) : null;

  const handleWrap = () => {
    if (selectedElementId) {
      wrapElement(selectedElementId);
    }
  };

  const handleDuplicate = () => {
    if (selectedElementId) {
      duplicateElement(selectedElementId);
    }
  };

  const handleDelete = () => {
    if (selectedElementId) {
      deleteElement(selectedElementId);
    }
  };

  if (!selectedElement) {
    return (
      <div className="p-6 text-center text-text-secondary">
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <p className="text-sm">Select an element to edit its styles</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Element Info */}
      <div className="p-4 border-b border-border-color">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Selected Element</h3>
          <span className="text-xs text-text-secondary">{selectedElement.type}</span>
        </div>
        <input
          type="text"
          value={selectedElement.name}
          onChange={(e) => {
            const { updateElement } = useBuilderStore.getState();
            updateElement(selectedElement.id, { name: e.target.value });
          }}
          className="w-full text-sm mb-3"
          placeholder="Element name"
        />

        {/* Element Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleWrap}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-canvas-bg hover:bg-border-color rounded text-xs font-medium text-text-primary transition-colors"
            title="Wrap in Div"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
              <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth={2} />
            </svg>
            Wrap
          </button>
          <button
            onClick={handleDuplicate}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-canvas-bg hover:bg-border-color rounded text-xs font-medium text-text-primary transition-colors"
            title="Duplicate"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="8" y="8" width="12" height="12" rx="2" strokeWidth={2} />
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" strokeWidth={2} />
            </svg>
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded text-xs font-medium text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Data / Bindings */}
      <div className="p-4 border-b border-border-color">
        <h4 className="text-sm font-semibold mb-2">Data / Bindings</h4>
        <BindingsEditor element={selectedElement} />
      </div>

      {/* Style Controls */}
      <div className="divide-y divide-border-color">
        <LayoutControl element={selectedElement} />
        <SizeControl element={selectedElement} />
        <SpacingControl element={selectedElement} />
        <TypographyControl element={selectedElement} />
        <BackgroundControl element={selectedElement} />
        <BorderControl element={selectedElement} />
        <InteractionControl element={selectedElement} />
        <BehaviorControl element={selectedElement} />
      </div>
    </div>
  );
};

export default StylePanel;

// Binding editor component
interface BindingsEditorProps {
  element: any;
}

const BindingsEditor = ({ element }: BindingsEditorProps) => {
  const { collections, getCollection } = useCMSStore();
  const { setElementBinding, clearElementBinding } = useBuilderStore();

  // Determine prop key to bind based on element type
  const propKey = element.type === 'image' ? 'src' : 'text';

  // Allowed backend field types for this element
  const allowedFieldTypes = (() => {
    if (element.type === 'image') return ['imageUrl'];
    // text-like elements support both text and richText
    if (['text', 'heading', 'button', 'link'].includes(element.type)) return ['text', 'richText', 'slug', 'url', 'email', 'phone', 'number'];
    return [];
  })();

  const currentBinding = element.bindings?.[propKey] || null;

  return (
    <div>
      <div className="text-xs text-text-secondary mb-2">Bind this element to a CMS field to render real content in Preview/Published modes.</div>
      <div className="space-y-2">
        <select
          value={currentBinding?.collectionId || ''}
          onChange={(e) => {
            const colId = e.target.value || null;
            if (!colId) {
              // clear binding
              if (currentBinding) clearElementBinding(element.id, propKey);
              return;
            }
            // set a temporary binding with no field yet (user will pick field next)
            setElementBinding(element.id, propKey, { collectionId: colId, fieldKey: '' });
          }}
          className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-sm"
        >
          <option value="">Select collection...</option>
          {collections.map((c: CMSCollection) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        {/* Field selector */}
        {currentBinding?.collectionId && (
          (() => {
            const col = getCollection(currentBinding.collectionId);
            const fields: CMSField[] = (col?.fields || []).filter(f => allowedFieldTypes.includes(f.type));
            return (
              <div>
                <select
                  value={currentBinding.fieldKey || ''}
                  onChange={(e) => {
                    const fieldKey = e.target.value;
                    if (!fieldKey) return;
                    setElementBinding(element.id, propKey, { collectionId: currentBinding.collectionId, fieldKey });
                  }}
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-sm"
                >
                  <option value="">Select field...</option>
                  {fields.map((f) => (
                    <option key={f._id} value={f.slug}>{f.name} ({f.slug})</option>
                  ))}
                </select>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => clearElementBinding(element.id, propKey)}
                    className="px-3 py-1 text-xs bg-canvas-bg rounded"
                  >
                    Clear Binding
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};
