import { useState } from 'react';

interface SavedElement {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  description: string;
  htmlCode: string;
  cssCode: string;
}

const BuildMode = () => {
  const [activeTab, setActiveTab] = useState<'components' | 'integrations' | 'deploy'>('components');

  // Sample exported/saved components
  const savedComponents: SavedElement[] = [
    {
      id: '1',
      name: 'Hero Section',
      category: 'Sections',
      thumbnail: '🎨',
      description: 'Full-width hero section with heading and CTA button',
      htmlCode: '<section class="hero">...</section>',
      cssCode: '.hero { padding: 80px 20px; }',
    },
    {
      id: '2',
      name: 'Card Component',
      category: 'Components',
      thumbnail: '🃏',
      description: 'Reusable card with image, title, and description',
      htmlCode: '<div class="card">...</div>',
      cssCode: '.card { border-radius: 8px; }',
    },
    {
      id: '3',
      name: 'Navigation Bar',
      category: 'Navigation',
      thumbnail: '🧭',
      description: 'Responsive navbar with logo and menu items',
      htmlCode: '<nav class="navbar">...</nav>',
      cssCode: '.navbar { display: flex; }',
    },
    {
      id: '4',
      name: 'Footer',
      category: 'Sections',
      thumbnail: '📄',
      description: 'Multi-column footer with links and social icons',
      htmlCode: '<footer class="footer">...</footer>',
      cssCode: '.footer { background: #1a1a1a; }',
    },
    {
      id: '5',
      name: 'Pricing Card',
      category: 'Components',
      thumbnail: '💰',
      description: 'Pricing table card with features list',
      htmlCode: '<div class="pricing-card">...</div>',
      cssCode: '.pricing-card { text-align: center; }',
    },
    {
      id: '6',
      name: 'Contact Form',
      category: 'Forms',
      thumbnail: '📝',
      description: 'Contact form with validation',
      htmlCode: '<form class="contact-form">...</form>',
      cssCode: '.contact-form input { width: 100%; }',
    },
  ];

  const handleExportComponent = (component: SavedElement) => {
    // Create HTML file content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component.name}</title>
  <style>
${component.cssCode}
  </style>
</head>
<body>
${component.htmlCode}
</body>
</html>`;

    // Download HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${component.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="h-full flex flex-col bg-canvas-bg">
      {/* Tabs */}
      <div className="flex border-b border-border-color bg-panel-bg">
        <button
          onClick={() => setActiveTab('components')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'components'
              ? 'border-b-2 border-accent-blue text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Saved Components
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'integrations'
              ? 'border-b-2 border-accent-blue text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'deploy'
              ? 'border-b-2 border-accent-blue text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Deploy & Export
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'components' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text-primary mb-2">Saved Components</h2>
              <p className="text-text-secondary text-sm">
                Export individual components you've created or browse the library
              </p>
            </div>

            {/* Component Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedComponents.map((component) => (
                <div
                  key={component.id}
                  className="bg-panel-bg border border-border-color rounded-lg p-4 hover:border-accent-blue transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-full h-32 bg-canvas-bg rounded-lg flex items-center justify-center mb-3 text-4xl">
                    {component.thumbnail}
                  </div>

                  {/* Info */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-text-primary">{component.name}</h3>
                      <span className="text-xs text-text-secondary px-2 py-1 bg-canvas-bg rounded">
                        {component.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {component.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportComponent(component)}
                      className="flex-1 px-3 py-2 bg-accent-blue text-white text-xs font-medium rounded hover:opacity-90 flex items-center justify-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                    </button>
                    <button
                      onClick={() => handleCopyCode(component.htmlCode)}
                      className="px-3 py-2 bg-canvas-bg text-text-primary text-xs font-medium rounded hover:bg-border-color"
                      title="Copy HTML"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">Integrations</h2>
            <div className="bg-panel-bg border border-border-color rounded-lg p-6 text-center">
              <p className="text-text-secondary">
                Connect your site to third-party services, APIs, and databases
              </p>
              <p className="text-text-secondary text-sm mt-2">Coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">Deploy & Export</h2>
            <div className="space-y-4">
              <div className="bg-panel-bg border border-border-color rounded-lg p-6">
                <h3 className="font-semibold text-text-primary mb-2">Export Full Project</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Download your entire project as HTML, CSS, and assets
                </p>
                <button className="px-4 py-2 bg-accent-blue text-white rounded hover:opacity-90">
                  Export Project
                </button>
              </div>

              <div className="bg-panel-bg border border-border-color rounded-lg p-6">
                <h3 className="font-semibold text-text-primary mb-2">Deploy to Hosting</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Publish your site to various hosting platforms
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="px-4 py-2 bg-canvas-bg text-text-primary rounded hover:bg-border-color">
                    Netlify
                  </button>
                  <button className="px-4 py-2 bg-canvas-bg text-text-primary rounded hover:bg-border-color">
                    Vercel
                  </button>
                  <button className="px-4 py-2 bg-canvas-bg text-text-primary rounded hover:bg-border-color">
                    GitHub Pages
                  </button>
                  <button className="px-4 py-2 bg-canvas-bg text-text-primary rounded hover:bg-border-color">
                    Custom FTP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildMode;
