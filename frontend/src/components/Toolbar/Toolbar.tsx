import { useBuilderStore } from '@/store/useBuilderStore';
import { API_BASE } from '@/lib/api';
import { useCMSStore } from '@/store/useCMSStore';
import { useHostingStore } from '@/store/useHostingStore';
import { useNavigate, useParams } from 'react-router-dom';
import { generateHTMLWithInlineStyles, exportTemplateAsZip, exportElementsAsZip } from '@/utils/exportCode';
import { useState, useEffect } from 'react';

const Toolbar = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { pages, currentPageId, setCurrentPage, addPage, currentBreakpoint, setBreakpoint, undo, redo, history, viewMode, setViewMode, canvasDarkMode, toggleCanvasDarkMode, setPageTemplate, rawHtmlTemplate, templateBasePath, isTemplateMode } = useBuilderStore();
  const { togglePanel: toggleCMSPanel, isPanelOpen: isCMSPanelOpen, collections } = useCMSStore();
  const { togglePanel: toggleHostingPanel, isPanelOpen: isHostingPanelOpen, isDeploying } = useHostingStore();

  // Get current page and its elements
  const currentPage = pages.find(p => p.id === currentPageId);
  const elements = currentPage?.elements || [];
  const [isSaving, setIsSaving] = useState(false);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showPublishTemplateModal, setShowPublishTemplateModal] = useState(false);

  const [projectName, setProjectName] = useState('Untitled Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [templateData, setTemplateData] = useState({
    title: '',
    description: '',
    category: 'Business',
    style: 'Modern',
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch project name from backend
  useEffect(() => {
    if (!projectId || projectId === 'new' || projectId.startsWith('temp-')) return;
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    if (!token || !orgId) return;
    fetch(`${API_BASE}/api/orgs/${orgId}/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.name) setProjectName(data.name); })
      .catch(() => {});
  }, [projectId]);

  const handleSaveProjectName = async (name: string) => {
    const trimmed = name.trim() || 'Untitled Project';
    setProjectName(trimmed);
    setIsEditingName(false);
    if (!projectId || projectId === 'new' || projectId.startsWith('temp-')) return;
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');
    if (!token || !orgId) return;
    await fetch(`${API_BASE}/api/orgs/${orgId}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => {});
  };

  const handleExport = async () => {
    const projectName = currentPage?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'landscapio-project';

    // Template mode: bundle rawHtml + all template assets into a zip
    if (isTemplateMode && rawHtmlTemplate) {
      try {
        await exportTemplateAsZip(rawHtmlTemplate, templateBasePath || '', projectName);
        alert('Project exported! Check your downloads folder for ' + projectName + '.zip');
      } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting project. Please try again.');
      }
      return;
    }

    // Element mode: bundle generated HTML/CSS/JS into a zip
    if (elements.length === 0) {
      alert('No elements to export. Add some elements to your canvas first!');
      return;
    }

    try {
      await exportElementsAsZip(elements, projectName);
      alert('Project exported! Check your downloads folder for ' + projectName + '.zip');
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting project. Please try again.');
    }
  };

  const handleAddPage = () => {
    if (newPageName.trim()) {
      const slug = newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      addPage(newPageName.trim(), slug);
      setNewPageName('');
      setShowAddPageModal(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('orgId');

    if (!token) {
      alert('Please log in to save your project');
      return;
    }

    if (!orgId) {
      alert('No organization selected. Please select an organization first.');
      return;
    }

    if (!projectId || projectId === 'new' || projectId.startsWith('temp-')) {
      // Create a new project first
      try {
        setIsSaving(true);
        const response = await fetch(`${API_BASE}/api/orgs/${orgId}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: projectName,
            elements: elements,
            rawHtml: isTemplateMode ? rawHtmlTemplate : undefined,
            templateBasePath: isTemplateMode ? templateBasePath : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          alert('Project saved successfully!');
          // Navigate to the new project URL
          navigate(`/builder/${data._id}`, { replace: true });
        } else {
          const error = await response.json();
          alert(`Failed to save: ${error.message}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        alert('Error saving project. Please try again.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Update existing project
    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE}/api/orgs/${orgId}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          elements: elements,
          rawHtml: isTemplateMode ? rawHtmlTemplate : undefined,
          templateBasePath: isTemplateMode ? templateBasePath : undefined,
        }),
      });

      if (response.ok) {
        alert('Project saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.message}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    toggleHostingPanel();
  };

  const handlePublishTemplate = async () => {
    if (!templateData.title.trim() || !templateData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (elements.length === 0) {
      alert('Cannot publish an empty template');
      return;
    }

    try {
      // Generate the template HTML with inline styles for proper template loading
      const html = generateHTMLWithInlineStyles(elements);

      // Create form data for upload
      const formData = new FormData();
      formData.append('title', templateData.title);
      formData.append('description', templateData.description);
      formData.append('category', templateData.category);
      formData.append('style', templateData.style);
      formData.append('html', html);
      formData.append('css', ''); // CSS is embedded in HTML for templates

      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to publish templates');
        return;
      }

      // Send to backend
      const response = await fetch(`${API_BASE}/api/templates/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        alert('Template published successfully!');
        setShowPublishTemplateModal(false);
        setTemplateData({
          title: '',
          description: '',
          category: 'Business',
          style: 'Modern',
        });
      } else {
        const error = await response.json();
        alert(`Failed to publish template: ${error.message}`);
      }
    } catch (error) {
      console.error('Publish template error:', error);
      alert('Error publishing template. Please try again.');
    }
  };

  return (
    <div className={`sticky top-0 z-50 bg-panel-bg border-b border-border-color flex items-center justify-between px-4 transition-all duration-300 ${
      isScrolled ? 'h-12 shadow-lg' : 'h-14'
    }`}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className={`font-bold text-accent-blue hover:opacity-80 tracking-tight transition-all duration-300 ${
            isScrolled ? 'text-lg' : 'text-xl'
          }`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Landscapio
        </button>

        <div className="relative">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'designer' | 'build')}
            className="appearance-none bg-canvas-bg border border-border-color text-text-primary px-4 py-1.5 pr-8 rounded text-sm font-medium cursor-pointer hover:bg-border-color transition-colors"
          >
            <option value="designer">Designer Mode</option>
            <option value="build">Build Mode</option>
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Template Page Toggle */}
        {currentPage && (
          <div className="flex items-center gap-1.5" title="Template Page">
            <label className="text-xs text-text-secondary cursor-pointer flex items-center gap-1">
              <input
                type="checkbox"
                checked={!!currentPage.isTemplatePage}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const collectionId = checked ? currentPage.templateCollectionId || '' : '';
                  setPageTemplate(currentPage.id, checked, collectionId || undefined);
                }}
                className="w-3.5 h-3.5"
              />
              <span className="text-[11px]">Tmpl</span>
            </label>
            {currentPage.isTemplatePage && (
              <select
                value={currentPage.templateCollectionId || ''}
                onChange={(e) => setPageTemplate(currentPage.id, true, e.target.value || undefined)}
                className="px-2 py-1 bg-canvas-bg border border-border-color rounded text-sm"
              >
                <option value="">Select collection...</option>
                {collections.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Page Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPageDropdown(!showPageDropdown)}
            className="flex items-center gap-2 bg-canvas-bg border border-border-color text-text-primary px-4 py-1.5 pr-8 rounded text-sm font-medium hover:bg-border-color transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {currentPage?.name || 'No Page'}
          </button>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>

          {showPageDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPageDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 w-56 bg-panel-bg border border-border-color rounded-md shadow-lg z-20">
                <div className="p-1 max-h-64 overflow-y-auto">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setCurrentPage(page.id);
                        setShowPageDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-canvas-bg transition-colors flex items-center gap-2 ${
                        currentPageId === page.id ? 'bg-canvas-bg text-accent-blue' : 'text-text-primary'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {page.name}
                      {page.isHome && <span className="ml-auto text-xs text-text-secondary">(Home)</span>}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border-color p-1">
                  <button
                    onClick={() => {
                      setShowPageDropdown(false);
                      setShowAddPageModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-canvas-bg transition-colors flex items-center gap-2 text-accent-blue"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Page
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {isEditingName ? (
          <input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={(e) => handleSaveProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveProjectName(projectName);
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            className="text-sm bg-canvas-bg border border-border-color rounded px-2 py-0.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue w-40"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors group flex items-center gap-1 max-w-[160px]"
            title={projectName}
          >
            <span className="truncate">{projectName}</span>
            <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {viewMode === 'designer' && (
        <>
          <div className="flex items-center gap-1 mr-1">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className="p-2 rounded hover:bg-canvas-bg text-text-secondary hover:text-text-primary disabled:opacity-30"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className="p-2 rounded hover:bg-canvas-bg text-text-secondary hover:text-text-primary disabled:opacity-30"
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowPublishTemplateModal(true)}
            disabled={elements.length === 0}
            className="p-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Publish as Template"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>

          <div className="flex items-center gap-2 bg-canvas-bg rounded-md p-1 ml-2">
            <button
              onClick={() => setBreakpoint('desktop')}
              className={'p-1.5 rounded transition-colors ' + (currentBreakpoint === 'desktop' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary')}
              title="Desktop View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
                <path d="M8 21h8M12 17v4" strokeWidth={2} />
              </svg>
            </button>
            <button
              onClick={() => setBreakpoint('tablet')}
              className={'p-1.5 rounded transition-colors ' + (currentBreakpoint === 'tablet' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary')}
              title="Tablet View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth={2} />
                <path d="M12 18h.01" strokeWidth={2} />
              </svg>
            </button>
            <button
              onClick={() => setBreakpoint('mobile')}
              className={'p-1.5 rounded transition-colors ' + (currentBreakpoint === 'mobile' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary')}
              title="Mobile View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="7" y="2" width="10" height="20" rx="2" strokeWidth={2} />
                <path d="M12 18h.01" strokeWidth={2} />
              </svg>
            </button>
          </div>

          {/* Day/Night Canvas Toggle */}
          <button
            onClick={toggleCanvasDarkMode}
            className="p-2 ml-1 rounded hover:bg-canvas-bg text-text-secondary hover:text-text-primary transition-colors"
            title={canvasDarkMode ? 'Switch to Day (Light Canvas)' : 'Switch to Night (Dark Canvas)'}
          >
            {canvasDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* CMS Button */}
          <button
            onClick={toggleCMSPanel}
            className={`px-3 py-2 ml-2 rounded flex items-center gap-2 text-sm font-medium transition-colors ${
              isCMSPanelOpen
                ? 'bg-accent-blue text-white'
                : 'bg-canvas-bg hover:bg-border-color text-text-primary'
            }`}
            title="Open CMS Panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            CMS
          </button>
        </>
      )}

      {viewMode === 'build' && (
        <div className="text-sm text-text-secondary">
          Build mode - Browse and export saved components
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded bg-canvas-bg hover:bg-border-color text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Code
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded bg-canvas-bg hover:bg-border-color text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handlePublish}
          className={`px-4 py-2 rounded text-white text-sm font-medium flex items-center gap-2 ${
            isHostingPanelOpen
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-accent-blue hover:opacity-90'
          }`}
        >
          {isDeploying && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          )}
          {isDeploying ? 'Deploying...' : 'Publish'}
        </button>
      </div>

      {/* Add Page Modal */}
      {showAddPageModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center" onClick={() => setShowAddPageModal(false)}>
            <div className="bg-panel-bg border border-border-color rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4 text-text-primary">Add New Page</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">Page Name</label>
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                  placeholder="e.g., About Us, Services, Blog"
                  className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddPageModal(false);
                    setNewPageName('');
                  }}
                  className="px-4 py-2 rounded bg-canvas-bg hover:bg-border-color text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPage}
                  disabled={!newPageName.trim()}
                  className="px-4 py-2 rounded bg-accent-blue hover:opacity-90 text-white text-sm font-medium disabled:opacity-50"
                >
                  Add Page
                </button>
              </div>
            </div>
          </div>
        </>
      )}


      {/* Publish Template Modal */}
      {showPublishTemplateModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center" onClick={() => setShowPublishTemplateModal(false)}>
            <div className="bg-panel-bg border border-border-color rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-2 text-text-primary">Publish as Template</h3>
              <p className="text-sm text-text-secondary mb-6">Share your design with the community</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Template Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateData.title}
                    onChange={(e) => setTemplateData({...templateData, title: e.target.value})}
                    placeholder="e.g., Modern Business Landing Page"
                    className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={templateData.description}
                    onChange={(e) => setTemplateData({...templateData, description: e.target.value})}
                    placeholder="Describe your template and its use cases..."
                    rows={3}
                    className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Category</label>
                  <select
                    value={templateData.category}
                    onChange={(e) => setTemplateData({...templateData, category: e.target.value})}
                    className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="Business">Business</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Blog">Blog</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Landing Page">Landing Page</option>
                    <option value="All">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Style</label>
                  <select
                    value={templateData.style}
                    onChange={(e) => setTemplateData({...templateData, style: e.target.value})}
                    className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="Modern">Modern</option>
                    <option value="Minimal">Minimal</option>
                    <option value="Classic">Classic</option>
                    <option value="Bold">Bold</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowPublishTemplateModal(false);
                    setTemplateData({
                      title: '',
                      description: '',
                      category: 'Business',
                      style: 'Modern',
                    });
                  }}
                  className="px-4 py-2 rounded bg-canvas-bg hover:bg-border-color text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishTemplate}
                  disabled={!templateData.title.trim() || !templateData.description.trim()}
                  className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Publish Template
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
