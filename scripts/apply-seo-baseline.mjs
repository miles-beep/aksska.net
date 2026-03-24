import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = 'https://www.aksska.net';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function routeFromFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

function toAbsoluteUrl(url, route) {
  if (!url) return BASE_URL + route;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return BASE_URL + url;
  return BASE_URL + (route.endsWith('/') ? route : route + '/') + url;
}

function ensureCanonical(html, absUrl) {
  const canonicalRe = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  if (canonicalRe.test(html)) {
    return html.replace(canonicalRe, (tag) => {
      if (/href=["'][^"']*["']/i.test(tag)) {
        return tag.replace(/href=["'][^"']*["']/i, `href=\"${absUrl}\"`);
      }
      return tag.replace(/>$/, ` href=\"${absUrl}\">`);
    });
  }

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `<link rel=\"canonical\" href=\"${absUrl}\"/>\n</head>`);
  }
  return html;
}

function normalizeOgUrls(html, absUrl) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const isOgUrl = /property=["']og:url["']/i.test(tag);
    const isOgImage = /property=["']og:image["']/i.test(tag);
    const isTwitterImage = /(?:name|property)=["']twitter:image["']/i.test(tag);
    if (!isOgUrl && !isOgImage && !isTwitterImage) return tag;

    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (!contentMatch) return tag;

    const current = contentMatch[1];
    const next = isOgUrl ? absUrl : toAbsoluteUrl(current, '/');
    return tag.replace(/content=["'][^"']*["']/i, `content="${next}"`);
  });
}

function ensureIndexSchema(html) {
  if (/application\/ld\+json/i.test(html)) return html;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'AKSSKA',
        url: BASE_URL,
        logo: `${BASE_URL}/favicon.ico`
      },
      {
        '@type': 'WebSite',
        name: 'AKSSKA',
        url: BASE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };

  const script = `<script type=\"application/ld+json\">${JSON.stringify(schema)}</script>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${script}\n</head>`);
  return html;
}

const files = walk(ROOT);
let updated = 0;
const routes = [];

for (const file of files) {
  const route = routeFromFile(file);
  routes.push(route);
  const absUrl = BASE_URL + route;
  let html = fs.readFileSync(file, 'utf8');
  const original = html;

  html = ensureCanonical(html, absUrl);
  html = normalizeOgUrls(html, absUrl);
  if (route === '/') html = ensureIndexSchema(html);

  if (html !== original) {
    fs.writeFileSync(file, html);
    updated++;
  }
}

const uniqueRoutes = [...new Set(routes)]
  .filter((r) => r && r !== '/404' && !r.includes('/web/'))
  .sort();

const now = new Date().toISOString();
const sitemapEntries = uniqueRoutes
  .map((r) => `  <url><loc>${BASE_URL}${r}</loc><lastmod>${now}</lastmod></url>`)
  .join('\n');

const sitemap = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${sitemapEntries}\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);

console.log(JSON.stringify({ files: files.length, htmlUpdated: updated, sitemapUrls: uniqueRoutes.length }, null, 2));
