// Template parsing utilities
// Extracts HTML, CSS, and JS from full HTML templates

import { TemplateContent } from '@/types/template.types';

/**
 * Parse a full HTML template into separate HTML, CSS, and JS parts
 */
export const parseTemplate = (fullHtml: string): TemplateContent => {
  // Extract all <style> content
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styles: string[] = [];
  let match;
  while ((match = styleRegex.exec(fullHtml)) !== null) {
    styles.push(match[1].trim());
  }
  const css = styles.join('\n\n');

  // Extract all <script> content (excluding external scripts)
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts: string[] = [];
  while ((match = scriptRegex.exec(fullHtml)) !== null) {
    const content = match[1].trim();
    if (content) {
      scripts.push(content);
    }
  }
  const js = scripts.join('\n\n');

  // Extract body content
  const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
  const bodyMatch = bodyRegex.exec(fullHtml);
  let html = bodyMatch ? bodyMatch[1] : fullHtml;

  // Remove inline scripts from body HTML (we extracted them separately)
  html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.trim();

  return {
    html,
    css,
    js,
    fullHtml,
  };
};

/**
 * Rebuild full HTML from separate parts
 */
export const buildTemplate = (content: TemplateContent): string => {
  // Extract head content from original (meta tags, title, external links)
  const headRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
  const headMatch = headRegex.exec(content.fullHtml);
  let headContent = headMatch ? headMatch[1] : '';

  // Remove existing style tags from head (we'll add our own)
  headContent = headContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Build the full HTML
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headContent.trim()}
  <style>
${content.css}
  </style>
</head>
<body>
${content.html}
${content.js ? `
  <script>
${content.js}
  </script>
` : ''}
</body>
</html>`;
};

/**
 * Check if template has JavaScript
 */
export const templateHasJavaScript = (fullHtml: string): boolean => {
  const scriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(fullHtml)) !== null) {
    if (match[1].trim()) {
      return true;
    }
  }
  return false;
};

/**
 * Extract external script URLs from template
 */
export const getExternalScripts = (fullHtml: string): string[] => {
  const scriptRegex = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match;
  while ((match = scriptRegex.exec(fullHtml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
};

/**
 * Extract external stylesheet URLs from template
 */
export const getExternalStylesheets = (fullHtml: string): string[] => {
  const linkRegex = /<link[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match;
  while ((match = linkRegex.exec(fullHtml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
};

/**
 * Minify CSS (basic minification)
 */
export const minifyCss = (css: string): string => {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around punctuation
    .trim();
};

/**
 * Minify JS (basic minification - for proper minification use terser)
 */
export const minifyJs = (js: string): string => {
  return js
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
};