const https = require('https');
const FormData = require('form-data');
const crypto = require('crypto');

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const PROJECT = process.env.CLOUDFLARE_PAGES_PROJECT || "dev-home-5";

if (!TOKEN || !ACCOUNT) {
  console.error('Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in env');
  process.exit(1);
}

// Simple test HTML
const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello from Genesis!</h1></body>
</html>`;

const htmlBuffer = Buffer.from(html, 'utf-8');
const htmlHash = crypto.createHash('sha1').update(htmlBuffer).digest('hex');

console.log('HTML Hash:', htmlHash);
console.log('HTML Size:', htmlBuffer.length);

const manifest = {
  '/index.html': htmlHash
};

console.log('Manifest:', JSON.stringify(manifest));

const formData = new FormData();
formData.append('manifest', JSON.stringify(manifest));
formData.append(htmlHash, htmlBuffer, { filename: 'index.html', contentType: 'text/html' });

const req = https.request({
  method: 'POST',
  host: 'api.cloudflare.com',
  path: `/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments`,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    ...formData.getHeaders()
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Response:', JSON.stringify(json, null, 2));
    if (json.result) {
      console.log('\nDeployment URL:', json.result.url);
      // Wait 3 seconds then test the URL
      setTimeout(() => {
        https.get(json.result.url, (r) => {
          let body = '';
          r.on('data', c => body += c);
          r.on('end', () => console.log('\nPage content:', body.substring(0, 200)));
        });
      }, 3000);
    }
  });
});

req.on('error', console.error);
formData.pipe(req);
