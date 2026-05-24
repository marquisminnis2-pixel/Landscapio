interface Element {
  id: string;
  type: string;
  name: string;
  children: Element[];
  styles: {
    desktop: Record<string, any>;
    tablet: Record<string, any>;
    mobile: Record<string, any>;
  };
  content?: string;
  attributes?: Record<string, string>;
}

const styleObjectToCSS = (styles: Record<string, any>): string => {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(' ');
};

const generateElementHTML = (element: Element, depth = 0): string => {
  const indent = '  '.repeat(depth);
  const classAttr = `class="${element.id}"`;

  let html = '';

  switch (element.type) {
    case 'container':
    case 'section':
    case 'div':
      html += `${indent}<div ${classAttr}>\n`;
      if (element.children.length > 0) {
        element.children.forEach((child) => {
          html += generateElementHTML(child, depth + 1);
        });
      }
      html += `${indent}</div>\n`;
      break;

    case 'heading':
      html += `${indent}<h2 ${classAttr}>${element.content || 'Heading'}</h2>\n`;
      break;

    case 'text':
      html += `${indent}<p ${classAttr}>${element.content || 'Text'}</p>\n`;
      break;

    case 'button':
      html += `${indent}<button ${classAttr}>${element.content || 'Button'}</button>\n`;
      break;

    case 'image':
      const src = element.attributes?.src || '';
      const alt = element.attributes?.alt || '';
      html += `${indent}<img ${classAttr} src="${src}" alt="${alt}" />\n`;
      break;

    case 'link':
      const href = element.attributes?.href || '#';
      const target = element.attributes?.target || '_self';
      html += `${indent}<a ${classAttr} href="${href}" target="${target}">${element.content || 'Link'}</a>\n`;
      break;

    default:
      html += `${indent}<div ${classAttr}>Unknown element</div>\n`;
  }

  return html;
};

export const generateHTML = (elements: Element[]): string => {
  let bodyContent = '';
  elements.forEach((element) => {
    bodyContent += generateElementHTML(element, 2);
  });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Published Site</title>
    <style>
      ${generateCSS(elements)}
    </style>
  </head>
  <body>
${bodyContent}  </body>
</html>`;
};

const generateElementCSS = (element: Element): string => {
  let css = '';

  // Desktop styles (default)
  if (Object.keys(element.styles.desktop).length > 0) {
    css += `.${element.id} { ${styleObjectToCSS(element.styles.desktop)} }\n`;
  }

  // Tablet styles
  if (Object.keys(element.styles.tablet).length > 0) {
    css += `@media (max-width: 768px) {\n`;
    css += `  .${element.id} { ${styleObjectToCSS(element.styles.tablet)} }\n`;
    css += `}\n`;
  }

  // Mobile styles
  if (Object.keys(element.styles.mobile).length > 0) {
    css += `@media (max-width: 480px) {\n`;
    css += `  .${element.id} { ${styleObjectToCSS(element.styles.mobile)} }\n`;
    css += `}\n`;
  }

  // Recursively generate CSS for children
  element.children.forEach((child) => {
    css += generateElementCSS(child);
  });

  return css;
};

export const generateCSS = (elements: Element[]): string => {
  let css = `* { margin: 0; padding: 0; box-sizing: border-box; }\n`;
  css += `body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }\n`;

  elements.forEach((element) => {
    css += generateElementCSS(element);
  });

  return css;
};
