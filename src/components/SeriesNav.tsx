import type { SeriesData } from '../utils/series';
import { toRoman, toInitCap } from '../utils/formatting';

interface SeriesNavProps {
  seriesData: SeriesData;
}

export default function SeriesNav({ seriesData }: SeriesNavProps) {
  return (
    <div className="series-nav">
      <em>This is part of a series on {seriesData.name.toLowerCase()}</em>.
      <ol>
        {seriesData.posts.map((post) => (
          <li key={post.part}>
            {post.isCurrent ? (
              <em>(This post)</em>
            ) : (
              <em>
                <a href={post.url}>
                  {toInitCap(seriesData.name)} {toRoman(post.part)}: {post.subtitle || post.title}
                </a>
              </em>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}