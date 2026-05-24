/**
 * Iframe Edit Bridge
 *
 * This script is injected into template iframes to enable editing capabilities.
 * It communicates with the parent builder via postMessage.
 *
 * Features:
 * - Hover highlight on elements
 * - Click to select elements
 * - Double-click to edit text inline
 * - Sends selection/edit events to parent
 */

export function getIframeEditBridgeScript(): string {
  return `
(function() {
  // Guard against double-initialization (when loaded via srcDoc with bridge already in HTML)
  if (window.__geniBridgeActive) return;
  window.__geniBridgeActive = true;

  // Prevent default link navigation inside the iframe
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.getAttribute('href')) {
      var href = link.getAttribute('href');
      // Allow anchor links
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      e.preventDefault();
      e.stopPropagation();
      // Notify parent about link click (for page navigation)
      window.parent.postMessage({
        type: 'TEMPLATE_LINK_CLICK',
        href: href
      }, '*');
    }
  }, true);

  // --- Styles ---
  var style = document.createElement('style');
  style.textContent = \`
    [data-builder-hover] {
      outline: 2px solid rgba(59, 130, 246, 0.5) !important;
      outline-offset: -1px;
    }
    [data-builder-selected] {
      outline: 2px solid #3b82f6 !important;
      outline-offset: -1px;
      position: relative;
    }
    [data-builder-selected]::after {
      content: attr(data-builder-tag);
      position: absolute;
      top: -22px;
      left: -1px;
      background: #3b82f6;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px 3px 0 0;
      font-family: -apple-system, sans-serif;
      pointer-events: none;
      z-index: 99999;
      white-space: nowrap;
    }
    [data-builder-editing] {
      outline: 2px solid #f59e0b !important;
      outline-offset: -1px;
      cursor: text !important;
      min-height: 1em;
    }
    [data-builder-geni-highlight] {
      outline: 3px solid #F59E0B !important;
      outline-offset: 3px;
      box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2) !important;
      animation: geni-highlight-pulse 1.2s ease-in-out infinite;
    }
    @keyframes geni-highlight-pulse {
      0%, 100% { outline-color: #F59E0B; box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2); }
      50% { outline-color: #FCD34D; box-shadow: 0 0 0 8px rgba(252, 211, 77, 0.3); }
    }
    .builder-overlay-hidden * {
      pointer-events: auto !important;
    }
  \`;
  document.head.appendChild(style);

  // --- State ---
  var hoveredEl = null;
  var selectedEl = null;
  var editingEl = null;

  // Build a unique path for an element (CSS selector path)
  function getElementPath(el) {
    var path = [];
    while (el && el !== document.body && el !== document.documentElement) {
      var tag = el.tagName.toLowerCase();
      if (el.id) {
        path.unshift(tag + '#' + el.id);
        break;
      }
      var parent = el.parentElement;
      if (parent) {
        var index = Array.from(parent.children).indexOf(el);
        path.unshift(tag + ':nth-child(' + (index + 1) + ')');
      } else {
        path.unshift(tag);
      }
      el = parent;
    }
    return path.join(' > ');
  }

  // Get a readable tag name for the selection label
  function getTagLabel(el) {
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === 'string'
      ? el.className.split(' ').filter(function(c) { return c && !c.startsWith('w-') && !c.startsWith('data-'); }).slice(0, 2).join('.')
      : '';
    if (cls) return tag + '.' + cls;
    if (el.id) return tag + '#' + el.id;
    return tag;
  }

  // Get computed styles for an element
  function getComputedStylesObj(el) {
    var computed = window.getComputedStyle(el);
    var styles = {};
    var props = [
      'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight',
      'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration', 'textTransform',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'width', 'height', 'maxWidth', 'minHeight',
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      'border', 'borderRadius', 'boxShadow', 'opacity',
      'overflow', 'backgroundImage', 'backgroundSize', 'backgroundPosition'
    ];
    props.forEach(function(prop) {
      styles[prop] = computed.getPropertyValue(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      );
    });
    return styles;
  }

  // Skip non-content elements
  function isSkippable(el) {
    if (!el || !el.tagName) return true;
    var tag = el.tagName.toLowerCase();
    return tag === 'html' || tag === 'body' || tag === 'head' ||
           tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta';
  }

  // Build a lightweight tree representation of visible DOM elements
  function buildDOMTree(root) {
    var result = [];
    var children = root ? root.children : [];
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (isSkippable(el)) continue;
      // Skip builder-injected style element
      if (el.tagName.toLowerCase() === 'style' && el.textContent && el.textContent.indexOf('data-builder') !== -1) continue;

      var directText = '';
      for (var j = 0; j < el.childNodes.length; j++) {
        if (el.childNodes[j].nodeType === 3) {
          var t = el.childNodes[j].textContent.trim();
          if (t) { directText += (directText ? ' ' : '') + t; }
        }
      }

      result.push({
        path: getElementPath(el),
        tag: el.tagName.toLowerCase(),
        label: getTagLabel(el),
        children: buildDOMTree(el),
        textPreview: directText.substring(0, 50)
      });
    }
    return result;
  }

  function sendDOMTree() {
    var tree = buildDOMTree(document.body);
    window.parent.postMessage({
      type: 'TEMPLATE_DOM_TREE',
      tree: tree
    }, '*');
  }

  // Extract a content map: all text elements + images so Geni knows what's on the page
  function extractContentMap() {
    var texts = [];
    var TEXT_TAGS = 'h1,h2,h3,h4,h5,h6,p,button,a,li,label,th,td,blockquote,figcaption,span';
    try {
      var els = document.querySelectorAll(TEXT_TAGS);
      for (var i = 0; i < els.length && texts.length < 80; i++) {
        var el = els[i];
        if (el.closest('script') || el.closest('style') || el.closest('noscript')) continue;
        // Skip builder-injected elements
        if (el.hasAttribute('data-builder-selected') || el.hasAttribute('data-builder-hover')) continue;
        // Skip empty or whitespace-only
        var text = (el.textContent || '').trim();
        if (!text || text.length < 2) continue;
        // Skip very long spans that are likely just wrappers
        if (el.tagName.toLowerCase() === 'span' && el.children.length > 2) continue;
        texts.push({
          selector: getElementPath(el),
          tag: el.tagName.toLowerCase(),
          classes: (typeof el.className === 'string') ? el.className.split(' ').filter(Boolean).slice(0, 3).join(' ') : '',
          text: text.substring(0, 120)
        });
      }
    } catch(ex) {}

    var images = [];
    try {
      // <img> elements
      var imgEls = document.querySelectorAll('img');
      for (var j = 0; j < imgEls.length && images.length < 25; j++) {
        var img = imgEls[j];
        var src = img.getAttribute('src') || '';
        images.push({
          selector: getElementPath(img),
          tag: 'img',
          alt: img.getAttribute('alt') || '',
          classes: (typeof img.className === 'string') ? img.className.split(' ').filter(Boolean).slice(0, 3).join(' ') : '',
          src: src.startsWith('data:') ? '[embedded-image]' : src.substring(0, 150)
        });
      }
      // Elements with CSS background-image
      var allEls = document.querySelectorAll('[style]');
      for (var k = 0; k < allEls.length && images.length < 30; k++) {
        var bgEl = allEls[k];
        var bgImg = bgEl.style.backgroundImage;
        if (!bgImg || bgImg === 'none') continue;
        images.push({
          selector: getElementPath(bgEl),
          tag: bgEl.tagName.toLowerCase(),
          alt: '',
          classes: (typeof bgEl.className === 'string') ? bgEl.className.split(' ').filter(Boolean).slice(0, 3).join(' ') : '',
          src: bgImg.startsWith('url("data:') ? '[embedded-bg-image]' : bgImg.substring(0, 150),
          isBackground: true
        });
      }
    } catch(ex) {}

    window.parent.postMessage({ type: 'TEMPLATE_CONTENT_MAP', texts: texts, images: images }, '*');
  }

  // Is element text-editable?
  function isTextEditable(el) {
    var tag = el.tagName.toLowerCase();
    var textTags = ['h1','h2','h3','h4','h5','h6','p','span','a','button','li','label','div'];
    if (!textTags.includes(tag)) return false;
    // Check if it has direct text content (not just child elements)
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) {
        return true;
      }
    }
    // Also editable if it only has inline children
    if (el.children.length === 0 && el.textContent.trim()) return true;
    return false;
  }

  // --- Hover ---
  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (isSkippable(el)) return;
    if (el === selectedEl || el === editingEl) return;

    if (hoveredEl && hoveredEl !== el) {
      hoveredEl.removeAttribute('data-builder-hover');
    }
    hoveredEl = el;
    el.setAttribute('data-builder-hover', '');
  });

  document.addEventListener('mouseout', function(e) {
    if (hoveredEl) {
      hoveredEl.removeAttribute('data-builder-hover');
      hoveredEl = null;
    }
  });

  // --- Click to Select ---
  document.addEventListener('click', function(e) {
    if (editingEl) return; // Don't change selection while editing

    var el = e.target;
    if (isSkippable(el)) return;
    e.preventDefault();
    e.stopPropagation();

    // Deselect previous
    if (selectedEl) {
      selectedEl.removeAttribute('data-builder-selected');
      selectedEl.removeAttribute('data-builder-tag');
    }

    selectedEl = el;
    el.setAttribute('data-builder-selected', '');
    el.setAttribute('data-builder-tag', getTagLabel(el));

    // Send selection info to parent
    var rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: 'TEMPLATE_ELEMENT_SELECTED',
      path: getElementPath(el),
      tag: el.tagName.toLowerCase(),
      label: getTagLabel(el),
      text: el.textContent ? el.textContent.substring(0, 100) : '',
      isTextEditable: isTextEditable(el),
      styles: getComputedStylesObj(el),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      hasChildren: el.children.length > 0,
      innerHTML: el.innerHTML.substring(0, 500)
    }, '*');
  }, true);

  // --- Double-click to Edit Text ---
  document.addEventListener('dblclick', function(e) {
    var el = e.target;
    if (isSkippable(el)) return;
    if (!isTextEditable(el)) return;

    e.preventDefault();
    e.stopPropagation();

    // Stop editing previous
    if (editingEl) {
      finishEditing();
    }

    editingEl = el;
    el.setAttribute('data-builder-editing', '');
    el.setAttribute('contenteditable', 'true');
    el.focus();

    // Select all text
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    window.parent.postMessage({
      type: 'TEMPLATE_EDITING_START',
      path: getElementPath(el),
      text: el.textContent
    }, '*');
  });

  function finishEditing() {
    if (!editingEl) return;
    editingEl.removeAttribute('data-builder-editing');
    editingEl.removeAttribute('contenteditable');

    window.parent.postMessage({
      type: 'TEMPLATE_EDITING_END',
      path: getElementPath(editingEl),
      text: editingEl.textContent,
      innerHTML: editingEl.innerHTML
    }, '*');
    editingEl = null;
  }

  // Finish editing on Enter (for headings/buttons) or click outside
  document.addEventListener('keydown', function(e) {
    if (editingEl) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        var tag = editingEl.tagName.toLowerCase();
        if (['h1','h2','h3','h4','h5','h6','button','a','span','label'].includes(tag)) {
          e.preventDefault();
          finishEditing();
        }
      }
      return; // Don't process Delete while editing text
    }

    // Delete/Backspace to remove selected element
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl && !editingEl) {
      e.preventDefault();
      deleteSelectedElement();
    }
  });

  // Delete the currently selected element
  function deleteSelectedElement() {
    if (!selectedEl) return;
    var path = getElementPath(selectedEl);
    var tag = selectedEl.tagName.toLowerCase();
    var label = getTagLabel(selectedEl);

    // Remove from DOM
    var parent = selectedEl.parentElement;
    if (parent) {
      parent.removeChild(selectedEl);
    }

    // Clear selection
    selectedEl = null;
    hoveredEl = null;

    // Notify parent with updated HTML so the store stays in sync
    window.parent.postMessage({
      type: 'TEMPLATE_ELEMENT_DELETED',
      path: path,
      tag: tag,
      label: label,
      updatedHtml: document.documentElement.outerHTML
    }, '*');

    // Re-send updated DOM tree
    sendDOMTree();
  }

  // --- Listen for commands from parent ---
  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'BUILDER_UPDATE_STYLE') {
      // Apply style change to selected element
      if (selectedEl && msg.property && msg.value !== undefined) {
        selectedEl.style[msg.property] = msg.value;
        // Send updated styles back
        window.parent.postMessage({
          type: 'TEMPLATE_STYLES_UPDATED',
          path: getElementPath(selectedEl),
          styles: getComputedStylesObj(selectedEl)
        }, '*');
      }
    }

    if (msg.type === 'BUILDER_DESELECT') {
      if (editingEl) finishEditing();
      if (selectedEl) {
        selectedEl.removeAttribute('data-builder-selected');
        selectedEl.removeAttribute('data-builder-tag');
        selectedEl = null;
      }
    }

    if (msg.type === 'BUILDER_SELECT_PATH') {
      // Select element by CSS path
      try {
        var el = document.querySelector(msg.path);
        if (el) {
          if (selectedEl) {
            selectedEl.removeAttribute('data-builder-selected');
            selectedEl.removeAttribute('data-builder-tag');
          }
          selectedEl = el;
          el.setAttribute('data-builder-selected', '');
          el.setAttribute('data-builder-tag', getTagLabel(el));
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch(ex) {}
    }

    if (msg.type === 'BUILDER_UPDATE_TEXT') {
      if (selectedEl && msg.text !== undefined) {
        selectedEl.textContent = msg.text;
      }
    }

    if (msg.type === 'BUILDER_UPDATE_ATTRIBUTE') {
      if (selectedEl && msg.attribute && msg.value !== undefined) {
        if (msg.attribute === 'src' || msg.attribute === 'href' || msg.attribute === 'alt') {
          selectedEl.setAttribute(msg.attribute, msg.value);
        }
      }
    }

    if (msg.type === 'BUILDER_DELETE_ELEMENT') {
      deleteSelectedElement();
    }

    if (msg.type === 'BUILDER_ADD_ELEMENT') {
      // Add a new element to the template
      var elementType = msg.elementType;
      var newEl = null;

      switch (elementType) {
        case 'container':
          newEl = document.createElement('div');
          newEl.style.cssText = 'max-width: 1200px; margin: 0 auto; padding: 20px;';
          newEl.textContent = 'Container';
          break;
        case 'section':
          newEl = document.createElement('section');
          newEl.style.cssText = 'width: 100%; padding: 40px 20px;';
          newEl.textContent = 'Section';
          break;
        case 'div':
          newEl = document.createElement('div');
          newEl.style.cssText = 'padding: 10px;';
          newEl.textContent = 'Div Block';
          break;
        case 'heading':
          newEl = document.createElement('h2');
          newEl.style.cssText = 'font-size: 32px; font-weight: 700; margin-bottom: 16px;';
          newEl.textContent = 'Heading';
          break;
        case 'text':
          newEl = document.createElement('p');
          newEl.style.cssText = 'font-size: 16px; line-height: 1.6;';
          newEl.textContent = 'This is a text block. Click to edit.';
          break;
        case 'button':
          newEl = document.createElement('button');
          newEl.style.cssText = 'display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;';
          newEl.textContent = 'Click Me';
          break;
        case 'image':
          newEl = document.createElement('img');
          newEl.src = 'https://via.placeholder.com/400x300';
          newEl.alt = 'Placeholder image';
          newEl.style.cssText = 'display: block; width: 100%; max-width: 400px;';
          break;
        case 'link':
          newEl = document.createElement('a');
          newEl.href = '#';
          newEl.style.cssText = 'color: #3b82f6; text-decoration: underline;';
          newEl.textContent = 'Link';
          break;
        case 'video':
          newEl = document.createElement('video');
          newEl.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
          newEl.controls = true;
          newEl.style.cssText = 'display: block; width: 100%; max-width: 800px;';
          break;
        default:
          newEl = document.createElement('div');
          newEl.style.cssText = 'padding: 10px; border: 1px dashed #ccc;';
          newEl.textContent = elementType + ' element';
      }

      if (newEl) {
        // If there's a selected element, insert after it; otherwise append to body
        if (selectedEl && selectedEl.parentElement) {
          selectedEl.parentElement.insertBefore(newEl, selectedEl.nextSibling);
        } else {
          // Find main content area or body
          var main = document.querySelector('main') || document.body;
          main.appendChild(newEl);
        }

        // Select the new element
        if (selectedEl) {
          selectedEl.removeAttribute('data-builder-selected');
          selectedEl.removeAttribute('data-builder-tag');
        }
        selectedEl = newEl;
        newEl.setAttribute('data-builder-selected', '');
        newEl.setAttribute('data-builder-tag', getTagLabel(newEl));

        // Scroll to the new element
        newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Notify parent about the new selection
        window.parent.postMessage({
          type: 'TEMPLATE_ELEMENT_ADDED',
          path: getElementPath(newEl),
          tag: newEl.tagName.toLowerCase(),
          label: getTagLabel(newEl)
        }, '*');

        // Also send selection info
        window.parent.postMessage({
          type: 'TEMPLATE_ELEMENT_SELECTED',
          path: getElementPath(newEl),
          tag: newEl.tagName.toLowerCase(),
          label: getTagLabel(newEl),
          text: newEl.textContent ? newEl.textContent.substring(0, 100) : '',
          isTextEditable: isTextEditable(newEl),
          styles: getComputedStylesObj(newEl),
          hasChildren: newEl.children.length > 0,
          innerHTML: newEl.innerHTML.substring(0, 500)
        }, '*');

        // Re-send updated DOM tree
        sendDOMTree();
      }
    }

    if (msg.type === 'BUILDER_DELETE_PATH') {
      // Delete element by CSS path directly (without needing to select first)
      try {
        var targetEl = document.querySelector(msg.path);
        if (targetEl && targetEl.parentElement) {
          var deletePath = getElementPath(targetEl);
          var deleteTag = targetEl.tagName.toLowerCase();
          var deleteLabel = getTagLabel(targetEl);

          if (targetEl === selectedEl) selectedEl = null;
          if (targetEl === hoveredEl) hoveredEl = null;

          targetEl.parentElement.removeChild(targetEl);

          window.parent.postMessage({
            type: 'TEMPLATE_ELEMENT_DELETED',
            path: deletePath,
            tag: deleteTag,
            label: deleteLabel,
            updatedHtml: document.documentElement.outerHTML
          }, '*');

          sendDOMTree();
        }
      } catch(ex) {}
    }

    if (msg.type === 'BUILDER_REQUEST_DOM_TREE') {
      sendDOMTree();
    }

    // --- Geni: selector-based element targeting (no click-to-select required) ---

    if (msg.type === 'BUILDER_REQUEST_CONTENT_MAP') {
      extractContentMap();
    }

    if (msg.type === 'BUILDER_FIND_AND_UPDATE_TEXT') {
      // Update text of element found by CSS selector
      if (msg.selector && msg.text !== undefined) {
        try {
          var targetEl = document.querySelector(msg.selector);
          if (targetEl) {
            // If element has only text content or simple inline children, update textContent
            // If it has block children, try to update the first text node only
            var hasBlockChildren = false;
            for (var ci = 0; ci < targetEl.children.length; ci++) {
              var child = targetEl.children[ci];
              var childTag = child.tagName.toLowerCase();
              if (['div','section','article','header','footer','nav','ul','ol','table','form','figure'].indexOf(childTag) !== -1) {
                hasBlockChildren = true; break;
              }
            }
            if (!hasBlockChildren) {
              targetEl.textContent = msg.text;
            } else {
              // Update only the first direct text node
              for (var ni = 0; ni < targetEl.childNodes.length; ni++) {
                if (targetEl.childNodes[ni].nodeType === 3 && targetEl.childNodes[ni].textContent.trim()) {
                  targetEl.childNodes[ni].textContent = msg.text;
                  break;
                }
              }
            }
            window.parent.postMessage({ type: 'TEMPLATE_TEXT_UPDATED', selector: msg.selector, text: msg.text }, '*');
          } else {
            window.parent.postMessage({ type: 'TEMPLATE_FIND_FAILED', selector: msg.selector, reason: 'No element matched selector' }, '*');
          }
        } catch(ex) {
          window.parent.postMessage({ type: 'TEMPLATE_FIND_FAILED', selector: msg.selector, reason: String(ex) }, '*');
        }
      }
    }

    if (msg.type === 'BUILDER_FIND_AND_UPDATE_ATTR') {
      // Update attribute of element found by CSS selector
      if (msg.selector && msg.attribute && msg.value !== undefined) {
        try {
          var attrEl = document.querySelector(msg.selector);
          if (attrEl) {
            var SAFE_ATTRS = ['src','href','alt','title','placeholder','action','data-src'];
            if (SAFE_ATTRS.indexOf(msg.attribute) !== -1) {
              attrEl.setAttribute(msg.attribute, msg.value);
              // For background-image updates (special case)
              if (msg.attribute === 'bg-src') {
                attrEl.style.backgroundImage = 'url("' + msg.value + '")';
              }
              window.parent.postMessage({ type: 'TEMPLATE_ATTR_UPDATED', selector: msg.selector, attribute: msg.attribute, value: msg.value }, '*');
            }
          } else {
            window.parent.postMessage({ type: 'TEMPLATE_FIND_FAILED', selector: msg.selector, reason: 'No element matched selector' }, '*');
          }
        } catch(ex) {}
      }
    }

    if (msg.type === 'BUILDER_FIND_ALL_AND_UPDATE_TEXT') {
      // Update text of ALL elements matching a CSS selector
      if (msg.selector && msg.text !== undefined) {
        try {
          var matchedEls = document.querySelectorAll(msg.selector);
          var count = 0;
          for (var mi = 0; mi < matchedEls.length; mi++) {
            matchedEls[mi].textContent = msg.text;
            count++;
          }
          window.parent.postMessage({ type: 'TEMPLATE_BATCH_TEXT_UPDATED', selector: msg.selector, count: count }, '*');
        } catch(ex) {}
      }
    }

    if (msg.type === 'BUILDER_BATCH_UPDATE') {
      // Apply an array of updates: [{selector, action:'text'|'attr'|'style', value, attribute?, property?}]
      var batchUpdates = msg.updates || [];
      var batchResults = [];
      for (var bi = 0; bi < batchUpdates.length; bi++) {
        var upd = batchUpdates[bi];
        try {
          var batchEl = document.querySelector(upd.selector);
          if (batchEl) {
            if (upd.action === 'text') {
              batchEl.textContent = upd.value;
              batchResults.push({ selector: upd.selector, success: true });
            } else if (upd.action === 'attr' && upd.attribute) {
              batchEl.setAttribute(upd.attribute, upd.value);
              batchResults.push({ selector: upd.selector, success: true });
            } else if (upd.action === 'style' && upd.property) {
              batchEl.style[upd.property] = upd.value;
              batchResults.push({ selector: upd.selector, success: true });
            } else if (upd.action === 'bg-src') {
              batchEl.style.backgroundImage = 'url("' + upd.value + '")';
              batchResults.push({ selector: upd.selector, success: true });
            }
          } else {
            batchResults.push({ selector: upd.selector, success: false, reason: 'Not found' });
          }
        } catch(ex) {
          batchResults.push({ selector: upd.selector, success: false, reason: String(ex) });
        }
      }
      window.parent.postMessage({ type: 'TEMPLATE_BATCH_UPDATED', results: batchResults }, '*');
    }

    if (msg.type === 'BUILDER_INJECT_CSS') {
      // Inject (or replace) a named <style> block — use for background/structural overrides only
      try {
        var cssStyleId = msg.styleId || 'geni-bg-overrides';
        var existingStyle = document.getElementById(cssStyleId);
        if (existingStyle) existingStyle.remove();
        var geniStyle = document.createElement('style');
        geniStyle.id = cssStyleId;
        geniStyle.textContent = msg.css || '';
        document.head.appendChild(geniStyle);
        window.parent.postMessage({ type: 'GENI_CSS_INJECTED', styleId: cssStyleId }, '*');
      } catch(ex) {}
    }

    if (msg.type === 'BUILDER_HIGHLIGHT_ELEMENT') {
      // Remove any existing Geni highlights
      var prevHighlights = document.querySelectorAll('[data-builder-geni-highlight]');
      for (var hi = 0; hi < prevHighlights.length; hi++) {
        prevHighlights[hi].removeAttribute('data-builder-geni-highlight');
      }
      if (msg.selector) {
        try {
          var hlEl = document.querySelector(msg.selector);
          if (hlEl) {
            hlEl.setAttribute('data-builder-geni-highlight', '');
            hlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch(ex) {}
      }
    }

    if (msg.type === 'BUILDER_DEHIGHLIGHT') {
      var hlEls = document.querySelectorAll('[data-builder-geni-highlight]');
      for (var di = 0; di < hlEls.length; di++) {
        hlEls[di].removeAttribute('data-builder-geni-highlight');
      }
    }

    // --- CMS Preview Rendering ---
    if (msg.type === 'RENDER_CMS_PREVIEW') {
      var cmsContext = msg.cmsContext;
      if (!cmsContext || !cmsContext.collections) return;

      // Section class → collection slug mapping (mirrors backend CMSRenderer)
      var sectionMappings = {
        'grid-blog-thirds': {
          collectionSlug: 'blog-posts',
          render: function(el, item) {
            var fd = item.fieldData || {};
            var img = el.querySelector('img.image-blog');
            if (img) { img.setAttribute('src', fd.image || ''); img.setAttribute('alt', fd.name || ''); img.classList.remove('w-dyn-bind-empty'); }
            var titleEl = el.querySelector('h3.no-margins') || el.querySelector('.text-style-h3');
            if (titleEl) { titleEl.textContent = fd.name || ''; titleEl.classList.remove('w-dyn-bind-empty'); }
            if (titleEl && titleEl.nextElementSibling && titleEl.nextElementSibling.tagName === 'DIV') {
              var desc = (fd['blog-content'] || '').replace(/<[^>]*>/g, '').substring(0, 120);
              titleEl.nextElementSibling.textContent = desc;
              titleEl.nextElementSibling.classList.remove('w-dyn-bind-empty');
            }
            var link = el.querySelector('a.tile-blog');
            if (link) link.setAttribute('href', 'blog/' + item.slug + '.html');
          }
        },
        'grid-services-thirds': {
          collectionSlug: 'services',
          render: function(el, item) {
            var fd = item.fieldData || {};
            var img = el.querySelector('img.icon-circle-icon');
            if (img) { img.setAttribute('src', fd.icon || ''); img.setAttribute('alt', fd.name || ''); img.classList.remove('w-dyn-bind-empty'); }
            var titleEl = el.querySelector('h3.no-margins') || el.querySelector('.text-style-h3');
            if (titleEl) { titleEl.textContent = fd.name || ''; titleEl.classList.remove('w-dyn-bind-empty'); }
            if (titleEl && titleEl.nextElementSibling && titleEl.nextElementSibling.tagName === 'DIV') {
              titleEl.nextElementSibling.textContent = (fd['short-description'] || '').substring(0, 100);
              titleEl.nextElementSibling.classList.remove('w-dyn-bind-empty');
            }
            if (fd.color && fd.color !== 'white') {
              var circle = el.querySelector('.circle-service-tile');
              if (circle) circle.style.backgroundColor = fd.color;
            }
            var link = el.querySelector('a.tile-service-thirds');
            if (link) link.setAttribute('href', 'services/' + item.slug + '.html');
          }
        },
        'list-moving-team': {
          collectionSlug: 'teams',
          render: function(el, item) {
            var fd = item.fieldData || {};
            var img = el.querySelector('img.image-moving-team');
            if (img) { img.setAttribute('src', fd['profile-image'] || ''); img.setAttribute('alt', fd.name || ''); img.classList.remove('w-dyn-bind-empty'); }
            var bottomDivs = el.querySelectorAll('.bottom-moving-team > div');
            if (bottomDivs[0]) { bottomDivs[0].textContent = fd.name || ''; bottomDivs[0].classList.remove('w-dyn-bind-empty'); }
            if (bottomDivs[2]) { bottomDivs[2].textContent = fd.position || ''; bottomDivs[2].classList.remove('w-dyn-bind-empty'); }
            var link = el.querySelector('a.tile-moving-team');
            if (link) link.setAttribute('href', 'team/' + item.slug + '.html');
          }
        },
        'list-team-wide': {
          collectionSlug: 'teams',
          render: function(el, item) {
            var fd = item.fieldData || {};
            var img = el.querySelector('img.image-team-wide');
            if (img) { img.setAttribute('src', fd['profile-image'] || ''); img.setAttribute('alt', fd.name || ''); img.classList.remove('w-dyn-bind-empty'); }
            var h3 = el.querySelector('.text-style-h3');
            if (h3) { h3.textContent = fd.name || ''; h3.classList.remove('w-dyn-bind-empty'); }
            var desc = el.querySelector('.body-big');
            if (desc) { desc.textContent = (fd['short-description'] || '').substring(0, 200); desc.classList.remove('w-dyn-bind-empty'); }
            var link = el.querySelector('a.tile-team-wide');
            if (link) link.setAttribute('href', 'team/' + item.slug + '.html');
          }
        },
        'grid-pricing-thirds': {
          collectionSlug: 'products',
          render: function(el, item) {
            var fd = item.fieldData || {};
            var priceDiv = el.querySelector('.tag-price div');
            if (priceDiv) priceDiv.textContent = '$' + (fd.price || 0);
            var h3 = el.querySelector('h3.no-margins') || el.querySelector('.text-style-h3');
            if (h3) h3.textContent = fd.name || '';
            if (h3 && h3.nextElementSibling && h3.nextElementSibling.tagName === 'DIV') {
              h3.nextElementSibling.textContent = fd.description || '';
            }
            var features = (fd.features || '').split('\\n').filter(Boolean);
            var checklistItems = el.querySelectorAll('.single-checklist, .single-checklist-pricing');
            for (var fi = 0; fi < checklistItems.length; fi++) {
              var featureDiv = checklistItems[fi].querySelector('div:last-child');
              if (featureDiv && features[fi]) featureDiv.textContent = features[fi];
            }
            var cta = el.querySelector('a.cta-main');
            if (cta) cta.setAttribute('href', 'contact.html');
          }
        }
      };

      // Process each w-dyn-list section
      var dynLists = document.querySelectorAll('.w-dyn-list');
      for (var li = 0; li < dynLists.length; li++) {
        var list = dynLists[li];
        var dynItems = list.querySelector('.w-dyn-items');
        if (!dynItems) continue;

        // Find matching section mapping by CSS class
        var classes = (dynItems.getAttribute('class') || '').split(/\s+/);
        var mapping = null;
        for (var ci = 0; ci < classes.length; ci++) {
          if (sectionMappings[classes[ci]]) {
            mapping = sectionMappings[classes[ci]];
            break;
          }
        }
        if (!mapping) continue;

        var collection = cmsContext.collections[mapping.collectionSlug];
        if (!collection || !collection.items || collection.items.length === 0) continue;

        // Get template item (first w-dyn-item)
        var templateItem = dynItems.querySelector('.w-dyn-item');
        if (!templateItem) continue;

        // Sort items by order field
        var sortedItems = collection.items.slice().sort(function(a, b) {
          var orderA = (a.fieldData && a.fieldData.order) || 999;
          var orderB = (b.fieldData && b.fieldData.order) || 999;
          return orderA - orderB;
        });

        // Clone and populate for each item
        var fragment = document.createDocumentFragment();
        for (var ii = 0; ii < sortedItems.length; ii++) {
          var clone = templateItem.cloneNode(true);
          mapping.render(clone, sortedItems[ii]);
          fragment.appendChild(clone);
        }

        // Replace content
        dynItems.innerHTML = '';
        dynItems.appendChild(fragment);

        // Remove the "No items found" empty state
        var emptyState = list.querySelector('.w-dyn-empty');
        if (emptyState) emptyState.remove();
      }

      // Notify parent that CMS preview is rendered
      window.parent.postMessage({ type: 'CMS_PREVIEW_RENDERED' }, '*');
      console.log('[CMS Preview] Rendered CMS content in builder canvas');
    }
  });

  // Notify parent that the bridge is ready
  window.parent.postMessage({ type: 'TEMPLATE_BRIDGE_READY' }, '*');
  // Send initial DOM tree and content map after a short delay to let the page settle
  setTimeout(function() { sendDOMTree(); extractContentMap(); }, 150);
})();
`;
}