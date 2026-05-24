import { useEffect, useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useBuilderStore } from '@/store/useBuilderStore';
import { useCMSStore } from '@/store/useCMSStore';
import * as cmsApi from '@/api/cms';
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
  const { pages, currentPageId, addElement, currentBreakpoint, selectElement, rawHtmlTemplate, isTemplateMode, templateBasePath, setTemplateSelectedElement, setTemplateDomTree, setTemplatePageHtml, setCurrentPage, selectedElementId, deleteElement, templateSelectedElement } = useBuilderStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize behavior tracker
  useEffect(() => {
    getBehaviorTracker();
    return () => {
      cleanupBehaviorTracker();
    };
  }, []);

  // Delete selected element on Delete/Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      // Don't delete if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      if (isTemplateMode) {
        // Template mode: send delete command to iframe
        if (!templateSelectedElement) return;
        e.preventDefault();
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'BUILDER_DELETE_ELEMENT' }, '*');
        }
      } else {
        // Element mode: delete from store
        if (!selectedElementId) return;
        e.preventDefault();
        deleteElement(selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTemplateMode, selectedElementId, deleteElement, templateSelectedElement]);

  // Get current page's elements
  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];

  // Fetch CMS data and send to iframe for preview rendering
  const sendCMSPreviewToIframe = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const projectId = useCMSStore.getState().projectId;
    if (!projectId) return;

    try {
      const collections = await cmsApi.getCollections(projectId);
      if (collections.length === 0) return;

      const cmsContext: { collections: Record<string, { items: Array<{ slug: string; fieldData: Record<string, any> }> }> } = { collections: {} };

      for (const col of collections) {
        const result = await cmsApi.getItems(projectId, col._id, { status: 'published' as any, limit: 100 });
        cmsContext.collections[col.slug] = {
          items: result.items.map(item => ({
            slug: item.slug,
            fieldData: item.fieldData || {},
          })),
        };
      }

      // Only send if we have data
      if (Object.keys(cmsContext.collections).length > 0) {
        iframe.contentWindow.postMessage({ type: 'RENDER_CMS_PREVIEW', cmsContext }, '*');
        console.log('📦 Sent CMS preview data to iframe');
      }
    } catch (err) {
      console.error('Failed to load CMS preview data:', err);
    }
  }, []);

  // Inject nav-block and click-to-edit scripts into template iframe after it loads
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || (!isTemplateMode && !rawHtmlTemplate)) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.head) return;

      // Guard against double injection
      const iframeWin = iframe.contentWindow as any;
      if (iframeWin?.__editBridgeInjected) return;
      if (iframeWin) iframeWin.__editBridgeInjected = true;

      // Multi-page mode: anchor clicks should send TEMPLATE_LINK_CLICK for in-editor page navigation
      const isMultiPage = !!templateBasePath;

      // ── SCRIPT 1: Nav-block (injected FIRST, useCapture:true) ──────────────
      // Blocks all real browser navigation while preserving multi-page postMessage routing
      const navBlockScript = [
        '(function() {',
        '  var multiPageMode = ' + isMultiPage + ';',
        '',
        '  // Block all anchor clicks — send postMessage for multi-page nav instead of navigating',
        '  document.addEventListener("click", function(e) {',
        '    var anchor = e.target.closest("a");',
        '    if (anchor) {',
        '      e.preventDefault();',
        '      e.stopPropagation();',
        '      if (multiPageMode) {',
        '        window.parent.postMessage({',
        '          type: "TEMPLATE_LINK_CLICK",',
        '          href: anchor.getAttribute("href") || ""',
        '        }, "*");',
        '      }',
        '      return false;',
        '    }',
        '  }, true);',
        '',
        '  // Block all form submissions',
        '  document.addEventListener("submit", function(e) {',
        '    e.preventDefault();',
        '    e.stopPropagation();',
        '    return false;',
        '  }, true);',
        '',
        '  // Block window.location changes',
        '  try {',
        '    window.location.assign = function() { return; };',
        '    window.location.replace = function() { return; };',
        '  } catch(ex) {}',
        '',
        '  // Block Webflow page transitions',
        '  window.Webflow = window.Webflow || {};',
        '  window.Webflow.location = function() { return; };',
        '',
        '})();',
      ].join('\n');

      const navEl = iframeDoc.createElement('script');
      navEl.textContent = navBlockScript;
      // Insert as FIRST child of head so it runs before any other scripts
      iframeDoc.head.insertBefore(navEl, iframeDoc.head.firstChild);

      // ── SCRIPT 2: Click-to-edit (injected SECOND, no useCapture) ───────────
      // Fires after nav-block capture phase; walks up the DOM to find the nearest
      // meaningful editable element (handles buttons, anchors, spans inside buttons, etc.)
      const editScript = [
        '(function() {',
        '  var currentEditable = null;',
        '',
        '  document.addEventListener("click", function(e) {',
        '    // Blur any previously active editable',
        '    if (currentEditable && currentEditable !== e.target) {',
        '      currentEditable.contentEditable = "false";',
        '      currentEditable.style.outline = "";',
        '      currentEditable.style.outlineOffset = "";',
        '      currentEditable = null;',
        '    }',
        '',
        '    var target = e.target;',
        '    var editableTags = ["P","H1","H2","H3","H4","H5","H6","SPAN","LI","BUTTON","A","TD","TH","LABEL","DIV"];',
        '    var found = null;',
        '',
        '    // Walk up the DOM to find the nearest meaningful editable element',
        '    while (target && target !== document.body && target !== document.documentElement) {',
        '      if (editableTags.indexOf(target.tagName) !== -1) {',
        '        if (target.tagName === "DIV") {',
        '          // Only make DIVs editable if they contain direct text nodes',
        '          var hasText = Array.from(target.childNodes).some(function(n) {',
        '            return n.nodeType === 3 && n.textContent.trim().length > 0;',
        '          });',
        '          if (hasText) { found = target; break; }',
        '          target = target.parentElement;',
        '          continue;',
        '        }',
        '        found = target;',
        '        break;',
        '      }',
        '      target = target.parentElement;',
        '    }',
        '',
        '    if (found) {',
        '      e.preventDefault();',
        '      found.contentEditable = "true";',
        '      found.style.outline = "2px solid #00CFFF";',
        '      found.style.outlineOffset = "2px";',
        '      found.focus();',
        '      currentEditable = found;',
        '',
        '      found.addEventListener("blur", function() {',
        '        found.contentEditable = "false";',
        '        found.style.outline = "";',
        '        found.style.outlineOffset = "";',
        '        currentEditable = null;',
        '        window.parent.postMessage({',
        '          type: "HTML_UPDATED",',
        '          html: document.documentElement.outerHTML',
        '        }, "*");',
        '      }, { once: true });',
        '    }',
        '  }); // no useCapture — fires after nav-block capture phase',
        '',
        '  window.parent.postMessage({ type: "TEMPLATE_BRIDGE_READY" }, "*");',
        '})();',
      ].join('\n');

      const editEl = iframeDoc.createElement('script');
      editEl.textContent = editScript;
      iframeDoc.head.appendChild(editEl);

      // Send CMS data after bridge has time to initialize
      setTimeout(sendCMSPreviewToIframe, 300);
    } catch (err) {
      console.error('Failed to inject editing bridge:', err);
    }
  }, [isTemplateMode, rawHtmlTemplate, templateBasePath, sendCMSPreviewToIframe]);

  // Listen for add-element events from ElementsLibrary (click-to-add in template mode)
  useEffect(() => {
    if (!isTemplateMode) return;

    const handleAddElement = (event: Event) => {
      const customEvent = event as CustomEvent<{ elementType: string }>;
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      // Send message to iframe to add the element
      iframe.contentWindow.postMessage({
        type: 'BUILDER_ADD_ELEMENT',
        elementType: customEvent.detail.elementType
      }, '*');
    };

    window.addEventListener('builder:add-element-to-template', handleAddElement);
    return () => window.removeEventListener('builder:add-element-to-template', handleAddElement);
  }, [isTemplateMode]);

  // Listen for messages from the iframe editing bridge
  useEffect(() => {
    if (!isTemplateMode) return;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'TEMPLATE_BRIDGE_READY':
          console.log('✅ Template editing bridge ready');
          break;

        case 'HTML_UPDATED':
          if (msg.html && currentPageId) {
            setTemplatePageHtml(currentPageId, msg.html);
          }
          break;

        case 'TEMPLATE_ELEMENT_SELECTED':
          setTemplateSelectedElement({
            path: msg.path,
            tag: msg.tag,
            label: msg.label,
            text: msg.text,
            isTextEditable: msg.isTextEditable,
            styles: msg.styles,
            innerHTML: msg.innerHTML || '',
          });
          break;

        case 'TEMPLATE_EDITING_START':
          console.log('✏️ Editing started:', msg.path);
          break;

        case 'TEMPLATE_EDITING_END':
          console.log('✅ Editing ended:', msg.path, '→', msg.text?.substring(0, 50));
          break;

        case 'TEMPLATE_STYLES_UPDATED':
          // Update the selected element's styles in store
          setTemplateSelectedElement({
            ...useBuilderStore.getState().templateSelectedElement!,
            styles: msg.styles,
          });
          break;

        case 'TEMPLATE_LINK_CLICK': {
          // Save current page's HTML before navigating away (preserves deletions, edits, etc.)
          const iframe = iframeRef.current;
          if (iframe?.contentDocument && currentPageId) {
            const currentHtml = iframe.contentDocument.documentElement.outerHTML;
            setTemplatePageHtml(currentPageId, currentHtml);
          }

          const href = msg.href || '';
          // Normalize: strip ./, /templates/xxx/ prefix, query strings, anchors
          let targetFile = href.split('?')[0].split('#')[0];
          targetFile = targetFile.replace(/^\.\//, '');
          if (templateBasePath) {
            targetFile = targetFile.replace(
              new RegExp('^' + templateBasePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
              ''
            );
          }
          targetFile = targetFile.replace(/^\//, '');

          // Find matching page and navigate
          const targetPage = pages.find(p => p.templateFile === targetFile);
          if (targetPage && targetPage.id !== currentPageId) {
            setCurrentPage(targetPage.id);
          }
          break;
        }

        case 'TEMPLATE_ELEMENT_ADDED':
          console.log('✅ Element added to template:', msg.tag, 'at', msg.path);
          break;

        case 'TEMPLATE_ELEMENT_DELETED':
          console.log('🗑️ Element deleted from template:', msg.tag, msg.label);
          setTemplateSelectedElement(null);
          // Sync updated HTML back to the store so it persists on save
          if (msg.updatedHtml && currentPageId) {
            setTemplatePageHtml(currentPageId, msg.updatedHtml);
          }
          break;

        case 'TEMPLATE_DOM_TREE':
          setTemplateDomTree(msg.tree || []);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isTemplateMode, setTemplateSelectedElement, setTemplateDomTree, setTemplatePageHtml, setCurrentPage, pages, currentPageId, templateBasePath]);

  // Re-send CMS preview data when CMS items change or page navigates
  const cmsItems = useCMSStore(state => state.items);
  useEffect(() => {
    if (!isTemplateMode) return;
    // Debounce to avoid rapid re-sends during bulk updates
    const timer = setTimeout(() => {
      sendCMSPreviewToIframe();
    }, 500);
    return () => clearTimeout(timer);
  }, [isTemplateMode, cmsItems, sendCMSPreviewToIframe]);

  // Must call all hooks before any conditional returns
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ELEMENT',
    drop: (item: { elementType: ElementType }) => {
      console.log('🎯 Canvas drop received:', item);
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

  // If we're in template mode, render the template page via iframe src (supports multi-page navigation + editing)
  // Use srcDoc when the page has modified rawHtml (preserves deletions/edits), otherwise load from disk.
  // When using srcDoc, inject a <base> tag so relative asset paths (CSS, images, JS) resolve correctly.
  if (isTemplateMode && templateBasePath && currentPage?.templateFile) {
    const iframeSrc = `${templateBasePath}${currentPage.templateFile}`;
    const useModifiedHtml = !!currentPage.rawHtml;

    // Inject <base href> into stored HTML so relative paths resolve against the template directory
    let srcDocHtml: string | undefined;
    if (useModifiedHtml && currentPage.rawHtml) {
      const baseTag = `<base href="${templateBasePath}">`;
      const html = currentPage.rawHtml;
      if (html.includes('<head>')) {
        srcDocHtml = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        srcDocHtml = html.replace('<HEAD>', `<HEAD>${baseTag}`);
      } else {
        // Fallback: prepend base tag
        srcDocHtml = baseTag + html;
      }
    }

    return (
      <div className="flex-1 overflow-auto bg-canvas-bg p-4 transition-colors duration-300">
        <div
          className="mx-auto bg-white transition-all duration-300"
          style={{
            width: getCanvasWidth(),
            height: 'calc(100vh - 120px)',
            boxShadow: '0 0 30px var(--shadow-color)',
          }}
        >
          {/* stopPropagation wrapper prevents iframe clicks from bubbling into React and triggering state updates */}
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%' }}>
            <iframe
              ref={iframeRef}
              key={currentPage.id}
              {...(srcDocHtml ? { srcDoc: srcDocHtml } : { src: iframeSrc })}
              onLoad={handleIframeLoad}
              title={`Template Preview - ${currentPage.name}`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    );
  }

  // If we have a raw HTML template (non-multi-page), render it via srcDoc
  if (rawHtmlTemplate) {

    return (
      <div className="flex-1 overflow-auto bg-canvas-bg p-4 transition-colors duration-300">
        <div
          className="mx-auto bg-white transition-all duration-300"
          style={{
            width: getCanvasWidth(),
            height: 'calc(100vh - 120px)',
            boxShadow: '0 0 30px var(--shadow-color)',
          }}
        >
          {/* stopPropagation wrapper prevents iframe clicks from bubbling into React and triggering state updates */}
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%' }}>
            <iframe
              ref={iframeRef}
              srcDoc={rawHtmlTemplate}
              onLoad={handleIframeLoad}
              title="Template Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-canvas-bg p-8 transition-colors duration-300">
      <div
        ref={drop}
        onClick={handleCanvasClick}
        className={`mx-auto bg-white min-h-screen transition-all duration-300 ${
          isOver ? 'ring-2 ring-accent-blue' : ''
        }`}
        style={{
          width: getCanvasWidth(),
          boxShadow: '0 0 30px var(--shadow-color)',
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