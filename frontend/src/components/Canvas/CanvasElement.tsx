import { CSSProperties, useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element, ElementType, StyleProperties } from '@/types/element.types';
import { useBehaviorModifications } from '@/hooks/useBehavior';
import { useInteractionHandlers } from '@/hooks/useInteractions';
import { useCMSStore } from '@/store/useCMSStore';

interface CanvasElementProps {
  element: Element;
}

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const createDefaultElement = (type: ElementType): Element => {
  // Reuse the same function from Canvas.tsx
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

  switch (type) {
    case 'div':
      baseElement.styles.desktop = { display: 'block', padding: '10px' };
      break;
    case 'text':
      baseElement.content = 'Text block';
      baseElement.styles.desktop = { fontSize: '16px' };
      break;
    case 'button':
      baseElement.content = 'Button';
      baseElement.styles.desktop = {
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        borderRadius: '6px',
      };
      break;
  }

  return baseElement;
};

const stylePropertiesToCSS = (styles: StyleProperties): CSSProperties => {
  return styles as CSSProperties;
};

const CanvasElement = ({ element }: CanvasElementProps) => {
  const {
    selectedElementId,
    hoveredElementId,
    selectElement,
    setHoveredElement,
    addElement,
    currentBreakpoint,
    updateElement,
    viewMode,
  } = useBuilderStore();

  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const editableRef = useRef<HTMLElement>(null);
  const elementRef = useRef<HTMLElement>(null);

  // Get behavior-based modifications (only in build/preview mode)
  const behaviorMods = useBehaviorModifications(element);

  // Get interaction handlers (for build/preview mode)
  const { handlers: interactionHandlers } = useInteractionHandlers(element, elementRef);

  const isSelected = selectedElementId === element.id;
  const isHovered = hoveredElementId === element.id;

  // Focus element when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      // Select all text for easy replacement
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  // Exit edit mode when element is deselected
  useEffect(() => {
    if (!isSelected && isEditing) {
      setIsEditing(false);
    }
  }, [isSelected, isEditing]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ELEMENT',
    drop: (item: { elementType: ElementType }, monitor) => {
      // Only drop if this is the most specific target
      const shallow = monitor.isOver({ shallow: true });
      console.log('🎯 CanvasElement drop:', item, 'targetElementId:', element.id, 'shallow:', shallow);
      if (shallow) {
        const newElement = createDefaultElement(item.elementType);
        addElement(newElement, element.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // In build mode, execute interactions instead of selecting
    if (viewMode === 'build') {
      interactionHandlers.onClick(e);
      return;
    }

    console.log('🖱️ Element clicked:', element.id, 'Type:', element.type, 'Name:', element.name);
    selectElement(element.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Enable editing for text-based elements or containers with content
    const editableTypes = ['heading', 'text', 'button', 'link'];
    const canEdit = editableTypes.includes(element.type) || (element.content && element.children.length === 0);
    console.log('🖱️🖱️ Double-click on:', element.id, 'Type:', element.type, 'Has content:', !!element.content, 'Can edit:', canEdit);
    if (canEdit) {
      setIsEditing(true);
      console.log('✏️ Editing mode enabled for:', element.name);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();

    // In build mode, execute hover interactions
    if (viewMode === 'build') {
      interactionHandlers.onMouseEnter(e);
    }

    setHoveredElement(element.id);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // In build mode, execute hover out interactions
    if (viewMode === 'build') {
      interactionHandlers.onMouseLeave(e);
    }

    setHoveredElement(null);
  };

  const handleContentEdit = (e: React.FocusEvent<HTMLElement>) => {
    const newContent = e.currentTarget.textContent || '';
    updateElement(element.id, { content: newContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      (e.target as HTMLElement).blur();
    }
  };

  // Merge styles from desktop -> tablet -> mobile based on current breakpoint
  const getComputedStyles = (): StyleProperties => {
    let computed = { ...element.styles.desktop };

    if (currentBreakpoint === 'tablet' || currentBreakpoint === 'mobile') {
      // Apply tablet styles but filter out display:none (keep elements visible in builder)
      const tabletStyles = { ...element.styles.tablet };
      if (tabletStyles.display === 'none') {
        delete tabletStyles.display;
      }
      computed = { ...computed, ...tabletStyles };
    }

    if (currentBreakpoint === 'mobile') {
      // Apply mobile styles but filter out display:none
      const mobileStyles = { ...element.styles.mobile };
      if (mobileStyles.display === 'none') {
        delete mobileStyles.display;
      }
      computed = { ...computed, ...mobileStyles };
    }

    return computed;
  };

  const computedStyles = getComputedStyles();
  let cssStyles = stylePropertiesToCSS(computedStyles);

  // Apply behavior-based style modifications in build mode
  if (viewMode === 'build' && behaviorMods.styles) {
    cssStyles = { ...cssStyles, ...behaviorMods.styles };
  }

  // Determine final content (with behavior override in build mode)
  const finalContent = (viewMode === 'build' && behaviorMods.content)
    ? behaviorMods.content
    : element.content;

  // Determine final attributes (with behavior override in build mode)
  const finalAttributes = (viewMode === 'build' && behaviorMods.attributes)
    ? { ...element.attributes, ...behaviorMods.attributes }
    : element.attributes;

  // Resolve CMS bindings in build/preview mode
  const { selectedItemId: cmsSelectedItemId, getItem: getCmsItem } = useCMSStore();
  let boundContent = finalContent;
  let boundAttributes = { ...finalAttributes };

  if (viewMode === 'build' && element.bindings) {
    // Text binding
    const textBinding = element.bindings['text'];
    if (textBinding && cmsSelectedItemId) {
      const cmsItem = getCmsItem(cmsSelectedItemId);
      if (cmsItem && cmsItem.collectionId === textBinding.collectionId) {
        const value = cmsItem.fieldData?.[textBinding.fieldKey];
        if (value !== undefined && value !== null) {
          boundContent = String(value);
        }
      }
    }

    // Src binding for images
    const srcBinding = element.bindings['src'];
    if (srcBinding && cmsSelectedItemId) {
      const cmsItem = getCmsItem(cmsSelectedItemId);
      if (cmsItem && cmsItem.collectionId === srcBinding.collectionId) {
        const value = cmsItem.fieldData?.[srcBinding.fieldKey];
        if (value) {
          boundAttributes = { ...boundAttributes, src: String(value) };
        }
      }
    }
  }

  // Use bound values if available
  const renderContent = boundContent;
  const renderAttributes = boundAttributes;

  // Hide element if behavior rules say so (build mode only)
  if (viewMode === 'build' && !behaviorMods.isVisible) {
    return null;
  }

  // Check if this element type is editable
  // Containers/sections/divs with content but no children are also editable
  const hasEditableContent = element.content && element.children.length === 0;
  const isEditableType = ['heading', 'text', 'button', 'link'].includes(element.type) || hasEditableContent;

  const className = `canvas-element ${isSelected ? 'selected-element' : ''} ${
    isHovered && !isSelected ? 'hovered-element' : ''
  } ${isOver ? 'ring-1 ring-accent-blue' : ''} ${isEditableType && isSelected ? 'editable-element' : ''} ${isEditing ? 'editing-element' : ''}`;

  // Render different elements based on type
  const renderElement = () => {
    const commonProps = {
      ref: (el: HTMLElement | null) => {
        drop(el);
        (elementRef as React.MutableRefObject<HTMLElement | null>).current = el;
      },
      className,
      style: cssStyles,
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      'data-element-id': element.id,
    };

    // Props for editable text elements
    const editableProps = {
      contentEditable: isEditing,
      suppressContentEditableWarning: true,
      onBlur: handleContentEdit,
      onKeyDown: handleKeyDown,
    };

    switch (element.type) {
      case 'container':
      case 'section':
      case 'div':
        // If container has content but no children, render the content (makes it editable)
        if (element.content && element.children.length === 0) {
          return (
            <div
              {...commonProps}
              {...editableProps}
              ref={(el) => {
                drop(el);
                (editableRef as React.MutableRefObject<HTMLElement | null>).current = el;
              }}
              dangerouslySetInnerHTML={!isEditing && finalContent ? { __html: finalContent } : undefined}
            >
              {isEditing ? (finalContent?.replace(/<[^>]*>/g, '') || 'Content') : (!finalContent ? undefined : undefined)}
            </div>
          );
        }
        // Check if element likely came from template import
        const hasAnyStyles = Object.keys(element.styles.desktop).length > 0 ||
          Object.keys(element.styles.tablet).length > 0 ||
          Object.keys(element.styles.mobile).length > 0;
        // Also check if name suggests it's from a template (not generic)
        const isTemplateElement = hasAnyStyles ||
          (element.name && !['Container', 'Div', 'Section', 'Wrapper'].includes(element.name));

        return (
          <div {...commonProps}>
            {element.children.length > 0 ? (
              element.children.map((child) => <CanvasElement key={child.id} element={child} />)
            ) : isTemplateElement ? (
              // Empty container from template - render nothing
              null
            ) : (
              <div className="text-gray-400 text-sm py-4 text-center">
                Drop elements here or click to add content
              </div>
            )}
          </div>
        );

      case 'heading':
        return (
          <h2
            {...commonProps}
            {...editableProps}
            ref={(el) => {
              drop(el);
              (editableRef as React.MutableRefObject<HTMLElement | null>).current = el;
            }}
          >
            {finalContent || 'Heading'}
          </h2>
        );

      case 'text':
          return (
            <p
              {...commonProps}
              {...editableProps}
              ref={(el) => {
                drop(el);
                (editableRef as React.MutableRefObject<HTMLElement | null>).current = el;
              }}
              dangerouslySetInnerHTML={!isEditing && renderContent ? { __html: renderContent } : undefined}
            >
              {isEditing ? (renderContent?.replace(/<[^>]*>/g, '') || 'Text') : (!renderContent ? 'Text' : undefined)}
            </p>
          );

      case 'button':
        return (
          <button
            {...commonProps}
            {...editableProps}
            ref={(el) => {
              drop(el);
              (editableRef as React.MutableRefObject<HTMLElement | null>).current = el;
            }}
            type="button"
          >
            {finalContent || 'Button'}
          </button>
        );

      case 'image':
        return (
          <img
            {...commonProps}
            src={renderAttributes?.src || 'https://via.placeholder.com/400x300'}
            alt={renderAttributes?.alt || 'Image'}
          />
        );

      case 'link':
        return (
          <a
            {...commonProps}
            {...editableProps}
            ref={(el) => {
              drop(el);
              (editableRef as React.MutableRefObject<HTMLElement | null>).current = el;
            }}
            href={finalAttributes?.href || '#'}
            target={finalAttributes?.target || '_self'}
            onClick={(e) => {
              e.preventDefault();
              handleClick(e);
            }}
          >
            {finalContent || 'Link'}
          </a>
        );

      // Advanced Elements - Assets
      case 'video':
        return (
          <video
            {...commonProps}
            src={finalAttributes?.src}
            controls={finalAttributes?.controls === 'true'}
          >
            Your browser does not support the video tag.
          </video>
        );

      case 'icon':
        return (
          <span
            {...commonProps}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleContentEdit}
          >
            {finalContent || '★'}
          </span>
        );

      case 'lottie':
        return (
          <div {...commonProps}>
            <div className="flex items-center justify-center h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Lottie Animation</p>
                <p className="text-xs mt-1">Configure source in properties</p>
              </div>
            </div>
          </div>
        );

      // Advanced Elements - Components
      case 'repeater':
        return (
          <div {...commonProps}>
            <div className="text-xs text-gray-500 mb-2 px-2">Repeater Component</div>
            {element.children.length > 0 ? (
              element.children.map((child) => <CanvasElement key={child.id} element={child} />)
            ) : (
              <div className="text-gray-400 text-sm py-4 text-center border-2 border-dashed border-gray-300 rounded">
                Drop a template element here
              </div>
            )}
          </div>
        );

      case 'modal':
        return (
          <div {...commonProps}>
            <div className="bg-white border-2 border-purple-300 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-purple-600">Modal</div>
                {finalAttributes?.closeButton === 'true' && (
                  <div className="text-gray-400">✕</div>
                )}
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={handleContentEdit}
                className="min-h-[60px]"
              >
                {finalContent || 'Modal content here'}
              </div>
            </div>
          </div>
        );

      // Advanced Elements - Interactive
      case 'tabs':
        return (
          <div {...commonProps}>
            {element.children.length > 0 ? (
              element.children.map((child) => <CanvasElement key={child.id} element={child} />)
            ) : (
              <div className="text-gray-400 text-sm py-4 text-center">
                Tabs component - Add tab headers and content
              </div>
            )}
          </div>
        );

      case 'accordion':
        return (
          <div {...commonProps}>
            {element.children.length > 0 ? (
              element.children.map((child) => <CanvasElement key={child.id} element={child} />)
            ) : (
              <div className="text-gray-400 text-sm py-4 text-center">
                Accordion - Add accordion items
              </div>
            )}
          </div>
        );

      case 'toggle':
        return (
          <div {...commonProps}>
            <div className="flex items-center justify-between">
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={handleContentEdit}
                className="flex-1"
              >
                {finalContent || 'Toggle to show/hide content'}
              </div>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        );

      default:
        return <div {...commonProps}>Unknown element type: {element.type}</div>;
    }
  };

  return renderElement();
};

export default CanvasElement;
