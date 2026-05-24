import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { ensureLocalTemplatesDir } from '../config/storage';

/**
 * Generates a thumbnail for a template by taking a screenshot of the HTML
 * @param templateId - The ID of the template
 * @returns Path to the generated thumbnail
 */
const generateThumbnail = async (templateId: string): Promise<string> => {
  const templatesDir = ensureLocalTemplatesDir();
  const templateDir = path.join(templatesDir, templateId);
  const htmlPath = path.join(templateDir, 'index.html');
  const cssPath = path.join(templateDir, 'styles.css');
  const thumbnailPath = path.join(templateDir, 'thumbnail.png');

  // Check if HTML file exists
  if (!fs.existsSync(htmlPath)) {
    console.warn(`HTML file not found for template ${templateId}`);
    throw new Error('HTML file not found');
  }

  try {
    // Read HTML and CSS
    let html = fs.readFileSync(htmlPath, 'utf-8');
    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

    // Inject CSS into HTML if not already present
    if (css && !html.includes('<style>')) {
      html = html.replace('</head>', `<style>${css}</style></head>`);
    }

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport to a standard desktop size
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
    });

    // Load the HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });

    // Take screenshot
    await page.screenshot({
      path: thumbnailPath,
      type: 'png',
      fullPage: false, // Only capture viewport
    });

    await browser.close();

    console.log(`✅ Thumbnail generated for template ${templateId}`);
    return thumbnailPath;
  } catch (error: any) {
    console.error(`❌ Thumbnail generation failed for template ${templateId}:`, error.message);
    throw error;
  }
};

export default generateThumbnail;