import { Card } from "@/components/ui/card";

const problems = [
  {
    title: "Time Consuming",
    description: "Spending hours on repetitive tasks that could be automated",
    icon: "⏰",
  },
  {
    title: "Scaling Issues",
    description: "Struggling to grow your business with limited resources",
    icon: "📈",
  },
  {
    title: "Complex Setup",
    description: "Dealing with complicated configurations and integrations",
    icon: "🔧",
  },
];

export default function Problem() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            The Problem We Solve
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We understand the challenges you face every day. Our solution addresses these pain points directly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {problems.map((problem, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
              <p className="text-muted-foreground">{problem.description}</p>
            </Card>
          ))}
        </div>

        <div className="bg-muted rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">
            There&apos;s a Better Way
          </h3>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Our platform eliminates these obstacles, allowing you to focus on what truly matters - 
            growing your business and delivering value to your customers.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-lg">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Save Time
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Scale Effortlessly
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Simple Setup
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}