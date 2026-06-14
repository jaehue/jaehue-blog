// 빈 description을 claude CLI로 생성해 채운다 (글 전체 요약 기반).
// 사용:
//   node scripts/seo-fill.mjs                 # blog 전체 중 빈 것만
//   node scripts/seo-fill.mjs <file...>       # 지정 파일 중 빈 것만 (pre-commit 훅에서 사용)
// idempotent: 이미 description 값이 있으면 건너뜀.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, isAbsolute } from 'node:path';

const BLOG_DIR = new URL('../src/content/blog/', import.meta.url).pathname;
const MODEL = process.env.SEO_MODEL || 'haiku'; // 커밋 속도를 위해 기본 haiku
const MAX = 160;

function listAll() {
  return readdirSync(BLOG_DIR)
    .filter((f) => /\.(md|mdx)$/.test(f))
    .map((f) => join(BLOG_DIR, f));
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

function getField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '').trim();
}

function yamlString(s) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function generate(title, tags, body) {
  const prompt = `다음은 한국어 블로그 글이다. 이 글 전체를 읽고 검색엔진 노출용 meta description을 작성하라.

규칙:
- 70~150자(한글)의 자연스러운 평서문 한두 문장.
- 글 전체의 핵심 주제와 메시지를 요약한다. 도입부 첫 문장을 그대로 베끼지 말 것.
- 글의 구체적 주제어/키워드가 자연스럽게 포함되게 한다.
- "이 글은", "이 포스트는" 같은 메타 표현 금지. 큰따옴표(") 사용 금지. 과장/낚시 금지.
- 출력은 description 본문 한 줄만. 따옴표·번호·접두사·부연설명 없이 결과 텍스트만.

제목: ${title}
${tags?.length ? `태그: ${tags.join(', ')}\n` : ''}본문:
${body.slice(0, 6000)}`;

  const r = spawnSync('claude', ['-p', prompt, '--model', MODEL], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`claude 실행 실패 (status ${r.status}): ${(r.stderr || '').slice(0, 300)}`);
  }
  let out = (r.stdout || '').trim();
  out = (out.split('\n').map((s) => s.trim()).filter(Boolean)[0] || '');
  out = out.replace(/^["'`]+|["'`]+$/g, '').replace(/"/g, '').trim();
  if (out.length > MAX) {
    const cut = out.slice(0, MAX);
    const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('다 '), cut.lastIndexOf('. '));
    out = (lastDot > MAX * 0.5 ? cut.slice(0, lastDot + 1) : cut).trim();
  }
  return out;
}

const args = process.argv.slice(2);
const files = (args.length ? args : listAll()).map((f) => (isAbsolute(f) ? f : join(process.cwd(), f)));

let filled = 0, skipped = 0, failed = 0;
for (const path of files) {
  if (!/\.(md|mdx)$/.test(path)) continue;
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { continue; }
  const parts = splitFrontmatter(raw);
  if (!parts) { console.warn(`⚠️  frontmatter 없음, 건너뜀: ${path}`); failed++; continue; }
  const { fm, body } = parts;

  const current = getField(fm, 'description');
  if (current) { skipped++; continue; }

  const title = getField(fm, 'title') || '';
  const tags = (fm.match(/^tags:\r?\n((?:[ \t]+-.*\r?\n?)*)/m)?.[1] || '')
    .split('\n').map((l) => l.replace(/^[ \t]*-[ \t]*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean);

  let desc;
  try {
    process.stdout.write(`✍️  생성 중: ${path.split('/').pop()} ... `);
    desc = generate(title, tags, body);
  } catch (e) {
    console.log('실패');
    console.warn(`   ${e.message}`);
    failed++;
    continue;
  }
  if (!desc) { console.log('빈 결과'); failed++; continue; }

  let newFm;
  if (/^description:/m.test(fm)) {
    newFm = fm.replace(/^description:[ \t]*.*$/m, `description: ${yamlString(desc)}`);
  } else if (/^title:.*$/m.test(fm)) {
    newFm = fm.replace(/^(title:.*)$/m, `$1\ndescription: ${yamlString(desc)}`);
  } else {
    newFm = `description: ${yamlString(desc)}\n${fm}`;
  }
  writeFileSync(path, `---\n${newFm}\n---\n${body}`);
  console.log(`완료\n   → ${desc}`);
  filled++;
}

console.log(`\n생성: ${filled} / 유지(기존값): ${skipped} / 실패: ${failed}`);
if (failed > 0) process.exitCode = 0; // 훅에서 커밋을 막지 않도록 0 유지 (빌드 가드가 최종 차단)
