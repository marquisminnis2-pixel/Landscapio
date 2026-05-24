import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Template, TemplateCategory, templateCategories } from '@/types/template.types';
import { fetchPurchasedTemplates } from '@/api/templates';
import AdminUpload from './AdminUpload';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
}

const TemplateGallery = ({ onSelectTemplate }: TemplateGalleryProps) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [purchasedTemplates, setPurchasedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = localStorage.getItem('orgId');
    const token = localStorage.getItem('token');
    if (!orgId || !token) { setLoading(false); return; }
    fetchPurchasedTemplates(orgId, token)
      .then(purchases => setPurchasedTemplates(purchases.map((p: any) => ({
        id: p.templateId,
        title: p.title,
        description: p.description,
        category: p.category,
        style: p.style,
        previewImage: p.previewImage,
        htmlContent: '',
        templateUrl: p.templateUrl,
        hasJavaScript: p.hasJavaScript,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = purchasedTemplates.filter((template) => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = async (template: Template) => {
    if (template.templateUrl && !template.htmlContent) {
      try {
        const res = await fetch(template.templateUrl);
        const html = await res.text();
        onSelectTemplate({ ...template, htmlContent: html });
      } catch {
        onSelectTemplate(template);
      }
    } else {
      onSelectTemplate(template);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-2xl font-bold text-white mb-2">Template Gallery</h1>
          <p className="text-white/50 text-sm">
            Your purchased templates — ready to use in the builder
          </p>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-white/5">
          <div className="mb-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {templateCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#10B981] text-white shadow-lg'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Admin Upload */}
        <div className="p-6">
          <details>
            <summary className="cursor-pointer text-sm text-text-secondary">Admin: Upload template (dev)</summary>
            <div className="mt-4">
              <AdminUpload />
            </div>
          </details>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-6 accent-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40 text-sm">Loading your templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-white/50 font-medium mb-1">
              {purchasedTemplates.length === 0 ? "You haven't purchased any templates yet" : 'No templates match your search'}
            </p>
            <p className="text-white/30 text-sm mb-5">
              {purchasedTemplates.length === 0
                ? 'Browse the Marketplace to find professional templates for your projects.'
                : 'Try adjusting your search or category filter.'}
            </p>
            {purchasedTemplates.length === 0 && (
              <button
                onClick={() => navigate('/marketplace')}
                className="px-5 py-2.5 bg-gradient-to-r from-[#34D399] to-[#10B981] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Browse Marketplace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden hover:border-[#10B981] hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => handleSelect(template)}
              >
                <div className="relative aspect-video bg-white/5 overflow-hidden">
                  <img
                    src={template.previewImage}
                    alt={template.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <button className="w-full py-2 bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#10B981] text-white rounded-md font-medium shadow-lg">
                      Use Template
                    </button>
                  </div>
                </div>
                <div className="p-4 pointer-events-none">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{template.title}</h3>
                    <span className="text-xs px-2 py-1 bg-[#34D399]/10 text-white/60 rounded">{template.style}</span>
                  </div>
                  <p className="text-sm text-white/50 line-clamp-2 mb-3">{template.description}</p>
                  <span className="text-xs px-2 py-1 bg-[#10B981]/10 text-white/70 rounded">{template.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;
