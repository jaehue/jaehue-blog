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
} as const;

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
