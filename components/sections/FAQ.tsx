"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <section className="container mx-auto px-4 py-16 bg-muted/20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">
          Frequently Asked Questions
        </h2>
        
        <Accordion type="single" collapsible className="space-y-4 animate-fade-in">
          <AccordionItem value="item-1" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              What is The Journal Method™ and how does it work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              The Journal Method™ is based on Comprehensible Input Theory—you acquire language naturally 
              through daily journaling practice. By writing about your life in your target language, you 
              build authentic expression while getting gentle AI guidance that adapts to your level. It&apos;s 
              about consistent practice, not memorization.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              Which languages does Llanai support?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              Currently, Llanai supports journaling in English, Greek, and Japanese, with more languages 
              coming soon. Our AI adapts to your chosen language and provides contextual feedback that 
              helps you develop natural expression in any of these languages.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              Why is journaling better than traditional language apps?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              Unlike apps that focus on memorization and grammar rules, journaling lets you write naturally 
              about your own life. You are using active recall, which forces you to associate vocabulary and grammar, rather than play simple
              games or fill in the blanks -- it is a simulation of a communication exercise!
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              How much time do I need to commit daily?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              Just 15 minutes daily is enough to see real progress. Consistency beats intensity—short 
              daily sessions are more effective than weekend cramming. The key is building a sustainable 
              habit that fits into your life, not adding another overwhelming task to your day.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              What kind of AI guidance does Llanai provide?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              Llanai offers minimal, thoughtful AI guidance—just enough to keep you writing, not so much 
              that it replaces your voice. You&apos;ll get gentle corrections, vocabulary suggestions, and 
              encouragement that adapts to your level, helping you improve without overwhelming you with rules.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              Can I track my progress over time?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              Yes! Llanai helps you set clear goals and track your journey. You can review past entries, 
              see how your writing has evolved, and celebrate daily wins. The platform is designed to show 
              you tangible progress, keeping you motivated as you build fluency layer by layer.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7" className="paper-shadow bg-card rounded-lg px-6">
            <AccordionTrigger className="text-left text-lg">
              What are the trial limitations?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">
              You can try Llanai with 3 free messages without any sign-up required. This gives you a 
              taste of our journaling method and AI guidance system. After that, you&apos;ll need to create 
              an account to continue your language learning journey.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
