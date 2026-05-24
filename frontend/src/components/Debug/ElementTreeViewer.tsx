import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

const ElementTreeViewer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { pages, currentPageId } = useBuilderStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];

  const renderElement = (element: Element, level: number = 0) => {
    return (
      <div key={element.id} style={{ marginLeft: `${level * 20}px` }} className="mb-2">
        <details className="cursor-pointer">
          <summary className="text-xs font-mono bg-gray-800 text-green-400 px-2 py-1 rounded inline-block">
            {element.type} - {element.name} (id: {element.id})
          </summary>
          <pre className="text-xs mt-1 bg-gray-900 text-gray-300 p-2 rounded overflow-auto">
            {JSON.stringify(
              {
                id: element.id,
                type: element.type,
                name: element.name,
                content: element.content,
                attributes: element.attributes,
                styles: element.styles,
                children: `${element.children.length} child(ren)`,
              },
              null,
              2
            )}
          </pre>
        </details>
        {element.children.length > 0 && (
          <div className="ml-4 mt-2">
            {element.children.map(child => renderElement(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 z-50 text-sm font-medium"
      >
        🌳 View Element Tree (JSON)
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-gray-900 border-2 border-green-500 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
      <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between">
        <h3 className="font-bold text-sm">Element Tree (JSON Data)</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {elements.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No elements on canvas
          </div>
        ) : (
          <div>
            {elements.map(element => renderElement(element))}
          </div>
        )}
      </div>
      <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
        Total elements: {elements.length} | Click to expand JSON
      </div>
    </div>
  );
};

export default ElementTreeViewer;