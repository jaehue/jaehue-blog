// 빈 description을 본문 첫 문단에서 추출해 채운다. (idempotent: 이미 값이 있으면 건드리지 않음)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../src/content/blog/', import.meta.url);
const MAX = 155;
const apply = process.argv.includes('--write');

function stripMarkdown(s) {
  return s
    .replace(/<[^>]+>/g, '')                       // html 태그 (<sub> 등)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')       // 링크 → 텍스트
    .replace(/`([^`]*)`/g, '$1')                    // 인라인 코드
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // 강조
    .replace(/^\s*>+\s?/g, '')                       // 인용 마커
    .replace(/\s+/g, ' ')
    .trim();
}

function isSkippable(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^#{1,6}\s/.test(t)) return true;            // 헤딩
  if (/^!\[/.test(t)) return true;                  // 이미지만 있는 줄
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return true; // 구분선
  if (/^(```|~~~)/.test(t)) return true;            // 코드펜스
  if (/^\|/.test(t)) return true;                   // 표
  if (/^(import|export)\s/.test(t)) return true;    // mdx import
  if (/^<[a-zA-Z]/.test(t) && !/[가-힣a-zA-Z0-9]{2,}/.test(stripMarkdown(t))) return true;
  return false;
}

function extractDescription(body) {
  const lines = body.split(/\r?\n/);
  let para = [];
  let inFence = false;
  for (const line of lines) {
    if (/^(```|~~~)/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (para.length === 0) {
      if (isSkippable(line)) continue;
      // 리스트/인용은 본문 첫 문단으로 부적절하므로 건너뜀
      if (/^\s*([-*+]|\d+\.)\s/.test(line) || /^\s*>/.test(line)) continue;
      para.push(line);
    } else {
      if (!line.trim()) break;
      para.push(line);
    }
  }
  let text = stripMarkdown(para.join(' '));
  if (!text) return '';
  if (text.length <= MAX) return text;
  // 문장 경계 우선, 없으면 단어 경계로 자르고 …
  const cut = text.slice(0, MAX);
  const lastSentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('. '), cut.lastIndexOf('다. '), cut.lastIndexOf('요. '));
  if (lastSentence > MAX * 0.5) return cut.slice(0, lastSentence + 1).trim();
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MAX * 0.5 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function yamlString(s) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

const files = readdirSync(DIR).filter((f) => /\.(md|mdx)$/.test(f));
let filled = 0, skipped = 0, failed = 0;

for (const f of files) {
  const path = join(DIR.pathname, f);
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { failed++; console.warn('frontmatter 파싱 실패:', f); continue; }
  const [, fm, body] = m;

  const descMatch = fm.match(/^description:[ \t]*(.*)$/m);
  const current = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '').trim() : '';
  if (current) { skipped++; continue; }

  const desc = extractDescription(body);
  if (!desc) { failed++; console.warn('본문에서 추출 실패:', f); continue; }

  let newFm;
  if (descMatch) {
    newFm = fm.replace(/^description:[ \t]*.*$/m, `description: ${yamlString(desc)}`);
  } else {
    // title 줄 뒤에 삽입 (없으면 맨 앞)
    if (/^title:.*$/m.test(fm)) {
      newFm = fm.replace(/^(title:.*)$/m, `$1\ndescription: ${yamlString(desc)}`);
    } else {
      newFm = `description: ${yamlString(desc)}\n` + fm;
    }
  }
  const out = `---\n${newFm}\n---\n${body}`;
  if (apply) writeFileSync(path, out);
  filled++;
  if (!apply && filled <= 6) console.log(`\n[${f}]\n  → ${desc}`);
}

console.log(`\n채움: ${filled} / 유지(기존값): ${skipped} / 실패: ${failed} ${apply ? '(WRITTEN)' : '(dry-run)'}`);
