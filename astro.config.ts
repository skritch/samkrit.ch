import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math'
import rehypeMathjax from 'rehype-mathjax'
import remarkToc from 'remark-toc'
import remarkConsistentHeadingIds from './plugins/remark-consistent-heading-ids.js'
import mdx from '@astrojs/mdx';

import react from '@astrojs/react';

export default defineConfig({
  integrations: [mdx({
    remarkPlugins: [
      remarkMath,
      remarkConsistentHeadingIds,
      [remarkToc, { skip: 'references:' }]
    ],
    rehypePlugins: [rehypeMathjax],
  }), react()],
  redirects: {
    // Old Jekyll-style URLs to new Astro URLs
    '/2024/08/19/thermo.html': '/posts/2024-08-19-thermo',
    '/2024/09/02/dimensions.html': '/posts/2024-09-02-dimensions',
    '/2024/09/30/partition-function.html': '/posts/2024-09-30-partition-function',
    '/2024/10/03/entropy-and-generating-functions.html': '/posts/2024-10-03-entropy-and-generating-functions',
    '/2024/10/06/reaction-networks-1.html': '/posts/2024-10-06-reaction-networks-1',
    '/2024/10/11/getting-to-s.html': '/posts/2024-10-11-getting-to-s',
    '/2024/10/15/reaction-networks-2.html': '/posts/2024-10-15-reaction-networks-2',
    '/2024/11/01/linear-algebra-1.html': '/posts/2024-11-01-linear-algebra-1',
    '/2025/01/16/exterior-algebra-notation-1.html': '/posts/2025-01-16-exterior-algebra-notation-1',
    '/2025/01/17/exterior-algebra-notation-2.html': '/posts/2025-01-17-exterior-algebra-notation-2',
    '/2025/01/21/division-1-linear-algebra.html': '/posts/2025-01-21-division-1-linear-algebra',
    '/2025/03/09/programming-1.html': '/posts/2025-03-09-programming-1',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light'
    }
  }
})