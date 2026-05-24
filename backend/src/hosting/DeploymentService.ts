import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { HostingSite, Deployment } from '../models/hosting.index';
import type { IDeployment, DeploymentStatus } from '../models/Deployment';
import Project from '../models/Project';
import CMSCollection from '../models/CMSCollection';
import CMSItem from '../models/CMSItem';
import { getHostingAdapter, DeploymentFiles, DeploymentProgress } from './index';
import { renderCMSContent, generateDetailPages, CMSContext } from './CMSRenderer';

/**
 * Service to handle the deployment pipeline:
 * 1. Build static files from project
 * 2. Deploy to hosting provider
 * 3. Update deployment status
 */
export class DeploymentService {
  /**
   * Process a queued deployment
   */
  async processDeployment(
    deploymentId: string,
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<IDeployment> {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const site = await HostingSite.findById(deployment.siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    const project = await Project.findById(deployment.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      // Update status to building
      await this.updateDeploymentStatus(deployment, 'building');
      deployment.buildStartedAt = new Date();
      await deployment.save();

      onProgress?.({ stage: 'building', progress: 0, message: 'Generating static files...' });

      // Log project info for debugging
      console.log(`[DeploymentService] Building files for project: ${project.name}`);
      console.log(`[DeploymentService] Project elements count: ${project.elements?.length || 0}`);
      console.log(`[DeploymentService] Has rawHtml: ${!!project.rawHtml}`);

      // Build static files - use rawHtml if available (template mode), otherwise generate from elements
      let files: DeploymentFiles[];
      if (project.rawHtml) {
        console.log(`[DeploymentService] Using rawHtml template (${project.rawHtml.length} chars)`);
        files = await this.buildStaticFilesFromRawHtml(project);
      } else {
        console.log(`[DeploymentService] Generating from elements`);
        files = await this.buildStaticFiles(project);
      }

      // Log generated files for debugging
      console.log(`[DeploymentService] Generated ${files.length} files:`);
      files.forEach(f => {
        console.log(`  - ${f.path}: ${f.content.length} bytes`);
      });

      deployment.buildCompletedAt = new Date();
      await deployment.save();

      onProgress?.({ stage: 'building', progress: 100, message: 'Build complete' });

      // Update status to uploading
      await this.updateDeploymentStatus(deployment, 'uploading');
      deployment.uploadStartedAt = new Date();
      await deployment.save();

      // Deploy to hosting provider
      const adapter = getHostingAdapter(deployment.provider as any);
      const result = await adapter.deploy(site, deployment, files, onProgress);

      deployment.uploadCompletedAt = new Date();

      if (result.success) {
        // Update deployment with result
        deployment.status = 'live';
        deployment.previewUrl = result.previewUrl;
        deployment.productionUrl = result.productionUrl;
        deployment.providerDeploymentId = result.providerDeploymentId;
        deployment.assets = result.assets || [];
        deployment.totalSize = result.totalSize || 0;
        deployment.liveAt = new Date();
        await deployment.save();

        // Update site with active deployment
        site.activeDeploymentId = deployment._id as mongoose.Types.ObjectId;
        site.status = 'live';
        await site.save();

        // Attach custom domain to the hosting provider (if supported)
        const baseDomain = process.env.GENESIS_BASE_DOMAIN;
        if (baseDomain && baseDomain !== 'pages.dev' && adapter.attachDomain) {
          // Extract the hostname from the production URL (e.g., dev-home-6.genesis-hosting.com)
          const productionUrl = adapter.getProductionUrl(site);
          const customDomain = new URL(productionUrl).hostname;
          console.log(`[DeploymentService] Attaching custom domain: ${customDomain}`);
          try {
            const domainResult = await adapter.attachDomain(site, customDomain);
            if (domainResult.success) {
              console.log(`[DeploymentService] Custom domain attached successfully: ${customDomain}`);
            } else {
              console.warn(`[DeploymentService] Failed to attach custom domain: ${domainResult.error}`);
            }
          } catch (domainError: any) {
            // Don't fail the deployment if domain attachment fails
            console.warn(`[DeploymentService] Domain attachment error (non-fatal): ${domainError.message}`);
          }
        }

        // Update project publish status
        project.isPublished = true;
        project.publishedUrl = result.productionUrl;
        await project.save();
      } else {
        deployment.status = 'failed';
        deployment.error = result.error;
        await deployment.save();
      }

      return deployment;
    } catch (error: any) {
      console.error('Deployment processing error:', error);
      deployment.status = 'failed';
      deployment.error = error.message || 'Unknown error';
      await deployment.save();
      throw error;
    }
  }

  /**
   * Build static HTML/CSS/JS files from project elements
   */
  private async buildStaticFiles(project: any): Promise<DeploymentFiles[]> {
    const files: DeploymentFiles[] = [];

    // Generate HTML from project elements
    const html = this.generateHTML(project);
    files.push({
      path: '/index.html',
      content: Buffer.from(html, 'utf-8'),
      contentType: 'text/html',
    });

    // Generate CSS from element styles
    const css = this.generateCSS(project);
    files.push({
      path: '/styles.css',
      content: Buffer.from(css, 'utf-8'),
      contentType: 'text/css',
    });

    // Generate basic JS for interactivity (if needed)
    const js = this.generateJS(project);
    if (js) {
      files.push({
        path: '/script.js',
        content: Buffer.from(js, 'utf-8'),
        contentType: 'application/javascript',
      });
    }

    return files;
  }

  /**
   * Build static files from rawHtml (template mode)
   * The rawHtml already contains the complete HTML template
   * We need to make it self-contained by removing broken external references
   */
  private async buildStaticFilesFromRawHtml(project: any): Promise<DeploymentFiles[]> {
    console.log('[DeploymentService] ===== NAV FIX v2 ACTIVE =====');
    const files: DeploymentFiles[] = [];

    let html: string = project.rawHtml;
    const templateBasePath = project.templateBasePath || '';

    // MIME types for bundled assets
    const mimeTypes: Record<string, string> = {
      '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
      '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
      '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.html': 'text/html',
    };

    // Resolve the template directory on disk (frontend/public/templates/...)
    const frontendPublicDir = path.resolve(__dirname, '../../..', 'frontend', 'public');
    const templateDir = templateBasePath
      ? path.join(frontendPublicDir, templateBasePath)
      : '';

    console.log(`[DeploymentService] Template base path: ${templateBasePath}`);
    console.log(`[DeploymentService] Template dir on disk: ${templateDir}`);

    // If we have access to template assets, bundle them
    if (templateDir && fs.existsSync(templateDir)) {
      // Recursively read all asset files from the template directory
      const readDirRecursive = (dir: string, relativeBase: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(relativeBase, entry.name);
          if (entry.isDirectory()) {
            readDirRecursive(fullPath, relativePath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            // Skip index.html (we generate it from rawHtml with rewritten paths)
            if (entry.name.toLowerCase() === 'index.html') continue;

            const contentType = mimeTypes[ext] || 'application/octet-stream';
            let content = fs.readFileSync(fullPath);

            // Rewrite asset paths in other HTML pages too
            if (ext === '.html' && templateBasePath) {
              let pageHtml = content.toString('utf-8');
              const escapedBase = templateBasePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              pageHtml = pageHtml.replace(new RegExp(escapedBase, 'g'), '/');
              pageHtml = pageHtml.replace(/\/\//g, '/');
              pageHtml = pageHtml.replace(/https?:\//g, (match) => match + '/');
              content = Buffer.from(pageHtml, 'utf-8');
            }

            files.push({
              path: '/' + relativePath.replace(/\\/g, '/'),
              content,
              contentType: ext === '.html' ? 'text/html' : contentType,
            });
          }
        }
      };

      readDirRecursive(templateDir, '');
      console.log(`[DeploymentService] Bundled ${files.length} template asset files`);

      // Rewrite /templates/{name}/... paths to relative paths in the HTML
      // e.g., /templates/dlolocal/css/normalize.css -> /css/normalize.css
      if (templateBasePath) {
        const escapedBase = templateBasePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(escapedBase, 'g'), '/');
        // Clean up any double slashes from replacement
        html = html.replace(/\/\//g, '/');
        // Fix protocol slashes that got broken (https:/ -> https://)
        html = html.replace(/https?:\//g, (match) => match + '/');
      }
    } else {
      console.log(`[DeploymentService] No template dir found, stripping template references`);
      // Fallback: strip template references if we can't find the files
      html = html.replace(/<link[^>]*href=["'][^"']*\/templates\/[^"']*["'][^>]*>/gi, '');
      html = html.replace(/<script[^>]*src=["'][^"']*\/templates\/[^"']*["'][^>]*><\/script>/gi, '');
    }

    // Rewrite CDN jQuery references to local copy in all HTML files
    // Templates depend on jQuery for navbar functionality; CDN may be blocked
    const jqueryLocalPath = '/js/jquery-3.5.1.min.js';
    const hasLocalJquery = files.some(f => f.path === jqueryLocalPath);

    const rewriteJqueryCdn = (htmlStr: string): string => {
      // Match the jQuery CDN pattern (with any query params, integrity, crossorigin)
      return htmlStr.replace(
        /<script[^>]*src=["']https?:\/\/d3e54v103j8qbb\.cloudfront\.net\/js\/jquery[^"']*["'][^>]*><\/script>/gi,
        `<script src="${jqueryLocalPath}" type="text/javascript"></script>`
      );
    };

    if (hasLocalJquery) {
      // Rewrite CDN refs in all bundled HTML files
      for (const file of files) {
        if (file.contentType === 'text/html') {
          const original = file.content.toString('utf-8');
          const rewritten = rewriteJqueryCdn(original);
          if (rewritten !== original) {
            console.log(`[DeploymentService] Rewrote jQuery CDN reference in ${file.path}`);
            file.content = Buffer.from(rewritten, 'utf-8');
          }
        }
      }
      // Also rewrite in the index.html we're about to add
      html = rewriteJqueryCdn(html);
    }

    // ===== STRIP WEBFLOW BRANDING from deployed HTML =====
    const stripWebflowBranding = (htmlStr: string): string => {
      let result = htmlStr;
      // 1. Remove "This site was created in Webflow" comment
      result = result.replace(/<!--\s*This site was created in Webflow[^>]*-->\s*/gi, '');
      // 2. Remove "Last Published" comment
      result = result.replace(/<!--\s*Last Published:[^>]*-->\s*/gi, '');
      // 3. Remove <meta content="Webflow" name="generator"> tag
      result = result.replace(/<meta[^>]*name=["']generator["'][^>]*content=["']Webflow["'][^>]*>\s*/gi, '');
      result = result.replace(/<meta[^>]*content=["']Webflow["'][^>]*name=["']generator["'][^>]*>\s*/gi, '');
      // 4. KEEP data-wf-page and data-wf-site — webflow.js needs these
      //    to initialize Interactions/IX2 animations (scroll reveal, etc.).
      //    Without them, elements with style="opacity:0" stay invisible.
      // 5. Remove og:title / twitter:title meta tags that mention "Webflow" in content
      result = result.replace(/<meta[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["'][^"']*[Ww]ebflow[^"']*["'][^>]*>\s*/gi, '');
      result = result.replace(/<meta[^>]*content=["'][^"']*[Ww]ebflow[^"']*["'][^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*>\s*/gi, '');
      // 6. Remove footer links/text referencing webflow.com
      result = result.replace(/<a[^>]*href=["']https?:\/\/(?:www\.)?webflow\.com\/?["'][^>]*>.*?<\/a>/gi, '');
      return result;
    };

    // Apply branding strip to all bundled HTML files
    for (const file of files) {
      if (file.contentType === 'text/html') {
        const original = file.content.toString('utf-8');
        const stripped = stripWebflowBranding(original);
        if (stripped !== original) {
          console.log(`[DeploymentService] Stripped Webflow branding from ${file.path}`);
          file.content = Buffer.from(stripped, 'utf-8');
        }
      }
    }
    // Also strip from the index.html
    html = stripWebflowBranding(html);

    // ===== CMS RENDERING: Populate w-dyn-list sections with real data =====
    const cmsContext = await this.loadCMSContext(project._id || project.id);

    if (Object.keys(cmsContext.collections).length > 0) {
      console.log(`[DeploymentService] CMS: Found ${Object.keys(cmsContext.collections).length} collections`);
      for (const [slug, col] of Object.entries(cmsContext.collections)) {
        console.log(`[DeploymentService] CMS:   ${slug}: ${col.items.length} items`);
      }

      // Render CMS content in all bundled HTML files
      for (const file of files) {
        if (file.contentType === 'text/html') {
          const original = file.content.toString('utf-8');
          const rendered = renderCMSContent(original, cmsContext);
          if (rendered !== original) {
            console.log(`[DeploymentService] CMS: Rendered content in ${file.path}`);
            file.content = Buffer.from(rendered, 'utf-8');
          }
        }
      }

      // Also render CMS in the index.html (from rawHtml)
      html = renderCMSContent(html, cmsContext);

      // Generate detail pages from templates
      const templateFileContents: Record<string, string> = {};
      for (const file of files) {
        if (file.contentType === 'text/html') {
          const fileName = file.path.split('/').pop() || '';
          if (fileName.startsWith('detail_')) {
            templateFileContents[fileName] = file.content.toString('utf-8');
          }
        }
      }

      const detailPages = generateDetailPages(cmsContext, templateFileContents);
      console.log(`[DeploymentService] CMS: Generated ${detailPages.length} detail pages`);
      files.push(...detailPages);
    } else {
      console.log('[DeploymentService] CMS: No collections found for this project');
    }

    // ===== NAV FIX v10: Complete fix (flatten dropdowns + robust mobile hamburger) =====
    //
    // ROOT CAUSE (v9 issues):
    // 1. w-dropdown structure left intact → empty dropdown-toggle renders invisible
    //    on mobile, but dropdown-list links show as raw paths (/blog, /#)
    // 2. /home-sales#pages is a Webflow demo link that shows as "/#"
    // 3. Webflow dropdown JS still initializes because w-dropdown classes weren't stripped
    // 4. "Buy template" CTA in mobile nav links to Webflow marketplace
    //
    // FIX v10:
    // A. Flatten dropdown: extract dropdown links into nav-menu as siblings, remove dropdown wrapper
    // B. Strip ALL Webflow widget classes (w-nav-*, w-dropdown-*, w-commerce-*)
    // C. Remove Webflow demo links (/home-sales#pages) and "Buy template" CTA
    // D. CSS: proper mobile menu with background color, padding, and link styling
    // E. JS: robust hamburger toggle in script block (not inline onclick)

    const applyNavFix = (htmlStr: string): string => {
      // 1. Save correct hrefs into data-href on ALL nav-area links
      htmlStr = htmlStr.replace(
        /<a\s+href="([^"#][^"]*)"([^>]*class="(?:nav-link|link(?:-dropdown)?|w-dropdown-link)[^"]*")/g,
        '<a href="$1" data-href="$1"$2'
      );

      // 2. Flatten dropdown: extract individual links from dropdown-list,
      //    add them as nav-link siblings, then remove the entire dropdown wrapper
      htmlStr = htmlStr.replace(
        /<div[^>]*class="[^"]*\bdropdown\b[^"]*"[^>]*>[\s\S]*?<nav[^>]*class="[^"]*\bdropdown-list\b[^"]*"[^>]*>([\s\S]*?)<\/nav>[\s\S]*?<\/div>/gi,
        (match, dropdownLinks) => {
          // Extract <a> tags from the dropdown list
          const links: string[] = [];
          const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
          let linkMatch;
          while ((linkMatch = linkRegex.exec(dropdownLinks)) !== null) {
            const href = linkMatch[1];
            const text = linkMatch[2].trim();
            // Skip Webflow demo links and duplicate links
            if (href.includes('/home-sales') || href.includes('home-sales') || !text) continue;
            // Convert to nav-link style
            links.push(`<a href="${href}" data-href="${href}" class="nav-link">${text}</a>`);
          }
          return links.join('\n');
        }
      );

      // 3. Remove Webflow marketplace links (webflow.com/templates/...)
      htmlStr = htmlStr.replace(/<a[^>]*href="[^"]*webflow\.com\/templates[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

      // 4. Strip template navbar classes
      htmlStr = htmlStr.replace(/\bw-nav-link\b/g, '');
      htmlStr = htmlStr.replace(/\bw-nav-menu\b/g, '');
      htmlStr = htmlStr.replace(/\bw-nav\b(?!-)/g, '');
      htmlStr = htmlStr.replace(/\bw-nav-button\b/g, '');
      htmlStr = htmlStr.replace(/\bw-nav-brand\b/g, '');

      // 5. Strip dropdown widget classes (now that dropdown is flattened)
      htmlStr = htmlStr.replace(/\bw-dropdown-link\b/g, '');
      htmlStr = htmlStr.replace(/\bw-dropdown-list\b/g, '');
      htmlStr = htmlStr.replace(/\bw-dropdown-toggle\b/g, '');
      htmlStr = htmlStr.replace(/\bw-dropdown\b/g, '');

      // 6. Strip navbar data-* attributes
      htmlStr = htmlStr.replace(/\s*data-animation="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-easing2?="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-collapse="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-no-scroll="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-duration="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-nav-menu-open="[^"]*"/g, '');
      // Strip dropdown data attributes too
      htmlStr = htmlStr.replace(/\s*data-delay="[^"]*"/g, '');
      htmlStr = htmlStr.replace(/\s*data-hover="[^"]*"/g, '');

      // 7. Remove the w-nav-overlay element
      htmlStr = htmlStr.replace(/<div[^>]*class="w-nav-overlay"[^>]*>[\s\S]*?<\/div>/g, '');

      // 8. Clean up double spaces in class attributes
      htmlStr = htmlStr.replace(/class="([^"]*)"/g, (_, classes) => {
        return `class="${classes.replace(/\s{2,}/g, ' ').trim()}"`;
      });

      // 9. Fix Blog nav link (template has href="#" for Blog in some pages)
      htmlStr = htmlStr.replace(/<a href="#" class="link">Blog<\/a>/g, '<a href="blog.html" data-href="blog.html" class="nav-link">Blog</a>');

      // 10. Fix brand-link href="#" → index.html (match any attribute order)
      htmlStr = htmlStr.replace(
        /<a([^>]*?)href="#"([^>]*?)class="([^"]*brand-link[^"]*)"([^>]*)>/g,
        '<a$1href="index.html"$2class="$3"$4>'
      );
      htmlStr = htmlStr.replace(
        /<a([^>]*?)class="([^"]*brand-link[^"]*)"([^>]*?)href="#"([^>]*)>/g,
        '<a$1class="$2"$3href="index.html"$4>'
      );

      // 11. Add aria attributes to menu-button for accessibility
      htmlStr = htmlStr.replace(
        /(<div[^>]*\bclass="[^"]*\bmenu-button\b[^"]*"[^>]*?)(>)/g,
        (match, before, gt) => {
          if (match.includes('role=')) return match;
          return before + ' role="button" tabindex="0" aria-label="Toggle menu"' + gt;
        }
      );

      // 12. Strip data-w-id from nav element to prevent Webflow from finding it
      htmlStr = htmlStr.replace(/(<div[^>]*\bclass="[^"]*\bnavbar\b[^"]*"[^>]*?)\s*data-w-id="[^"]*"([^>]*>)/g, '$1$2');

      return htmlStr;
    };

    const navFixScript = `
  <style>
  /* Nav fix v10 CSS */
  /* Stacking: nav-menu above nav-mid so links aren't blocked by brand overlay */
  .nav-menu { position: relative !important; z-index: 2 !important; }
  /* nav-mid (brand logo container) passes pointer events through to elements below */
  .nav-mid { pointer-events: none; z-index: 1; }
  .nav-mid .brand-link { pointer-events: auto; }
  /* nav-link needs display since w-nav-link was stripped */
  .nav-link, .link { display: inline-block; text-decoration: none; position: relative; cursor: pointer; }
  /* Hide Webflow marketplace CTA */
  .menu-cta-wrap { display: none !important; }
  /* Hamburger: HIDDEN at desktop */
  .menu-button { display: none !important; }
  /* Mobile: show hamburger, hide nav links until toggled open */
  @media screen and (max-width: 991px) {
    .menu-button {
      display: flex !important;
      align-items: center;
      cursor: pointer;
      position: relative !important;
      z-index: 20 !important;
      padding: 8px;
    }
    .nav-menu {
      display: none !important;
    }
    .nav-menu.nav-menu--open {
      display: flex !important;
      flex-direction: column !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      right: 0 !important;
      z-index: 100 !important;
      background: var(--color--light-two, #fff) !important;
      padding: 16px 24px 24px !important;
      border-top: 1px solid rgba(21,21,21,0.1);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      gap: 4px;
    }
    .nav-menu.nav-menu--open .nav-link,
    .nav-menu.nav-menu--open .link {
      display: block !important;
      padding: 12px 0 !important;
      font-size: 18px !important;
      font-weight: 500 !important;
      color: var(--color--dark, #151515) !important;
      border-bottom: 1px solid rgba(21,21,21,0.06);
      text-decoration: none !important;
    }
    .nav-menu.nav-menu--open .nav-link:last-child,
    .nav-menu.nav-menu--open .link:last-child {
      border-bottom: none;
    }
    /* Hide close icon by default, show hamburger */
    .menu-close-icon { display: none; }
    .menu-hamburger-icon { display: block; }
  }
  </style>
  <script>
  /* Nav fix v10 - hamburger toggle + nav-link navigation */
  (function() {
    // Hamburger toggle
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.menu-button');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        var menu = document.querySelector('.nav-menu');
        if (!menu) return;
        var isOpen = menu.classList.toggle('nav-menu--open');
        var hi = btn.querySelector('.menu-hamburger-icon');
        var cl = btn.querySelector('.menu-close-icon');
        if (hi) hi.style.display = isOpen ? 'none' : 'block';
        if (cl) cl.style.display = isOpen ? 'block' : 'none';
        return;
      }
      // Nav link navigation via data-href (immune to template JS interception)
      var link = e.target.closest('[data-href]');
      if (link) {
        var href = link.getAttribute('data-href');
        if (href) {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.location.href = href;
        }
      }
    }, true);

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      var menu = document.querySelector('.nav-menu.nav-menu--open');
      if (!menu) return;
      if (!e.target.closest('.nav-menu') && !e.target.closest('.menu-button')) {
        menu.classList.remove('nav-menu--open');
        var hi = document.querySelector('.menu-hamburger-icon');
        var cl = document.querySelector('.menu-close-icon');
        if (hi) hi.style.display = 'block';
        if (cl) cl.style.display = 'none';
      }
    });
  })();
  </script>`;

    const injectNavFix = (htmlStr: string): string => {
      if (htmlStr.includes('Nav fix v10')) return htmlStr;
      // Strip any older version before injecting new one
      htmlStr = htmlStr.replace(/<style>\s*\/\* Nav fix v[0-9]+[\s\S]*?<\/script>/g, '');
      return htmlStr.replace(/<\/body>/i, navFixScript + '\n</body>');
    };

    // Apply ALL fixes to bundled HTML files
    let navFixCount = 0;
    for (const file of files) {
      if (file.contentType === 'text/html') {
        let content = file.content.toString('utf-8');
        content = applyNavFix(content);
        content = injectNavFix(content);
        navFixCount++;
        file.content = Buffer.from(content, 'utf-8');
      }
    }

    // Apply fixes to index.html (from rawHtml)
    html = applyNavFix(html);
    html = injectNavFix(html);
    navFixCount++;
    console.log(`[DeploymentService] Nav fix v10 applied to ${navFixCount} HTML files`);

    // Add the HTML as index.html
    files.push({
      path: '/index.html',
      content: Buffer.from(html, 'utf-8'),
      contentType: 'text/html',
    });

    console.log(`[DeploymentService] Total deployment files: ${files.length}`);

    return files;
  }

  /**
   * Generate HTML from project elements
   */
  private generateHTML(project: any): string {
    const renderElement = (el: any): string => {
      if (!el) return '';

      const children = el.children?.map(renderElement).join('') || '';
      const content = el.content || children;

      // Build attributes string
      const attrs = Object.entries(el.attributes || {})
        .map(([key, val]) => `${key}="${val}"`)
        .join(' ');

      switch (el.type) {
        case 'text':
          return `<p class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${content}</p>`;
        case 'heading':
          const level = el.attributes?.level || 1;
          return `<h${level} class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${content}</h${level}>`;
        case 'image':
          return `<img class="el-${el.id}" src="${el.attributes?.src || ''}" alt="${el.attributes?.alt || ''}" />`;
        case 'link':
          return `<a class="el-${el.id}" href="${el.attributes?.href || '#'}"${attrs ? ' ' + attrs : ''}>${content}</a>`;
        case 'button':
          return `<button class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${content}</button>`;
        case 'container':
        case 'section':
        case 'div':
          return `<div class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${children}</div>`;
        case 'nav':
          return `<nav class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${children}</nav>`;
        case 'header':
          return `<header class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${children}</header>`;
        case 'footer':
          return `<footer class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${children}</footer>`;
        case 'form':
          return `<form class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${children}</form>`;
        case 'input':
          return `<input class="el-${el.id}"${attrs ? ' ' + attrs : ''} />`;
        default:
          return `<div class="el-${el.id}"${attrs ? ' ' + attrs : ''}>${content}</div>`;
      }
    };

    const bodyContent = (project.elements || []).map(renderElement).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name || 'Website'}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${bodyContent}
<script src="/script.js"></script>
</body>
</html>`;
  }

  /**
   * Generate CSS from element styles
   */
  private generateCSS(project: any): string {
    const cssRules: string[] = [];

    // Base reset
    cssRules.push(`
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.5;
}

img {
  max-width: 100%;
  height: auto;
}
`);

    const processElement = (el: any) => {
      if (!el) return;

      // Generate CSS for each breakpoint
      if (el.styles?.desktop) {
        cssRules.push(`.el-${el.id} { ${this.stylesToCSS(el.styles.desktop)} }`);
      }

      if (el.styles?.tablet) {
        cssRules.push(`@media (max-width: 991px) { .el-${el.id} { ${this.stylesToCSS(el.styles.tablet)} } }`);
      }

      if (el.styles?.mobile) {
        cssRules.push(`@media (max-width: 767px) { .el-${el.id} { ${this.stylesToCSS(el.styles.mobile)} } }`);
      }

      // Process children
      el.children?.forEach(processElement);
    };

    (project.elements || []).forEach(processElement);

    return cssRules.join('\n\n');
  }

  /**
   * Convert style object to CSS string
   */
  private stylesToCSS(styles: Record<string, any>): string {
    return Object.entries(styles)
      .map(([prop, value]) => {
        // Convert camelCase to kebab-case
        const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssProperty}: ${value}`;
      })
      .join('; ');
  }

  /**
   * Generate JavaScript (minimal for static sites)
   */
  private generateJS(_project: any): string {
    return `// Genesis Site
document.addEventListener('DOMContentLoaded', function() {
  console.log('Site loaded');
});
`;
  }

  /**
   * Load CMS data for a project into a CMSContext object
   */
  private async loadCMSContext(projectId: string): Promise<CMSContext> {
    const ctx: CMSContext = { collections: {} };

    try {
      const collections = await CMSCollection.find({ projectId });
      if (collections.length === 0) return ctx;

      for (const collection of collections) {
        const collectionId = collection._id;
        const items = await CMSItem.find({
          collectionId,
          status: 'published',
        }).sort({ 'fieldData.order': 1, createdAt: -1 });

        ctx.collections[collection.slug] = {
          items: items.map(item => ({
            slug: item.slug,
            fieldData: item.fieldData || {},
          })),
        };
      }
    } catch (err: any) {
      console.error('[DeploymentService] Error loading CMS context:', err.message);
    }

    return ctx;
  }

  /**
   * Update deployment status in database
   */
  private async updateDeploymentStatus(deployment: IDeployment, status: DeploymentStatus): Promise<void> {
    deployment.status = status;
    await deployment.save();
  }
}

/**
 * Singleton instance
 */
let deploymentServiceInstance: DeploymentService | null = null;

export function getDeploymentService(): DeploymentService {
  if (!deploymentServiceInstance) {
    deploymentServiceInstance = new DeploymentService();
  }
  return deploymentServiceInstance;
}