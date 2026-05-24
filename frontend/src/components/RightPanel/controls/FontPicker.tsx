import { useState, useEffect, useRef } from 'react';
import { fontCategories, getFontsByCategory, getPopularFonts, searchFonts, getFontCssValue, GoogleFont } from '@/data/googleFonts';
import { loadFont, isFontLoaded } from '@/utils/fontLoader';

interface FontPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const FontPicker = ({ value, onChange }: FontPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get current font name from CSS value
  const currentFontName = value?.replace(/['"]/g, '').split(',')[0].trim() || 'Inter';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get fonts to display based on search or category
  const getDisplayFonts = (): GoogleFont[] => {
    if (searchQuery) {
      return searchFonts(searchQuery);
    }
    if (activeCategory === 'popular') {
      return getPopularFonts();
    }
    return getFontsByCategory(activeCategory as GoogleFont['category']);
  };

  const displayFonts = getDisplayFonts();

  // Handle font selection
  const handleSelectFont = async (font: GoogleFont) => {
    // Load font if not already loaded
    if (!isFontLoaded(font.family)) {
      setLoadingFonts(prev => new Set(prev).add(font.family));
      await loadFont(font.family, font.weights);
      setLoadingFonts(prev => {
        const next = new Set(prev);
        next.delete(font.family);
        return next;
      });
    }

    onChange(getFontCssValue(font));
    setIsOpen(false);
    setSearchQuery('');
  };

  // Load font for preview on hover
  const handleFontHover = (font: GoogleFont) => {
    if (!isFontLoaded(font.family) && !loadingFonts.has(font.family)) {
      loadFont(font.family, [400]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Font Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-canvas-bg border border-border-color rounded-md hover:border-text-secondary transition-colors text-left"
      >
        <span
          className="text-sm truncate"
          style={{ fontFamily: value || 'Inter, sans-serif' }}
        >
          {currentFontName}
        </span>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-panel-bg border border-border-color rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border-color">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fonts..."
                className="w-full pl-9 pr-3 py-2 bg-canvas-bg border border-border-color rounded-md text-sm focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex gap-1 p-2 border-b border-border-color overflow-x-auto scrollbar-hide">
              {fontCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? 'bg-accent-blue text-white'
                      : 'bg-canvas-bg text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}

          {/* Font List */}
          <div className="max-h-64 overflow-y-auto">
            {displayFonts.length === 0 ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                No fonts found
              </div>
            ) : (
              displayFonts.map((font) => {
                const isSelected = currentFontName === font.family;
                const isLoading = loadingFonts.has(font.family);

                return (
                  <button
                    key={font.family}
                    onClick={() => handleSelectFont(font)}
                    onMouseEnter={() => handleFontHover(font)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-canvas-bg transition-colors ${
                      isSelected ? 'bg-accent-blue/10' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className="block text-sm truncate"
                        style={{
                          fontFamily: isFontLoaded(font.family)
                            ? `'${font.family}', ${font.category}`
                            : 'inherit'
                        }}
                      >
                        {font.family}
                      </span>
                      <span className="text-xs text-text-secondary capitalize">
                        {font.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLoading && (
                        <svg className="w-4 h-4 animate-spin text-text-secondary" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* System Fonts Section */}
          <div className="border-t border-border-color">
            <div className="px-3 py-2 text-xs text-text-secondary font-medium bg-canvas-bg/50">
              System Fonts
            </div>
            {[
              { name: 'System Default', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
              { name: 'Arial', value: 'Arial, sans-serif' },
              { name: 'Georgia', value: 'Georgia, serif' },
              { name: 'Times New Roman', value: "'Times New Roman', serif" },
            ].map((font) => (
              <button
                key={font.name}
                onClick={() => {
                  onChange(font.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-canvas-bg transition-colors"
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontPicker;