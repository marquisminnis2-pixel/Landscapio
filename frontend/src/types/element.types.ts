import { BehaviorRule } from './behavior.types';
import { Interaction, ToggleState } from './interaction.types';

export type ElementType =
  // Basic Elements
  | 'div'
  | 'section'
  | 'text'
  | 'heading'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'button'
  | 'image'
  | 'link'
  | 'container'
  // Advanced Elements - Assets
  | 'video'
  | 'icon'
  | 'lottie'
  // Advanced Elements - Interactive
  | 'repeater'
  | 'modal'
  | 'tabs'
  | 'accordion'
  | 'toggle';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface StyleProperties {
  // Layout
  display?: 'block' | 'flex' | 'inline-block' | 'inline-flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridGap?: string;

  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Typography
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color?: string;

  // Dimensions
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;

  // Position
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;

  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'auto' | 'cover' | 'contain';
  backgroundPosition?: string;
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';

  // Border
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';

  // Effects
  opacity?: number;
  boxShadow?: string;
  transform?: string;
  transition?: string;

  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // Cursor
  cursor?: string;
}

export interface Element {
  id: string;
  type: ElementType;
  name: string; // User-friendly name
  children: Element[];

  // Responsive styles
  styles: {
    desktop: StyleProperties;
    tablet: StyleProperties;
    mobile: StyleProperties;
  };

  // Content
  content?: string; // For text elements

  // Attributes
  attributes?: {
    src?: string; // For images
    alt?: string;
    href?: string; // For links
    target?: string;
    className?: string;
    [key: string]: string | undefined;
  };

  // Data bindings for CMS integration. Keyed by prop name (e.g. 'text' or 'src')
  bindings?: Record<string, { collectionId: string; fieldKey: string }>;

  // Metadata
  locked?: boolean;
  hidden?: boolean;
  parentId?: string | null;

  // Behavior-Aware UI
  behaviorRules?: BehaviorRule[]; // Rules that modify this element based on user behavior

  // Interaction System (click/hover/scroll animations)
  interactions?: Interaction[];
  toggleStates?: ToggleState[];
}

export interface Page {
  id: string;
  name: string;
  slug: string; // URL-friendly name (e.g., 'home', 'about', 'contact')
  elements: Element[];
  isHome?: boolean; // Mark the home/landing page
  templateFile?: string; // For multi-page templates: relative path to HTML file (e.g., 'about.html')
  rawHtml?: string; // Cached raw HTML content for iframe-rendered template pages
  // If true, this page is a CMS template page that will render a "current item"
  isTemplatePage?: boolean;
  // Optional collection id to which this template page is tied (used for dynamic routing)
  templateCollectionId?: string;
}

export interface BuilderState {
  pages: Page[];
  currentPageId: string | null;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  currentBreakpoint: Breakpoint;
  history: {
    past: Element[][];
    future: Element[][];
  };
  clipboard: Element | null;
}

/** Lightweight representation of a DOM node inside a template iframe */
export interface TemplateDomNode {
  path: string;
  tag: string;
  label: string;
  children: TemplateDomNode[];
  textPreview: string;
}

export interface Project {
  _id: string;
  name: string;
  userId: string;
  pages: Page[]; // Changed from elements to pages
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  publishedUrl?: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Asset {
  _id: string;
  projectId: string;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'font';
  size: number;
  uploadedAt: string;
}
