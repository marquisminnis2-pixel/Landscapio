import { useState } from 'react';
import { useCMSStore } from '@/store/useCMSStore';
import { FIELD_TYPE_INFO } from '@/types/cms.types';
import type { CMSField } from '@/api/cms';
import type { CMSFieldType } from '@/types/cms.types';

const FieldsEditor = () => {
  const {
    collections,
    selectedCollectionId,
    addField,
    updateField,
    deleteField,
    updateCollection,
  } = useCMSStore();

  const collection = collections.find((c) => c._id === selectedCollectionId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<CMSField | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // New field form state
  const [newField, setNewField] = useState({
    name: '',
    type: 'text' as CMSFieldType,
    required: false,
    helpText: '',
    placeholder: '',
  });

  if (!collection) return null;

  const handleAddField = () => {
    if (newField.name.trim() && selectedCollectionId) {
      addField(selectedCollectionId, {
        name: newField.name.trim(),
        type: newField.type,
        required: newField.required,
        helpText: newField.helpText || undefined,
        placeholder: newField.placeholder || undefined,
      });
      setNewField({
        name: '',
        type: 'text',
        required: false,
        helpText: '',
        placeholder: '',
      });
      setShowAddModal(false);
    }
  };

  const handleUpdateField = () => {
    if (editingField && selectedCollectionId) {
      updateField(selectedCollectionId, editingField._id, editingField);
      setEditingField(null);
    }
  };

  const handleDeleteField = (fieldId: string) => {
    if (selectedCollectionId) {
      deleteField(selectedCollectionId, fieldId);
      setShowDeleteModal(null);
    }
  };

  const handleSetPrimaryField = (fieldSlug: string) => {
    if (selectedCollectionId) {
      updateCollection(selectedCollectionId, { primaryField: fieldSlug });
    }
  };

  const fieldTypes = Object.entries(FIELD_TYPE_INFO);

  return (
    <div className="p-4">
      {/* Add Field Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full px-4 py-3 bg-accent-blue hover:opacity-90 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Field
      </button>

      {/* Fields List */}
      {(collection.fields || []).length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-canvas-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-text-primary font-medium mb-1">No fields yet</h3>
          <p className="text-text-secondary text-sm">
            Add fields to define your collection structure
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(collection.fields || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((field) => {
              const typeInfo = FIELD_TYPE_INFO[field.type];
              const isPrimary = collection.primaryField === field.slug;

              return (
                <div
                  key={field._id}
                  className="group p-3 rounded-lg border border-border-color hover:border-accent-blue/50 bg-panel-bg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Field Type Icon */}
                      <div className="w-8 h-8 rounded bg-canvas-bg flex items-center justify-center text-xs font-mono text-text-secondary flex-shrink-0">
                        {typeInfo.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">{field.name}</span>
                          {field.required && (
                            <span className="text-xs text-red-400">*</span>
                          )}
                          {isPrimary && (
                            <span className="text-xs bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {typeInfo.label} • {field.slug}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isPrimary && field.type === 'text' && (
                        <button
                          onClick={() => handleSetPrimaryField(field.slug)}
                          className="p-1.5 rounded hover:bg-border-color transition-colors"
                          title="Set as primary field"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setEditingField({ ...field })}
                        className="p-1.5 rounded hover:bg-border-color transition-colors"
                        title="Edit field"
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(field._id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete field"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {field.helpText && (
                    <p className="mt-2 text-xs text-text-secondary pl-11">
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Add Field Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-h-[80vh] bg-panel-bg border border-border-color rounded-xl shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-border-color">
              <h3 className="text-lg font-semibold text-text-primary">Add Field</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Field Name
                </label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., Title, Description, Image"
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Field Type
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {fieldTypes.map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => setNewField({ ...newField, type: type as CMSFieldType })}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        newField.type === type
                          ? 'border-accent-blue bg-accent-blue/5'
                          : 'border-border-color hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-canvas-bg flex items-center justify-center text-xs font-mono text-text-secondary">
                          {info.icon}
                        </span>
                        <span className="text-sm font-medium text-text-primary">{info.label}</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 ml-8">{info.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Placeholder (optional)
                </label>
                <input
                  type="text"
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  placeholder="Placeholder text for empty field"
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Help Text (optional)
                </label>
                <input
                  type="text"
                  value={newField.helpText}
                  onChange={(e) => setNewField({ ...newField, helpText: e.target.value })}
                  placeholder="Displayed below the field to guide editors"
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="w-4 h-4 rounded border-border-color text-accent-blue focus:ring-accent-blue"
                />
                <span className="text-sm text-text-primary">Required field</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-border-color">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewField({
                    name: '',
                    type: 'text',
                    required: false,
                    helpText: '',
                    placeholder: '',
                  });
                }}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddField}
                disabled={!newField.name.trim()}
                className="px-4 py-2 rounded-lg bg-accent-blue hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Field
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setEditingField(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-h-[80vh] bg-panel-bg border border-border-color rounded-xl shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-border-color">
              <h3 className="text-lg font-semibold text-text-primary">Edit Field</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Field Name
                </label>
                <input
                  type="text"
                  value={editingField.name}
                  onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Field Type
                </label>
                <div className="px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-secondary text-sm">
                  {FIELD_TYPE_INFO[editingField.type].label}
                  <span className="text-xs ml-2">(Type cannot be changed)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Placeholder (optional)
                </label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Help Text (optional)
                </label>
                <input
                  type="text"
                  value={editingField.helpText || ''}
                  onChange={(e) => setEditingField({ ...editingField, helpText: e.target.value })}
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingField.required}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                  className="w-4 h-4 rounded border-border-color text-accent-blue focus:ring-accent-blue"
                />
                <span className="text-sm text-text-primary">Required field</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-border-color">
              <button
                onClick={() => setEditingField(null)}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateField}
                disabled={!editingField.name.trim()}
                className="px-4 py-2 rounded-lg bg-accent-blue hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
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
                <h3 className="text-lg font-semibold text-text-primary">Delete Field</h3>
                <p className="text-sm text-text-secondary">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete this field? All data in this field will be lost from existing items.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-canvas-bg hover:bg-border-color text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteField(showDeleteModal)}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Delete Field
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldsEditor;