import { Element, StyleProperties } from '@/types/element.types';
import { v4 as uuidv4 } from 'uuid';

// Store for extracted CSS rules
let cssRulesMap: Map<string, Partial<StyleProperties>> = new Map();
let mediaQueryRules: { tablet: Map<string, Partial<StyleProperties>>; mobile: Map<string, Partial<StyleProperties>> } = {
  tablet: new Map(),
  mobile: new Map(),
};

// Store for CSS custom properties (variables)
let cssVariables: Map<string, string> = new Map();

// Parse CSS value - handle var() and other special values
const parseCSSValue = (value: string): string => {
  let result = value.trim();

  // Resolve CSS variables like var(--accent-3)
  const varRegex = /var\(--([^)]+)\)/g;
  result = result.replace(varRegex, (match, varName) => {
    const resolved = cssVariables.get(varName);
    return resolved || match; // Keep original if not found
  });

  return result;
};

// Parse a CSS declaration block into StyleProperties
const parseDeclarationBlock = (cssText: string): Partial<StyleProperties> => {
  const styles: Partial<StyleProperties> = {};

  if (!cssText) return styles;

  // Split by semicolons but respect nested parentheses
  const declarations: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of cssText) {
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === ';' && parenDepth === 0) {
      if (current.trim()) declarations.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) declarations.push(current.trim());

  declarations.forEach(declaration => {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) return;

    const property = declaration.substring(0, colonIndex).trim();
    const value = parseCSSValue(declaration.substring(colonIndex + 1));

    if (!property || !value) return;

    // Convert CSS property to camelCase
    const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

    // Comprehensive CSS property mapping
    const propertyMap: Record<string, keyof StyleProperties> = {
      // Layout
      'display': 'display',
      'flexDirection': 'flexDirection',
      'justifyContent': 'justifyContent',
      'alignItems': 'alignItems',
      'flexWrap': 'flexWrap',
      'gap': 'gap',
      'gridTemplateColumns': 'gridTemplateColumns',
      'gridTemplateRows': 'gridTemplateRows',
      'gridGap': 'gridGap',
      'gridColumnGap': 'gap',
      'gridRowGap': 'gap',

      // Spacing
      'padding': 'padding',
      'paddingTop': 'paddingTop',
      'paddingRight': 'paddingRight',
      'paddingBottom': 'paddingBottom',
      'paddingLeft': 'paddingLeft',
      'margin': 'margin',
      'marginTop': 'marginTop',
      'marginRight': 'marginRight',
      'marginBottom': 'marginBottom',
      'marginLeft': 'marginLeft',

      // Typography
      'fontSize': 'fontSize',
      'fontWeight': 'fontWeight',
      'fontFamily': 'fontFamily',
      'lineHeight': 'lineHeight',
      'letterSpacing': 'letterSpacing',
      'textAlign': 'textAlign',
      'textDecoration': 'textDecoration',
      'textTransform': 'textTransform',
      'color': 'color',

      // Dimensions
      'width': 'width',
      'height': 'height',
      'minWidth': 'minWidth',
      'minHeight': 'minHeight',
      'maxWidth': 'maxWidth',
      'maxHeight': 'maxHeight',

      // Position
      'position': 'position',
      'top': 'top',
      'right': 'right',
      'bottom': 'bottom',
      'left': 'left',
      'zIndex': 'zIndex',

      // Background
      'backgroundColor': 'backgroundColor',
      'background': 'backgroundColor',
      'backgroundImage': 'backgroundImage',
      'backgroundSize': 'backgroundSize',
      'backgroundPosition': 'backgroundPosition',
      'backgroundRepeat': 'backgroundRepeat',

      // Border
      'border': 'border',
      'borderTop': 'borderTop',
      'borderRight': 'borderRight',
      'borderBottom': 'borderBottom',
      'borderLeft': 'borderLeft',
      'borderRadius': 'borderRadius',
      'borderColor': 'borderColor',
      'borderWidth': 'borderWidth',
      'borderStyle': 'borderStyle',

      // Effects
      'opacity': 'opacity',
      'boxShadow': 'boxShadow',
      'transform': 'transform',
      'transition': 'transition',

      // Overflow
      'overflow': 'overflow',
      'overflowX': 'overflowX',
      'overflowY': 'overflowY',

      // Cursor
      'cursor': 'cursor',
    };

    // Special handling for 'background' property
    if (camelProperty === 'background') {
      if (value.includes('gradient') || value.startsWith('url(')) {
        (styles as any)['backgroundImage'] = value;
      } else if (value !== 'none' && value !== 'transparent' && value !== '0') {
        (styles as any)['backgroundColor'] = value;
      }
    } else {
      const mappedKey = propertyMap[camelProperty];
      if (mappedKey) {
        (styles as any)[mappedKey] = value;
      }
    }
  });

  return styles;
};

// Extract content between balanced braces
const extractBalancedBraces = (text: string, startIndex: number): { content: string; endIndex: number } => {
  let depth = 0;
  let start = -1;
  let i = startIndex;

  while (i < text.length) {
    if (text[i] === '{') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return { content: text.substring(start, i), endIndex: i };
      }
    }
    i++;
  }
  return { content: '', endIndex: text.length };
};

// Parse CSS rules from style tags
const parseStylesheetRules = (cssText: string): void => {
  cssRulesMap.clear();
  mediaQueryRules.tablet.clear();
  mediaQueryRules.mobile.clear();
  cssVariables.clear();

  // Remove comments
  cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  // Extract CSS variables from :root
  const rootMatch = cssText.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    const rootContent = rootMatch[1];
    const varRegex = /--([^:]+):\s*([^;]+);/g;
    let varMatch;
    while ((varMatch = varRegex.exec(rootContent)) !== null) {
      const varName = varMatch[1].trim();
      const varValue = varMatch[2].trim();
      cssVariables.set(varName, varValue);
    }
    console.log('🎨 Extracted CSS variables:', cssVariables.size, Array.from(cssVariables.entries()).slice(0, 5));
  }

  // Extract and process media queries
  const mediaQueryStartRegex = /@media[^{]+/g;
  let mediaMatch;
  const processedRanges: Array<{ start: number; end: number }> = [];

  while ((mediaMatch = mediaQueryStartRegex.exec(cssText)) !== null) {
    const mediaCondition = mediaMatch[0];
    const { content: innerCSS, endIndex } = extractBalancedBraces(cssText, mediaMatch.index + mediaCondition.length);

    processedRanges.push({ start: mediaMatch.index, end: endIndex + 1 });

    // Determine if it's tablet or mobile
    const isTablet = mediaCondition.includes('max-width: 991px') || mediaCondition.includes('max-width:991px');
    const isMobile = mediaCondition.includes('max-width: 767px') || mediaCondition.includes('max-width:767px') ||
                     mediaCondition.includes('max-width: 479px') || mediaCondition.includes('max-width:479px');

    const targetMap = isMobile ? mediaQueryRules.mobile : isTablet ? mediaQueryRules.tablet : null;

    if (targetMap && innerCSS) {
      // Parse rules inside media query
      const ruleRegex = /([^{]+)\{([^}]*)\}/g;
      let ruleMatch;
      let ruleCount = 0;
      while ((ruleMatch = ruleRegex.exec(innerCSS)) !== null) {
        const selectors = ruleMatch[1].trim().split(',');
        const declarations = ruleMatch[2];
        const styles = parseDeclarationBlock(declarations);
        ruleCount++;

        selectors.forEach(selector => {
          const cleanSelector = selector.trim();
          if (cleanSelector.startsWith('.')) {
            const className = cleanSelector.substring(1).split(/[\s:>+~[]/)[0];
            const existing = targetMap.get(className) || {};
            targetMap.set(className, { ...existing, ...styles });
            // Debug: log key classes
            if (className.includes('pricing') || className.includes('layout')) {
              console.log(`📱 Parsed ${isMobile ? 'mobile' : 'tablet'} rule for .${className}:`, styles);
            }
          }
        });
      }
      console.log(`📋 Parsed ${ruleCount} rules from ${isMobile ? 'mobile' : 'tablet'} media query`);
    }
  }

  console.log('📱 Media query rules extracted - Tablet:', mediaQueryRules.tablet.size, 'Mobile:', mediaQueryRules.mobile.size);

  // Debug: log some sample tablet rules
  if (mediaQueryRules.tablet.size > 0) {
    const sampleKeys = Array.from(mediaQueryRules.tablet.keys()).slice(0, 5);
    console.log('📱 Sample tablet classes:', sampleKeys);
  }
  if (mediaQueryRules.mobile.size > 0) {
    const sampleKeys = Array.from(mediaQueryRules.mobile.keys()).slice(0, 5);
    console.log('📱 Sample mobile classes:', sampleKeys);
  }

  // Remove media queries from CSS for main parsing
  let mainCSS = cssText;
  // Sort ranges in reverse order to remove from end first
  processedRanges.sort((a, b) => b.start - a.start);
  for (const range of processedRanges) {
    mainCSS = mainCSS.substring(0, range.start) + mainCSS.substring(range.end);
  }

  // Parse main rules
  const ruleRegex = /([^{@]+)\{([^}]*)\}/g;
  let ruleMatch;
  while ((ruleMatch = ruleRegex.exec(mainCSS)) !== null) {
    const selectors = ruleMatch[1].trim().split(',');
    const declarations = ruleMatch[2];
    const styles = parseDeclarationBlock(declarations);

    selectors.forEach((selector: string) => {
      const cleanSelector = selector.trim();
      // Only handle class selectors for now
      if (cleanSelector.startsWith('.')) {
        const className = cleanSelector.substring(1).split(/[\s:>+~[]/)[0];
        const existing = cssRulesMap.get(className) || {};
        cssRulesMap.set(className, { ...existing, ...styles });
      }
    });
  }
};

// Get computed styles for an element based on its classes
const getStylesForClasses = (classNames: string[]): {
  desktop: Partial<StyleProperties>;
  tablet: Partial<StyleProperties>;
  mobile: Partial<StyleProperties>;
} => {
  const desktop: Partial<StyleProperties> = {};
  const tablet: Partial<StyleProperties> = {};
  const mobile: Partial<StyleProperties> = {};

  classNames.forEach(className => {
    const desktopStyles = cssRulesMap.get(className);
    if (desktopStyles) {
      Object.assign(desktop, desktopStyles);
    }

    const tabletStyles = mediaQueryRules.tablet.get(className);
    if (tabletStyles) {
      Object.assign(tablet, tabletStyles);
      // Debug: log when we find responsive styles
      if (className.includes('pricing') || className.includes('grid') || className.includes('layout')) {
        console.log(`📱 Tablet styles for .${className}:`, tabletStyles);
      }
    }

    const mobileStyles = mediaQueryRules.mobile.get(className);
    if (mobileStyles) {
      Object.assign(mobile, mobileStyles);
      // Debug: log when we find responsive styles
      if (className.includes('pricing') || className.includes('grid') || className.includes('layout')) {
        console.log(`📱 Mobile styles for .${className}:`, mobileStyles);
      }
    }
  });

  return { desktop, tablet, mobile };
};

// Generate a readable name from element info
const generateElementName = (tagName: string, classNames: string[], textContent: string): string => {
  // Try to use a meaningful class name
  const meaningfulClass = classNames.find(c =>
    !c.startsWith('w-') &&
    !c.includes('--') &&
    c.length > 2 &&
    c.length < 30
  );

  if (meaningfulClass) {
    // Convert class to readable name: hero-heading -> Hero Heading
    return meaningfulClass
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .substring(0, 25);
  }

  // Use first few words of text content
  if (textContent && textContent.length > 0) {
    const words = textContent.trim().split(/\s+/).slice(0, 3).join(' ');
    if (words.length > 0 && words.length < 30) {
      return words;
    }
  }

  // Fallback to tag name
  return tagName.charAt(0).toUpperCase() + tagName.slice(1);
};

// Convert HTML element to Builder Element
const convertHTMLElement = (node: HTMLElement, depth = 0): Element | null => {
  // Skip unwanted tags
  const skipTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'SVG'];
  if (skipTags.includes(node.tagName)) {
    return null;
  }

  // Skip hidden elements and template utility classes
  const classList = Array.from(node.classList);

  // Classes that indicate elements should be skipped entirely
  const skipClasses = [
    'w-embed',
    'global-styles',
    'hide',
    'display-none',
    'w-nav-button',      // Mobile menu button
    'menu-icon',         // Hamburger menu icon
    'w-dropdown-list',   // Dropdown content (hidden by default)
    'w-dropdown-toggle', // Dropdown toggle
    'w-dropdown',        // Dropdown wrapper
    'w-nav-overlay',     // Mobile nav overlay
    'mobile-menu',       // Generic mobile menu class
    'mobile-nav',        // Mobile navigation
    'nav-menu-mobile',   // Mobile nav menu
    'hamburger',         // Hamburger menu
    'burger-menu',       // Burger menu
  ];

  const shouldSkip = skipClasses.some(skipClass => classList.includes(skipClass));

  if (shouldSkip) {
    // But still process children if it's a wrapper and not explicitly hidden
    const isHidden = classList.includes('hide') || classList.includes('display-none');
    if (node.children.length > 0 && !isHidden) {
      const children: Element[] = [];
      Array.from(node.children).forEach(child => {
        if (child instanceof HTMLElement) {
          const childElement = convertHTMLElement(child, depth);
          if (childElement) children.push(childElement);
        }
      });
      if (children.length === 1) return children[0];
      if (children.length > 1) {
        return {
          id: uuidv4(),
          type: 'container',
          name: 'Wrapper',
          children,
          styles: { desktop: {}, tablet: {}, mobile: {} },
        };
      }
    }
    return null;
  }

  const id = uuidv4();
  const tagName = node.tagName.toLowerCase();

  // Map HTML tags to element types
  let type: Element['type'] = 'div';
  let content = '';

  // Helper function to check if element is text-like (only inline formatting children)
  const isTextLikeElement = (el: HTMLElement): boolean => {
    const inlineTags = ['SPAN', 'STRONG', 'B', 'EM', 'I', 'A', 'BR', 'SUB', 'SUP', 'MARK'];
    if (el.children.length === 0) return true;
    return Array.from(el.children).every(child =>
      inlineTags.includes(child.tagName) &&
      (child.children.length === 0 || isTextLikeElement(child as HTMLElement))
    );
  };

  switch (tagName) {
    case 'section':
    case 'main':
    case 'article':
    case 'aside':
    case 'header':
    case 'footer':
      type = 'section';
      break;
    case 'nav':
      type = 'container';
      break;
    case 'div':
      // If div has only text/inline elements, treat as text
      if (node.textContent?.trim() && isTextLikeElement(node)) {
        type = 'text';
        content = node.innerHTML;
      } else {
        type = 'container';
      }
      break;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      type = 'heading';
      content = node.textContent?.trim() || '';
      break;
    case 'p':
      type = 'text';
      content = node.innerHTML || '';
      break;
    case 'span':
      // Spans with only inline children are text, otherwise container
      if (isTextLikeElement(node)) {
        type = 'text';
        content = node.innerHTML;
      } else {
        type = 'container';
      }
      break;
    case 'strong':
    case 'b':
    case 'em':
    case 'i':
      type = 'text';
      content = node.textContent?.trim() || '';
      break;
    case 'button':
      type = 'button';
      content = node.textContent?.trim() || '';
      break;
    case 'img':
      type = 'image';
      break;
    case 'a':
      // Check if it's a button-style link
      if (classList.some(c => c.includes('button') || c.includes('btn'))) {
        type = 'button';
      } else {
        type = 'link';
      }
      content = node.textContent?.trim() || '';
      break;
    case 'ul':
    case 'ol':
      type = 'container';
      break;
    case 'li':
      type = 'text';
      content = node.textContent?.trim() || '';
      break;
    case 'form':
      type = 'container';
      break;
    case 'input':
    case 'textarea':
    case 'select':
      type = 'container'; // We'll handle forms later
      break;
    case 'label':
      type = 'text';
      content = node.textContent?.trim() || '';
      break;
  }

  // Get styles from classes
  const classStyles = getStylesForClasses(classList);

  // Parse inline styles and merge (inline takes precedence)
  const inlineStyleStr = node.getAttribute('style') || '';
  const inlineStyles = parseDeclarationBlock(inlineStyleStr);

  const mergedStyles = {
    desktop: { ...classStyles.desktop, ...inlineStyles },
    tablet: { ...classStyles.tablet },
    mobile: { ...classStyles.mobile },
  };

  // Get attributes
  const attributes: Record<string, string> = {};
  if (type === 'image') {
    const src = node.getAttribute('src') || '';
    const srcset = node.getAttribute('srcset') || '';
    // Prefer highest resolution from srcset if available
    if (srcset) {
      const sources = srcset.split(',').map(s => s.trim());
      const lastSource = sources[sources.length - 1];
      const srcFromSet = lastSource?.split(' ')[0];
      attributes.src = srcFromSet || src || 'https://via.placeholder.com/400x300';
    } else {
      attributes.src = src || 'https://via.placeholder.com/400x300';
    }
    attributes.alt = node.getAttribute('alt') || 'Image';
  }
  if (type === 'link' || (type === 'button' && tagName === 'a')) {
    attributes.href = node.getAttribute('href') || '#';
    attributes.target = node.getAttribute('target') || '_self';
  }

  // Parse children for container-like elements
  const children: Element[] = [];
  const containerTypes: Element['type'][] = ['container', 'section', 'div'];

  if (containerTypes.includes(type) && node.children.length > 0) {
    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        const childElement = convertHTMLElement(child, depth + 1);
        if (childElement) {
          children.push(childElement);
        }
      }
    });
  }

  // Generate a readable name
  const name = generateElementName(tagName, classList, content);

  const result = {
    id,
    type,
    name,
    children,
    styles: mergedStyles,
    content: content || undefined,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };

  // Debug: log text/heading elements
  if (type === 'text' || type === 'heading' || type === 'button' || type === 'link') {
    console.log(`📝 Created ${type} element:`, name, 'content:', content?.substring(0, 50));
  }

  return result;
};

// Extract CSS from style tags
export const extractCSS = (htmlString: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  let css = '';

  // Get all style tags
  const styleTags = doc.querySelectorAll('style');
  styleTags.forEach(style => {
    css += style.textContent + '\n';
  });

  return css;
};

// Main parser function
export const parseHTMLToElements = (htmlString: string): Element[] => {
  console.log('🔧 parseHTMLToElements called');
  console.log('📥 Input HTML length:', htmlString?.length || 0);

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // First, extract and parse all CSS rules
  const css = extractCSS(htmlString);
  console.log('🎨 Extracted CSS length:', css.length);
  parseStylesheetRules(css);
  console.log('📋 Parsed CSS rules:', cssRulesMap.size);

  const elements: Element[] = [];

  // Get body content - look for main wrapper or body children
  const body = doc.body;

  // Try to find the main content wrapper
  const mainWrapper = body.querySelector('.page-wrapper') ||
                      body.querySelector('.main-wrapper') ||
                      body.querySelector('main') ||
                      body;

  console.log('🏗️ Processing wrapper:', mainWrapper?.className || 'body');

  if (mainWrapper && mainWrapper.children.length > 0) {
    Array.from(mainWrapper.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        const element = convertHTMLElement(child);
        if (element) {
          elements.push(element);
        }
      }
    });
  }

  // If no elements parsed from wrapper, try body children directly
  if (elements.length === 0 && body && body.children.length > 0) {
    Array.from(body.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        const element = convertHTMLElement(child);
        if (element) {
          elements.push(element);
        }
      }
    });
  }

  // If still no elements, create a default container
  if (elements.length === 0) {
    console.log('⚠️ No elements parsed, creating default container');
    elements.push({
      id: uuidv4(),
      type: 'container',
      name: 'Imported Container',
      children: [],
      styles: {
        desktop: {
          padding: '40px',
          backgroundColor: '#ffffff',
        },
        tablet: {},
        mobile: {},
      },
    });
  }

  console.log('✅ Final elements count:', elements.length);
  return elements;
};

// Parse with full HTML template support (extracts CSS and injects as scoped styles)
export const parseTemplate = (htmlString: string): { elements: Element[]; globalCSS: string } => {
  const elements = parseHTMLToElements(htmlString);
  const globalCSS = extractCSS(htmlString);

  return { elements, globalCSS };
};