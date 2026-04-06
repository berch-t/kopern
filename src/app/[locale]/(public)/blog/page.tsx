import { getAllPosts } from "@/lib/blog";
import { LocalizedLink } from "@/components/LocalizedLink";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Blog — Kopern" : "Blog — Kopern",
    description: isEn
      ? "Behind the scenes of building Kopern: engineering decisions, AI agent insights, and product updates."
      : "Les coulisses de la construction de Kopern : decisions techniques, insights sur les agents IA et mises a jour produit.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/blog`,
      languages: { en: `${SITE_URL}/en/blog`, fr: `${SITE_URL}/fr/blog` },
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = getAllPosts(locale);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Blog</h1>
        <p className="text-lg text-muted-foreground">
          {locale === "en"
            ? "Behind the scenes of building Kopern — engineering decisions, challenges, and lessons learned."
            : "Les coulisses de la construction de Kopern — decisions techniques, defis et lecons apprises."}
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">
          {locale === "en" ? "No posts yet." : "Aucun article pour le moment."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <LocalizedLink
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block border rounded-lg overflow-hidden hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              {post.image && (
                <div className="aspect-[2/1] overflow-hidden bg-muted">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
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
                </div>
                <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {post.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-sm text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </LocalizedLink>
          ))}
        </div>
      )}
    </div>
  );
}
