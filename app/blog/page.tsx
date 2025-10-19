import { getArticles } from './_assets/serverUtils';
import { Article } from '@/app/constants';
import CardArticle from './_assets/components/CardArticle';
import { getSEOTags } from "@/lib/seo";
import config from "@/config";
import { categories } from './_assets/content';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export async function generateMetadata() {
  return getSEOTags({
    title: `Blog | ${config.appName}`,
    description: "Explore our latest articles and insights",
    canonicalUrlRelative: "/blog",
    keywords: ["blog", "language learning resources", "japanese grammar tips", "japanese learning resources"],
  });
}

const BlogPage = async () => {
  const articles: Article[] = getArticles().sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <>
      <section className="mt-12 mb-8 md:mb-12 max-w-3xl mx-auto text-center">
        <h1 className="font-extrabold text-3xl lg:text-5xl tracking-tight text-secondary mb-6 md:mb-8">
          Our Blog
        </h1>
        <p className="md:text-lg text-foreground/80 max-w-xl mx-auto mb-8">
          Discover our latest articles, tutorials, and insights
        </p>
        
        {/* Category badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {categories.map((category) => (
            <Link href={`/blog/category/${category.slug}`} key={category.slug}>
              <Badge 
                variant="secondary" 
                className="px-3 py-1 text-sm cursor-pointer hover:bg-secondary/90 transition-colors"
              >
                {category.titleShort || category.title}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <div className="grid lg:grid-cols-2 gap-8">
          {articles.map(article => (
            <CardArticle
              key={article.slug}
              article={article}
              tag="h2"
              showCategory={true}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default BlogPage;
