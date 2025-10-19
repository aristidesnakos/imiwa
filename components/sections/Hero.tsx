"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ButtonSignin from "@/components/buttons/ButtonSignin";
import Image from "next/image";

const languages = [
  { name: "English" },
  { name: "Ελληνικά" },
  { name: "日本語" }
];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % languages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-20 pb-4 overflow-hidden">
      <div className="mx-auto px-4">
        <motion.div 
          className="text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-foreground">
            Are you ready to write fluently?
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Track, analyze, and grow your language skills through guided journaling.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="px-6 py-3 rounded-lg bg-indigo-200 text-foreground text-xl">
            {languages[currentIndex].name}
          </h2>  
          <ButtonSignin
            text="Start Your Journal"
            extraStyle="bg-primary p-2 rounded-lg shadow-lg hover:shadow-xl btn-lg"
          />
        </motion.div>

        <motion.p 
          className="text-center text-sm text-muted-foreground mb-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          No commitments. Just insights. Upgrade to a premium plan anytime.
        </motion.p>

        {/* Desktop Layout - Hidden on mobile */}
        <div className="hidden lg:block relative max-w-7xl mx-auto min-h-[800px] pt-20 pb-10">
          <div className="relative flex items-center justify-center">
            
            {/* Left top side feature - Set Goals (Step 1) */}
            <motion.div 
              className="absolute -left-20 -top-10 z-10 hover:z-50"
              initial={{ opacity: 0, x: -50, rotate: -5 }}
              animate={{ opacity: 1, x: 0, rotate: -5 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div 
                className="opacity-75 transform hover:rotate-0 transition-transform duration-300 relative"
                whileHover={{ opacity: 0.9, scale: 1.05 }}
              >
                <Image 
                  src="/images/set-goals.PNG" 
                  alt="Set goals" 
                  width={420} 
                  height={280} 
                  className="rounded-xl shadow-2xl object-cover"
                />
                <div className="absolute -top-6 left-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-md font-semibold">① Set Goals</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Left bottom side feature - Write Freely (Step 2) */}
            <motion.div 
              className="absolute -left-20 -bottom-40 z-10"
              initial={{ opacity: 0, x: -50, rotate: 3 }}
              animate={{ opacity: 1, x: 0, rotate: 3 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div 
                className="opacity-75 transform hover:rotate-0 transition-transform duration-300 relative"
                whileHover={{ opacity: 0.9, scale: 1.05 }}
              >
                <Image 
                  src="/images/journal-entry-prior-to-correction.png" 
                  alt="Write freely" 
                  width={420} 
                  height={280} 
                  className="rounded-xl shadow-2xl object-cover"
                />
                <div className="absolute -bottom-6 left-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-md font-semibold">② Write Freely</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Center journal image */}
            <motion.div 
              className="relative z-20 mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-card rounded-2xl shadow-2xl p-6">
                <Image 
                  src="/images/home-screen-journal.png" 
                  alt="Journal Dashboard" 
                  width={540} 
                  height={360} 
                  className="rounded-lg"
                />
              </div>

              {/* Feature callout label for Daily Streak */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-200 to-purple-400 text-white rounded-full px-4 py-2 shadow-lg z-30">
                <p className="text-sm font-semibold">Daily Streak 🔥</p>
              </div>

            </motion.div>

            {/* Right top feature - AI Review (Step 3) - MOVED HIGHER */}
            <motion.div 
              className="absolute -right-20 -top-20 z-10 hover:z-50"
              initial={{ opacity: 0, x: 50, rotate: 5 }}
              animate={{ opacity: 1, x: 0, rotate: 5 }}
              transition={{ delay: 0.7 }}
            >
              <motion.div 
                className="opacity-75 transform hover:rotate-0 transition-transform duration-300 relative"
                whileHover={{ opacity: 0.9, scale: 1.05 }}
              >
                <Image 
                  src="/images/exemplary-correction-journal.png" 
                  alt="AI corrections" 
                  width={420} 
                  height={280} 
                  className="rounded-xl shadow-2xl object-cover"
                />
                <div className="absolute -top-6 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-md font-semibold">③ Smart Review</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right bottom feature - Final Summaries (Step 4) - MOVED LOWER */}
            <motion.div 
              className="absolute -right-20 -bottom-60 z-10"
              initial={{ opacity: 0, x: 50, rotate: -3 }}
              animate={{ opacity: 1, x: 0, rotate: -3 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div 
                className="opacity-75 transform hover:rotate-0 transition-transform duration-300 relative"
                whileHover={{ opacity: 0.9, scale: 1.05 }}
              >
                <Image 
                  src="/images/final-journal-entry.png" 
                  alt="Journal summaries" 
                  width={420} 
                  height={280} 
                  className="rounded-xl shadow-2xl object-cover"
                />
                <div className="absolute -bottom-6 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg px-3 py-2 shadow-lg">
                  <p className="text-md font-semibold">④ Summaries</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Mobile Layout - Simple stacked cards */}
        <div className="lg:hidden max-w-md mx-auto px-4 py-8">
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Feature cards in a simple grid */}
            <div className="grid grid-cols-1 gap-4">
              <motion.div 
                className="bg-card rounded-xl shadow-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg px-3 py-1 text-sm font-semibold mb-3">
                  ① Set Goals
                </div>
                <Image 
                  src="/images/set-goals.PNG" 
                  alt="Set goals" 
                  width={350} 
                  height={233} 
                  className="rounded-lg w-full"
                />
              </motion.div>

              <motion.div 
                className="bg-card rounded-xl shadow-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg px-3 py-1 text-sm font-semibold mb-3">
                  ② Write Freely
                </div>
                <Image 
                  src="/images/journal-entry-prior-to-correction.png" 
                  alt="Write freely" 
                  width={350} 
                  height={233} 
                  className="rounded-lg w-full"
                />
              </motion.div>

              <motion.div 
                className="bg-card rounded-xl shadow-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg px-3 py-1 text-sm font-semibold mb-3">
                  ③ Smart Review
                </div>
                <Image 
                  src="/images/exemplary-correction-journal.png" 
                  alt="AI corrections" 
                  width={350} 
                  height={233} 
                  className="rounded-lg w-full"
                />
              </motion.div>

              <motion.div 
                className="bg-card rounded-xl shadow-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg px-3 py-1 text-sm font-semibold mb-3">
                  ④ Summaries
                </div>
                <Image 
                  src="/images/final-journal-entry.png" 
                  alt="Journal summaries" 
                  width={350} 
                  height={233} 
                  className="rounded-lg w-full"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
