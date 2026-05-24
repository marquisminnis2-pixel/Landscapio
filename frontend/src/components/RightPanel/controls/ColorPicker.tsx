import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#111827',
  '#6b7280',
  '#ef4444',
  '#f97316',
  '#fbbf24',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
];

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handlePresetClick = (c: string) => {
    onChange(c);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded border border-border-color flex items-center justify-center"
        title="Pick color"
        aria-label="Pick color"
      >
        <span
          className="w-6 h-6 rounded"
          style={{ backgroundColor: value || '#000000' }}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 p-2 bg-white border border-border-color rounded shadow-lg w-48">
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handlePresetClick(c)}
                className="w-8 h-8 rounded"
                style={{ backgroundColor: c, border: '1px solid rgba(0,0,0,0.06)' }}
                title={c}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-8 p-0 border-0"
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 text-sm px-2 py-1 border border-border-color rounded"
              placeholder="#000000"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
