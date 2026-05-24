import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { MarketplaceTemplate, templateCategories } from '@/types/template.types';
import { marketplaceTemplates } from '@/data/marketplaceTemplates';
import TemplateDetailModal from './TemplateDetailModal';
import { recordTemplatePurchase } from '@/api/templates';

type FilterType = 'all' | 'free' | 'premium';
type SortType = 'popular' | 'newest' | 'rating' | 'price-low' | 'price-high';

const Marketplace = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [communityTemplates, setCommunityTemplates] = useState<MarketplaceTemplate[]>([]);

  // Fetch community-published templates from the API
  useEffect(() => {
    fetch(`${API_BASE}/api/templates/list`)
      .then(r => r.json())
      .then(data => {
        const mapped: MarketplaceTemplate[] = (data.templates || []).map((t: any) => ({
          id: t._id || t.id,
          title: t.title,
          description: t.description || '',
          category: t.category || 'All',
          style: t.style || 'Modern',
          previewImage: '',
          htmlContent: t.htmlContent || '',
          price: 0,
          isPremium: false,
          author: { name: 'Landscapio Community', avatar: '' },
          rating: 0,
          reviewCount: 0,
          downloads: 0,
          tags: [t.category, t.style].filter(Boolean),
          createdAt: t.publishedAt || new Date().toISOString(),
          updatedAt: t.publishedAt || new Date().toISOString(),
        }));
        setCommunityTemplates(mapped);
      })
      .catch(() => {});
  }, []);

  // Handle return from Stripe after purchase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pending = localStorage.getItem('pendingPurchase');

    // Support both ?purchased=true (from Stripe redirect) and any pending purchase
    if (params.get('purchased') !== 'true' || !pending) return;

    let data: any;
    try { data = JSON.parse(pending); } catch { localStorage.removeItem('pendingPurchase'); return; }

    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    if (!token || !orgId) { localStorage.removeItem('pendingPurchase'); return; }

    recordTemplatePurchase(orgId, data, token)
      .then(() => {
        localStorage.removeItem('pendingPurchase');
        // Navigate to dashboard — template gallery is accessed from there (New Project)
        navigate('/dashboard', { state: { purchasedTemplate: data.title } });
      })
      .catch((err: any) => {
        console.error('Failed to record template purchase:', err);
        localStorage.removeItem('pendingPurchase');
        // Still navigate to dashboard even if recording failed
        navigate('/dashboard');
      });
  }, [navigate]);

  const filteredTemplates = useMemo(() => {
    let templates = [...marketplaceTemplates, ...communityTemplates];

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
    // Premium templates: save metadata then redirect to Stripe Payment Link
    if (template.isPremium && template.stripePaymentLink) {
      localStorage.setItem('pendingPurchase', JSON.stringify({
        templateId: template.id,
        title: template.title,
        description: template.description,
        category: template.category,
        style: template.style,
        previewImage: template.previewImage,
        templateUrl: template.templateUrl || '',
        hasJavaScript: template.hasJavaScript || false,
      }));
      window.location.href = template.stripePaymentLink;
      return;
    }
    if (template.isPremium) {
      alert('This premium template is not yet available for purchase. Please check back soon.');
      return;
    }

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

        const projectResponse = await fetch(`${API_BASE}/api/orgs/${orgId}/projects`, {
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
    <div className="h-screen flex flex-col bg-[#0D1117]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Template Marketplace</h1>
              <p className="text-sm text-white/50">Discover professional templates to kickstart your project</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] text-white placeholder-white/30 w-64"
              />
            </div>
          </div>
        </div>

        {/* Filters row — directly under header, always visible */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 flex-1">
            {templateCategories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#10B981] text-white shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {/* Filter Type */}
          <div className="flex bg-white/5 rounded-lg p-1 flex-shrink-0">
            {(['all', 'free', 'premium'] as FilterType[]).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white'
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
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#10B981] flex-shrink-0"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>


      {/* Template Grid — scrollable area starts here */}
      <div className="flex-1 overflow-y-auto min-h-0 px-8 py-6 accent-scrollbar">
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className="group cursor-pointer bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
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
                  {template.featured && (
                    <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {template.rating}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 text-white backdrop-blur-sm px-4 py-2 rounded-lg font-medium shadow-lg">
                      Preview
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white group-hover:text-[#10B981] transition-colors">
                      {template.title}
                    </h3>
                    <span className="text-sm font-bold text-white ml-2 flex-shrink-0">
                      {template.price === 0 ? 'Free' : `$${template.price}`}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 line-clamp-2 mb-3">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      <span className="text-sm text-white/50">{template.rating}</span>
                      <span className="text-xs text-white/30">({template.reviewCount})</span>
                    </div>
                    <span className="text-xs text-white/40">{template.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-1">No templates found</h3>
            <p className="text-white/50 mb-4">
              {filterType === 'free' ? 'All templates are premium — switch to "All" or "Premium" to browse.' : 'Try adjusting your search or filters'}
            </p>
            {filterType === 'free' && (
              <button
                onClick={() => setFilterType('all')}
                className="px-4 py-2 bg-[#10B981]/20 border border-[#10B981]/30 text-[#34D399] rounded-lg text-sm hover:bg-[#10B981]/30 transition-colors"
              >
                Show all templates
              </button>
            )}
          </div>
        )}
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