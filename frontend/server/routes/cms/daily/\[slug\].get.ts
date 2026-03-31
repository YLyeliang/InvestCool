import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const contentDir = '/root/projects/InvestCool/frontend/content/daily'
  const filePath = path.join(contentDir, `${slug}.md`)
  
  if (!fs.existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Daily report not found'
    })
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  
  // Frontmatter Parser
  const fmMatch = fileContent.match(/^---([\s\S]*?)---/)
  const metadata: any = {}
  let markdownBody = fileContent

  if (fmMatch) {
    markdownBody = fileContent.replace(fmMatch[0], '').trim()
    const fmText = fmMatch[1]
    fmText.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        let v = valueParts.join(':').trim()
        if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
          v = v.slice(1, -1)
        }
        metadata[key.trim()] = v
      }
    })
  }

  // Generate HTML on the fly
  const htmlContent = await marked.parse(markdownBody)

  return {
    ...metadata,
    html: htmlContent
  }
})
