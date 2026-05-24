import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBuilderStore } from '@/store/useBuilderStore';
import { useCMSStore } from '@/store/useCMSStore';
import { useHostingStore } from '@/store/useHostingStore';
import Canvas from '../Canvas/Canvas';
import ElementsLibrary from '../LeftPanel/ElementsLibrary';
import Navigator from '../LeftPanel/Navigator';
import CMSSidebar from '../LeftPanel/CMSSidebar';
import StylePanel from '../RightPanel/StylePanel';
import Toolbar from '../Toolbar/Toolbar';
import BuildMode from '../BuildMode/BuildMode';
import LumaPanel from '../Geni/Geni';
import { CMSPanel } from '../CMS';
import CMSDataTable from '../CMS/CMSDataTable';
import { HostingPanel } from '../Hosting';
import { parseHTMLToElements } from '@/utils/htmlParser';
import { API_BASE } from '@/lib/api';
import { Page } from '@/types/element.types';
import { v4 as uuidv4 } from 'uuid';

type LeftPanelTab = 'elements' | 'navigator' | 'cms';
type RightPanelTab = 'style' | 'geni';

/**
 * Discover pages from a template's HTML by scanning for internal links.
 * Returns an array of Page objects for all discovered pages.
 */
function discoverTemplatePages(html: string, entryFile: string = 'index.html'): Page[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a[href]');

  const pageMap = new Map<string, { name: string; file: string }>();

  // Always include the entry file as Home
  pageMap.set(entryFile, { name: 'Home', file: entryFile });

  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    // Skip external links, anchors, javascript:, mailto:, tel:, and absolute URLs
    if (
      href.startsWith('http') ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href === '' ||
      href === '/'
    ) {
      return;
    }

    // Normalize: strip leading ./ or /
    let file = href.replace(/^\.\//, '').replace(/^\/templates\/[^/]+\//, '');

    // Only include .html files
    if (!file.endsWith('.html')) return;

    // Skip error pages and utility pages
    if (file === '401.html' || file === '404.html' || file.startsWith('static-template-')) return;

    // Generate a readable name from filename
    if (!pageMap.has(file)) {
      let name = file
        .replace(/\.html$/, '')
        .replace(/\//g, ' - ')       // accidents/car-accident-lawyer → accidents - car-accident-lawyer
        .replace(/[-_]/g, ' ')        // car-accident-lawyer → car accident lawyer
        .replace(/\b\w/g, c => c.toUpperCase()); // capitalize words

      // Clean up subfolder names
      if (name.startsWith('Accidents ')) {
        name = name.replace('Accidents  ', '');
      }
      if (name.startsWith('Template ')) {
        name = name.replace('Template  ', '');
      }

      pageMap.set(file, { name, file });
    }
  });

  // Convert to Page objects
  const pages: Page[] = [];
  pageMap.forEach(({ name, file }) => {
    pages.push({
      id: uuidv4(),
      name,
      slug: file.replace(/\.html$/, '').replace(/\//g, '-'),
      elements: [],
      isHome: file === 'index.html',
      templateFile: file,
    });
  });

  // Sort: Home first, then alphabetical
  pages.sort((a, b) => {
    if (a.isHome) return -1;
    if (b.isHome) return 1;
    return a.name.localeCompare(b.name);
  });

  return pages;
}

const MainLayout = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('elements');
  const [cmsCollectionId, setCmsCollectionId] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('style');
  const { viewMode, loadProject, loadTemplateProject } = useBuilderStore();
  const { setProjectId: setCMSProjectId, selectedCollectionId, selectCollection } = useCMSStore();
  const { setProjectId: setHostingProjectId } = useHostingStore();

  // Track if content has been loaded (either from template or API) to prevent double-loading
  const hasLoadedContent = useRef(false);

  // Set projectId for CMS and Hosting when component mounts
  useEffect(() => {
    if (projectId) {
      setCMSProjectId(projectId);
      setHostingProjectId(projectId);
    }
  }, [projectId, setCMSProjectId, setHostingProjectId]);

  // Fetch existing project from backend if returning to it (no template in sessionStorage)
  useEffect(() => {
    const fetchExistingProject = async () => {
      // Skip if we've already loaded content this session
      if (hasLoadedContent.current) {
        console.log('⏭️ Skipping project fetch - content already loaded');
        return;
      }

      // Only fetch if we have a projectId and no template waiting to be loaded
      const templateHtml = sessionStorage.getItem('templateHtml');
      if (!projectId || templateHtml) {
        return; // Skip if no projectId or template is being loaded
      }

      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');
      if (!token || !orgId) {
        console.warn('No auth token or orgId found, cannot fetch project');
        return;
      }

      try {
        console.log('🔄 Fetching existing project:', projectId);
        const response = await fetch(`${API_BASE}/api/orgs/${orgId}/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch project:', response.status);
          return;
        }

        const project = await response.json();
        console.log('📥 Loaded project:', project.name, 'with', project.elements?.length || 0, 'elements');
        console.log('📥 Project has rawHtml:', !!project.rawHtml);

        // Double-check we haven't loaded content while waiting for fetch
        if (hasLoadedContent.current) {
          console.log('⏭️ Skipping load - content was loaded while fetching');
          return;
        }

        // Check if this is a template mode project (has rawHtml)
        if (project.rawHtml) {
          console.log('🖼️ Loading saved template project');
          hasLoadedContent.current = true;
          // Discover all pages from the HTML links (sets templateFile on each page)
          const templatePages = discoverTemplatePages(project.rawHtml, project.templateEntryFile || 'index.html');
          console.log('📄 Discovered pages:', templatePages.map((p: any) => p.name));
          loadTemplateProject(project.rawHtml, project.templateBasePath || '', templatePages);
          console.log('✅ Template project loaded with', templatePages.length, 'pages');
        } else if (project.elements && project.elements.length > 0) {
          hasLoadedContent.current = true;
          loadProject(project.elements);
          console.log('✅ Project elements loaded into builder');
        } else {
          console.log('ℹ️ Project has no saved elements');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      }
    };

    fetchExistingProject();
  }, [projectId, loadProject, loadTemplateProject]);

  // Load template HTML if available (only run once on mount)
  useEffect(() => {
    console.log('🔍 MainLayout mounted - checking for template HTML');
    const templateHtml = sessionStorage.getItem('templateHtml');
    const templateType = sessionStorage.getItem('templateType');
    const templateHasJS = sessionStorage.getItem('templateHasJS');
    const templateBasePath = sessionStorage.getItem('templateBasePath');
    const templateEntryFile = sessionStorage.getItem('templateEntryFile') || 'index.html';
    console.log('📦 SessionStorage templateHtml:', templateHtml ? `${templateHtml.length} chars` : 'null');
    console.log('📦 SessionStorage templateType:', templateType);

    if (templateHtml) {
      // Mark immediately to prevent any async fetch from overwriting
      hasLoadedContent.current = true;

      // Check if this is a complex multi-file template (has external CSS/JS)
      const hasExternalStylesheets = templateHtml.includes('<link') && templateHtml.includes('rel="stylesheet"');
      const isComplexTemplate = templateHasJS === 'true' || (hasExternalStylesheets && templateBasePath);

      if (isComplexTemplate && templateBasePath) {
        // Use iframe mode for complex templates - preserves all CSS, JS, and interactions
        console.log('🖼️ Loading complex template in iframe mode');
        console.log('📂 Template base path:', templateBasePath);

        // Discover all pages from the HTML links, using the actual entry file as home
        const templatePages = discoverTemplatePages(templateHtml, templateEntryFile);
        console.log('📄 Discovered pages:', templatePages.map(p => p.name));

        // Load into store as a template project
        loadTemplateProject(templateHtml, templateBasePath, templatePages);
        console.log('✅ Template project loaded with', templatePages.length, 'pages');
      } else {
        // Simple template - parse into editable elements
        console.log('🔄 Parsing HTML to editable elements...');
        const elements = parseHTMLToElements(templateHtml);
        console.log('✅ Parsed elements:', elements.length, 'elements');
        loadProject(elements);
        console.log('✅ Template loaded');
      }

      // Clear session storage
      sessionStorage.removeItem('templateHtml');
      sessionStorage.removeItem('templateType');
      sessionStorage.removeItem('templateHasJS');
      sessionStorage.removeItem('templateBasePath');
      sessionStorage.removeItem('templateEntryFile');
      console.log('🧹 Cleared sessionStorage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="flex flex-col h-screen bg-canvas-bg text-text-primary">
      <Toolbar />

      {viewMode === 'designer' ? (
        <div className="flex flex-1 overflow-hidden">
          {isLeftPanelOpen && (
            <div className="w-64 bg-panel-bg border-r border-border-color flex flex-col builder-panel">
              <div className="px-4 py-2 border-b border-border-color flex items-center gap-2 relative builder-panel-header">
                <svg className="w-3 h-3 text-[#4a7c2f]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a7c2f]">Editor</span>
              </div>
              <div className="flex border-b border-border-color">
                <button
                  onClick={() => setLeftPanelTab('elements')}
                  className={'flex-1 px-2 py-2.5 text-xs font-medium transition-colors ' + (leftPanelTab === 'elements' ? 'bg-canvas-bg text-text-primary builder-tab-active' : 'text-text-secondary hover:text-text-primary')}
                >
                  Elements
                </button>
                <button
                  onClick={() => setLeftPanelTab('navigator')}
                  className={'flex-1 px-2 py-2.5 text-xs font-medium transition-colors ' + (leftPanelTab === 'navigator' ? 'bg-canvas-bg text-text-primary builder-tab-active' : 'text-text-secondary hover:text-text-primary')}
                >
                  Navigator
                </button>
                <button
                  onClick={() => setLeftPanelTab('cms')}
                  className={'flex-1 px-2 py-2.5 text-xs font-medium transition-colors ' + (leftPanelTab === 'cms' ? 'bg-canvas-bg text-[#4a7c2f] builder-tab-active' : 'text-text-secondary hover:text-text-primary')}
                >
                  CMS
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {leftPanelTab === 'elements' ? (
                  <ElementsLibrary />
                ) : leftPanelTab === 'navigator' ? (
                  <Navigator />
                ) : (
                  <CMSSidebar
                    onSelectCollection={(id) => { setCmsCollectionId(id); selectCollection(id); }}
                    selectedCollectionId={selectedCollectionId}
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            {leftPanelTab === 'cms' && (cmsCollectionId || selectedCollectionId) ? (
              <CMSDataTable collectionId={(cmsCollectionId || selectedCollectionId)!} />
            ) : leftPanelTab === 'cms' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <p className="text-sm">Select a collection to view its content</p>
              </div>
            ) : (
              <Canvas />
            )}
          </div>

          {isRightPanelOpen && (
            <div className="w-80 bg-panel-bg border-l border-border-color flex flex-col overflow-hidden builder-panel">
              {/* Right panel header */}
              <div className="px-4 py-2 border-b border-border-color flex items-center gap-2 flex-shrink-0 relative builder-panel-header">
                <svg className="w-3 h-3 text-[#4a7c2f]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a7c2f]">Designer</span>
              </div>
              {/* Right panel tab bar */}
              <div className="flex border-b border-border-color flex-shrink-0">
                <button
                  onClick={() => setRightPanelTab('style')}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    rightPanelTab === 'style'
                      ? 'text-white border-b-2 border-[#4a7c2f] builder-tab-active'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Design
                </button>
                <button
                  onClick={() => setRightPanelTab('geni')}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    rightPanelTab === 'geni'
                      ? 'text-[#6b8f3e] border-b-2 border-[#6b8f3e] builder-tab-active'
                      : 'text-white/40 hover:text-[#6b8f3e]/70'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Luma
                  <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${rightPanelTab === 'geni' ? 'text-[#6b8f3e] bg-[#6b8f3e]/15' : 'text-white/25 bg-white/5'}`}>beta</span>
                </button>
              </div>
              {/* Right panel content */}
              {rightPanelTab === 'style' ? (
                <div className="flex-1 overflow-y-auto">
                  <StylePanel />
                </div>
              ) : (
                <LumaPanel />
              )}
            </div>
          )}

          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="fixed left-0 top-1/2 -translate-y-1/2 bg-panel-bg border border-border-color rounded-r-md p-1 hover:bg-canvas-bg z-10"
            title={isLeftPanelOpen ? 'Hide left panel' : 'Show left panel'}
          >
            <svg
              className={'w-4 h-4 transition-transform ' + (isLeftPanelOpen ? '' : 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-panel-bg border border-border-color rounded-l-md p-1 hover:bg-canvas-bg z-10"
            title={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
          >
            <svg
              className={'w-4 h-4 transition-transform ' + (isRightPanelOpen ? 'rotate-180' : '')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <BuildMode />
        </div>
      )}

      {/* CMS Panel */}
      <CMSPanel />

      {/* Hosting Panel */}
      <HostingPanel />
    </div>
  );
};

export default MainLayout;
