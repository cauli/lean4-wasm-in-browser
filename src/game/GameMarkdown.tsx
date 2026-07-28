import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

interface Props {
  children: string
  assetBase?: string
}

const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', 'math', 'math-display'],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['className', 'math', 'math-inline'],
    ],
  },
}

function imageSource(src?: string, assetBase?: string) {
  if (!src) return src
  if (!src.startsWith('images/')) return src
  return assetBase ? `${assetBase}/${src.slice('images/'.length)}` : `/${src}`
}

export function GameMarkdown({ children, assetBase }: Props) {
  const components: Components = {
    // Keep lesson headings subordinate to the page's own h1.
    h1: 'h2',
    a({ node, ...props }) {
      void node
      return <a {...props} target="_blank" rel="noreferrer" />
    },
    img({ node, src, alt, ...props }) {
      void node
      return (
        <img
          {...props}
          src={imageSource(src, assetBase)}
          alt={alt || ''}
          loading="lazy"
          decoding="async"
        />
      )
    },
  }
  return (
    <div className="game-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, markdownSchema],
          [rehypeKatex, {
            strict: false,
            throwOnError: false,
            macros: {
              '\\R': '\\mathbb{R}',
            },
          }],
        ]}
        components={components}
      >
        {children.trim()}
      </Markdown>
    </div>
  )
}
