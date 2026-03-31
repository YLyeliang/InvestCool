import fs from 'node:fs'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  // Use absolute path to bypass any production CWD confusion
  const contentDir = '/root/projects/InvestCool/frontend/content/daily'
  
  if (!fs.existsSync(contentDir)) {
    console.error('[CMS Daily API] Content directory NOT FOUND at:', contentDir)
    return []
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'))
  
  const items = files.map(file => {
    const filePath = path.join(contentDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Simple Frontmatter Parser
    const fmMatch = content.match(/^---([\s\S]*?)---/)
    const metadata: any = {
      path: `/daily/${file.replace('.md', '')}`,
      file: file
    }
    
    if (fmMatch) {
      const fmText = fmMatch[1]
      const lines = fmText.split('\n')
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':')
        if (key && valueParts.length > 0) {
          const k = key.trim()
          let v = valueParts.join(':').trim()
          if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
            v = v.slice(1, -1)
          }
          metadata[k] = v
        }
      })
    }
    
    return metadata
  })

  // Sort by date desc, with safety fallback
  return items.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})
