import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  authorRole?: string;
  authorGithub?: string;
  authorLinkedin?: string;
  tags: string[];
  image?: string;
  readingTime: number;
  content: string;
  locale: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  authorRole?: string;
  tags: string[];
  image?: string;
  readingTime: number;
  locale: string;
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function getAllPosts(locale: string = "en"): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));

  function getPostsForLocale(targetLocale: string): BlogPostMeta[] {
    return files
      .map((filename) => {
        const filePath = path.join(BLOG_DIR, filename);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(fileContent);

        const postLocale = data.locale || "en";
        if (postLocale !== targetLocale) return null;

        return {
          slug: filename.replace(/\.md$/, ""),
          title: data.title || "Untitled",
          description: data.description || "",
          date: data.date || "",
          author: data.author || "Kopern Team",
          authorRole: data.authorRole,
          tags: data.tags || [],
          image: data.image,
          readingTime: estimateReadingTime(content),
          locale: postLocale,
        };
      })
      .filter(Boolean) as BlogPostMeta[];
  }

  // Try requested locale first, fallback to "en" if no posts found
  let posts = getPostsForLocale(locale);
  if (posts.length === 0 && locale !== "en") {
    posts = getPostsForLocale("en");
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  return {
    slug,
    title: data.title || "Untitled",
    description: data.description || "",
    date: data.date || "",
    author: data.author || "Kopern Team",
    authorRole: data.authorRole,
    authorGithub: data.authorGithub,
    authorLinkedin: data.authorLinkedin,
    tags: data.tags || [],
    image: data.image,
    readingTime: estimateReadingTime(content),
    content,
    locale: data.locale || "en",
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}
