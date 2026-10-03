import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// html:false escapes raw HTML in the source; DOMPurify is a second line of defence on the output.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false })

const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, opts, env, self) => self.renderToken(tokens, idx, opts))
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, opts, env, self)
}

// "Recomendación:", "**Recomendación:**", "**Recomendación**:" ... at the start of a paragraph.
const TIP_RE = /^(\*\*|__)?\s*(recomendaci[oó]n|sugerencia|consejo|recommendation|suggestion|tip|advice)\s*(:\s*(\*\*|__)|(\*\*|__)\s*:|:)/i

// Marks standalone paragraphs starting with a tip label so they render as a gold card.
md.core.ruler.push('kf_tip', (state) => {
  const tokens = state.tokens
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'heading_open' && /^h[23]$/.test(tokens[i].tag)) {
      // "### 1. Title" -> numbered insight badge (number moved to data-n)
      const inline = tokens[i + 1]
      const m = /^(\d{1,2})[.)]\s+(.+)/.exec(inline.content)
      if (m) {
        tokens[i].attrSet('data-n', m[1])
        inline.content = m[2]
        if (inline.children?.[0]?.type === 'text') inline.children[0].content = inline.children[0].content.replace(/^\d{1,2}[.)]\s+/, '')
      }
      continue
    }
    if (tokens[i].type !== 'paragraph_open') continue
    if (TIP_RE.test(tokens[i + 1].content.trimStart())) tokens[i].attrJoin('class', 'kf-ai-tip')
  }
})

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export const renderAiMarkdown = (source) => {
  if (!source) return ''
  return DOMPurify.sanitize(md.render(String(source)), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-n'],
  })
}
