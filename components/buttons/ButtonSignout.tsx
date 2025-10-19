"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function ButtonSignout() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-gray-700 hover:bg-purple-400 hover:text-white"
    >
      <LogOut className="mr-3 flex-shrink-0 h-6 w-6 text-gray-700 group-hover:text-white" />
      Sign Out
    </button>
  );
}
