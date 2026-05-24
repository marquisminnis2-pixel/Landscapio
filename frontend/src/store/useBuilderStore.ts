import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Element, Page, Breakpoint, StyleProperties, BuilderState, TemplateDomNode } from '@/types/element.types';
import { v4 as uuidv4 } from 'uuid';

export type ViewMode = 'designer' | 'build';

// Represents an element selected inside a template iframe
export interface TemplateSelectedElement {
  path: string;           // CSS selector path to the element
  tag: string;            // HTML tag name
  label: string;          // Readable label (e.g., "div.hero-section")
  text: string;           // Text content (truncated)
  isTextEditable: boolean;
  styles: Record<string, string>; // Computed CSS styles
  innerHTML: string;      // Inner HTML (truncated)
}

interface BuilderStore extends BuilderState {
  viewMode: ViewMode;
  rawHtmlTemplate: string | null; // For full HTML templates with embedded CSS
  templateBasePath: string | null; // Base path for multi-page templates (e.g., '/templates/acci-connect/')
  isTemplateMode: boolean; // Whether we're in iframe template mode
  templateSelectedElement: TemplateSelectedElement | null; // Selected element in template iframe
  templateDomTree: TemplateDomNode[]; // Live DOM tree from template iframe
  canvasDarkMode: boolean; // Day/night canvas background toggle

  // Canvas
  toggleCanvasDarkMode: () => void;

  // Page operations
  addPage: (name: string, slug: string) => void;
  deletePage: (pageId: string) => void;
  setCurrentPage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  getCurrentPage: () => Page | null;

  // Element operations (work on current page)
  addElement: (element: Element, parentId?: string) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  moveElement: (elementId: string, newParentId: string | null, index?: number) => void;
  duplicateElement: (id: string) => void;
  wrapElement: (id: string) => void;
  // Binding operations
  setElementBinding: (id: string, propKey: string, binding: { collectionId: string; fieldKey: string }) => void;
  clearElementBinding: (id: string, propKey: string) => void;

  // Selection
  selectElement: (id: string | null) => void;
  setHoveredElement: (id: string | null) => void;

  // Styles
  updateElementStyles: (id: string, breakpoint: Breakpoint, styles: Partial<StyleProperties>) => void;

  // Breakpoints
  setBreakpoint: (breakpoint: Breakpoint) => void;

  // View Mode
  setViewMode: (mode: ViewMode) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Clipboard
  copyElement: (id: string) => void;
  pasteElement: (parentId?: string) => void;

  // Project
  loadProject: (elements: Element[]) => void;
  loadProjectWithPages: (pages: Page[]) => void;
  loadRawHtmlTemplate: (html: string) => void;
  clearRawHtmlTemplate: () => void;
  clearProject: () => void;

  // Multi-page template
  loadTemplateProject: (html: string, basePath: string, pages: Page[]) => void;
  setTemplatePageHtml: (pageId: string, html: string) => void;
  setTemplateSelectedElement: (el: TemplateSelectedElement | null) => void;
  setTemplateDomTree: (tree: TemplateDomNode[]) => void;
  // Page template settings
  setPageTemplate: (pageId: string, isTemplate: boolean, collectionId?: string | null) => void;

  // Utilities
  findElementById: (id: string) => Element | null;
  getAllElements: () => Element[];
}

const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const findElementByIdRecursive = (elements: Element[], id: string): Element | null => {
  for (const element of elements) {
    if (element.id === id) return element;
    if (element.children.length > 0) {
      const found = findElementByIdRecursive(element.children, id);
      if (found) return found;
    }
  }
  return null;
};

const deleteElementRecursive = (elements: Element[], id: string): Element[] => {
  return elements.filter(el => {
    if (el.id === id) return false;
    if (el.children.length > 0) {
      el.children = deleteElementRecursive(el.children, id);
    }
    return true;
  });
};

const duplicateElementDeep = (element: Element): Element => {
  return {
    ...element,
    id: generateId(),
    name: `${element.name} Copy`,
    children: element.children.map(duplicateElementDeep),
  };
};

// Create default pages
const createDefaultPages = (): Page[] => {
  return [
    { id: uuidv4(), name: 'Home', slug: 'home', elements: [], isHome: true },
    { id: uuidv4(), name: 'About', slug: 'about', elements: [] },
    { id: uuidv4(), name: 'Services', slug: 'services', elements: [] },
    { id: uuidv4(), name: 'Contact', slug: 'contact', elements: [] },
    { id: uuidv4(), name: 'Privacy Policy', slug: 'privacy-policy', elements: [] },
  ];
};

export const useBuilderStore = create<BuilderStore>()(
  immer((set, get) => {
    const defaultPages = createDefaultPages();
    const homePage = defaultPages.find(p => p.isHome);

    return {
      pages: defaultPages,
      currentPageId: homePage?.id || defaultPages[0]?.id || null,
      selectedElementId: null,
      hoveredElementId: null,
      currentBreakpoint: 'desktop',
      history: { past: [], future: [] },
      clipboard: null,
      viewMode: 'designer',
      rawHtmlTemplate: null,
      templateBasePath: null,
      isTemplateMode: false,
      templateSelectedElement: null,
      templateDomTree: [],
      canvasDarkMode: false,

    // Canvas - toggles dark mode for the entire builder UI
    toggleCanvasDarkMode: () => {
      set((state) => {
        state.canvasDarkMode = !state.canvasDarkMode;
      });
      // Toggle .dark-mode class on the document root so CSS variables switch
      document.documentElement.classList.toggle('dark-mode');
    },

    // Page operations
    addPage: (name, slug) => set((state) => {
      const newPage: Page = {
        id: uuidv4(),
        name,
        slug,
        elements: [],
      };
      state.pages.push(newPage);
      state.currentPageId = newPage.id;
    }),

    deletePage: (pageId) => set((state) => {
      // Don't delete if it's the last page
      if (state.pages.length <= 1) return;

      const index = state.pages.findIndex(p => p.id === pageId);
      if (index !== -1) {
        state.pages.splice(index, 1);
        // If we deleted the current page, switch to first page
        if (state.currentPageId === pageId) {
          state.currentPageId = state.pages[0]?.id || null;
        }
      }
    }),

    setCurrentPage: (pageId) => set((state) => {
      state.currentPageId = pageId;
      state.selectedElementId = null; // Clear selection when switching pages
      state.templateSelectedElement = null; // Clear template selection too
      state.templateDomTree = []; // Clear DOM tree (new page will send fresh tree)
    }),

    renamePage: (pageId, name) => set((state) => {
      const page = state.pages.find(p => p.id === pageId);
      if (page) {
        page.name = name;
        // Update slug
        page.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
    }),

    getCurrentPage: () => {
      const state = get();
      return state.pages.find(p => p.id === state.currentPageId) || null;
    },

    // Element operations (work on current page)
    addElement: (element, parentId) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      if (parentId) {
        const parent = findElementByIdRecursive(currentPage.elements, parentId);
        if (parent) {
          parent.children.push(element);
        }
      } else {
        currentPage.elements.push(element);
      }
      get().saveHistory();
    }),

    updateElement: (id, updates) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      const element = findElementByIdRecursive(currentPage.elements, id);
      if (element) {
        Object.assign(element, updates);
      }
      get().saveHistory();
    }),

    setElementBinding: (id, propKey, binding) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;
      const element = findElementByIdRecursive(currentPage.elements, id);
      if (!element) return;
      if (!element.bindings) element.bindings = {};
      element.bindings[propKey] = binding;
      get().saveHistory();
    }),

    clearElementBinding: (id, propKey) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;
      const element = findElementByIdRecursive(currentPage.elements, id);
      if (!element || !element.bindings) return;
      delete element.bindings[propKey];
      get().saveHistory();
    }),

    deleteElement: (id) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      currentPage.elements = deleteElementRecursive(currentPage.elements, id);
      if (state.selectedElementId === id) {
        state.selectedElementId = null;
      }
      get().saveHistory();
    }),

    moveElement: (elementId, newParentId, index) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      const element = findElementByIdRecursive(currentPage.elements, elementId);
      if (!element) return;

      // Remove from current location
      currentPage.elements = deleteElementRecursive(currentPage.elements, elementId);

      // Add to new location
      if (newParentId) {
        const newParent = findElementByIdRecursive(currentPage.elements, newParentId);
        if (newParent) {
          if (index !== undefined) {
            newParent.children.splice(index, 0, element);
          } else {
            newParent.children.push(element);
          }
        }
      } else {
        if (index !== undefined) {
          currentPage.elements.splice(index, 0, element);
        } else {
          currentPage.elements.push(element);
        }
      }
      get().saveHistory();
    }),

    duplicateElement: (id) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      const element = findElementByIdRecursive(currentPage.elements, id);
      if (element) {
        const duplicate = duplicateElementDeep(element);
        // Add after the original element
        currentPage.elements.push(duplicate);
      }
      get().saveHistory();
    }),

    wrapElement: (id) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      // Find the element and its parent
      const findElementAndParent = (elements: Element[], targetId: string, parent: Element | null = null): { element: Element; parent: Element | null; index: number } | null => {
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].id === targetId) {
            return { element: elements[i], parent, index: i };
          }
          if (elements[i].children.length > 0) {
            const found = findElementAndParent(elements[i].children, targetId, elements[i]);
            if (found) return found;
          }
        }
        return null;
      };

      const result = findElementAndParent(currentPage.elements, id);
      if (!result) return;

      const { element, parent, index } = result;

      // Create a wrapper div
      const wrapper: Element = {
        id: generateId(),
        type: 'div',
        name: 'Wrapper',
        children: [{ ...element }], // Clone the element as child
        styles: {
          desktop: {},
          tablet: {},
          mobile: {},
        },
        content: '',
      };

      // Replace the element with the wrapper
      if (parent) {
        parent.children.splice(index, 1, wrapper);
      } else {
        currentPage.elements.splice(index, 1, wrapper);
      }

      // Select the new wrapper
      state.selectedElementId = wrapper.id;
      get().saveHistory();
    }),

    // Selection
    selectElement: (id) => set((state) => {
      state.selectedElementId = id;
    }),

    setHoveredElement: (id) => set((state) => {
      state.hoveredElementId = id;
    }),

    // Styles
    updateElementStyles: (id, breakpoint, styles) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      const element = findElementByIdRecursive(currentPage.elements, id);
      if (element) {
        element.styles[breakpoint] = {
          ...element.styles[breakpoint],
          ...styles,
        };
      }
      get().saveHistory();
    }),

    // Breakpoints
    setBreakpoint: (breakpoint) => set((state) => {
      state.currentBreakpoint = breakpoint;
    }),

    // View Mode
    setViewMode: (mode) => set((state) => {
      state.viewMode = mode;
    }),

    // History
    saveHistory: () => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      state.history.past.push(JSON.parse(JSON.stringify(currentPage.elements)));
      state.history.future = [];
      // Limit history to last 50 states
      if (state.history.past.length > 50) {
        state.history.past.shift();
      }
    }),

    undo: () => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      if (state.history.past.length > 0) {
        const previous = state.history.past.pop()!;
        state.history.future.push(JSON.parse(JSON.stringify(currentPage.elements)));
        currentPage.elements = previous;
        state.selectedElementId = null;
      }
    }),

    redo: () => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      if (state.history.future.length > 0) {
        const next = state.history.future.pop()!;
        state.history.past.push(JSON.parse(JSON.stringify(currentPage.elements)));
        currentPage.elements = next;
        state.selectedElementId = null;
      }
    }),

    // Clipboard
    copyElement: (id) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      const element = findElementByIdRecursive(currentPage.elements, id);
      if (element) {
        state.clipboard = JSON.parse(JSON.stringify(element));
      }
    }),

    pasteElement: (parentId) => set((state) => {
      const currentPage = state.pages.find(p => p.id === state.currentPageId);
      if (!currentPage) return;

      if (state.clipboard) {
        const duplicate = duplicateElementDeep(state.clipboard);
        get().addElement(duplicate, parentId);
      }
    }),

    // Project operations
    loadProject: (elements) => {
      console.log('💾 loadProject called with elements:', elements.length);
      console.log('📋 Elements preview:', elements.slice(0, 2));
      set((state) => {
        // Load elements into the home page
        const homePage = state.pages.find(p => p.isHome);
        if (homePage) {
          homePage.elements = elements;
        } else if (state.pages.length > 0) {
          state.pages[0].elements = elements;
        }
        state.selectedElementId = null;
        state.history = { past: [], future: [] };
      });
      console.log('✅ Store updated with new elements');
    },

    loadProjectWithPages: (pages) => set((state) => {
      state.pages = pages.length > 0 ? pages : createDefaultPages();
      state.currentPageId = state.pages.find(p => p.isHome)?.id || state.pages[0]?.id || null;
      state.selectedElementId = null;
      state.history = { past: [], future: [] };
    }),

    loadRawHtmlTemplate: (html) => set((state) => {
      state.rawHtmlTemplate = html;
      state.selectedElementId = null;
    }),

    clearRawHtmlTemplate: () => set((state) => {
      state.rawHtmlTemplate = null;
      state.templateBasePath = null;
      state.isTemplateMode = false;
      state.templateDomTree = [];
    }),

    loadTemplateProject: (html, basePath, templatePages) => set((state) => {
      state.rawHtmlTemplate = html;
      state.templateBasePath = basePath;
      state.isTemplateMode = true;
      state.pages = templatePages;
      state.currentPageId = templatePages.find(p => p.isHome)?.id || templatePages[0]?.id || null;
      state.selectedElementId = null;
      state.history = { past: [], future: [] };
      // Cache the home page HTML
      const homePage = templatePages.find(p => p.isHome);
      if (homePage) {
        homePage.rawHtml = html;
      }
    }),

    setTemplatePageHtml: (pageId, html) => set((state) => {
      const page = state.pages.find(p => p.id === pageId);
      if (page) {
        page.rawHtml = html;
      }
      state.rawHtmlTemplate = html;
    }),

    setTemplateSelectedElement: (el) => set((state) => {
      state.templateSelectedElement = el;
    }),

    setTemplateDomTree: (tree) => set((state) => {
      state.templateDomTree = tree;
    }),

    setPageTemplate: (pageId, isTemplate, collectionId) => set((state) => {
      const page = state.pages.find(p => p.id === pageId);
      if (!page) return;
      page.isTemplatePage = isTemplate;
      page.templateCollectionId = collectionId || undefined;
    }),

    clearProject: () => set((state) => {
      state.pages = createDefaultPages();
      state.currentPageId = state.pages.find(p => p.isHome)?.id || state.pages[0]?.id || null;
      state.selectedElementId = null;
      state.hoveredElementId = null;
      state.history = { past: [], future: [] };
    }),

    // Utilities
    findElementById: (id) => {
      const currentPage = get().pages.find(p => p.id === get().currentPageId);
      if (!currentPage) return null;
      return findElementByIdRecursive(currentPage.elements, id);
    },

    getAllElements: () => {
      const currentPage = get().pages.find(p => p.id === get().currentPageId);
      if (!currentPage) return [];

      const allElements: Element[] = [];
      const traverse = (elements: Element[]) => {
        elements.forEach(el => {
          allElements.push(el);
          traverse(el.children);
        });
      };
      traverse(currentPage.elements);
      return allElements;
    },
  };
})
);