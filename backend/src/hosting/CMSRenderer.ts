/**
 * CMSRenderer — Deploy-time CMS content rendering using cheerio
 *
 * Fills w-dyn-list sections with real CMS data, and generates
 * per-item detail pages from detail templates.
 */
import * as cheerio from 'cheerio';
import type { DeploymentFiles } from './index';

// ─── Types ────────────────────────────────────────────────────────────────

export interface CMSContext {
  collections: Record<string, {
    items: Array<{
      slug: string;
      fieldData: Record<string, any>;
    }>;
  }>;
}

// ─── Section-to-Collection Mapping ────────────────────────────────────────

interface SectionMapping {
  collectionSlug: string;
  renderItem: ($template: any, item: { slug: string; fieldData: Record<string, any> }, $: cheerio.CheerioAPI) => void;
}

function getSectionMappings(): Record<string, SectionMapping> {
  return {
    'grid-blog-thirds': {
      collectionSlug: 'blog-posts',
      renderItem($el, item, $) {
        const fd = item.fieldData;
        $el.find('img.image-blog').attr('src', fd.image || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        // Title can be h3.no-margins or .text-style-h3
        const titleEl = $el.find('h3.no-margins').length ? $el.find('h3.no-margins') : $el.find('.text-style-h3');
        titleEl.text(fd.name || '').removeClass('w-dyn-bind-empty');
        // Description (sibling div after title)
        titleEl.next('div').text(truncate(stripHtml(fd['blog-content'] || ''), 120)).removeClass('w-dyn-bind-empty');
        // Link to detail page
        $el.find('a.tile-blog').attr('href', `blog/${item.slug}.html`);
      },
    },

    'grid-services-thirds': {
      collectionSlug: 'services',
      renderItem($el, item, $) {
        const fd = item.fieldData;
        $el.find('img.icon-circle-icon').attr('src', fd.icon || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        // Title
        const titleEl = $el.find('h3.no-margins').length ? $el.find('h3.no-margins') : $el.find('.text-style-h3');
        titleEl.text(fd.name || '').removeClass('w-dyn-bind-empty');
        // Short description
        titleEl.next('div').text(truncate(fd['short-description'] || '', 100)).removeClass('w-dyn-bind-empty');
        // Color for circle background
        if (fd.color && fd.color !== 'white') {
          $el.find('.circle-service-tile').css('background-color', fd.color);
        }
        // Link
        $el.find('a.tile-service-thirds').attr('href', `services/${item.slug}.html`);
      },
    },

    'list-moving-team': {
      collectionSlug: 'teams',
      renderItem($el, item, $) {
        const fd = item.fieldData;
        $el.find('img.image-moving-team').attr('src', fd['profile-image'] || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        // Bottom section: name - position
        const bottomDivs = $el.find('.bottom-moving-team > div');
        bottomDivs.eq(0).text(fd.name || '').removeClass('w-dyn-bind-empty');
        bottomDivs.eq(2).text(fd.position || '').removeClass('w-dyn-bind-empty');
        // Link
        $el.find('a.tile-moving-team').attr('href', `team/${item.slug}.html`);
      },
    },

    'list-team-wide': {
      collectionSlug: 'teams',
      renderItem($el, item, $) {
        const fd = item.fieldData;
        $el.find('img.image-team-wide').attr('src', fd['profile-image'] || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        $el.find('.text-style-h3').text(fd.name || '').removeClass('w-dyn-bind-empty');
        $el.find('.body-big').text(truncate(fd['short-description'] || '', 200)).removeClass('w-dyn-bind-empty');
        $el.find('a.tile-team-wide').attr('href', `team/${item.slug}.html`);
      },
    },

    'grid-pricing-thirds': {
      collectionSlug: 'products',
      renderItem($el, item, $) {
        const fd = item.fieldData;
        // Price tag
        $el.find('.tag-price div').first().text(`$${fd.price || 0}`);
        // Product name
        const h3 = $el.find('h3.no-margins').length ? $el.find('h3.no-margins') : $el.find('.text-style-h3');
        h3.text(fd.name || '');
        // Description (div after h3 inside .top-pricing-tile)
        h3.next('div').text(fd.description || '');
        // Feature checklist
        const features = (fd.features || '').split('\n').filter(Boolean);
        $el.find('.single-checklist, .single-checklist-pricing').each(function (i) {
          const featureDiv = $(this).find('div').last();
          featureDiv.text(features[i] || '');
        });
        // CTA link
        $el.find('a.cta-main').attr('href', 'contact.html');
      },
    },
  };
}

// ─── Main Render Function ─────────────────────────────────────────────────

/**
 * Render CMS content into an HTML string by populating w-dyn-list sections.
 */
export function renderCMSContent(html: string, ctx: CMSContext): string {
  const $ = cheerio.load(html, { xml: false } as any);
  const mappings = getSectionMappings();

  // Find all w-dyn-list sections
  $('.w-dyn-list').each(function () {
    const $list = $(this);
    const $dynItems = $list.find('.w-dyn-items').first();
    if (!$dynItems.length) return;

    // Identify which collection this section maps to by CSS class
    const classes = ($dynItems.attr('class') || '').split(/\s+/);
    let mapping: SectionMapping | undefined;
    let matchedClass = '';

    for (const cls of classes) {
      if (mappings[cls]) {
        mapping = mappings[cls];
        matchedClass = cls;
        break;
      }
    }

    if (!mapping) return;

    const collection = ctx.collections[mapping.collectionSlug];
    if (!collection || collection.items.length === 0) return;

    // Get the template item (first w-dyn-item)
    const $templateItem = $dynItems.find('.w-dyn-item').first();
    if (!$templateItem.length) return;

    const templateHtml = $.html($templateItem);

    // Clear existing items
    $dynItems.empty();

    // Sort items by order if they have it
    const sortedItems = [...collection.items].sort((a, b) => {
      const orderA = a.fieldData.order ?? 999;
      const orderB = b.fieldData.order ?? 999;
      return orderA - orderB;
    });

    // Clone template and fill for each item
    for (const item of sortedItems) {
      const tempDoc = cheerio.load(`<div id="__cms_root">${templateHtml}</div>`, { xml: false } as any);
      const $tempItem = tempDoc('.w-dyn-item');
      mapping.renderItem($tempItem, item, tempDoc);
      const renderedItemHtml = tempDoc('#__cms_root').html() || '';
      $dynItems.append(renderedItemHtml);
    }

    // Remove the empty state
    $list.find('.w-dyn-empty').remove();
  });

  return $.html();
}

// ─── Detail Page Generation ───────────────────────────────────────────────

interface DetailConfig {
  templateFileName: string;
  collectionSlug: string;
  outputPrefix: string;
  fillDetailFields: ($: cheerio.CheerioAPI, item: { slug: string; fieldData: Record<string, any> }) => void;
}

function getDetailConfigs(): DetailConfig[] {
  return [
    {
      templateFileName: 'detail_blog.html',
      collectionSlug: 'blog-posts',
      outputPrefix: 'blog',
      fillDetailFields($, item) {
        const fd = item.fieldData;
        // Hero section
        $('.hero-blog-template .body-big.w-dyn-bind-empty').text('Blog').removeClass('w-dyn-bind-empty');
        $('h1.w-dyn-bind-empty').text(fd.name || '').removeClass('w-dyn-bind-empty');
        $('img.image-blog-template').attr('src', fd.image || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        // Rich text content
        $('.w-dyn-bind-empty.w-richtext').html(fd['blog-content'] || '').removeClass('w-dyn-bind-empty');
      },
    },
    {
      templateFileName: 'detail_team.html',
      collectionSlug: 'teams',
      outputPrefix: 'team',
      fillDetailFields($, item) {
        const fd = item.fieldData;
        $('img.image-team-template').attr('src', fd['profile-image'] || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        $('h1.w-dyn-bind-empty').text(fd.name || '').removeClass('w-dyn-bind-empty');
        $('.subtitle.w-dyn-bind-empty').text(fd.position || '').removeClass('w-dyn-bind-empty');
        $('.w-dyn-bind-empty.w-richtext').html(fd['long-description'] || '').removeClass('w-dyn-bind-empty');
      },
    },
    {
      templateFileName: 'detail_services.html',
      collectionSlug: 'services',
      outputPrefix: 'services',
      fillDetailFields($, item) {
        const fd = item.fieldData;
        $('img.icon-service-template').attr('src', fd.icon || '').attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
        // The first w-dyn-bind-empty h1 is the title
        $('h1.w-dyn-bind-empty').text(fd.name || '').removeClass('w-dyn-bind-empty');
        // Subtitle = short description
        $('.subtitle.w-dyn-bind-empty').text(fd['short-description'] || '').removeClass('w-dyn-bind-empty');
        // Rich text = about this service
        $('.left-service-template .w-dyn-bind-empty.w-richtext').html(fd['about-this-service'] || '').removeClass('w-dyn-bind-empty');

        // Gallery section
        const galleryStr = fd.gallery || '';
        if (galleryStr) {
          const galleryUrls = galleryStr.split(';').map((u: string) => u.trim()).filter(Boolean);
          const $galleryItems = $('.grid-service-gallery');
          if ($galleryItems.length && galleryUrls.length > 0) {
            const $templateGalleryItem = $galleryItems.find('.w-dyn-item').first();
            const templateGalleryHtml = $.html($templateGalleryItem);
            $galleryItems.empty();

            for (const url of galleryUrls) {
              const tempDoc = cheerio.load(`<div id="__g">${templateGalleryHtml}</div>`, { xml: false } as any);
              tempDoc('img.image-service-gallery').attr('src', url).attr('alt', fd.name || '').removeClass('w-dyn-bind-empty');
              tempDoc('.lightbox-service-gallery').attr('href', url).removeClass('w-dyn-bind-empty');
              $galleryItems.append(tempDoc('#__g').html() || '');
            }

            // Remove empty state for gallery
            $galleryItems.closest('.w-dyn-list').find('.w-dyn-empty').remove();
          }
        }
      },
    },
  ];
}

/**
 * Generate per-item detail HTML pages.
 * Returns an array of DeploymentFiles.
 */
export function generateDetailPages(
  ctx: CMSContext,
  templateFiles: Record<string, string> // fileName -> HTML content
): DeploymentFiles[] {
  const files: DeploymentFiles[] = [];
  const configs = getDetailConfigs();

  for (const config of configs) {
    const templateHtml = templateFiles[config.templateFileName];
    if (!templateHtml) {
      console.log(`[CMSRenderer] Detail template not found: ${config.templateFileName}, skipping`);
      continue;
    }

    const collection = ctx.collections[config.collectionSlug];
    if (!collection || collection.items.length === 0) {
      console.log(`[CMSRenderer] No items for collection ${config.collectionSlug}, skipping detail pages`);
      continue;
    }

    for (const item of collection.items) {
      // Load a fresh copy of the template for each item
      const $ = cheerio.load(templateHtml, { xml: false } as any);

      // Fill detail fields
      config.fillDetailFields($, item);

      // Also render any w-dyn-list sections in the detail page (related items)
      const renderedHtml = renderCMSContent($.html(), ctx);

      const outputPath = `/${config.outputPrefix}/${item.slug}.html`;
      files.push({
        path: outputPath,
        content: Buffer.from(renderedHtml, 'utf-8'),
        contentType: 'text/html',
      });

      console.log(`[CMSRenderer] Generated detail page: ${outputPath}`);
    }
  }

  return files;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '...';
}
