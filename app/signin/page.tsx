"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent
} from "@/components/ui/card";

export default function Login() {

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="inline-flex items-center text-primary hover:font-bold transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-6 h-6 mr-2"
            >
              <path
                fillRule="evenodd"
                d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
                clipRule="evenodd"
              />
            </svg>
            <span>Back to home</span>
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign in Coming Soon
            </CardTitle>
            <CardDescription className="text-center mt-4">
              Authentication features will be available in a future update
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">
              For now, explore our kanji learning tools without an account.
            </p>
            <Link href="/kanji">
              <Button className="w-full">
                Explore Kanji Dictionary
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
