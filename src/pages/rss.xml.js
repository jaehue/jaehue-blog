import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';
import { basePostsOnly } from '../lib/translations';

export async function GET(context) {
  const posts = basePostsOnly(await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || undefined,
      pubDate: new Date(post.data.date),
      link: `/post/${post.id}/`,
      categories: [...(post.data.categories ?? []), ...(post.data.tags ?? [])].filter(Boolean),
    })),
    customData: `<language>ko-kr</language>`,
  });
}
