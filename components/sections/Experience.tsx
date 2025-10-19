"use client";

import { motion } from "framer-motion";

const languages = [
  { name: "English", level: "Native", flag: "🇬🇧" },
  { name: "Greek", level: "Native", flag: "🇬🇷" },
  { name: "Spanish", level: "Conversational", flag: "🇪🇸" },
  { name: "Japanese", level: "Conversational", flag: "🇯🇵" },
  { name: "German", level: "Conversational", flag: "🇩🇪" }
];

const Experience = () => {
  return (
    <section className="pt-4 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl">
          
        <motion.div
          className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold my-16 text-foreground">
              You&apos;ve tried language apps.
            </h2>
            <h2 className="text-2xl md:text-3xl font-bold my-14 text-foreground">
              Memorized flashcards.
            </h2>
            <h2 className="text-2xl md:text-3xl font-bold my-12 text-foreground">
              Watched countless videos.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground my-10">
              But you still stare at the blank page, unable to express yourself.
            </p>
            <p className="text-base md:text-lg text-muted-foreground my-8">
              There&apos;s a reason passive methods fail
            </p>
            <p className="text-base md:text-lg text-muted-foreground my-6">
              and a <span className="text-primary font-semibold">simple proven practice</span>
            </p>
            <p className="text-base md:text-lg text-muted-foreground my-4">
              that actually works.
            </p>
        </motion.div>

        <motion.div
          className="bg-card border rounded-xl p-8 md:p-12 mb-16"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-center text-foreground">
              The <span className="text-primary">Journal Method™</span>
            </h3>
            <p className="text-base text-center text-muted-foreground mb-8">
              Based on Comprehensible Input Theory: You acquire language naturally when you understand 
              messages just slightly above your current level.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center">
                <div className="text-3xl mb-3">📝</div>
                <h4 className="font-semibold text-base mb-2 text-foreground">Set Clear Goals</h4>
                <p className="text-sm text-muted-foreground">
                  Define what fluency means for you—then break it into daily wins
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🔄</div>
                <h4 className="font-semibold text-base mb-2 text-foreground">Build Consistency</h4>
                <p className="text-sm text-muted-foreground">
                  15 minutes daily beats 2-hour weekend cramming sessions
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🧠</div>
                <h4 className="font-semibold text-base mb-2 text-foreground">Lock in Learning</h4>
                <p className="text-sm text-muted-foreground">
                  Review and build on yesterday&apos;s knowledge, layer by layer
                </p>
              </div>
            </div>
        </motion.div>

        <div className="grid md:grid-cols-1 gap-12 items-center justify-center mb-16">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="text-xl font-semibold mb-6 text-foreground">
                Why Journaling <span className="text-primary">Succeeds</span> Where Apps Fail
              </h3>
              <ul className="space-y-4 text-muted-foreground inline-block text-left">
                <li className="flex items-center gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <div>
                    <strong className="text-foreground">No overwhelming grammar rules</strong>
                    <p className="text-sm mt-1">Write naturally, absorb patterns through practice</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <div>
                    <strong className="text-foreground">No memorization without context</strong>
                    <p className="text-sm mt-1">Every word you learn has personal meaning</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <div>
                    <strong className="text-foreground">Your voice, not someone else&apos;s</strong>
                    <p className="text-sm mt-1">Develop your unique writing style from day one</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1">✓</span>
                  <div>
                    <strong className="text-foreground">Visible progress tracking</strong>
                    <p className="text-sm mt-1">Watch your writing evolve entry by entry</p>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold mb-6 text-foreground">
                Your Guide
              </h3>
              <p className="text-muted-foreground mb-6">
                I&apos;m Ari—polyglot, TESOL-certified teacher, and language learning researcher.
              </p>
              <div className="space-y-3 mb-6 inline-block">
                {languages.map((lang) => (
                  <div key={lang.name} className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {lang.level}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">
                But more importantly: I&apos;ve helped hundreds discover that journaling 
                is the practice that finally makes everything click.
              </p>
            </motion.div>
        </div>

        <motion.div
          className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 md:p-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-xl font-bold mb-4 text-foreground">
              Stop Memorizing. <span className="text-primary">Start Writing.</span>
            </h3>
            <p className="text-base text-muted-foreground mb-6">
              Transform your language learning through daily journaling—the method that builds 
              authentic written expression, not just vocabulary lists.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Minimal AI guidance.</strong> Just enough to keep you writing, 
              not so much that it replaces your voice.
            </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Experience;