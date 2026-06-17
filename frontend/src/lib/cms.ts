import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import { sanitizeMarkdownHtml } from "@/lib/sanitize";

const CONTENT_DIR = path.resolve(process.cwd(), "content");
const COLLECTIONS = new Set(["analysis", "community", "daily", "tutorials"]);

export interface ContentMetadata {
  slug: string;
  path: string;
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  date?: string;
  created_at?: string;
  cover?: string;
  is_deleted?: boolean | string;
  [key: string]: unknown;
}

export interface ContentDocument extends ContentMetadata {
  html: string;
}

function assertCollection(collection: string) {
  if (!COLLECTIONS.has(collection)) {
    throw new Error(`Unsupported content collection: ${collection}`);
  }
}

function assertSlug(slug: string) {
  if (!slug || slug.includes("/") || slug.includes("\\") || slug === "." || slug === "..") {
    throw new Error("Invalid content slug");
  }
}

export const getCollection = unstable_cache(
  async (collection: string) => {
    assertCollection(collection);
    const dirPath = path.join(CONTENT_DIR, collection);
    
    try {
      try {
        await fs.access(dirPath);
      } catch {
        console.warn(`[CMS] Directory not found: ${dirPath}`);
        return [];
      }

      const filenames = await fs.readdir(dirPath);
      const mdFiles = filenames.filter(f => f.endsWith('.md'));
      
      const items: ContentMetadata[] = await Promise.all(mdFiles.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const parsed = matter(content);
        const metadata: ContentMetadata = {
          ...parsed.data,
          slug: file.replace('.md', ''),
          path: `/${collection}/${file.replace('.md', '')}`,
          title: String(parsed.data.title || file.replace('.md', '')),
        };

        return metadata;
      }));

      return items.sort((a, b) => {
        const dateA = a.date || a.created_at || "0";
        const dateB = b.date || b.created_at || "0";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    } catch (e) {
      console.error(`[CMS] Error reading collection ${collection}:`, e);
      return [];
    }
  },
  ["cms-collection-cache"],
  { revalidate: 60, tags: ["cms"] }
);

export async function getDocBySlug(collection: string, slug: string) {
  assertCollection(collection);
  const decodedSlug = decodeURIComponent(slug);
  assertSlug(decodedSlug);

  return unstable_cache(
    async () => {
      const filePath = path.join(CONTENT_DIR, collection, `${decodedSlug}.md`);
      
      try {
        await fs.access(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const parsed = matter(fileContent);
        const rendered = await marked.parse(parsed.content);
        const htmlContent = sanitizeMarkdownHtml(rendered);

        return {
          ...parsed.data,
          slug: decodedSlug,
          path: `/${collection}/${decodedSlug}`,
          title: String(parsed.data.title || decodedSlug),
          html: htmlContent
        } as ContentDocument;
      } catch {
        return null;
      }
    },
    [`doc-${collection}-${slug}`],
    { revalidate: 60, tags: ["cms", `doc-${collection}-${slug}`] }
  )();
}
