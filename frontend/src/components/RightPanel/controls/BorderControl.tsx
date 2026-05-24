import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface BorderControlProps {
  element: Element;
}

const BorderControl = ({ element }: BorderControlProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentBreakpoint, updateElementStyles } = useBuilderStore();

  const styles = element.styles[currentBreakpoint];

  const handleChange = (property: string, value: string) => {
    updateElementStyles(element.id, currentBreakpoint, { [property]: value });
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <h4 className="text-sm font-semibold">Border</h4>
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
          {/* Border Width */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Border Width</label>
            <input
              type="text"
              value={styles.borderWidth || ''}
              onChange={(e) => handleChange('borderWidth', e.target.value)}
              placeholder="1px"
              className="w-full"
            />
          </div>

          {/* Border Style */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Border Style</label>
            <select
              value={styles.borderStyle || 'solid'}
              onChange={(e) => handleChange('borderStyle', e.target.value)}
              className="w-full"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          {/* Border Color */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Border Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={styles.borderColor || '#000000'}
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="w-12 h-9"
              />
              <input
                type="text"
                value={styles.borderColor || ''}
                onChange={(e) => handleChange('borderColor', e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Border Radius</label>
            <input
              type="text"
              value={styles.borderRadius || ''}
              onChange={(e) => handleChange('borderRadius', e.target.value)}
              placeholder="0px"
              className="w-full"
            />
          </div>

          {/* Box Shadow */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Box Shadow</label>
            <input
              type="text"
              value={styles.boxShadow || ''}
              onChange={(e) => handleChange('boxShadow', e.target.value)}
              placeholder="0 2px 4px rgba(0,0,0,0.1)"
              className="w-full"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={styles.opacity || 1}
              onChange={(e) => handleChange('opacity', e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-text-secondary text-center mt-1">
              {styles.opacity || 1}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorderControl;
