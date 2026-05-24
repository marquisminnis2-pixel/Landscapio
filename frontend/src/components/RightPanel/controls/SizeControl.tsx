import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface SizeControlProps {
  element: Element;
}

const SizeControl = ({ element }: SizeControlProps) => {
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
        <h4 className="text-sm font-semibold">Size</h4>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Width</label>
              <input
                type="text"
                value={styles.width || ''}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="auto"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Height</label>
              <input
                type="text"
                value={styles.height || ''}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="auto"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Min Width</label>
              <input
                type="text"
                value={styles.minWidth || ''}
                onChange={(e) => handleChange('minWidth', e.target.value)}
                placeholder="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Min Height</label>
              <input
                type="text"
                value={styles.minHeight || ''}
                onChange={(e) => handleChange('minHeight', e.target.value)}
                placeholder="0"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Max Width</label>
              <input
                type="text"
                value={styles.maxWidth || ''}
                onChange={(e) => handleChange('maxWidth', e.target.value)}
                placeholder="none"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Max Height</label>
              <input
                type="text"
                value={styles.maxHeight || ''}
                onChange={(e) => handleChange('maxHeight', e.target.value)}
                placeholder="none"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Overflow</label>
            <select
              value={styles.overflow || 'visible'}
              onChange={(e) => handleChange('overflow', e.target.value)}
              className="w-full"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
              <option value="scroll">Scroll</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default SizeControl;
