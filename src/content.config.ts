import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().optional().default(''),
			date: z.union([z.string(), z.date()]).transform(v => v instanceof Date ? v.toISOString() : v),
			thumbnail: z.string().optional().default(''),
			categories: z.union([z.array(z.string()), z.null()]).optional().transform(v => v ?? []),
			tags: z.union([z.array(z.string()), z.null()]).optional().transform(v => v ?? []),
			draft: z.boolean().optional().default(false),
			// 에세이집 메타 (선택)
			essay: z
				.object({
					part: z.number(),
					partName: z.string(),
					order: z.number(),
					status: z.enum(['star', 'diamond', 'circle']).optional(),
				})
				.optional(),
		}),
});

export const collections = { blog };
