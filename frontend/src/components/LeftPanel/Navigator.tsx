import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element, TemplateDomNode } from '@/types/element.types';

interface TreeNodeProps {
  element: Element;
  level: number;
}

const TreeNode = ({ element, level }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedElementId, selectElement, deleteElement, hoveredElementId, setHoveredElement } =
    useBuilderStore();

  const isSelected = selectedElementId === element.id;
  const isHovered = hoveredElementId === element.id;
  const hasChildren = element.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectElement(element.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete ${element.name}?`)) {
      deleteElement(element.id);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onMouseEnter={() => setHoveredElement(element.id)}
        onMouseLeave={() => setHoveredElement(null)}
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-canvas-bg transition-colors ${
          isSelected ? 'bg-accent-blue/20 border-l-2 border-accent-blue' : ''
        } ${isHovered && !isSelected ? 'bg-canvas-bg/50' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-border-color rounded transition-transform"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Element Icon */}
        <div className="text-text-secondary flex-shrink-0">
          {/* Basic Elements */}
          {element.type === 'container' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
            </svg>
          )}
          {element.type === 'section' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
            </svg>
          )}
          {element.type === 'div' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
            </svg>
          )}
          {element.type === 'text' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
          {element.type === 'heading' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          )}
          {element.type === 'button' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="8" width="18" height="8" rx="2" strokeWidth={2} />
            </svg>
          )}
          {element.type === 'image' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-5L5 21" />
            </svg>
          )}
          {element.type === 'link' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}

          {/* Advanced Elements - Assets */}
          {element.type === 'video' && (
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth={2} />
              <polygon points="10,8 16,12 10,16" fill="currentColor" />
            </svg>
          )}
          {element.type === 'icon' && (
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          )}
          {element.type === 'lottie' && (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}

          {/* Advanced Elements - Components */}
          {element.type === 'repeater' && (
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )}
          {element.type === 'modal' && (
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}

          {/* Advanced Elements - Interactive */}
          {element.type === 'tabs' && (
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 9v-9h4m0 0h4v9m-4-9v9m-4 0h.01M3 19h18" />
            </svg>
          )}
          {element.type === 'accordion' && (
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
          {element.type === 'toggle' && (
            <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01" />
            </svg>
          )}
        </div>

        {/* Element Name */}
        <span className="text-sm flex-1 truncate">{element.name}</span>

        {/* Hidden/Locked Indicators */}
        {element.hidden && (
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
        {element.locked && (
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400"
          title="Delete element"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {element.children.map((child) => (
            <TreeNode key={child.id} element={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Template Mode Tree Node ---

interface TemplateTreeNodeProps {
  node: TemplateDomNode;
  level: number;
}

const sendToIframe = (message: Record<string, unknown>) => {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(message, '*');
  }
};

const TemplateTreeNode = ({ node, level }: TemplateTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(level < 3);
  const { templateSelectedElement } = useBuilderStore();

  const isSelected = templateSelectedElement?.path === node.path;
  const hasChildren = node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendToIframe({ type: 'BUILDER_SELECT_PATH', path: node.path });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete <${node.tag}>?`)) {
      sendToIframe({ type: 'BUILDER_DELETE_PATH', path: node.path });
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`group flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-canvas-bg transition-colors ${
          isSelected ? 'bg-accent-blue/20 border-l-2 border-accent-blue' : ''
        }`}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-border-color rounded transition-transform flex-shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Tag badge */}
        <span className="text-[10px] font-mono bg-canvas-bg text-text-secondary px-1 rounded flex-shrink-0">
          {node.tag}
        </span>

        {/* Label */}
        <span className="text-xs flex-1 truncate" title={node.path}>
          {node.label}
        </span>

        {/* Text preview */}
        {node.textPreview && !hasChildren && (
          <span className="text-[10px] text-text-secondary truncate max-w-[60px] flex-shrink-0" title={node.textPreview}>
            {node.textPreview}
          </span>
        )}

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-red-400 flex-shrink-0"
          title="Delete element"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, i) => (
            <TemplateTreeNode key={child.path || `${node.path}-${i}`} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Navigator Component ---

const Navigator = () => {
  const { pages, currentPageId, isTemplateMode, templateDomTree } = useBuilderStore();

  // Template mode: render live DOM tree from iframe
  if (isTemplateMode) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2 px-2">
            Template Structure
          </h3>
          {templateDomTree.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-secondary">
              <p>Loading template structure...</p>
              <p className="mt-1 text-xs">The DOM tree will appear once the template loads.</p>
            </div>
          ) : (
            <div>
              {templateDomTree.map((node, i) => (
                <TemplateTreeNode key={node.path || `root-${i}`} node={node} level={0} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Element mode: render element tree from store
  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2">
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2 px-2">
          Page Structure
        </h3>
        {elements.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-secondary">
            <p>No elements yet.</p>
            <p className="mt-1">Drag elements from the Elements tab to get started.</p>
          </div>
        ) : (
          <div className="group">
            {elements.map((element) => (
              <TreeNode key={element.id} element={element} level={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigator;
