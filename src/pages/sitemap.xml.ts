import { buildSitemapXml, xmlResponse } from '../lib/sitemap';

export async function GET() {
  return xmlResponse(await buildSitemapXml());
}
