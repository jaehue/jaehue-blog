// 빌드 가드: 발행(draft=false) 글 중 description이 비어 있으면 빌드를 실패시킨다.
// package.json의 prebuild에 연결되어 build/배포 전에 자동 실행된다.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BLOG_DIR = new URL('../src/content/blog/', import.meta.url).pathname;
const MIN_LEN = 10;

function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '').trim() : null;
}

const offenders = [];
for (const f of readdirSync(BLOG_DIR).filter((f) => /\.(md|mdx)$/.test(f))) {
  const raw = readFileSync(join(BLOG_DIR, f), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { offenders.push(`${f} (frontmatter 없음)`); continue; }
  const fm = m[1];
  if (/^draft:[ \t]*true/m.test(fm)) continue; // 초안은 발행 안 되므로 제외
  const desc = field(fm, 'description');
  if (!desc) offenders.push(`${f} (description 비어 있음)`);
  else if (desc.length < MIN_LEN) offenders.push(`${f} (description 너무 짧음: "${desc}")`);
}

if (offenders.length) {
  console.error(`\n❌ SEO 가드: 발행 글 ${offenders.length}개의 description이 누락/부실합니다.`);
  offenders.forEach((o) => console.error(`   - ${o}`));
  console.error(`\n해결: \`npm run seo\` 를 실행해 자동 생성하거나 직접 채운 뒤 다시 빌드하세요.\n`);
  process.exit(1);
}
console.log(`✅ SEO 가드 통과: 모든 발행 글에 description 존재.`);
