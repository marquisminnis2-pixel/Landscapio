import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface LayoutControlProps {
  element: Element;
}

const LayoutControl = ({ element }: LayoutControlProps) => {
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
        <h4 className="text-sm font-semibold">Layout</h4>
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
          {/* Display */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Display</label>
            <select
              value={styles.display || 'block'}
              onChange={(e) => handleChange('display', e.target.value)}
              className="w-full"
            >
              <option value="block">Block</option>
              <option value="flex">Flex</option>
              <option value="inline-block">Inline Block</option>
              <option value="inline-flex">Inline Flex</option>
              <option value="grid">Grid</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Flexbox Controls */}
          {(styles.display === 'flex' || styles.display === 'inline-flex') && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Flex Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleChange('flexDirection', 'row')}
                    className={`px-3 py-2 rounded text-xs ${
                      styles.flexDirection === 'row' || !styles.flexDirection
                        ? 'bg-accent-blue text-white'
                        : 'bg-canvas-bg'
                    }`}
                  >
                    Row
                  </button>
                  <button
                    onClick={() => handleChange('flexDirection', 'column')}
                    className={`px-3 py-2 rounded text-xs ${
                      styles.flexDirection === 'column'
                        ? 'bg-accent-blue text-white'
                        : 'bg-canvas-bg'
                    }`}
                  >
                    Column
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Justify Content</label>
                <select
                  value={styles.justifyContent || 'flex-start'}
                  onChange={(e) => handleChange('justifyContent', e.target.value)}
                  className="w-full"
                >
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="space-between">Space Between</option>
                  <option value="space-around">Space Around</option>
                  <option value="space-evenly">Space Evenly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Align Items</label>
                <select
                  value={styles.alignItems || 'stretch'}
                  onChange={(e) => handleChange('alignItems', e.target.value)}
                  className="w-full"
                >
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="stretch">Stretch</option>
                  <option value="baseline">Baseline</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Gap</label>
                <input
                  type="text"
                  value={styles.gap || ''}
                  onChange={(e) => handleChange('gap', e.target.value)}
                  placeholder="e.g., 10px"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Flex Wrap</label>
                <select
                  value={styles.flexWrap || 'nowrap'}
                  onChange={(e) => handleChange('flexWrap', e.target.value)}
                  className="w-full"
                >
                  <option value="nowrap">No Wrap</option>
                  <option value="wrap">Wrap</option>
                  <option value="wrap-reverse">Wrap Reverse</option>
                </select>
              </div>
            </>
          )}

          {/* Position */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Position</label>
            <select
              value={styles.position || 'static'}
              onChange={(e) => handleChange('position', e.target.value)}
              className="w-full"
            >
              <option value="static">Static</option>
              <option value="relative">Relative</option>
              <option value="absolute">Absolute</option>
              <option value="fixed">Fixed</option>
              <option value="sticky">Sticky</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutControl;
