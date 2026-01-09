import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/pages/posts" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    preview: z.boolean().optional(),
    // Series support
    series: z.object({
      name: z.string(),
      part: z.number(),
    }).optional(),
  }),
});

export const collections = {
  posts,
};