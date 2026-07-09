import { getCollection } from 'astro:content';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../consts';
import { basePostsOnly } from './translations';

const SITE_URL = SITE.url.replace(/\/$/, '');

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absoluteUrl(path: string) {
  return new URL(path, `${SITE_URL}/`).href;
}

function postLastmod(id: string, fallbackDate: string) {
  for (const ext of ['md', 'mdx']) {
    try {
      return statSync(join(process.cwd(), 'src/content/blog', `${id}.${ext}`)).mtime.toISOString();
    } catch {}
  }
  return new Date(fallbackDate).toISOString();
}

function urlEntry(path: string, lastmod?: string) {
  const loc = escapeXml(absoluteUrl(path));
  const lastmodXml = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodXml}\n  </url>`;
}

export async function buildSitemapXml() {
  const posts = basePostsOnly(await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf(),
  );

  const latestPostDate = posts[0]?.data.date ? new Date(posts[0].data.date).toISOString() : undefined;
  const tags = [...new Set(posts.flatMap((post) => post.data.tags ?? []).filter(Boolean))].sort();
  const categories = [...new Set(posts.flatMap((post) => post.data.categories ?? []).filter(Boolean))].sort();

  const entries = [
    urlEntry('/', latestPostDate),
    urlEntry('/post/', latestPostDate),
    urlEntry('/about/'),
    urlEntry('/tags/', latestPostDate),
    urlEntry('/search/'),
    ...posts.map((post) => urlEntry(`/post/${post.id}/`, postLastmod(post.id, post.data.date))),
    ...tags.map((tag) => urlEntry(`/tags/${encodeURIComponent(tag)}/`, latestPostDate)),
    ...categories.map((category) => urlEntry(`/categories/${encodeURIComponent(category)}/`, latestPostDate)),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function buildSitemapIndexXml() {
  const loc = escapeXml(absoluteUrl('/sitemap.xml'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>\n</sitemapindex>\n`;
}

export function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
