// Curated list of popular Google Fonts
// These are the most commonly used fonts in web design

export interface GoogleFont {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';
  weights: number[];
  popular?: boolean;
}

export const googleFonts: GoogleFont[] = [
  // Sans-Serif - Modern & Clean
  { family: 'Inter', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], popular: true },
  { family: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], popular: true },
  { family: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900], popular: true },
  { family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800], popular: true },
  { family: 'Montserrat', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], popular: true },
  { family: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900], popular: true },
  { family: 'Nunito', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Nunito Sans', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Raleway', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], popular: true },
  { family: 'Work Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Manrope', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700] },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Outfit', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Sora', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Figtree', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Rubik', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900] },
  { family: 'Karla', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Mulish', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Source Sans 3', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Lexend', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Albert Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Urbanist', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Quicksand', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },

  // Serif - Elegant & Traditional
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900], popular: true },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900], popular: true },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], popular: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700] },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { family: 'Source Serif 4', category: 'serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'DM Serif Display', category: 'serif', weights: [400] },
  { family: 'Crimson Text', category: 'serif', weights: [400, 600, 700] },
  { family: 'Bitter', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Spectral', category: 'serif', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Fraunces', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Instrument Serif', category: 'serif', weights: [400] },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700, 800] },
  { family: 'Cardo', category: 'serif', weights: [400, 700] },
  { family: 'Noto Serif', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },

  // Display - Headlines & Impact
  { family: 'Bebas Neue', category: 'display', weights: [400], popular: true },
  { family: 'Oswald', category: 'display', weights: [200, 300, 400, 500, 600, 700], popular: true },
  { family: 'Anton', category: 'display', weights: [400] },
  { family: 'Abril Fatface', category: 'display', weights: [400] },
  { family: 'Righteous', category: 'display', weights: [400] },
  { family: 'Alfa Slab One', category: 'display', weights: [400] },
  { family: 'Fjalla One', category: 'display', weights: [400] },
  { family: 'Archivo Black', category: 'display', weights: [400] },
  { family: 'Passion One', category: 'display', weights: [400, 700, 900] },
  { family: 'Black Ops One', category: 'display', weights: [400] },
  { family: 'Bungee', category: 'display', weights: [400] },
  { family: 'Secular One', category: 'display', weights: [400] },
  { family: 'Dela Gothic One', category: 'display', weights: [400] },

  // Handwriting - Personal & Creative
  { family: 'Pacifico', category: 'handwriting', weights: [400], popular: true },
  { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700] },
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700] },
  { family: 'Satisfy', category: 'handwriting', weights: [400] },
  { family: 'Great Vibes', category: 'handwriting', weights: [400] },
  { family: 'Lobster', category: 'handwriting', weights: [400] },
  { family: 'Sacramento', category: 'handwriting', weights: [400] },
  { family: 'Kalam', category: 'handwriting', weights: [300, 400, 700] },
  { family: 'Indie Flower', category: 'handwriting', weights: [400] },
  { family: 'Shadows Into Light', category: 'handwriting', weights: [400] },
  { family: 'Permanent Marker', category: 'handwriting', weights: [400] },
  { family: 'Amatic SC', category: 'handwriting', weights: [400, 700] },

  // Monospace - Code & Technical
  { family: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700], popular: true },
  { family: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800] },
  { family: 'Source Code Pro', category: 'monospace', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'IBM Plex Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700] },
  { family: 'Roboto Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700] },
  { family: 'Space Mono', category: 'monospace', weights: [400, 700] },
  { family: 'Inconsolata', category: 'monospace', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
];

// Get fonts by category
export const getFontsByCategory = (category: GoogleFont['category']): GoogleFont[] => {
  return googleFonts.filter(font => font.category === category);
};

// Get popular fonts
export const getPopularFonts = (): GoogleFont[] => {
  return googleFonts.filter(font => font.popular);
};

// Search fonts
export const searchFonts = (query: string): GoogleFont[] => {
  const lowerQuery = query.toLowerCase();
  return googleFonts.filter(font =>
    font.family.toLowerCase().includes(lowerQuery)
  );
};

// Get font CSS value
export const getFontCssValue = (font: GoogleFont): string => {
  const fallback = font.category === 'monospace' ? 'monospace' :
                   font.category === 'serif' ? 'serif' : 'sans-serif';
  return `'${font.family}', ${fallback}`;
};

// Categories for UI
export const fontCategories = [
  { id: 'popular', label: 'Popular' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'monospace', label: 'Monospace' },
] as const;