// Font utilities for extracting and managing fonts in projects
import { Element } from '@/types/element.types';
import { googleFonts } from '@/data/googleFonts';

// Extract font family name from CSS value
export const extractFontName = (fontFamily: string): string | null => {
  if (!fontFamily) return null;

  // Remove quotes and get first font in stack
  const cleaned = fontFamily.replace(/['"]/g, '').split(',')[0].trim();

  // Skip generic families
  const genericFamilies = ['inherit', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
  if (genericFamilies.includes(cleaned.toLowerCase())) return null;

  return cleaned;
};

// Check if font is a Google Font
export const isGoogleFont = (fontName: string): boolean => {
  return googleFonts.some(font => font.family === fontName);
};

// Extract all fonts used in elements recursively
export const extractUsedFonts = (elements: Element[]): Set<string> => {
  const fonts = new Set<string>();

  const traverse = (els: Element[]) => {
    for (const element of els) {
      // Check all breakpoint styles
      for (const breakpoint of ['desktop', 'tablet', 'mobile'] as const) {
        const styles = element.styles[breakpoint];
        if (styles?.fontFamily) {
          const fontName = extractFontName(styles.fontFamily);
          if (fontName && isGoogleFont(fontName)) {
            fonts.add(fontName);
          }
        }
      }

      // Recurse into children
      if (element.children?.length > 0) {
        traverse(element.children);
      }
    }
  };

  traverse(elements);
  return fonts;
};

// Get all used Google Fonts from all pages
export const getProjectFonts = (pages: { elements: Element[] }[]): string[] => {
  const allFonts = new Set<string>();

  for (const page of pages) {
    const pageFonts = extractUsedFonts(page.elements);
    pageFonts.forEach(font => allFonts.add(font));
  }

  return Array.from(allFonts).sort();
};

// Generate Google Fonts URL for project export
export const generateProjectFontUrl = (fonts: string[]): string => {
  if (fonts.length === 0) return '';

  const families = fonts
    .map(font => `family=${encodeURIComponent(font)}:wght@100;200;300;400;500;600;700;800;900`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

// Generate HTML link tags for font import
export const generateFontLinkHtml = (fonts: string[]): string => {
  if (fonts.length === 0) return '';

  const url = generateProjectFontUrl(fonts);
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${url}" rel="stylesheet">`;
};

// Generate CSS @import for fonts
export const generateFontImportCss = (fonts: string[]): string => {
  if (fonts.length === 0) return '';

  const url = generateProjectFontUrl(fonts);
  return `@import url('${url}');`;
};