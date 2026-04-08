import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { LocalizedLink } from "@/components/LocalizedLink";
import { Calendar, Clock, ArrowLeft, Github, Linkedin } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Kopern Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      url: `${SITE_URL}/${locale}/blog/${slug}`,
      images: post.image ? [{ url: `${SITE_URL}${post.image}` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/blog/${slug}`,
    },
  };
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        image={post.image || "/opengraph-image"}
        author={post.author}
        authorGithub={post.authorGithub}
        datePublished={post.date}
        url={`${SITE_URL}/${locale}/blog/${slug}`}
        wordCount={post.content.split(/\s+/).length}
        locale={locale}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Kopern", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/${locale}/blog` },
          { name: post.title, url: `${SITE_URL}/${locale}/blog/${slug}` },
        ]}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <LocalizedLink
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to blog
        </LocalizedLink>

        {post.image && (
          <div className="aspect-[2/1] overflow-hidden rounded-lg mb-8 bg-muted">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-4">
            {post.title}
          </h1>

          <p className="article-description text-lg text-muted-foreground mb-6">
            {post.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {post.author.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-foreground">{post.author}</div>
                {post.authorRole && (
                  <div className="text-xs">{post.authorRole}</div>
                )}
              </div>
            </div>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.date).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTime} min read
            </span>
            {post.authorGithub && (
              <a
                href={`https://github.com/${post.authorGithub}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
          </div>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <MarkdownRenderer content={post.content} />
        </div>

        <footer className="mt-12 pt-6 border-t">
          <LocalizedLink
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All articles
          </LocalizedLink>
        </footer>
      </article>
    </>
  );
}
