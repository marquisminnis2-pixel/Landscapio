export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  style: string;
  previewImage: string;
  htmlContent: string;
  templateUrl?: string;
  hasJavaScript?: boolean;
}

// Parsed template content for code editor
export interface TemplateContent {
  html: string;       // Body HTML content
  css: string;        // Extracted <style> content
  js: string;         // Extracted <script> content
  fullHtml: string;   // Original full HTML (for reference)
}

// Extended template for marketplace
export interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  style: string;
  previewImage: string;
  previewImages?: string[]; // Multiple preview images for detail view
  htmlContent: string;
  templateUrl?: string; // URL to fetch full template HTML (for large templates)
  hasJavaScript?: boolean; // Flag if template includes JS interactions

  // Marketplace fields
  price: number; // 0 = free
  isPremium: boolean;
  author: {
    name: string;
    avatar: string;
    verified?: boolean;
  };
  rating: number; // 0-5
  reviewCount: number;
  downloads: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
  stripePaymentLink?: string; // Stripe Payment Link URL for premium templates
}

export const templateCategories = [
  'All',
  'Technology',
  'E-commerce',
  'Creative',
  'Restaurant',
  'Fitness',
  'SaaS',
  'Portfolio',
  'Landing Page',
  'Agency',
  'Blog',
  'Education',
] as const;

export type TemplateCategory = typeof templateCategories[number];
