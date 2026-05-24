import { useState, useRef } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';

interface StyleGroup {
  label: string;
  properties: { key: string; label: string }[];
}

const styleGroups: StyleGroup[] = [
  {
    label: 'Typography',
    properties: [
      { key: 'color', label: 'Color' },
      { key: 'fontSize', label: 'Font Size' },
      { key: 'fontFamily', label: 'Font Family' },
      { key: 'fontWeight', label: 'Font Weight' },
      { key: 'lineHeight', label: 'Line Height' },
      { key: 'letterSpacing', label: 'Letter Spacing' },
      { key: 'textAlign', label: 'Text Align' },
      { key: 'textDecoration', label: 'Text Decoration' },
      { key: 'textTransform', label: 'Text Transform' },
    ],
  },
  {
    label: 'Layout',
    properties: [
      { key: 'display', label: 'Display' },
      { key: 'flexDirection', label: 'Flex Direction' },
      { key: 'justifyContent', label: 'Justify Content' },
      { key: 'alignItems', label: 'Align Items' },
      { key: 'gap', label: 'Gap' },
    ],
  },
  {
    label: 'Size',
    properties: [
      { key: 'width', label: 'Width' },
      { key: 'height', label: 'Height' },
      { key: 'maxWidth', label: 'Max Width' },
      { key: 'minHeight', label: 'Min Height' },
    ],
  },
  {
    label: 'Spacing',
    properties: [
      { key: 'paddingTop', label: 'Padding Top' },
      { key: 'paddingRight', label: 'Padding Right' },
      { key: 'paddingBottom', label: 'Padding Bottom' },
      { key: 'paddingLeft', label: 'Padding Left' },
      { key: 'marginTop', label: 'Margin Top' },
      { key: 'marginRight', label: 'Margin Right' },
      { key: 'marginBottom', label: 'Margin Bottom' },
      { key: 'marginLeft', label: 'Margin Left' },
    ],
  },
  {
    label: 'Background & Border',
    properties: [
      { key: 'backgroundColor', label: 'Background' },
      { key: 'borderRadius', label: 'Border Radius' },
      { key: 'boxShadow', label: 'Box Shadow' },
      { key: 'opacity', label: 'Opacity' },
    ],
  },
  {
    label: 'Position',
    properties: [
      { key: 'position', label: 'Position' },
      { key: 'top', label: 'Top' },
      { key: 'right', label: 'Right' },
      { key: 'bottom', label: 'Bottom' },
      { key: 'left', label: 'Left' },
      { key: 'zIndex', label: 'Z-Index' },
    ],
  },
];

// Send a style update to the iframe
function sendStyleToIframe(property: string, value: string) {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'BUILDER_UPDATE_STYLE',
      property,
      value,
    }, '*');
  }
}

interface StyleRowProps {
  label: string;
  property: string;
  value: string;
}

const StyleRow = ({ label, property, value }: StyleRowProps) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditValue(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCommit = () => {
    setEditing(false);
    if (editValue !== value) {
      sendStyleToIframe(property, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommit();
    if (e.key === 'Escape') {
      setEditValue(value);
      setEditing(false);
    }
  };

  // Determine if value is a color
  const isColor = property.toLowerCase().includes('color') || property === 'backgroundColor';
  const colorMatch = value.match(/^rgba?\([\d, .]+\)$|^#[0-9a-fA-F]{3,8}$/);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-text-secondary whitespace-nowrap flex-shrink-0 w-24">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {isColor && colorMatch && (
          <div
            className="w-4 h-4 rounded border border-border-color flex-shrink-0"
            style={{ backgroundColor: value }}
          />
        )}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            className="w-full text-xs bg-canvas-bg border border-accent-blue rounded px-1.5 py-0.5 text-text-primary outline-none"
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className="w-full text-left text-xs text-text-primary bg-canvas-bg hover:bg-border-color rounded px-1.5 py-0.5 truncate transition-colors"
            title={value}
          >
            {value || '-'}
          </button>
        )}
      </div>
    </div>
  );
};

const TemplateStylePanel = () => {
  const { templateSelectedElement, isTemplateMode } = useBuilderStore();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['Typography', 'Layout', 'Size']));

  if (!isTemplateMode || !templateSelectedElement) {
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
        <p className="text-sm">Click an element in the template to edit it</p>
        <p className="text-xs text-text-secondary mt-1">Double-click text to edit inline</p>
      </div>
    );
  }

  const el = templateSelectedElement;

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Element Info */}
      <div className="p-4 border-b border-border-color">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">Selected Element</h3>
          <span className="text-xs font-mono bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded">{el.tag}</span>
        </div>
        <p className="text-xs text-text-secondary font-mono truncate mb-2" title={el.label}>{el.label}</p>

        {el.isTextEditable && (
          <div className="mt-2 p-2 bg-canvas-bg rounded">
            <p className="text-[10px] text-text-secondary uppercase font-medium mb-1">Text Content</p>
            <p className="text-xs text-text-primary line-clamp-3">{el.text || '(empty)'}</p>
            <p className="text-[10px] text-text-secondary mt-1">Double-click in template to edit</p>
          </div>
        )}
      </div>

      {/* Style Groups */}
      <div>
        {styleGroups.map(group => {
          const isOpen = openGroups.has(group.label);
          // Filter to only show properties that have values
          const activeProps = group.properties.filter(p => {
            const val = el.styles[p.key];
            return val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px' && val !== 'static';
          });

          return (
            <div key={group.label} className="border-b border-border-color">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-canvas-bg transition-colors"
              >
                <span className="text-xs font-semibold text-text-primary">{group.label}</span>
                <div className="flex items-center gap-2">
                  {activeProps.length > 0 && (
                    <span className="text-[10px] text-text-secondary">{activeProps.length} set</span>
                  )}
                  <svg
                    className={`w-3.5 h-3.5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-3">
                  {group.properties.map(prop => (
                    <StyleRow
                      key={prop.key}
                      label={prop.label}
                      property={prop.key}
                      value={el.styles[prop.key] || ''}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateStylePanel;