import { getCollection, type CollectionEntry } from 'astro:content';

export interface SeriesPost {
  part: number;
  title: string;
  subtitle?: string;
  url: string;
  isCurrent: boolean;
}

export interface SeriesData {
  name: string;
  posts: SeriesPost[];
}

export async function getSeriesData(seriesName: string, currentSlug: string): Promise<SeriesData | null> {
  const allPosts = await getCollection('posts');

  // Find all posts in the same series, filtering by preview/draft status
  const seriesPosts = allPosts
    .filter(post => post.data.series?.name === seriesName)
    .filter(post => {
      // In production, hide preview posts from series navigation
      // In development, show all posts
      return import.meta.env.PROD ? !post.data.preview : true;
    })
    .sort((a, b) => a.data.series!.part - b.data.series!.part)
    .map(post => ({
      part: post.data.series!.part,
      title: post.data.title,
      subtitle: post.data.subtitle,
      url: `/posts/${post.id}`,
      isCurrent: post.id === currentSlug,
    }));

  return {
    name: seriesName,
    posts: seriesPosts,
  };
}

export async function getAllSeries(): Promise<Record<string, SeriesPost[]>> {
  const allPosts = await getCollection('posts');

  const seriesMap: Record<string, SeriesPost[]> = {};

  for (const post of allPosts) {
    if (post.data.series) {
      // Apply the same preview/draft filtering as getSeriesData
      if (import.meta.env.PROD && post.data.preview) {
        continue;
      }

      const seriesName = post.data.series.name;

      if (!seriesMap[seriesName]) {
        seriesMap[seriesName] = [];
      }

      seriesMap[seriesName].push({
        part: post.data.series.part,
        title: post.data.title,
        subtitle: post.data.subtitle,
        url: `/posts/${post.id}`,
        isCurrent: false,
      });
    }
  }

  // Sort each series by part number
  for (const seriesName in seriesMap) {
    seriesMap[seriesName].sort((a, b) => a.part - b.part);
  }

  return seriesMap;
}