import { useState, useEffect } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import Canvas from '../Canvas/Canvas';
import ElementsLibrary from '../LeftPanel/ElementsLibrary';
import Navigator from '../LeftPanel/Navigator';
import StylePanel from '../RightPanel/StylePanel';
import Toolbar from '../Toolbar/Toolbar';
import BuildMode from '../BuildMode/BuildMode';
import ElementTreeViewer from '../Debug/ElementTreeViewer';
import Geni from '../Geni/Geni';
import { parseHTMLToElements } from '@/utils/htmlParser';
import { Page } from '@/types/element.types';
import { v4 as uuidv4 } from 'uuid';

type LeftPanelTab = 'elements' | 'navigator';

/**
 * Discover pages from a template's HTML by scanning for internal links.
 * Returns an array of Page objects for all discovered pages.
 */
function discoverTemplatePages(html: string): Page[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a[href]');

  const pageMap = new Map<string, { name: string; file: string }>();

  // Always include index.html as Home
  pageMap.set('index.html', { name: 'Home', file: 'index.html' });

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
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('elements');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const { viewMode, loadProject, loadTemplateProject } = useBuilderStore();

  // Load template HTML if available (only run once on mount)
  useEffect(() => {
    console.log('🔍 MainLayout mounted - checking for template HTML');
    const templateHtml = sessionStorage.getItem('templateHtml');
    const templateType = sessionStorage.getItem('templateType');
    const templateHasJS = sessionStorage.getItem('templateHasJS');
    const templateBasePath = sessionStorage.getItem('templateBasePath');
    console.log('📦 SessionStorage templateHtml:', templateHtml ? `${templateHtml.length} chars` : 'null');
    console.log('📦 SessionStorage templateType:', templateType);

    if (templateHtml) {
      // Check if this is a complex multi-file template (has external CSS/JS)
      const hasExternalStylesheets = templateHtml.includes('<link') && templateHtml.includes('rel="stylesheet"');
      const isComplexTemplate = templateHasJS === 'true' || (hasExternalStylesheets && templateBasePath);

      if (isComplexTemplate && templateBasePath) {
        // Use iframe mode for complex templates - preserves all CSS, JS, and interactions
        console.log('🖼️ Loading complex template in iframe mode');
        console.log('📂 Template base path:', templateBasePath);

        // Discover all pages from the HTML links
        const templatePages = discoverTemplatePages(templateHtml);
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
            <div className="w-64 bg-panel-bg border-r border-border-color flex flex-col">
              <div className="flex border-b border-border-color">
                <button
                  onClick={() => setLeftPanelTab('elements')}
                  className={'flex-1 px-4 py-3 text-sm font-medium transition-colors ' + (leftPanelTab === 'elements' ? 'bg-canvas-bg text-text-primary' : 'text-text-secondary hover:text-text-primary')}
                >
                  Elements
                </button>
                <button
                  onClick={() => setLeftPanelTab('navigator')}
                  className={'flex-1 px-4 py-3 text-sm font-medium transition-colors ' + (leftPanelTab === 'navigator' ? 'bg-canvas-bg text-text-primary' : 'text-text-secondary hover:text-text-primary')}
                >
                  Navigator
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {leftPanelTab === 'elements' ? <ElementsLibrary /> : <Navigator />}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas />
          </div>

          {isRightPanelOpen && (
            <div className="w-80 bg-panel-bg border-l border-border-color overflow-y-auto">
              <StylePanel />
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

      {/* Debug: Element Tree Viewer */}
      {viewMode === 'designer' && <ElementTreeViewer />}

      {/* AI Assistant Floating Widget */}
      <Geni />
    </div>
  );
};

export default MainLayout;
