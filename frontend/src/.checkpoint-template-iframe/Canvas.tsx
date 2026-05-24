import { useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element, ElementType } from '@/types/element.types';
import CanvasElement from './CanvasElement';
import { getBehaviorTracker, cleanupBehaviorTracker } from '@/utils/behaviorDetection';

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const createDefaultElement = (type: ElementType): Element => {
  const baseElement: Element = {
    id: generateId(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    children: [],
    styles: {
      desktop: {},
      tablet: {},
      mobile: {},
    },
  };

  // Set default styles based on element type
  switch (type) {
    case 'container':
      baseElement.styles.desktop = {
        display: 'block',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
      };
      break;
    case 'section':
      baseElement.styles.desktop = {
        display: 'block',
        width: '100%',
        padding: '40px 20px',
      };
      break;
    case 'div':
      baseElement.styles.desktop = {
        display: 'block',
        padding: '10px',
      };
      break;
    case 'heading':
      baseElement.content = 'Heading';
      baseElement.styles.desktop = {
        fontSize: '32px',
        fontWeight: '700',
        marginBottom: '16px',
      };
      break;
    case 'text':
      baseElement.content = 'This is a text block. Click to edit.';
      baseElement.styles.desktop = {
        fontSize: '16px',
        lineHeight: '1.6',
      };
      break;
    case 'button':
      baseElement.content = 'Click Me';
      baseElement.styles.desktop = {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
      };
      break;
    case 'image':
      baseElement.attributes = {
        src: 'https://via.placeholder.com/400x300',
        alt: 'Placeholder image',
      };
      baseElement.styles.desktop = {
        display: 'block',
        width: '100%',
        maxWidth: '400px',
      };
      break;
    case 'link':
      baseElement.content = 'Link';
      baseElement.attributes = {
        href: '#',
        target: '_self',
      };
      baseElement.styles.desktop = {
        color: '#3b82f6',
        textDecoration: 'underline',
      };
      break;

    // Advanced Elements - Assets
    case 'video':
      baseElement.attributes = {
        src: 'https://www.w3schools.com/html/mov_bbb.mp4',
        controls: 'true',
      };
      baseElement.styles.desktop = {
        display: 'block',
        width: '100%',
        maxWidth: '800px',
      };
      break;
    case 'icon':
      baseElement.content = '★'; // Default icon
      baseElement.styles.desktop = {
        display: 'inline-block',
        fontSize: '48px',
        color: '#3b82f6',
      };
      break;
    case 'lottie':
      baseElement.attributes = {
        src: '', // Will be set by user
        loop: 'true',
        autoplay: 'true',
      };
      baseElement.styles.desktop = {
        display: 'block',
        width: '200px',
        height: '200px',
      };
      break;

    // Advanced Elements - Components
    case 'repeater':
      baseElement.attributes = {
        dataSource: '[]', // JSON array of data
        itemsPerRow: '3',
      };
      baseElement.styles.desktop = {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        padding: '20px',
      };
      // Add a default child template
      baseElement.children = [{
        id: generateId(),
        type: 'div',
        name: 'Repeater Item',
        children: [],
        styles: {
          desktop: {
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          },
          tablet: {},
          mobile: {},
        },
        content: 'Item Template - Will repeat for each data item',
      }];
      break;
    case 'modal':
      baseElement.attributes = {
        backdrop: 'true',
        closeButton: 'true',
      };
      baseElement.styles.desktop = {
        display: 'none', // Hidden by default
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 1000,
        maxWidth: '600px',
        width: '90%',
      };
      baseElement.content = 'Modal Content';
      break;

    // Advanced Elements - Interactive
    case 'tabs':
      baseElement.styles.desktop = {
        display: 'block',
      };
      // Create default tab structure
      baseElement.children = [
        {
          id: generateId(),
          type: 'div',
          name: 'Tab Headers',
          children: [],
          styles: {
            desktop: {
              display: 'flex',
              borderBottom: '2px solid #e5e7eb',
              marginBottom: '20px',
            },
            tablet: {},
            mobile: {},
          },
          content: 'Tab 1 | Tab 2 | Tab 3',
        },
        {
          id: generateId(),
          type: 'div',
          name: 'Tab Content',
          children: [],
          styles: {
            desktop: { padding: '20px' },
            tablet: {},
            mobile: {},
          },
          content: 'Tab content goes here',
        },
      ];
      break;
    case 'accordion':
      baseElement.styles.desktop = {
        display: 'block',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      };
      // Create default accordion item
      baseElement.children = [{
        id: generateId(),
        type: 'div',
        name: 'Accordion Item',
        children: [],
        styles: {
          desktop: {
            borderBottom: '1px solid #e5e7eb',
            padding: '16px',
          },
          tablet: {},
          mobile: {},
        },
        content: 'Click to expand/collapse',
      }];
      break;
    case 'toggle':
      baseElement.content = 'Toggle Content';
      baseElement.attributes = {
        isOpen: 'false',
      };
      baseElement.styles.desktop = {
        display: 'block',
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
      };
      break;
  }

  return baseElement;
};

const Canvas = () => {
  const { pages, currentPageId, addElement, currentBreakpoint, selectElement, rawHtmlTemplate, isTemplateMode, templateBasePath } = useBuilderStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize behavior tracker
  useEffect(() => {
    getBehaviorTracker();
    return () => {
      cleanupBehaviorTracker();
    };
  }, []);

  // Get current page's elements
  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];

  // Must call all hooks before any conditional returns
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ELEMENT',
    drop: (item: { elementType: ElementType }) => {
      const newElement = createDefaultElement(item.elementType);
      addElement(newElement);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  // Deselect when clicking canvas background
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  };

  // Get canvas width based on breakpoint
  const getCanvasWidth = () => {
    switch (currentBreakpoint) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  // If we're in template mode, render the template page via iframe src (supports multi-page navigation)
  if (isTemplateMode && templateBasePath && currentPage?.templateFile) {
    const iframeSrc = `${templateBasePath}${currentPage.templateFile}`;
    console.log('🖼️ Rendering template page:', currentPage.name, '→', iframeSrc);

    return (
      <div className="flex-1 overflow-auto bg-canvas-bg p-4">
        <div
          className="mx-auto bg-white transition-all duration-300"
          style={{
            width: getCanvasWidth(),
            height: 'calc(100vh - 120px)',
            boxShadow: '0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          <iframe
            ref={iframeRef}
            key={currentPage.id}
            src={iframeSrc}
            title={`Template Preview - ${currentPage.name}`}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    );
  }

  // If we have a raw HTML template (non-multi-page), render it via srcDoc
  if (rawHtmlTemplate) {
    console.log('🖼️ Rendering raw HTML template in iframe');

    return (
      <div className="flex-1 overflow-auto bg-canvas-bg p-4">
        <div
          className="mx-auto bg-white transition-all duration-300"
          style={{
            width: getCanvasWidth(),
            height: 'calc(100vh - 120px)',
            boxShadow: '0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={rawHtmlTemplate}
            title="Template Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas-bg p-8">
      <div
        ref={drop}
        onClick={handleCanvasClick}
        className={`mx-auto bg-white min-h-screen transition-all duration-300 ${
          isOver ? 'ring-2 ring-accent-blue' : ''
        }`}
        style={{
          width: getCanvasWidth(),
          boxShadow: '0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {elements.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-center p-8">
            <div>
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-lg font-medium">Drag elements here to start building</p>
              <p className="text-sm mt-2">Select elements from the left panel</p>
            </div>
          </div>
        ) : (
          elements.map((element) => (
            <CanvasElement key={element.id} element={element} />
          ))
        )}
      </div>
    </div>
  );
};

export default Canvas;