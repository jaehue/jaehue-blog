// 사이트 전역 SEO 상수
export const SITE = {
  title: '장재휴',
  description: '장재휴의 글 — 여행, 일, 사람, 믿음, 성찰에 대한 기록',
  author: '장재휴',
  url: 'https://jaehue.github.io',
  locale: 'ko_KR',
  // 글에 thumbnail이 없을 때 사용할 기본 OG 이미지(루트 기준 경로).
  // /public 아래에 파일을 두면 자동 적용됩니다. 없으면 og:image 생략.
  defaultOgImage: '',
  // 소셜 링크. 빈 문자열이면 해당 링크는 표시되지 않습니다.
  social: {
    facebook: 'https://www.facebook.com/bbugguj',
    instagram: 'https://www.instagram.com/jaehue.jang/',
  },
} as const;

// 다국어 번역 지원.
// 글 파일명을 `{slug}.{언어코드}.md` 로 만들면(예: 2026.06.15.mn.md)
// 해당 글의 번역본으로 자동 인식되어, 원문 페이지 안에서 언어 전환으로 노출된다.
// 번역본은 단독 페이지·목록·RSS·검색에서 자동 제외된다.
export const DEFAULT_LANG = 'ko';
export const LANGUAGES: Record<string, string> = {
  ko: '한국어',
  mn: 'Монгол',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

export const ESSAY_PARTS = [
  { part: 1, name: '여행', subtitle: '경상도 촌놈, 세상 밖으로 나가다' },
  { part: 2, name: '떠남', subtitle: '익숙한 곳을 벗어나다' },
  { part: 3, name: '일', subtitle: '만들고, 부딪히고, 성장하다' },
  { part: 4, name: '사람', subtitle: '관계 속에서 나를 발견하다' },
  { part: 5, name: '믿음', subtitle: '흔들리면서 단단해지다' },
  { part: 6, name: '성찰', subtitle: '느리게 깊이 생각하다' },
  { part: 7, name: '꿈', subtitle: '아직 끝나지 않은 이야기' },
  { part: 8, name: '독서', subtitle: '책이 내 삶을 다시 쓴다' },
] as const;
