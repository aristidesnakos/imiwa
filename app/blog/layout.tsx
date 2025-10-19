export default async function LayoutBlog({ children }: { children: any }) {
  return (
    <div>
      <main className="min-h-screen max-w-6xl mx-auto p-8">{children}</main>
      <div className="h-24" />
    </div>
  );
}
