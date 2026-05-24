// Google Fonts loader utility
// Dynamically loads fonts when selected

const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2';

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();

// Generate Google Fonts URL for a specific font
export const getGoogleFontUrl = (fontFamily: string, weights: number[] = [400, 700]): string => {
  const weightsStr = weights.join(';');
  const encodedFamily = encodeURIComponent(fontFamily);
  return `${GOOGLE_FONTS_API}?family=${encodedFamily}:wght@${weightsStr}&display=swap`;
};

// Load a single font
export const loadFont = async (fontFamily: string, weights: number[] = [400, 500, 600, 700]): Promise<void> => {
  // Skip if already loaded
  if (loadedFonts.has(fontFamily)) {
    return;
  }

  try {
    const url = getGoogleFontUrl(fontFamily, weights);

    // Check if link already exists
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) {
      loadedFonts.add(fontFamily);
      return;
    }

    // Create and append link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;

    // Wait for font to load
    await new Promise<void>((resolve, reject) => {
      link.onload = () => {
        loadedFonts.add(fontFamily);
        resolve();
      };
      link.onerror = () => reject(new Error(`Failed to load font: ${fontFamily}`));
      document.head.appendChild(link);
    });
  } catch (error) {
    console.error(`Error loading font ${fontFamily}:`, error);
  }
};

// Load multiple fonts
export const loadFonts = async (fonts: { family: string; weights?: number[] }[]): Promise<void> => {
  await Promise.all(fonts.map(font => loadFont(font.family, font.weights)));
};

// Preload popular fonts for better UX
export const preloadPopularFonts = (): void => {
  const popularFonts = [
    'Inter',
    'Poppins',
    'Roboto',
    'Montserrat',
    'Playfair Display',
  ];

  // Load asynchronously without blocking
  popularFonts.forEach(font => {
    loadFont(font, [400, 500, 600, 700]);
  });
};

// Check if a font is loaded
export const isFontLoaded = (fontFamily: string): boolean => {
  return loadedFonts.has(fontFamily);
};

// Get all loaded fonts
export const getLoadedFonts = (): string[] => {
  return Array.from(loadedFonts);
};

// Generate CSS @import statement for fonts
export const generateFontImports = (fonts: string[]): string => {
  if (fonts.length === 0) return '';

  const families = fonts
    .map(font => `family=${encodeURIComponent(font)}:wght@100;200;300;400;500;600;700;800;900`)
    .join('&');

  return `@import url('${GOOGLE_FONTS_API}?${families}&display=swap');`;
};

// Generate link tags for HTML export
export const generateFontLinkTags = (fonts: string[]): string => {
  if (fonts.length === 0) return '';

  const families = fonts
    .map(font => `family=${encodeURIComponent(font)}:wght@100;200;300;400;500;600;700;800;900`)
    .join('&');

  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${GOOGLE_FONTS_API}?${families}&display=swap" rel="stylesheet">`;
};