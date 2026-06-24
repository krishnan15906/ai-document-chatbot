"use client";
import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

type Message = { role: "user" | "bot"; text: string };

export default function ChatDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<{ id: string; name: string }[]>([]);
  const [activeDocumentName, setActiveDocumentName] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Clear messages and input when switching document
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [documentId]);

  // Fetch documents and find active document name
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/documents");
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
          const activeDoc = data.find((doc: any) => doc.id === documentId);
          if (activeDoc) {
            setActiveDocumentName(activeDoc.name);
          } else {
            setActiveDocumentName(documentId);
          }
        }
      } catch (err) {
        console.error("Error fetching documents on chat page:", err);
      }
    };
    fetchDocuments();
  }, [documentId]);

  // Setup sidebar responsive open state
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendQuestion = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ doc_id: documentId, question }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unable to reach server.";
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `⚠️ ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white font-sans overflow-x-hidden">
      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-45 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 border-zinc-900 bg-black z-50 flex flex-col justify-between transition-all duration-300 md:static ${
        isSidebarOpen 
          ? "translate-x-0 w-64 border-r p-6" 
          : "-translate-x-full w-64 md:translate-x-0 md:w-0 md:p-0 md:border-r-0 overflow-hidden"
      }`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                DocuMind AI
              </span>
            </div>
            {/* Mobile close button */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => router.push("/dashboard")} 
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/40 transition-all whitespace-nowrap"
            >
              <LayoutDashboard className="h-4 w-4 text-zinc-500" />
              <span>Dashboard</span>
            </button>
            
            <div className="space-y-1">
              <button 
                onClick={() => router.push("/dashboard?tab=documents")} 
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-zinc-900 text-white transition-all whitespace-nowrap"
              >
                <FileText className="h-4 w-4 text-violet-400" />
                <span>Documents</span>
              </button>
              
              {/* Nested list of uploaded documents */}
              {documents.length > 0 && (
                <div className="pl-9 pr-2 py-1 space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        router.push(`/chat/${doc.id}`);
                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded-lg hover:bg-zinc-900/40 transition-colors truncate block ${
                        doc.id === documentId ? "text-violet-400 bg-zinc-900/60 font-semibold" : "text-zinc-400 hover:text-violet-400"
                      }`}
                      title={doc.name}
                    >
                      📄 {doc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => router.push("/dashboard?tab=chatbots")} 
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/40 transition-all whitespace-nowrap"
            >
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              <span>Chatbots</span>
            </button>
            
            <button 
              onClick={() => router.push("/dashboard?tab=settings")} 
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/40 transition-all whitespace-nowrap"
            >
              <Settings className="h-4 w-4 text-zinc-500" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sign Out Action */}
        <button 
          onClick={() => {
            router.push("/");
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/20 transition-all whitespace-nowrap"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Chat Workspace Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto flex items-center gap-4 px-6 py-4">
            {/* Sidebar toggle button (Visible on both Desktop and Mobile!) */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div className="flex items-center gap-2 ml-auto max-w-[50%]">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-white leading-tight">PDF Chat Assistant</p>
                <p className="text-[10px] text-zinc-500 truncate" title={activeDocumentName || documentId}>
                  Document: {activeDocumentName || documentId}
                </p>
              </div>
            </div>
          </div>
        </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Welcome message when no messages */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center">
                <Bot className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Ask anything about your PDF</h2>
                <p className="text-sm text-zinc-500 max-w-md">
                  I&apos;ve analyzed your document. Ask me questions about its content and I&apos;ll provide detailed answers.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  "Summarize this document",
                  "What are the key points?",
                  "Explain the main topic",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full hover:text-violet-300 hover:border-violet-800/50 hover:bg-violet-950/30 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "bot" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mt-1">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mt-1">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2 focus-within:border-violet-600/50 focus-within:ring-1 focus-within:ring-violet-600/20 transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question about your PDF..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={sendQuestion}
              disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-2">
            AI responses are based on the document content. Results may not always be accurate.
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
