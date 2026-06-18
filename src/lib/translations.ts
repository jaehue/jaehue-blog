// 파일명 규칙 `{slug}.{언어코드}.md` 기반의 번역본 처리 유틸.
//
//   2026.06.15.md      → 원문(기본 언어)
//   2026.06.15.mn.md   → 위 글의 몽골어 번역본 (단독 노출 안 됨)
//
// 번역본은 목록/RSS/검색/단독 페이지에서 제외하고,
// 원문 페이지 안에서 언어 전환으로만 보여준다.

import { DEFAULT_LANG, LANGUAGES } from '../consts';

type Entry = { id: string };

// 기본 언어(ko)를 제외한, 번역으로 인정하는 언어 코드들
const TRANSLATION_LANGS = Object.keys(LANGUAGES).filter((c) => c !== DEFAULT_LANG);

// id가 "{baseId}.{lang}" 형태면 분해해서 반환. 아니면 null.
// 단순히 끝 2글자만 보는 게 아니라, 알려진 언어 코드일 때만 인정한다.
export function splitTranslationId(id: string): { baseId: string; lang: string } | null {
  const m = id.match(/^(.+)\.([a-z]{2})$/);
  if (!m) return null;
  const [, baseId, lang] = m;
  if (!TRANSLATION_LANGS.includes(lang)) return null;
  return { baseId, lang };
}

// 해당 id가 (원문이 실제로 존재하는) 번역본인지 여부
export function isTranslation(id: string, baseIds: Set<string>): boolean {
  const split = splitTranslationId(id);
  return split !== null && baseIds.has(split.baseId);
}

// 번역본을 걷어내고 원문 글만 남긴다. (목록/RSS/단독 페이지 생성용)
export function basePostsOnly<T extends Entry>(entries: T[]): T[] {
  const ids = new Set(entries.map((e) => e.id));
  return entries.filter((e) => !isTranslation(e.id, ids));
}

// 특정 원문 글의 번역본들을 { 언어코드: 엔트리 } 형태로 모은다.
export function translationsOf<T extends Entry>(baseId: string, entries: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const e of entries) {
    const split = splitTranslationId(e.id);
    if (split && split.baseId === baseId) out[split.lang] = e;
  }
  return out;
}
