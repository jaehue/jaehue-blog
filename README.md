# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

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

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
