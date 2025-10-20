import { StaticImageData } from "next/image";

// Article type definition for blog system
export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  categories: any[];
  author: {
    name: string;
    avatar: string | StaticImageData;
    slug: string;
  };
  publishedAt: string;
  image?: any;
  slug: string;
}

// Categories for blog articles
export const CATEGORIES = [
  'Japanese Learning',
  'Kanji',
  'Language Tips',
  'Study Methods',
] as const;

// Authors
export const AUTHORS = {
  ari: {
    name: 'Ari',
    avatar: '/app/blog/_assets/images/authors/ari.png',
  },
} as const;