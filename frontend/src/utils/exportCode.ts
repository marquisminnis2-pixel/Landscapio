import { Element, StyleProperties } from '@/types/element.types';
import { Interaction, InteractionAction, AnimationType } from '@/types/interaction.types';

// Generate clean, semantic class names
const generateClassName = (element: Element): string => {
  // Create short hash from element ID
  const idHash = element.id.replace('el_', '').substring(0, 4);
  return `${element.type}-${idHash}`;
};

// Build class map for all elements
const buildClassMap = (elements: Element[], map: Map<string, string> = new Map()): Map<string, string> => {
  elements.forEach(element => {
    map.set(element.id, generateClassName(element));
    if (element.children.length > 0) {
      buildClassMap(element.children, map);
    }
  });
  return map;
};

const stylePropertiesToCSS = (styles: StyleProperties): string => {
  const cssRules: string[] = [];

  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      cssRules.push(`  ${cssKey}: ${value};`);
    }
  });

  return cssRules.join('\n');
};

const stylePropertiesToInline = (styles: StyleProperties): string => {
  const inlineStyles: string[] = [];

  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      inlineStyles.push(`${cssKey}: ${value}`);
    }
  });

  return inlineStyles.join('; ');
};

const generateElementHTML = (
  element: Element,
  depth = 1,
  useInlineStyles = false,
  classMap?: Map<string, string>
): string => {
  const indent = '  '.repeat(depth);
  const className = classMap?.get(element.id) || element.id;
  const classAttr = `class="${className}"`;
  const dataAttr = `data-element-id="${element.id}"`;

  // Generate inline style attribute if needed
  const inlineStyleAttr = useInlineStyles && Object.keys(element.styles.desktop).length > 0
    ? `style="${stylePropertiesToInline(element.styles.desktop)}"`
    : '';

  const attributes = [classAttr, dataAttr, inlineStyleAttr].filter(Boolean).join(' ');

  let html = '';

  switch (element.type) {
    case 'container':
    case 'section':
    case 'div':
      html += `${indent}<div ${attributes}>\n`;
      if (element.children.length > 0) {
        element.children.forEach((child) => {
          html += generateElementHTML(child, depth + 1, useInlineStyles, classMap);
        });
      } else {
        html += `${indent}  <!-- Empty container -->\n`;
      }
      html += `${indent}</div>\n`;
      break;

    case 'heading':
      html += `${indent}<h2 ${attributes}>${element.content || 'Heading'}</h2>\n`;
      break;

    case 'text':
      html += `${indent}<p ${attributes}>${element.content || 'Text'}</p>\n`;
      break;

    case 'button':
      html += `${indent}<button ${attributes} type="button">${element.content || 'Button'}</button>\n`;
      break;

    case 'image':
      const src = element.attributes?.src || 'https://via.placeholder.com/400x300';
      const alt = element.attributes?.alt || 'Image';
      html += `${indent}<img ${attributes} src="${src}" alt="${alt}" />\n`;
      break;

    case 'link':
      const href = element.attributes?.href || '#';
      const target = element.attributes?.target || '_self';
      html += `${indent}<a ${attributes} href="${href}" target="${target}">${element.content || 'Link'}</a>\n`;
      break;

    default:
      html += `${indent}<div ${attributes}>Unknown element</div>\n`;
  }

  return html;
};

const generateElementCSS = (element: Element, classMap?: Map<string, string>): string => {
  let css = '';
  const className = classMap?.get(element.id) || element.id;

  // Desktop styles (default)
  if (Object.keys(element.styles.desktop).length > 0) {
    css += `.${className} {\n${stylePropertiesToCSS(element.styles.desktop)}\n}\n\n`;
  }

  // Tablet styles
  if (Object.keys(element.styles.tablet).length > 0) {
    css += `@media (max-width: 768px) {\n`;
    css += `  .${className} {\n`;
    css += stylePropertiesToCSS(element.styles.tablet).split('\n').map(line => `  ${line}`).join('\n');
    css += `\n  }\n}\n\n`;
  }

  // Mobile styles
  if (Object.keys(element.styles.mobile).length > 0) {
    css += `@media (max-width: 480px) {\n`;
    css += `  .${className} {\n`;
    css += stylePropertiesToCSS(element.styles.mobile).split('\n').map(line => `  ${line}`).join('\n');
    css += `\n  }\n}\n\n`;
  }

  // Recursively generate CSS for children
  element.children.forEach((child) => {
    css += generateElementCSS(child, classMap);
  });

  return css;
};

export const generateHTML = (elements: Element[], includeInteractions: boolean = true): string => {
  // Build class name map for clean class names
  const classMap = buildClassMap(elements);

  let bodyContent = '';
  elements.forEach((element) => {
    bodyContent += generateElementHTML(element, 1, false, classMap);
  });

  // Check if we need to include interactions script
  const needsInteractions = includeInteractions && hasInteractions(elements);
  const scriptTag = needsInteractions ? '\n  <script src="interactions.js"></script>' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${bodyContent}${scriptTag}
</body>
</html>`;
};

export const generateCSS = (elements: Element[]): string => {
  // Build class name map for clean class names
  const classMap = buildClassMap(elements);

  let css = `/* Reset and Base Styles */\n`;
  css += `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\n`;
  css += `body {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',\n    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n`;
  css += `/* Component Styles */\n\n`;

  elements.forEach((element) => {
    css += generateElementCSS(element, classMap);
  });

  return css;
};

// Collect all interactions from element tree
interface ElementInteractionData {
  elementId: string;
  className: string;
  interactions: Interaction[];
}

const collectAllInteractions = (
  elements: Element[],
  classMap: Map<string, string>
): ElementInteractionData[] => {
  const result: ElementInteractionData[] = [];

  const traverse = (els: Element[]) => {
    els.forEach((el) => {
      if (el.interactions && el.interactions.length > 0) {
        result.push({
          elementId: el.id,
          className: classMap.get(el.id) || el.id,
          interactions: el.interactions.filter((i) => i.enabled),
        });
      }
      if (el.children.length > 0) {
        traverse(el.children);
      }
    });
  };

  traverse(elements);
  return result;
};

// Generate keyframes code for an animation type
const getKeyframesCode = (type: AnimationType, params: Record<string, unknown> = {}): string => {
  const distance = (params.distance as string) || '20px';
  const scale = (params.scale as number) || 1.05;
  const degrees = (params.degrees as number) || 360;
  const intensity = (params.intensity as string) || 'normal';
  const shakeAmount = intensity === 'strong' ? 10 : intensity === 'subtle' ? 3 : 6;

  switch (type) {
    case 'show':
      return `[{ visibility: 'hidden', opacity: 0 }, { visibility: 'visible', opacity: 1 }]`;
    case 'hide':
      return `[{ visibility: 'visible', opacity: 1 }, { visibility: 'hidden', opacity: 0 }]`;
    case 'fade_in':
      return `[{ opacity: 0 }, { opacity: 1 }]`;
    case 'fade_out':
      return `[{ opacity: 1 }, { opacity: 0 }]`;
    case 'slide_up':
    case 'slide_fade_in':
      return `[{ transform: 'translateY(${distance})', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]`;
    case 'slide_down':
      return `[{ transform: 'translateY(-${distance})', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]`;
    case 'slide_left':
      return `[{ transform: 'translateX(${distance})', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }]`;
    case 'slide_right':
      return `[{ transform: 'translateX(-${distance})', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }]`;
    case 'slide_fade_out':
      return `[{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-${distance})', opacity: 0 }]`;
    case 'scale_up':
      return `[{ transform: 'scale(1)' }, { transform: 'scale(${scale})' }]`;
    case 'scale_down':
      return `[{ transform: 'scale(${scale})' }, { transform: 'scale(1)' }]`;
    case 'rotate':
      return `[{ transform: 'rotate(0deg)' }, { transform: 'rotate(${degrees}deg)' }]`;
    case 'bounce':
      return `[
        { transform: 'translateY(0)', offset: 0 },
        { transform: 'translateY(-15px)', offset: 0.3 },
        { transform: 'translateY(0)', offset: 0.5 },
        { transform: 'translateY(-8px)', offset: 0.7 },
        { transform: 'translateY(0)', offset: 1 }
      ]`;
    case 'shake':
      return `[
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(-${shakeAmount}px)', offset: 0.1 },
        { transform: 'translateX(${shakeAmount}px)', offset: 0.2 },
        { transform: 'translateX(-${shakeAmount}px)', offset: 0.3 },
        { transform: 'translateX(${shakeAmount}px)', offset: 0.4 },
        { transform: 'translateX(-${shakeAmount}px)', offset: 0.5 },
        { transform: 'translateX(${shakeAmount}px)', offset: 0.6 },
        { transform: 'translateX(-${shakeAmount}px)', offset: 0.7 },
        { transform: 'translateX(${shakeAmount}px)', offset: 0.8 },
        { transform: 'translateX(0)', offset: 1 }
      ]`;
    case 'pulse':
      return `[
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.05)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ]`;
    default:
      return `[{ opacity: 1 }]`;
  }
};

// Generate action execution code
const generateActionCode = (action: InteractionAction): string => {
  const { target, animation } = action;
  const keyframes = getKeyframesCode(animation.type, animation.params || {});
  const timing = animation.timing;

  let targetCode = '';
  switch (target.type) {
    case 'self':
      targetCode = '[element]';
      break;
    case 'children':
      targetCode = 'Array.from(element.children)';
      break;
    case 'all_children':
      targetCode = "Array.from(element.querySelectorAll('*'))";
      break;
    case 'parent':
      targetCode = 'element.parentElement ? [element.parentElement] : []';
      break;
    case 'siblings':
      targetCode = "Array.from(element.parentElement?.children || []).filter(el => el !== element)";
      break;
    case 'specific':
      targetCode = `document.querySelector('[data-element-id="${target.elementId}"]') ? [document.querySelector('[data-element-id="${target.elementId}"]')] : []`;
      break;
    default:
      targetCode = '[element]';
  }

  return `
      ${targetCode}.forEach(function(target) {
        target.animate(${keyframes}, {
          duration: ${timing.duration},
          delay: ${timing.delay || 0},
          easing: '${timing.easing}',
          fill: 'forwards'
        });
      });`;
};

// Generate JavaScript for all interactions
export const generateInteractionJS = (elements: Element[]): string => {
  const classMap = buildClassMap(elements);
  const allInteractions = collectAllInteractions(elements, classMap);

  if (allInteractions.length === 0) {
    return '';
  }

  let setupCode = '';

  allInteractions.forEach(({ className, interactions }) => {
    interactions.forEach((interaction) => {
      const selector = `.${className}`;
      const actions = interaction.toggle ? interaction.toggle.onTrue : interaction.actions;

      switch (interaction.trigger.type) {
        case 'click':
          setupCode += `
    // ${interaction.name}
    document.querySelectorAll('${selector}').forEach(function(element) {
      ${interaction.toggle ? `element._toggleState = element._toggleState || false;` : ''}
      element.addEventListener('click', function(e) {
        ${interaction.options?.preventDefault ? 'e.preventDefault();' : ''}
        ${interaction.options?.stopPropagation ? 'e.stopPropagation();' : ''}
        ${
          interaction.toggle
            ? `
        element._toggleState = !element._toggleState;
        if (element._toggleState) {
          ${interaction.toggle.onTrue.map((a) => generateActionCode(a)).join('\n')}
        } else {
          ${interaction.toggle.onFalse.map((a) => generateActionCode(a)).join('\n')}
        }`
            : actions.map((a) => generateActionCode(a)).join('\n')
        }
      });
    });
`;
          break;

        case 'hover':
        case 'mouse_enter':
          setupCode += `
    // ${interaction.name}
    document.querySelectorAll('${selector}').forEach(function(element) {
      element.addEventListener('mouseenter', function(e) {
        ${actions.map((a) => generateActionCode(a)).join('\n')}
      });
    });
`;
          break;

        case 'hover_out':
        case 'mouse_leave':
          setupCode += `
    // ${interaction.name}
    document.querySelectorAll('${selector}').forEach(function(element) {
      element.addEventListener('mouseleave', function(e) {
        ${actions.map((a) => generateActionCode(a)).join('\n')}
      });
    });
`;
          break;

        case 'scroll_into_view':
          const threshold = interaction.trigger.scrollOptions?.threshold || 0.2;
          const once = interaction.trigger.scrollOptions?.once ? 'true' : 'false';
          setupCode += `
    // ${interaction.name}
    (function() {
      var triggered = {};
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var element = entry.target;
            var id = element.getAttribute('data-element-id');
            if (${once} && triggered[id]) return;
            triggered[id] = true;
            ${actions.map((a) => generateActionCode(a)).join('\n')}
            ${once === 'true' ? 'observer.unobserve(element);' : ''}
          }
        });
      }, { threshold: ${threshold} });

      document.querySelectorAll('${selector}').forEach(function(element) {
        // Start hidden for scroll animations
        element.style.opacity = '0';
        observer.observe(element);
      });
    })();
`;
          break;

        case 'page_load':
          const delay = interaction.trigger.pageLoadOptions?.delay || 0;
          setupCode += `
    // ${interaction.name}
    document.querySelectorAll('${selector}').forEach(function(element) {
      // Start hidden
      element.style.opacity = '0';
      setTimeout(function() {
        ${actions.map((a) => generateActionCode(a)).join('\n')}
      }, ${delay});
    });
`;
          break;
      }
    });
  });

  return `/**
 * Interactions Script
 * Generated by Genesis - No dependencies required
 */
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
${setupCode}
  });
})();
`;
};

// Check if elements have any interactions
const hasInteractions = (elements: Element[]): boolean => {
  const check = (els: Element[]): boolean => {
    for (const el of els) {
      if (el.interactions && el.interactions.some((i) => i.enabled)) {
        return true;
      }
      if (el.children.length > 0 && check(el.children)) {
        return true;
      }
    }
    return false;
  };
  return check(elements);
};

export const downloadFile = (content: string, filename: string, type: string = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate HTML with inline styles for template publishing
export const generateHTMLWithInlineStyles = (elements: Element[]): string => {
  let bodyContent = '';
  elements.forEach((element) => {
    bodyContent += generateElementHTML(element, 1, true); // true = use inline styles
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
${bodyContent}</body>
</html>`;
};

export const exportProject = (elements: Element[], projectName: string = 'project') => {
  const html = generateHTML(elements);
  const css = generateCSS(elements);
  const js = generateInteractionJS(elements);

  // Download HTML file
  downloadFile(html, `${projectName}.html`, 'text/html');

  // Download CSS file after a short delay
  setTimeout(() => {
    downloadFile(css, 'styles.css', 'text/css');
  }, 100);

  // Download JS file if there are interactions
  if (js) {
    setTimeout(() => {
      downloadFile(js, 'interactions.js', 'text/javascript');
    }, 200);
  }

  return { html, css, js };
};

/**
 * Parse an HTML string for asset references (CSS, JS, images, fonts).
 * Returns relative paths found in href, src, url() attributes.
 */
function parseAssetPaths(html: string): string[] {
  const paths = new Set<string>();

  // Match href="..." and src="..." attributes (relative paths only)
  const attrRegex = /(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = attrRegex.exec(html)) !== null) {
    const val = match[1];
    // Skip absolute URLs, data URIs, anchors, and mailto
    if (!val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('#') && !val.startsWith('mailto:')) {
      paths.add(val);
    }
  }

  // Match url(...) in inline styles
  const urlRegex = /url\(["']?([^"')]+)["']?\)/gi;
  while ((match = urlRegex.exec(html)) !== null) {
    const val = match[1];
    if (!val.startsWith('http') && !val.startsWith('data:')) {
      paths.add(val);
    }
  }

  return Array.from(paths);
}

/**
 * Export a template-based project as a zip file.
 * Fetches the HTML and all referenced assets, bundles them into a .zip download.
 */
export const exportTemplateAsZip = async (
  rawHtml: string,
  templateBasePath: string,
  projectName: string = 'project'
): Promise<void> => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Add the main HTML file
  zip.file('index.html', rawHtml);

  // Parse HTML for asset references
  const assetPaths = parseAssetPaths(rawHtml);

  // Normalize base path
  const basePath = templateBasePath.endsWith('/') ? templateBasePath : `${templateBasePath}/`;

  // Fetch and add each asset to the zip
  const fetchPromises = assetPaths.map(async (assetPath) => {
    // Resolve the asset URL relative to the template base
    const cleanPath = assetPath.startsWith('./') ? assetPath.slice(2) : assetPath;
    const url = `${basePath}${cleanPath}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const blob = await response.blob();
      zip.file(cleanPath, blob);
    } catch {
      // Skip assets that can't be fetched
    }
  });

  // Also try to fetch common asset directories that may not be directly referenced in HTML
  // (e.g., CSS files reference fonts/images via url())
  const cssFiles = assetPaths.filter(p => p.endsWith('.css'));
  const cssAssetPromises = cssFiles.map(async (cssPath) => {
    const cleanPath = cssPath.startsWith('./') ? cssPath.slice(2) : cssPath;
    const url = `${basePath}${cleanPath}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const cssText = await response.text();
      // Parse CSS for additional asset references (fonts, images)
      const cssAssets = parseAssetPaths(`style="${cssText}"`);
      const cssDir = cleanPath.includes('/') ? cleanPath.substring(0, cleanPath.lastIndexOf('/') + 1) : '';

      await Promise.all(cssAssets.map(async (ref) => {
        // Resolve relative to the CSS file's directory
        const resolvedPath = ref.startsWith('../')
          ? ref.replace(/^\.\.\//, '') // Go up one level from css dir
          : `${cssDir}${ref}`;
        const assetUrl = `${basePath}${resolvedPath}`;

        try {
          const res = await fetch(assetUrl);
          if (!res.ok) return;
          const blob = await res.blob();
          zip.file(resolvedPath, blob);
        } catch {
          // Skip
        }
      }));
    } catch {
      // Skip
    }
  });

  await Promise.all([...fetchPromises, ...cssAssetPromises]);

  // Generate and download the zip
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export an element-based project as a zip file.
 */
export const exportElementsAsZip = async (
  elements: Element[],
  projectName: string = 'project'
): Promise<void> => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const html = generateHTML(elements);
  const css = generateCSS(elements);
  const js = generateInteractionJS(elements);

  zip.file('index.html', html);
  zip.file('styles.css', css);
  if (js) {
    zip.file('interactions.js', js);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
