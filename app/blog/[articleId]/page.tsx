import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import React from 'react';
import { authors, authorType, styles } from '../_assets/content';
import { getSEOTags } from '@/lib/seo';
// Import directly from the relative path instead of using the alias
import { JsonLd, getBlogPostSchema } from '@/lib/jsonld';
import { Badge } from '@/components/ui/badge';

// No custom PageProps interface needed

// Define the interface for the article metadata
interface ArticleData {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string; // Added updatedAt field (optional with ? since some articles might not have it yet)
  author: string;
  categories: string[];
  image: {
    src: string;
    alt: string;
  };
}

// Generate static parameters for dynamic routes
export async function generateStaticParams() {
  const articlesDirectory = path.join(process.cwd(), 'app/blog/_assets/articles');
  const filenames = fs.readdirSync(articlesDirectory);

  return filenames.map((filename) => {
    const articleId = filename.replace(/\.md$/, '');
    return { articleId };
  });
}

const CustomImage = ({ src, alt, ...props }: React.ComponentPropsWithoutRef<'img'>) => {
  const isExternal = src?.startsWith('http') || false;
  
  // Check if this is a YouTube thumbnail
  if (src?.includes('youtube.com/vi/') || src?.includes('youtu.be/')) {
    // Extract video ID
    const videoId = src.includes('youtube.com/vi/') 
      ? src.split('/vi/')[1].split('/')[0]
      : src.split('youtu.be/')[1];
      
    return (
      <div className="relative w-full pt-[56.25%] my-6 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          className="absolute top-0 left-0 w-full h-full" 
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  
  // Filter out width and height from props as we'll set them explicitly
  const { ...restProps } = props;
  
  return (
    <Image
      src={src || ''}
      alt={alt || ''}
      width={600}
      height={330}
      className="rounded-lg object-cover my-4"
      unoptimized={isExternal}
      {...(restProps as any)}
    />
  );
}

// The page component with minimal type annotations
export default async function ArticlePage(props: any) {
  const { articleId } = await props.params;
  const articlesDirectory = path.join(process.cwd(), 'app/blog/_assets/articles');
  const fullPath = path.join(articlesDirectory, `${articleId}.md`);
  
  // Check if the file exists
  if (!fs.existsSync(fullPath)) {
    redirect('/404');
  }
  
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Parse the Markdown file's metadata and content
  const matterResult = matter(fileContents);
  const data = matterResult.data as ArticleData;
  const content = matterResult.content;

  // Find the article's author
  const author = authors.find((a: authorType) => a.slug === data.author);

  return (
    <div className="article-container max-w-4xl mx-auto">
      <JsonLd data={getBlogPostSchema({
        title: data.title,
        description: data.description,
        publishedAt: data.publishedAt,
        updatedAt: data.updatedAt,
        author: author?.name || data.author,
        slug: articleId,
        image: data.image
      })} />
      <h1 className={styles.h1}>{data.title}</h1>
      <Badge variant="outline" className="mt-4 mb-4 text-md py-1 px-3 border-primary/30 bg-primary/5">
        By {author?.name} • {data.updatedAt ? `Updated at ${data.updatedAt}` : `Published at ${data.publishedAt}`}
      </Badge>
      {/* Render the Markdown content with custom styles */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ ...props }) => <h2 className={styles.h2} {...props} />,
          h3: ({ ...props }) => <h3 className={styles.h3} {...props} />,
          h4: ({ ...props }) => <h4 className={styles.h4} {...props} />,
          p: ({ ...props }) => <p className={styles.p} {...props} />,
          ul: ({ ...props }) => <ul className={styles.ul} {...props} />,
          ol: ({ ...props }) => <ol className={styles.ol} {...props} />,
          li: ({ children, ...props }) => <li className={styles.li} {...props}>{children}</li>,
          table: ({ ...props }) => <table className="w-full my-6 border-collapse border border-border" {...props} />,
          thead: ({ ...props }) => <thead className="bg-muted" {...props} />,
          tbody: ({ ...props }) => <tbody className="divide-y divide-border" {...props} />,
          tr: ({ ...props }) => <tr className="hover:bg-muted/50" {...props} />,
          th: ({ ...props }) => <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />,
          td: ({ ...props }) => <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground" {...props} />,
          a: ({ href, children, ...props }) => {
            // Check if this is a YouTube link
            if (href?.includes('youtube.com/watch') || href?.includes('youtu.be/')) {
              // Extract video ID
              const videoId = href.includes('youtube.com/watch') 
                ? new URL(href).searchParams.get('v')
                : href.split('youtu.be/')[1];
                
              if (videoId) {
                return (
                  <div className="relative w-full pt-[56.25%] my-6 rounded-lg overflow-hidden shadow-lg">
                    <iframe 
                      className="absolute top-0 left-0 w-full h-full" 
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
            }
            
            // Regular link
            return <a className={styles.a} href={href} {...props}>{children}</a>;
          },
          code: ({ className, ...props }) => {
            // Check if the code is inline by examining the className
            // Code blocks typically have a language-* className from the markdown processor
            const isInline = !className || !className.includes('language-');
            return isInline ? (
              <code className={styles.codeInline} {...props} />
            ) : (
              <code className={styles.code} {...props} />
            );
          },
          pre: ({ children, ...props }) => {
            // Extract language from the className of the first child if it exists
            const child = React.Children.toArray(children)[0] as React.ReactElement;
            const match = /language-([\w-]+)/.exec(child?.props.className || '');
            const language = match ? match[1] : '';
            
            return (
              <div className="relative">
                {language && (
                  <div className="absolute top-0 right-0 px-4 py-1 text-xs font-mono text-secondary-foreground bg-secondary rounded-bl-md rounded-tr-md">
                    {language}
                  </div>
                )}
                <pre className={styles.pre} {...props}>
                  {children}
                </pre>
              </div>
            );
          },
          img: CustomImage,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export async function generateMetadata(props: any) {
  try {
    const { articleId } = await props.params;
    
    // If no articleId is provided, return default metadata
    if (!articleId) {
      return getSEOTags({
        title: "Article Not Found",
        description: "The requested article could not be found.",
        canonicalUrlRelative: "/blog",
      });
    }
    
    const articlesDirectory = path.join(process.cwd(), 'app/blog/_assets/articles');
    const fullPath = path.join(articlesDirectory, `${articleId}.md`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return getSEOTags({
        title: "Article Not Found",
        description: "The requested article could not be found.",
        canonicalUrlRelative: "/blog",
      });
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);
    const data = matterResult.data as ArticleData;
    
    return getSEOTags({
      title: data.title,
      description: data.description,
      canonicalUrlRelative: `/blog/${articleId}`,
      extraTags: {
        openGraph: {
          title: data.title,
          description: data.description,
          url: `/blog/${articleId}`,
          images: [
            {
              url: data.image.src,
              alt: data.image.alt,
              width: 600,
              height: 330,
            },
          ],
          locale: 'en_US',
          type: 'article',
        },
      },
    });
  } catch (error) {
    // Return default metadata in case of any error
    return getSEOTags({
      title: "Blog",
      description: "Llanai Blog",
      canonicalUrlRelative: "/blog",
    });
  }
}
