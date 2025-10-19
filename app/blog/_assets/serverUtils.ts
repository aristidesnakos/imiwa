import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article } from '@/app/constants';
import { categories, authors } from './content';

const articlesDirectory = path.join(process.cwd(), 'app/blog/_assets/articles');

export function getArticles(): Article[] {
  const fileNames = fs.readdirSync(articlesDirectory);
  const articles = fileNames.map((fileName) => {
    const fullPath = path.join(articlesDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    const authorObj = authors.find(author => author.slug === data.author);
    if (!authorObj) throw new Error(`Author ${data.author} not found`);

    const categoryObjs = data.categories.map((categorySlug: string) => {
      const category = categories.find(cat => cat.slug === categorySlug);
      if (!category) throw new Error(`Category ${categorySlug} not found`);
      return category;
    });
    
    return {
      slug: data.slug,
      title: data.title,
      description: data.description,
      categories: categoryObjs,
      author: authorObj,
      publishedAt: data.publishedAt,
      image: {
        src: data.image.src,
        urlRelative: data.image.src,
        alt: data.image.alt,
      },
      content: content
    } as Article;
  });

  return articles;
} 