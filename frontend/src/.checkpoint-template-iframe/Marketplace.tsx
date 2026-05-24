import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceTemplate, templateCategories } from '@/types/template.types';
import { marketplaceTemplates, getFeaturedTemplates } from '@/data/marketplaceTemplates';
import TemplateDetailModal from './TemplateDetailModal';

type FilterType = 'all' | 'free' | 'premium';
type SortType = 'popular' | 'newest' | 'rating' | 'price-low' | 'price-high';

const Marketplace = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);

  const featuredTemplates = getFeaturedTemplates();

  const filteredTemplates = useMemo(() => {
    let templates = [...marketplaceTemplates];

    // Category filter
    if (selectedCategory !== 'All') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // Price filter
    if (filterType === 'free') {
      templates = templates.filter(t => !t.isPremium);
    } else if (filterType === 'premium') {
      templates = templates.filter(t => t.isPremium);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        templates.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'newest':
        templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'rating':
        templates.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        templates.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        templates.sort((a, b) => b.price - a.price);
        break;
    }

    return templates;
  }, [selectedCategory, filterType, sortBy, searchQuery]);

  const handleUseTemplate = async (template: MarketplaceTemplate) => {
    let htmlContent = template.htmlContent;

    // If template has a URL, fetch the content
    if (template.templateUrl) {
      try {
        console.log('🔄 Fetching template from:', template.templateUrl);
        const response = await fetch(template.templateUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        htmlContent = await response.text();
        console.log('✅ Template fetched, length:', htmlContent.length);
        console.log('📄 Template preview:', htmlContent.substring(0, 200));
      } catch (error) {
        console.error('Failed to fetch template:', error);
        alert('Failed to load template. Please try again.');
        return;
      }
    }

    // Store template HTML in sessionStorage for the builder to use
    sessionStorage.setItem('templateHtml', htmlContent);
    // Mark this as a full HTML template (with embedded CSS)
    sessionStorage.setItem('templateType', 'fullHtml');

    // Store additional metadata for multi-page/complex templates
    if (template.hasJavaScript) {
      sessionStorage.setItem('templateHasJS', 'true');
    }
    if (template.templateUrl) {
      // Derive the base path from templateUrl (e.g., '/templates/acci-connect/index.html' → '/templates/acci-connect/')
      const basePath = template.templateUrl.substring(0, template.templateUrl.lastIndexOf('/') + 1);
      sessionStorage.setItem('templateBasePath', basePath);
    }

    // Try to create a project on the backend if logged in
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    if (token && orgId) {
      try {
        const basePath = template.templateUrl
          ? template.templateUrl.substring(0, template.templateUrl.lastIndexOf('/') + 1)
          : '';

        const projectResponse = await fetch(`/api/orgs/${orgId}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: template.title,
            rawHtml: htmlContent,
            templateBasePath: basePath,
          }),
        });

        const projectData = await projectResponse.json();

        if (projectResponse.ok) {
          // Navigate to the builder with the new project
          navigate(`/builder/${projectData._id}`);
          return;
        }
      } catch (error) {
        console.error('Failed to create project on backend:', error);
        // Continue to navigate without project ID
      }
    }

    // Navigate to builder without project ID (works without login)
    navigate('/builder/new');
  };

  return (
    <div className="h-screen relative overflow-hidden flex flex-col">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 bg-[#0D1117] pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-drift-1"
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, rgba(52, 211, 153, 0.08) 40%, transparent 70%)',
            top: '10%',
            left: '15%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-drift-2"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 70%)',
            top: '50%',
            right: '10%',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-white/50 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Template Marketplace</h1>
                <p className="text-sm text-gray-600">Discover professional templates to kickstart your project</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white/50 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] text-gray-900 placeholder-gray-500 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Featured Section */}
          <div className="px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredTemplates.slice(0, 4).map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="group cursor-pointer bg-white/80 backdrop-blur-xl rounded-xl overflow-hidden border border-white/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={template.previewImage}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {template.isPremium && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        PREMIUM
                      </div>
                    )}
                    {!template.isPremium && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        FREE
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {template.rating}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#10B981] transition-colors">
                        {template.title}
                      </h3>
                      <span className="text-lg font-bold text-gray-900">
                        {template.price === 0 ? 'Free' : `$${template.price}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={template.author.avatar}
                          alt={template.author.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs text-gray-600">{template.author.name}</span>
                        {template.author.verified && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{template.downloads.toLocaleString()} uses</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters & All Templates */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">All Templates</h2>
              <div className="flex items-center gap-3">
                {/* Filter Type */}
                <div className="flex bg-white/50 rounded-lg p-1">
                  {(['all', 'free', 'premium'] as FilterType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filterType === type
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortType)}
                  className="px-4 py-2 bg-white/50 border border-white/30 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-6">
              {templateCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#059669] text-white shadow-lg'
                      : 'bg-white/50 text-gray-700 hover:bg-white/70'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="group cursor-pointer bg-white/80 backdrop-blur-xl rounded-xl overflow-hidden border border-white/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={template.previewImage}
                      alt={template.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {template.isPremium ? (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        ${template.price}
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        FREE
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg">
                        Preview
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#10B981] transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="text-sm text-gray-600">{template.rating}</span>
                        <span className="text-xs text-gray-400">({template.reviewCount})</span>
                      </div>
                      <span className="text-xs text-gray-500">{template.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
};

export default Marketplace;