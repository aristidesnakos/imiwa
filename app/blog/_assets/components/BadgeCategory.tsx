import Link from "next/link";
import { categoryType } from "../content";

// This is the category badge that appears in the article page and in <CardArticle /> component
const Category = ({
  category,
  extraStyle,
}: {
  category: categoryType;
  extraStyle?: string;
}) => {
  return (
    <Link
      href={`/blog/category/${category.slug}`}
      className={`my-2 badge bg-foreground border border-foreground text-background p-2 rounded-xl badge-sm md:badge-md hover:badge-primary ${
        extraStyle ? extraStyle : ""
      }`}
      title={`Posts in ${category.title}`}
      rel="tag"
    >
      {category.titleShort}
    </Link>
  );
};

export default Category;
