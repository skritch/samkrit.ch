import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

// Strip MathJax expressions from text for ID generation
function stripMathJax(text) {
  return text
    .replace(/\$\$[^$]*\$\$/g, '') // Remove display math $$...$$
    .replace(/\$[^$]*\$/g, '')     // Remove inline math $...$
    .trim();
}

// Generate slug from text (same logic as remark-toc uses)
function slugify(text) {
  return stripMathJax(text)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-|\-$/g, '');
}

export default function remarkConsistentHeadingIds() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      const text = toString(node);
      const id = slugify(text);
      
      // Set the id in the heading's data
      if (!node.data) node.data = {};
      if (!node.data.hProperties) node.data.hProperties = {};
      node.data.hProperties.id = id;
    });
  };
}