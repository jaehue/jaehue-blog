# 장재휴 블로그 (jaehue-blog)

Astro로 만든 개인 블로그. 여행, 일, 사람, 믿음, 성찰에 대한 글.

## ✨ 주요 기능

- **Astro 6 + Tailwind CSS v4**, React 아일랜드(인터랙티브 요소)
- **글** — Markdown/MDX 콘텐츠 컬렉션 (`src/content/blog/`)
- **에세이집** — frontmatter `essay` 필드로 분류 (`src/consts.ts`의 `ESSAY_PARTS`)
- **댓글** — Firebase
- **전문 검색** — Pagefind (빌드 후 `postbuild`에서 색인 생성)
- **SEO 자동화** — OG/Twitter/canonical/JSON-LD/sitemap/RSS 자동 적용 + `description` 자동 생성
- **다국어(번역) 글** — 파일명 규칙으로 번역본 추가 (아래 참고)

## 📁 프로젝트 구조

```text
src/
├── components/    # React/Astro 컴포넌트 (댓글 등)
├── content/blog/  # 글 (Markdown/MDX) — 콘텐츠 컬렉션
├── layouts/       # 페이지 레이아웃 (BaseLayout, BlogPost)
├── lib/           # 유틸 (번역본 감지/필터 등)
├── pages/         # 라우트 (글/목록/태그/카테고리/에세이/RSS)
└── consts.ts      # 사이트 상수 (SITE, LANGUAGES, ESSAY_PARTS)
scripts/           # SEO 자동화 스크립트
.githooks/         # git pre-commit 훅
public/            # 정적 에셋
```

`src/pages/`의 파일명이 곧 라우트가 된다. 글 본문은 `src/content/blog/`의 `.md`/`.mdx` 파일이며 `getCollection()`으로 불러온다.

## 🧞 Commands

프로젝트 루트에서 실행한다.

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | 의존성 설치                                  |
| `npm run dev`     | 로컬 dev 서버 (`localhost:4321`)             |
| `npm run build`   | 프로덕션 빌드 → `./dist/` (검색 색인까지 생성) |
| `npm run preview` | 빌드 결과 로컬 미리보기                      |

## 🔍 SEO 자동화

새 글을 쓸 때 SEO는 대부분 자동이다. OG/Twitter/canonical/JSON-LD/title/sitemap/RSS는 공용 레이아웃·빌드에서 모든 글에 자동 적용된다. 글마다 직접 챙길 건 사실상 `description` 하나뿐인데, 이것도 자동화돼 있다.

| Command          | Action                                                            |
| :--------------- | :--------------------------------------------------------------- |
| `npm run seo`        | 빈 `description`을 가진 글을 찾아 claude로 요약을 생성해 채움 (멱등) |
| `npm run seo:check`  | 발행 글 중 `description` 누락/부실이 있는지 검사 (빌드 전 자동 실행) |
| `npm run seo:install`| git pre-commit 훅 활성화 (`core.hooksPath .githooks`)             |

동작 방식:

1. **커밋 시 자동 생성** — `.githooks/pre-commit`이 새/변경된 글 중 `description`이 빈 것을 찾아 `claude` CLI로 요약을 생성하고 다시 스테이징한다. 클론 직후 한 번 `npm run seo:install`로 훅을 켜야 한다. (claude CLI 필요)
2. **빌드 가드** — `prebuild`(`seo:check`)가 발행 글에 빈 `description`이 있으면 빌드를 실패시켜 배포를 막는다. CI(`bun run build`)에서도 동일하게 동작한다.

요약 모델은 기본 `haiku`이며 `SEO_MODEL=sonnet npm run seo`처럼 바꿀 수 있다.

## 🌐 다국어(번역) 글

한 글을 여러 언어로 제공할 수 있다. 원문은 평소처럼 두고, 번역본만 파일명 규칙으로 추가하면 끝이다.

### 파일명 규칙

원문 `{slug}.md` 옆에 `{slug}.{언어코드}.md` 파일을 만들면 **자동으로 그 글의 번역본**으로 인식된다.

```text
src/content/blog/
├── 2026.06.15.md       # 원문 (기본 언어: 한국어)
├── 2026.06.15.mn.md    # 몽골어 번역본
└── 2026.06.15.en.md    # 영어 번역본 (만들면 자동 인식)
```

- 지원 언어 코드와 표기명은 `src/consts.ts`의 `LANGUAGES`에 정의 (`ko` / `mn` / `en` / `ja` / `zh` …). 새 언어는 여기 한 줄 추가하면 된다.
- 기본 언어는 `src/consts.ts`의 `DEFAULT_LANG`(`ko`).

### 동작 방식

- 번역본은 **단독 페이지로 생성되지 않고**, 목록 · 태그 · 카테고리 · RSS · 검색 색인에서 **자동 제외**된다. (파일명만으로 처리)
- 원문 페이지에 `한국어 · Монгол · …` **언어 스위처**가 자동으로 붙는다.
- `?lang=xx` 쿼리 파라미터로 진입하면 해당 언어로 바로 열린다. 예: `/post/2026.06.15?lang=mn`.
- 하단 **이전/다음 글**도 해당 언어 번역본이 있으면 그 언어 제목·링크(`?lang=xx`)로 전환되고, 없으면 원문으로 폴백한다.

### 작업 중인 번역 숨기기

번역본 frontmatter에 `draft: true`를 주면 **언어 스위처에서 숨겨진다.** 번역을 완성하기 전까지 비공개로 둘 때 사용한다. (`draft: false` 또는 생략 시 공개)

### 번역 품질 원칙

- **직역 금지.** 해당 언어 화자가 자연스럽게 읽도록 의역하되, 원문의 정서 · 호흡 · 의미를 최대한 살린다.
- 고유명사·인명 표기는 기존 번역본과 일관되게 유지한다.

### 관련 파일

| 파일 | 역할 |
| :--- | :--- |
| `src/lib/translations.ts` | 번역본 감지/필터 유틸 (`basePostsOnly`, `translationsOf` 등) |
| `src/consts.ts` | `LANGUAGES`, `DEFAULT_LANG` 정의 |
| `src/pages/post/[...slug].astro` | 원문 페이지에 번역본 수집·렌더 |
| `src/layouts/BlogPost.astro` | 언어 스위처 UI + `?lang` 전환 스크립트 + 이전/다음 글 언어 연동 |
| 목록/RSS 페이지들 | `basePostsOnly()`로 번역본 제외 |

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
