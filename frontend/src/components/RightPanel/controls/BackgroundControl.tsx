import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface BackgroundControlProps {
  element: Element;
}

const BackgroundControl = ({ element }: BackgroundControlProps) => {
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
        <h4 className="text-sm font-semibold">Background</h4>
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
          {/* Background Type Selector */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Background Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (styles.backgroundImage) {
                    handleChange('backgroundImage', '');
                  }
                }}
                className={`px-3 py-2 rounded text-xs font-medium ${
                  !styles.backgroundImage ? 'bg-accent-blue text-white' : 'bg-canvas-bg text-text-secondary'
                }`}
              >
                Solid Color
              </button>
              <button
                onClick={() => {
                  if (!styles.backgroundImage) {
                    handleChange('backgroundImage', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
                  }
                }}
                className={`px-3 py-2 rounded text-xs font-medium ${
                  styles.backgroundImage ? 'bg-accent-blue text-white' : 'bg-canvas-bg text-text-secondary'
                }`}
              >
                Gradient/Image
              </button>
            </div>
          </div>

          {/* Background Color - Only show if no gradient/image */}
          {!styles.backgroundImage && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={styles.backgroundColor || '#ffffff'}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-12 h-9"
                />
                <input
                  type="text"
                  value={styles.backgroundColor || ''}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Background Image/Gradient - Only show if gradient/image mode */}
          {styles.backgroundImage && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Gradient or Image URL</label>
              <textarea
                value={styles.backgroundImage || ''}
                onChange={(e) => handleChange('backgroundImage', e.target.value)}
                placeholder="linear-gradient(...) or url(...)"
                className="w-full text-xs font-mono"
                rows={3}
              />
              <div className="mt-2 text-xs text-text-secondary">
                <p className="mb-1">Examples:</p>
                <button
                  onClick={() => handleChange('backgroundImage', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}
                  className="block w-full text-left px-2 py-1 bg-canvas-bg rounded hover:bg-border-color mb-1"
                >
                  Purple gradient
                </button>
                <button
                  onClick={() => handleChange('backgroundImage', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')}
                  className="block w-full text-left px-2 py-1 bg-canvas-bg rounded hover:bg-border-color"
                >
                  Pink gradient
                </button>
              </div>
            </div>
          )}

          {/* Background Size */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Background Size</label>
            <select
              value={styles.backgroundSize || 'auto'}
              onChange={(e) => handleChange('backgroundSize', e.target.value)}
              className="w-full"
            >
              <option value="auto">Auto</option>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </div>

          {/* Background Position */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Background Position</label>
            <input
              type="text"
              value={styles.backgroundPosition || ''}
              onChange={(e) => handleChange('backgroundPosition', e.target.value)}
              placeholder="center center"
              className="w-full"
            />
          </div>

          {/* Background Repeat */}
          <div>
            <label className="block text-xs text-text-secondary mb-1">Background Repeat</label>
            <select
              value={styles.backgroundRepeat || 'repeat'}
              onChange={(e) => handleChange('backgroundRepeat', e.target.value)}
              className="w-full"
            >
              <option value="repeat">Repeat</option>
              <option value="no-repeat">No Repeat</option>
              <option value="repeat-x">Repeat X</option>
              <option value="repeat-y">Repeat Y</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundControl;
