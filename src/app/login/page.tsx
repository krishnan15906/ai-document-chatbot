import React from "react";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import LoginFrom from "@/components/LoginFrom";

export const metadata: Metadata = {
  title: "Sign In | DocuMind AI",
  description: "Log in to your DocuMind AI account to start chatting with your PDFs and documents.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black font-sans selection:bg-violet-500 selection:text-white p-4 sm:p-6 md:p-8 relative overflow-hidden bg-radial-[at_top_right,_var(--tw-gradient-stops)] from-violet-950/20 via-zinc-950 to-black">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Centered Content Container */}
      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        {/* Branding header above form */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            DocuMind AI
          </span>
        </div>

        {/* Login Form Component */}
        <LoginFrom />

        {/* Footer */}
        <div className="mt-8 text-xs text-zinc-650 text-center">
          &copy; {new Date().getFullYear()} DocuMind AI. All rights reserved.
        </div>
      </div>
    </main>
  );
}
