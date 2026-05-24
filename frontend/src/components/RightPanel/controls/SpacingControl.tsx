import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface SpacingControlProps {
  element: Element;
}

const SpacingControl = ({ element }: SpacingControlProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
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
        <h4 className="text-sm font-semibold">Spacing</h4>
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
        <div className="space-y-4">
          {/* Padding */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Padding</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={styles.paddingTop || ''}
                onChange={(e) => handleChange('paddingTop', e.target.value)}
                placeholder="Top"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.paddingRight || ''}
                onChange={(e) => handleChange('paddingRight', e.target.value)}
                placeholder="Right"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.paddingBottom || ''}
                onChange={(e) => handleChange('paddingBottom', e.target.value)}
                placeholder="Bottom"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.paddingLeft || ''}
                onChange={(e) => handleChange('paddingLeft', e.target.value)}
                placeholder="Left"
                className="w-full text-xs"
              />
            </div>
            <input
              type="text"
              value={styles.padding || ''}
              onChange={(e) => handleChange('padding', e.target.value)}
              placeholder="All sides (e.g., 10px)"
              className="w-full text-xs mt-2"
            />
          </div>

          {/* Margin */}
          <div>
            <label className="block text-xs text-text-secondary mb-2">Margin</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={styles.marginTop || ''}
                onChange={(e) => handleChange('marginTop', e.target.value)}
                placeholder="Top"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.marginRight || ''}
                onChange={(e) => handleChange('marginRight', e.target.value)}
                placeholder="Right"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.marginBottom || ''}
                onChange={(e) => handleChange('marginBottom', e.target.value)}
                placeholder="Bottom"
                className="w-full text-xs"
              />
              <input
                type="text"
                value={styles.marginLeft || ''}
                onChange={(e) => handleChange('marginLeft', e.target.value)}
                placeholder="Left"
                className="w-full text-xs"
              />
            </div>
            <input
              type="text"
              value={styles.margin || ''}
              onChange={(e) => handleChange('margin', e.target.value)}
              placeholder="All sides (e.g., 10px auto)"
              className="w-full text-xs mt-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SpacingControl;
