import { MarketplaceTemplate } from '@/types/template.types';

/**
 * TEMPLATE REGISTRY
 *
 * For REAL templates (from HTML exports):
 * - Paste HTML file in: public/templates/your-template.html
 * - Set htmlContent: '' (empty)
 * - Set templateUrl: '/templates/your-template.html'
 *
 * Template files can be 50-100MB+, never embed them here.
 * See public/templates/README.md for full guide.
 */

export const marketplaceTemplates: MarketplaceTemplate[] = [
  {
    id: 'mp-13',
    title: 'SpotQeys SEO Agency',
    description: 'Professional SEO and digital marketing agency template with pricing plans, client results slider, services section, and testimonials. Perfect for local SEO businesses.',
    category: 'Agency',
    style: 'Professional',
    previewImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
      'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&q=80',
    ],
    htmlContent: '', // Will be loaded from templateUrl
    templateUrl: '/templates/spotqeys-agency.html',
    hasJavaScript: true, // Uses JS for interactions
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_eVq28tcrP86X1ofdcg3ZK06',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.9,
    reviewCount: 42,
    downloads: 1250,
    tags: ['seo', 'agency', 'marketing', 'local business', 'pricing'],
    createdAt: '2024-03-01',
    updatedAt: '2024-03-20',
    featured: true,
  },
  {
    id: 'mp-14',
    title: 'AcciConnect - Law Firm',
    description: 'Professional law firm and legal services template. Features accident lawyer pages, location-based landing pages, contact forms, and a modern design perfect for personal injury attorneys.',
    category: 'Agency',
    style: 'Professional',
    previewImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/acci-connect/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_fZueVfgI51Iz9UL0pu3ZK05',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.8,
    reviewCount: 18,
    downloads: 340,
    tags: ['law firm', 'legal', 'attorney', 'lawyer', 'personal injury', 'professional'],
    createdAt: '2024-03-20',
    updatedAt: '2024-03-26',
    featured: true,
  },
  {
    id: 'mp-15',
    title: 'Strifex - SEO & SaaS',
    description: 'Modern SEO and SaaS agency template with pricing tables, integrations showcase, blog, team profiles, and ecommerce features. Built with Epilogue and Space Grotesk fonts for a professional look.',
    category: 'SaaS',
    style: 'Modern',
    previewImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/qeyseo/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_fZu00l1Nb4UL1of6NS3ZK04',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.9,
    reviewCount: 56,
    downloads: 1840,
    tags: ['seo', 'saas', 'agency', 'ecommerce', 'blog', 'pricing', 'modern'],
    createdAt: '2024-03-25',
    updatedAt: '2024-03-27',
    featured: true,
  },
  {
    id: 'mp-16',
    title: 'Stickers - Design Agency',
    description: 'A bold freelancer and design agency template with service pages, work portfolio, blog, and contact form. Uses Bricolage Grotesque and Inter fonts for a modern, playful look.',
    category: 'Agency',
    style: 'Bold',
    previewImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80',
      'https://images.unsplash.com/photo-1522542550221-31fd8575f637?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/dlolocal/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_9B628t1Nb9b17MDfko3ZK03',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.7,
    reviewCount: 34,
    downloads: 920,
    tags: ['agency', 'freelancer', 'design', 'portfolio', 'services', 'bold'],
    createdAt: '2024-03-26',
    updatedAt: '2024-03-27',
    featured: true,
  },
  {
    id: 'mp-17',
    title: 'Motorio - Car Detailing',
    description: 'Sleek car detailing and automotive services template with service pages, team profiles, blog, and contact form. Features smooth animations and bold Montserrat/Oxanium typography.',
    category: 'Agency',
    style: 'Bold',
    previewImage: 'https://images.unsplash.com/photo-1520340356584-f9321a2a9cce?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1520340356584-f9321a2a9cce?w=1200&q=80',
      'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/bala-car-detailing/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_7sYcN7gI52MDff50pu3ZK02',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.8,
    reviewCount: 27,
    downloads: 680,
    tags: ['car detailing', 'automotive', 'services', 'team', 'blog', 'bold'],
    createdAt: '2024-03-26',
    updatedAt: '2024-03-27',
    featured: true,
  },
  {
    id: 'mp-18',
    title: 'Agrofy - Agriculture',
    description: 'Agriculture and farming template with portfolio, pricing plans, services, team profiles, FAQ, and blog. Features video backgrounds and custom Switzer/Zodiak typography.',
    category: 'Agency',
    style: 'Professional',
    previewImage: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&q=80',
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/sb-template/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_00wdRb77v3QH8QH2xC3ZK01',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.7,
    reviewCount: 41,
    downloads: 1120,
    tags: ['agriculture', 'farming', 'portfolio', 'pricing', 'services', 'video'],
    createdAt: '2024-03-27',
    updatedAt: '2024-03-27',
    featured: true,
  },
  {
    id: 'mp-19',
    title: 'Pioneer Popcorn - Kettle Corn',
    description: 'Full ecommerce template for a kettle corn and popcorn business. Includes product pages, checkout flow, services, team profiles, blog, pricing, and contact. Built with Fredoka and Satoshi fonts.',
    category: 'E-commerce',
    style: 'Bold',
    previewImage: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=1200&q=80',
      'https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/pioneer-popcorn/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_aFabJ3ezX86X8QH5JO3ZK00',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.9,
    reviewCount: 31,
    downloads: 750,
    tags: ['ecommerce', 'food', 'popcorn', 'checkout', 'services', 'team', 'blog'],
    createdAt: '2024-03-28',
    updatedAt: '2024-03-28',
    featured: true,
  },
  {
    id: 'mp-20',
    title: 'Cleaning Master - Home Services',
    description: 'Professional cleaning and home services template with service pages, about, blog, contact, pricing, and legal pages. Clean, modern design built for local service businesses.',
    category: 'Landing Page',
    style: 'Professional',
    previewImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    previewImages: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=80',
    ],
    htmlContent: '',
    templateUrl: '/templates/cleaning-master/index.html',
    hasJavaScript: true,
    price: 50,
    isPremium: true,
    stripePaymentLink: 'https://buy.stripe.com/test_8x27sNdvT4UL7MDb483ZK07',
    author: {
      name: 'SpotQeys',
      avatar: 'https://ui-avatars.com/api/?name=SpotQeys&background=FFB088&color=fff',
      verified: true,
    },
    rating: 4.8,
    reviewCount: 12,
    downloads: 200,
    tags: ['cleaning', 'home services', 'local business', 'services', 'blog', 'contact'],
    createdAt: '2024-04-01',
    updatedAt: '2024-04-01',
    featured: true,
  },
];

export const getFeaturedTemplates = () =>
  marketplaceTemplates.filter(t => t.featured);

export const getFreeTemplates = () =>
  marketplaceTemplates.filter(t => !t.isPremium);

export const getPremiumTemplates = () =>
  marketplaceTemplates.filter(t => t.isPremium);

export const getTemplatesByCategory = (category: string) =>
  category === 'All'
    ? marketplaceTemplates
    : marketplaceTemplates.filter(t => t.category === category);