import { Element, StyleProperties } from '@/types/element.types';

// Generate unique class name from element ID
const generateClassName = (element: Element): string => {
  // Create a short, unique class based on element type and ID
  const idHash = element.id.replace('el_', '').substring(0, 8);
  return `${element.type}-${idHash}`;
};

// Convert style object to CSS string
const stylesToCSS = (styles: StyleProperties, selector: string): string => {
  if (!styles || Object.keys(styles).length === 0) return '';

  const cssProperties = Object.entries(styles)
    .map(([property, value]) => {
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  ${cssProperty}: ${value};`;
    })
    .join('\n');

  return `${selector} {\n${cssProperties}\n}\n`;
};

// Generate CSS for all breakpoints
const generateElementCSS = (element: Element, className: string): string => {
  let css = '';

  // Desktop styles (base)
  if (element.styles.desktop && Object.keys(element.styles.desktop).length > 0) {
    css += stylesToCSS(element.styles.desktop, `.${className}`);
  }

  // Tablet styles (medium breakpoint)
  if (element.styles.tablet && Object.keys(element.styles.tablet).length > 0) {
    css += `\n@media (max-width: 768px) {\n`;
    css += stylesToCSS(element.styles.tablet, `.${className}`).split('\n').map(line => line ? `  ${line}` : '').join('\n');
    css += `}\n`;
  }

  // Mobile styles (small breakpoint)
  if (element.styles.mobile && Object.keys(element.styles.mobile).length > 0) {
    css += `\n@media (max-width: 480px) {\n`;
    css += stylesToCSS(element.styles.mobile, `.${className}`).split('\n').map(line => line ? `  ${line}` : '').join('\n');
    css += `}\n`;
  }

  return css;
};

// Generate HTML element
const generateHTMLElement = (element: Element, classMap: Map<string, string>): string => {
  const className = classMap.get(element.id) || generateClassName(element);

  // Determine the HTML tag
  let tag = 'div';
  let attributes = '';

  switch (element.type) {
    case 'heading':
      tag = 'h2';
      break;
    case 'text':
      tag = 'p';
      break;
    case 'button':
      tag = 'button';
      attributes = ' type="button"';
      break;
    case 'image':
      tag = 'img';
      attributes = ` src="${element.attributes?.src || ''}" alt="${element.attributes?.alt || ''}"`;
      break;
    case 'link':
      tag = 'a';
      attributes = ` href="${element.attributes?.href || '#'}" target="${element.attributes?.target || '_self'}"`;
      break;
    case 'video':
      tag = 'video';
      attributes = ` src="${element.attributes?.src || ''}" ${element.attributes?.controls === 'true' ? 'controls' : ''}`;
      break;
    case 'section':
      tag = 'section';
      break;
    case 'container':
    case 'div':
    default:
      tag = 'div';
      break;
  }

  // Build opening tag
  let html = `<${tag} class="${className}"${attributes}>`;

  // Add content
  if (element.content && !['image', 'video'].includes(element.type)) {
    html += element.content;
  }

  // Add children
  if (element.children && element.children.length > 0) {
    html += '\n';
    element.children.forEach(child => {
      html += '  ' + generateHTMLElement(child, classMap).split('\n').join('\n  ') + '\n';
    });
  }

  // Self-closing tags
  if (['image', 'img'].includes(element.type)) {
    return `<${tag} class="${className}"${attributes} />`;
  }

  // Closing tag
  html += `</${tag}>`;

  return html;
};

// Main export function
export const exportToHTML = (elements: Element[]): { html: string; css: string } => {
  // Generate class names for all elements
  const classMap = new Map<string, string>();

  const generateClassNames = (els: Element[]) => {
    els.forEach(el => {
      classMap.set(el.id, generateClassName(el));
      if (el.children.length > 0) {
        generateClassNames(el.children);
      }
    });
  };

  generateClassNames(elements);

  // Generate HTML
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '  <meta charset="UTF-8">\n';
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '  <title>Exported Page</title>\n';
  html += '  <link rel="stylesheet" href="styles.css">\n';
  html += '</head>\n<body>\n';

  elements.forEach(element => {
    html += '  ' + generateHTMLElement(element, classMap).split('\n').join('\n  ') + '\n';
  });

  html += '</body>\n</html>';

  // Generate CSS
  let css = '/* Generated styles */\n\n';
  css += '* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\n';

  const generateCSS = (els: Element[]) => {
    els.forEach(el => {
      const className = classMap.get(el.id);
      if (className) {
        css += generateElementCSS(el, className);
        css += '\n';
      }
      if (el.children.length > 0) {
        generateCSS(el.children);
      }
    });
  };

  generateCSS(elements);

  return { html, css };
};

// Export single page with clean class names
export const exportPage = (pageName: string, elements: Element[]): { html: string; css: string; pageName: string } => {
  const { html, css } = exportToHTML(elements);
  return {
    html,
    css,
    pageName: pageName.toLowerCase().replace(/\s+/g, '-'),
  };
};

// Download as files
export const downloadExport = (html: string, css: string, pageName: string = 'index') => {
  // Download HTML
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const htmlUrl = URL.createObjectURL(htmlBlob);
  const htmlLink = document.createElement('a');
  htmlLink.href = htmlUrl;
  htmlLink.download = `${pageName}.html`;
  htmlLink.click();
  URL.revokeObjectURL(htmlUrl);

  // Download CSS
  const cssBlob = new Blob([css], { type: 'text/css' });
  const cssUrl = URL.createObjectURL(cssBlob);
  const cssLink = document.createElement('a');
  cssLink.href = cssUrl;
  cssLink.download = 'styles.css';
  cssLink.click();
  URL.revokeObjectURL(cssUrl);
};