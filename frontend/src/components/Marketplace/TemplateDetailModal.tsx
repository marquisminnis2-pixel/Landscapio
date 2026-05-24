import { useState } from 'react';
import { MarketplaceTemplate } from '@/types/template.types';

interface TemplateDetailModalProps {
  template: MarketplaceTemplate;
  onClose: () => void;
  onUseTemplate: (template: MarketplaceTemplate) => void;
}

const TemplateDetailModal = ({ template, onClose, onUseTemplate }: TemplateDetailModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = template.previewImages || [template.previewImage];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#1a2332]/95 backdrop-blur-xl rounded-xl border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={template.author.avatar}
              alt={template.author.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{template.author.name}</span>
                {template.author.verified && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-white/40">Template Creator</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Preview Images */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 mb-4">
                <img
                  src={images[currentImageIndex]}
                  alt={`${template.title} preview ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(i => (i > 0 ? i - 1 : images.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-lg shadow-lg hover:bg-white/15 transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(i => (i < images.length - 1 ? i + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-lg shadow-lg hover:bg-white/15 transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        currentImageIndex === index ? 'border-[#10B981]' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{template.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <span className="font-medium text-white">{template.rating}</span>
                    <span className="text-white/40">({template.reviewCount} reviews)</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <span className="text-white/50">{template.downloads.toLocaleString()} downloads</span>
                </div>
              </div>

              <p className="text-white/50">{template.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {template.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/10 text-white/60 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Category & Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-white/40">Category</span>
                  <p className="font-medium text-white">{template.category}</p>
                </div>
                <div>
                  <span className="text-sm text-white/40">Style</span>
                  <p className="font-medium text-white">{template.style}</p>
                </div>
              </div>

              {/* Price */}
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/50">Price</span>
                  <span className="text-3xl font-bold text-white">
                    {template.price === 0 ? 'Free' : `$${template.price}`}
                  </span>
                </div>
                <button
                  onClick={() => onUseTemplate(template)}
                  className="w-full py-3 bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#10B981] text-white rounded-md font-medium hover:opacity-90 transition-opacity shadow-lg"
                >
                  {template.isPremium ? 'Purchase & Use Template' : 'Use This Template'}
                </button>
                {template.isPremium && (
                  <p className="text-xs text-white/40 text-center mt-2">
                    One-time purchase. Use on unlimited projects.
                  </p>
                )}
              </div>

              {/* Last Updated */}
              <div className="text-sm text-white/40">
                Last updated: {new Date(template.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetailModal;