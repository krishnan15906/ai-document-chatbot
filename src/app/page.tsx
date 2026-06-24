import React from "react";
import Image from "next/image";
import { Sparkles, FileText, MessageSquare, BrainCircuit, ArrowRight, Check, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-violet-500 selection:text-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              DocuMind AI
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </a>
            <a
              href="/singin"
              className="flex items-center justify-center text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl px-5 py-2.5 shadow-lg shadow-violet-950/20 hover:shadow-violet-950/40 transition-all duration-200 active:scale-[0.98]"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-950 bg-violet-950/30 text-violet-300 text-xs font-semibold tracking-wide mb-8 animate-pulse">
          <Zap className="h-3 w-3" /> Now Powered by GPT-4 & Claude 3.5 Sonnet
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Empower Your Reading with{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-emerald-400">
            AI Understanding
          </span>
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
          Upload PDFs, textbooks, or contract drafts. Chat directly with your documents to extract references, summeries, and smart answers in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/singin"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-base font-semibold text-white rounded-xl shadow-xl shadow-violet-950/30 hover:shadow-violet-950/50 active:scale-[0.98] transition-all duration-200"
          >
            <span>Start Chatting Free</span>
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-base font-semibold text-zinc-300 hover:text-white rounded-xl transition-all duration-200"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto border-t border-zinc-900">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Features Designed for Research</h2>
          <p className="text-zinc-400 text-sm">
            Everything you need to digest academic papers, legal files, and books efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-950/50 border border-violet-800/30 text-violet-400 mb-6">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">PDF Citation Engine</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Clickable citation labels that direct you straight to the exact page, sentence, and paragraph source in the uploaded document.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-950/50 border border-indigo-800/30 text-indigo-400 mb-6">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Contextual Memory</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Retain deep document context across multi-document chat sessions. Compare texts and synthesize cross-document summaries easily.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 mb-6">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Summarization</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Receive instant executive briefs, section outlines, and concept lists to quickly parse legal contracts and complex manuals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto border-t border-zinc-900">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Flexible, Simple Pricing</h2>
          <p className="text-zinc-400 text-sm">
            Get started for free or upgrade to support larger volume uploads and premium model queries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 rounded-2xl bg-zinc-950/50 border border-zinc-900 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-300">Starter Free</h3>
              <p className="text-zinc-500 text-xs mt-1">Perfect for trying out our chatbot</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-zinc-400 text-sm"> / month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Up to 3 PDF uploads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>10MB max file size</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>50 queries / day</span>
                </li>
              </ul>
            </div>
            <a
              href="/singin"
              className="mt-8 flex justify-center py-3 bg-zinc-900 hover:bg-zinc-850 text-sm font-semibold text-white border border-zinc-800 rounded-xl transition-all duration-200"
            >
              Sign Up Free
            </a>
          </div>

          {/* Pro Tier */}
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-violet-800/80 relative flex flex-col justify-between">
            <div className="absolute top-4 right-4 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Most Popular
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Researcher Pro</h3>
              <p className="text-zinc-400 text-xs mt-1">For heavy reading and study</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">$15</span>
                <span className="text-zinc-400 text-sm"> / month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>Unlimited uploads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>100MB max file size</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>Priority GPT-4 & Sonnet support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-violet-400" />
                  <span>OCR text scanning for scanned docs</span>
                </li>
              </ul>
            </div>
            <a
              href="/singin"
              className="mt-8 flex justify-center py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-xl shadow-lg shadow-violet-950/20 hover:shadow-violet-950/40 transition-all duration-200"
            >
              Upgrade to Pro
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-zinc-550">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">DocuMind AI</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} DocuMind AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
