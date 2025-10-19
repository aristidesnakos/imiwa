
import React, { JSX } from 'react';
import { StaticImageData } from "next/image";
import ariImg from "@/app/blog/_assets/images/authors/ari.png";

// ==================================================================================================================================================
// BLOG CATEGORIES 🏷️
// ==================================================================================================================================================

// Export the categoryType
export type categoryType = {
  slug: string;
  title: string;
  titleShort?: string;
  description: string;
  descriptionShort?: string;
};

// These slugs are used to generate pages in the /blog/category/[categoryI].js. 
const categorySlugs: { [key: string]: string } = {
  tutorial: "tutorial",
  community: "community",
  learning_resources: "learning_resources",
  motivation: "motivation",
  maker_story: "maker_story",
  culture: "culture"
};

export const categories: categoryType[] = [
  {
    slug: categorySlugs.tutorial,
    title: "Tutorials",
    titleShort: "Tutorials",
    description:
      "Here are the latest tutorials for using CreateQuiz.Video.",
    descriptionShort: "Tutorials for using CreateQuiz.Video",
  },
  {
    slug: categorySlugs.community,
    title: "Community",
    titleShort: "Community",
    description: "Updates on the platform SoFaast.",
    descriptionShort: "Quick updates for SoFaast",
  },
  {
    slug: categorySlugs.learning_resources,
    title: "Learning Resources",
    titleShort: "Learning Resources",
    description: "Resources for learning English.",
    descriptionShort: "Resources for learning English",
  },
  {
    slug: categorySlugs.motivation,
    title: "Motivation",
    titleShort: "Motivation",
    description: "Motivational content for English learners.",
    descriptionShort: "Motivational content for English learners",
  },
  {
    slug: categorySlugs.maker_story,
    title: "Maker Story",
    titleShort: "Maker Story",
    description: "The journey of a maker.",
    descriptionShort: "The journey of a maker",
  },
  {
    slug: categorySlugs.culture,
    title: "Culture",
    titleShort: "Culture",
    description: "Cultural content for English learners.",
    descriptionShort: "Cultural content for English learners",
  }
];

// BLOG AUTHORS 📝

export type authorType = {
  slug: string;
  name: string;
  job: string;
  description: string;
  avatar: StaticImageData;
  socials?: {
    name: string;
    icon: JSX.Element;
    url: string;
  }[];
};

// Social icons used in the author's bio.
const socialIcons: {
  [key: string]: {
    name: string;
    svg: JSX.Element;
  };
} = {
  twitter: {
    name: "Twitter",
    svg: (
      <svg
        version="1.1"
        id="svg5"
        x="0px"
        y="0px"
        viewBox="0 0 1668.56 1221.19"
        className="w-9 h-9"
        // Using a dark theme? ->  className="w-9 h-9 fill-white"
      >
        <g id="layer1" transform="translate(52.390088,-25.058597)">
          <path
            id="path1009"
            d="M283.94,167.31l386.39,516.64L281.5,1104h87.51l340.42-367.76L984.48,1104h297.8L874.15,558.3l361.92-390.99   h-87.51l-313.51,338.7l-253.31-338.7H283.94z M412.63,231.77h136.81l604.13,807.76h-136.81L412.63,231.77z"
          />
        </g>
      </svg>
    ),
  },
  linkedin: {
    name: "LinkedIn",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
        // Using a dark theme? ->  className="w-6 h-6 fill-white"
        viewBox="0 0 24 24"
      >
        <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
      </svg>
    ),
  },
};

const authorSlugs: {
  [key: string]: string;
} = {
  ari: "ari",
};

// All the blog authors data display in the /blog/author/[authorId].js pages.
export const authors: authorType[] = [
  {
    slug: authorSlugs.ari,
    name: "Ari Nakos",
    job: "Maker of Llanai",
    description:
      "Language Learning is a lifelong pursuit.",
    avatar: ariImg,
    socials: [
      {
        name: socialIcons.twitter.name,
        icon: socialIcons.twitter.svg,
        url: "https://twitter.com/just_aristides",
      },
      {
        name: socialIcons.linkedin.name,
        icon: socialIcons.linkedin.svg,
        url: "https://www.linkedin.com/in/aristidesnakos/",
      },
    ],
  },
];

// ===============================================================================================================================
// BLOG ARTICLES 📚
// ===============================================================================================================================

export type articleType = {
  slug: string;
  title: string;
  description: string;
  categories: categoryType[];
  author: authorType;
  publishedAt: string;
  image: {
    src?: StaticImageData;
    urlRelative: string;
    alt: string;
  };
  content: JSX.Element;
};

// These styles are used in the content of the articles. When you update them, all articles will be updated.
export const styles: {
  [key: string]: string;
} = {
  a: 'text-primary font-bold hover:text-secondary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  h1: 'text-3xl lg:text-6xl font-bold tracking-tight mt-2 mb-2 text-foreground',
  h2: 'text-2xl lg:text-4xl font-bold tracking-tight mt-2 mb-4 text-foreground',
  h3: 'text-xl lg:text-2xl font-bold tracking-tight mt-2 mb-2 text-foreground',
  caption: 'text-sm text-muted-foreground mb-2',
  p: 'text-foreground leading-relaxed mb-2 md:text-lg',
  ul: 'list-inside list-disc text-secondary leading-relaxed',
  li: 'list-item md:text-lg text-secondary',
  code: 'text-lg font-mono bg-muted text-foreground p-6 rounded-box mt-4 mb-4 overflow-x-scroll select-all border border-border',
  codeInline: 'text-sm font-mono bg-muted px-1 py-0.5 my-2 rounded select-all md:text-lg text-foreground border border-border',
  pill: 'my-2 badge bg-primary border border-primary text-primary-foreground p-2 rounded-xl badge-sm md:badge-md hover:bg-primary/80'
};
