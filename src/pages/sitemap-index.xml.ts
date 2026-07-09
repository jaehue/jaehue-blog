import { buildSitemapIndexXml, xmlResponse } from '../lib/sitemap';

export async function GET() {
  return xmlResponse(buildSitemapIndexXml());
}
