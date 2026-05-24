import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ElementType } from '@/types/element.types';
import { useBuilderStore } from '@/store/useBuilderStore';

interface DraggableElementProps {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

const DraggableElement = ({ type, label, icon, description }: DraggableElementProps) => {
  const isTemplateMode = useBuilderStore((state) => state.isTemplateMode);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ELEMENT',
    item: { elementType: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // In template mode, use click-to-add instead of drag
  const handleClick = () => {
    if (isTemplateMode) {
      // Dispatch custom event that Canvas will listen to
      window.dispatchEvent(new CustomEvent('builder:add-element-to-template', {
        detail: { elementType: type }
      }));
    }
  };

  return (
    <div
      ref={isTemplateMode ? undefined : drag}
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 rounded transition-colors ${
        isTemplateMode
          ? 'cursor-pointer hover:bg-accent-blue/10 hover:ring-1 hover:ring-accent-blue/30'
          : 'cursor-move hover:bg-canvas-bg'
      } ${isDragging ? 'opacity-50' : ''}`}
      title={isTemplateMode ? `Click to add ${label}` : `Drag ${label} to canvas`}
    >
      <div className="text-text-secondary flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {description && (
          <div className="text-xs text-text-secondary mt-0.5">{description}</div>
        )}
      </div>
      {isTemplateMode && (
        <div className="text-accent-blue flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )}
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, defaultOpen = false, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-text-secondary uppercase hover:text-text-primary transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="space-y-1 mt-1">{children}</div>}
    </div>
  );
};

const ElementsLibrary = () => {
  const basicElements: DraggableElementProps[] = [
    {
      type: 'container',
      label: 'Container',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: 'section',
      label: 'Section',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: 'div',
      label: 'Div Block',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="1" strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: 'heading',
      label: 'Heading',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      type: 'text',
      label: 'Text',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
    },
    {
      type: 'button',
      label: 'Button',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="8" width="18" height="8" rx="2" strokeWidth={2} />
        </svg>
      ),
    },
    {
      type: 'image',
      label: 'Image',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
          <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-5L5 21" />
        </svg>
      ),
    },
    {
      type: 'link',
      label: 'Link',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ];

  const assetElements: DraggableElementProps[] = [
    {
      type: 'image',
      label: 'Image',
      description: 'JPG, PNG, SVG, WebP',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
          <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-5L5 21" />
        </svg>
      ),
    },
    {
      type: 'video',
      label: 'Video',
      description: 'MP4, WebM, embedded',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth={2} />
          <polygon points="10,8 16,12 10,16" fill="currentColor" />
        </svg>
      ),
    },
    {
      type: 'icon',
      label: 'Icon (SVG)',
      description: 'Scalable vector graphics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      type: 'lottie',
      label: 'Lottie Animation',
      description: 'JSON-based animations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const interactiveElements: DraggableElementProps[] = [
    {
      type: 'tabs',
      label: 'Tabs',
      description: 'Horizontal tabbed interface',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 9v-9h4m0 0h4v9m-4-9v9m-4 0h.01M3 19h18" />
        </svg>
      ),
    },
    {
      type: 'accordion',
      label: 'Accordion',
      description: 'Collapsible content panels',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      type: 'toggle',
      label: 'Toggle',
      description: 'Show/hide content trigger',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01" />
        </svg>
      ),
    },
  ];

  const componentElements: DraggableElementProps[] = [
    {
      type: 'repeater',
      label: 'Repeater/Collection',
      description: 'Repeat child blocks with data',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      type: 'modal',
      label: 'Modal/Overlay',
      description: 'Popup with backdrop & focus trap',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-4">
      {/* Basic Elements - Collapsible */}
      <CollapsibleSection title="Basic Elements" defaultOpen={true}>
        {basicElements.map((element) => (
          <DraggableElement key={element.type} {...element} />
        ))}
      </CollapsibleSection>

      {/* Advanced Elements Header */}
      <div className="border-t border-border-color pt-4 mt-2">
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-3 px-2">
          Advanced Elements
        </h3>

        {/* Asset Types */}
        <CollapsibleSection title="Asset Types">
          {assetElements.map((element) => (
            <DraggableElement key={`asset-${element.type}`} {...element} />
          ))}
        </CollapsibleSection>

        {/* Components */}
        <CollapsibleSection title="Components">
          {componentElements.map((element) => (
            <DraggableElement key={element.type} {...element} />
          ))}
        </CollapsibleSection>

        {/* Interactive */}
        <CollapsibleSection title="Interactive">
          {interactiveElements.map((element) => (
            <DraggableElement key={element.type} {...element} />
          ))}
        </CollapsibleSection>
      </div>

      <div className="mt-6 p-4 bg-canvas-bg rounded text-xs text-text-secondary">
        <p className="mb-2">Drag elements onto the canvas to start building your page.</p>
        <p>Click on an element to edit its styles in the right panel.</p>
      </div>
    </div>
  );
};

export default ElementsLibrary;
