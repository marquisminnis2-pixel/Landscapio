import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element, ElementType } from '@/types/element.types';
import FontPicker from './FontPicker';
import ColorPicker from './ColorPicker';

interface TypographyControlProps {
  element: Element;
}

const headingTypes: ElementType[] = ['h1', 'h2', 'h3'];
const textTypes: ElementType[] = ['text', 'heading', 'button', 'link', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'];

const TypographyControl = ({ element }: TypographyControlProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentBreakpoint, updateElementStyles, updateElement } = useBuilderStore();

  const styles = element.styles[currentBreakpoint];

  const handleChange = (property: string, value: string) => {
    updateElementStyles(element.id, currentBreakpoint, { [property]: value });
  };

  const handleHeadingTypeChange = (newType: ElementType) => {
    updateElement(element.id, { type: newType });
  };

  // Check if it's a heading-type element
  const isHeading = headingTypes.includes(element.type as ElementType) || element.type === 'heading';

  // Only show for text-based elements
  if (!textTypes.includes(element.type)) {
    return null;
  }

  return (
    <div className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <h4 className="text-sm font-semibold">Typography</h4>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Heading Type - Only show for heading elements */}
          {isHeading && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Heading Type</label>
              <div className="grid grid-cols-3 gap-1">
                {headingTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleHeadingTypeChange(type)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      element.type === type
                        ? 'bg-accent-blue text-white'
                        : 'bg-canvas-bg hover:bg-border-color text-text-primary'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Font Family */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Font Family</label>
            <FontPicker
              value={styles.fontFamily || "'Inter', sans-serif"}
              onChange={(value) => handleChange('fontFamily', value)}
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Font Size</label>
            <input
              type="text"
              value={styles.fontSize || ''}
              onChange={(e) => handleChange('fontSize', e.target.value)}
              placeholder="16px"
              className="w-full"
            />
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Font Weight</label>
            <select
              value={styles.fontWeight || '400'}
              onChange={(e) => handleChange('fontWeight', e.target.value)}
              className="w-full"
            >
              <option value="100">Thin (100)</option>
              <option value="200">Extra Light (200)</option>
              <option value="300">Light (300)</option>
              <option value="400">Normal (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semi Bold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">Extra Bold (800)</option>
              <option value="900">Black (900)</option>
            </select>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Line Height</label>
            <input
              type="text"
              value={styles.lineHeight || ''}
              onChange={(e) => handleChange('lineHeight', e.target.value)}
              placeholder="1.5"
              className="w-full"
            />
          </div>

          {/* Text Align */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Text Align</label>
            <div className="grid grid-cols-4 gap-1">
              {['left', 'center', 'right', 'justify'].map((align) => (
                <button
                  key={align}
                  onClick={() => handleChange('textAlign', align)}
                  className={`px-2 py-2 rounded text-xs ${
                    styles.textAlign === align ? 'bg-accent-blue text-white' : 'bg-canvas-bg'
                  }`}
                >
                  {align[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Color</label>
            <div className="flex gap-2 items-center">
              <ColorPicker
                value={styles.color}
                onChange={(c) => handleChange('color', c)}
              />
              <input
                type="text"
                value={styles.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Letter Spacing</label>
            <input
              type="text"
              value={styles.letterSpacing || ''}
              onChange={(e) => handleChange('letterSpacing', e.target.value)}
              placeholder="normal"
              className="w-full"
            />
          </div>

          {/* Text Transform */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Text Transform</label>
            <select
              value={styles.textTransform || 'none'}
              onChange={(e) => handleChange('textTransform', e.target.value)}
              className="w-full"
            >
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>

          {/* Text Decoration */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Text Decoration</label>
            <input
              type="text"
              value={styles.textDecoration || ''}
              onChange={(e) => handleChange('textDecoration', e.target.value)}
              placeholder="none"
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TypographyControl;
