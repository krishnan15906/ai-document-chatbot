"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Upload, 
  Plus, 
  Search, 
  Calendar, 
  FileCode, 
  Trash2, 
  ArrowRight,
  TrendingUp,
  Brain,
  Menu,
  X
} from "lucide-react";

interface MockDocument {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "documents" | "chatbots" | "settings">("dashboard");
  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Documents database (starts with mock data, populated with backend files if available)
  const [documents, setDocuments] = useState<MockDocument[]>([
    { id: "doc-1", name: "Q2_Financials_Overview.pdf", size: "1.2 MB", uploadedAt: "2 hours ago", type: "pdf" },
    { id: "doc-2", name: "AI_Research_Paper_Draft.pdf", size: "4.8 MB", uploadedAt: "1 day ago", type: "pdf" },
    { id: "doc-3", name: "Enterprise_SaaS_Agreement.docx", size: "340 KB", uploadedAt: "3 days ago", type: "word" },
    { id: "doc-4", name: "Customer_Feedback_Notes.txt", size: "12 KB", uploadedAt: "1 week ago", type: "text" },
  ]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsSidebarOpen(window.innerWidth >= 768);
    }
    if (tabParam === "documents" || tabParam === "chatbots" || tabParam === "settings" || tabParam === "dashboard") {
      setActiveTab(tabParam as any);
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUserName(userData.name);
          // Generate initials (e.g. "John Doe" -> "JD")
          const initials = userData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
          setUserInitials(initials);
        } else {
          // Token invalid or expired
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };
    fetchProfile();

    // Fetch uploaded documents from backend
    const fetchDocuments = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/documents", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.data) {
          setDocuments(response.data);
        }
      } catch (err) {
        console.error("Error fetching documents from backend:", err);
      }
    };
    fetchDocuments();
  }, [tabParam]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    // Return back to the landing page
    router.push("/");
  };

  const handleNavLinkClick = (tab: "dashboard" | "documents" | "chatbots" | "settings") => {
    setActiveTab(tab);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleUploadClick = () => {
    // Trigger hidden file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const newDoc: MockDocument = {
        id: response.data.id,
        name: response.data.filename,
        size: response.data.size,
        uploadedAt: "Just now",
        type: response.data.type,
      };

      setDocuments((prev) => {
        const filtered = prev.filter((doc) => doc.id !== newDoc.id);
        return [newDoc, ...filtered];
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload document. Please ensure the backend server is running.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDoc = async (id: string, name: string) => {
    // Optimistic UI update: remove it immediately so the user doesn't double-click
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:8000/api/documents/${encodeURIComponent(name)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err: any) {
      // If it's a 404, the document is already deleted or not found on the server, so we can ignore the error
      if (err.response && err.response.status !== 404) {
        console.error("Error deleting document:", err);
      }
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              onClick={() => handleNavLinkClick("dashboard")} 
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === "dashboard" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${activeTab === "dashboard" ? "text-violet-400" : "text-zinc-500"}`} />
              <span>Dashboard</span>
            </button>
            <div className="space-y-1">
              <button 
                onClick={() => handleNavLinkClick("documents")} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === "documents" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                }`}
              >
                <FileText className={`h-4 w-4 ${activeTab === "documents" ? "text-violet-400" : "text-zinc-500"}`} />
                <span>Documents</span>
              </button>
              {documents.length > 0 && (
                <div className="pl-9 pr-2 py-1 space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => router.push(`/chat/${doc.id}`)}
                      className="w-full text-left text-xs text-zinc-400 hover:text-violet-400 py-1.5 px-2 rounded-lg hover:bg-zinc-900/40 transition-colors truncate block"
                      title={doc.name}
                    >
                      📄 {doc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => handleNavLinkClick("chatbots")} 
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === "chatbots" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
              }`}
            >
              <MessageSquare className={`h-4 w-4 ${activeTab === "chatbots" ? "text-violet-400" : "text-zinc-500"}`} />
              <span>Chatbots</span>
            </button>
            <button 
              onClick={() => handleNavLinkClick("settings")} 
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === "settings" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
              }`}
            >
              <Settings className={`h-4 w-4 ${activeTab === "settings" ? "text-violet-400" : "text-zinc-500"}`} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sign Out Action */}
        <button 
          onClick={() => {
            handleSignOut();
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

      {/* Main Workspace Dashboard Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
        {/* Header bar */}
        <header className="border-b border-zinc-900 bg-black/30 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button (Visible on both Desktop and Mobile!) */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 md:hidden">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white hidden md:block">Workspace Dashboard</h2>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <button 
              onClick={handleUploadClick}
              className="flex items-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-violet-950/10 active:scale-[0.98] transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Document</span>
            </button>
            <div className="h-8 w-px bg-zinc-900"></div>
            {/* Dynamic User Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-xs font-bold text-violet-300 px-2 py-1">
                {userInitials || "U"}
              </div>
              <span className="text-xs font-semibold text-zinc-300 hidden sm:inline-block">
                {userName || "Loading..."}
              </span>
            </div>
          </div>
        </header>

        {/* Body content */}
        <div className="p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          {/* Welcome Banner - Only shown on Dashboard main tab */}
          {activeTab === "dashboard" && (
            <div className="relative p-8 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black overflow-hidden shadow-xl">
              <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10 max-w-xl space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}!
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Add PDFs or text files to build your custom intelligence core. Select any document below to launch the conversational AI engine.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics grid - Only shown on Dashboard main tab */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Total Documents</span>
                  <span className="text-3xl font-extrabold text-white">{documents.length}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-violet-950/40 border border-violet-850/30 flex items-center justify-center text-violet-400">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Chats Initiated</span>
                  <span className="text-3xl font-extrabold text-white">84</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-indigo-950/40 border border-indigo-850/30 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">API Storage Used</span>
                  <span className="text-3xl font-extrabold text-white">42%</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-950/40 border border-emerald-850/30 flex items-center justify-center text-emerald-400">
                  <Brain className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          {/* Drag & Drop Upload Zone - Shown on Dashboard & Documents tab */}
          {(activeTab === "dashboard" || activeTab === "documents") && (
            <div 
              onClick={handleUploadClick}
              className="group border border-dashed border-zinc-800 hover:border-violet-500 bg-zinc-950/40 hover:bg-zinc-900/10 p-8 rounded-2xl text-center cursor-pointer transition-all duration-300 shadow-sm relative overflow-hidden"
            >
              {isUploading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-10 flex flex-col items-center justify-center space-y-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  <p className="text-xs font-semibold text-zinc-300">Uploading document...</p>
                </div>
              )}
              <div className="max-w-xs mx-auto space-y-4">
                <div className="h-12 w-12 rounded-xl bg-zinc-900 group-hover:bg-violet-650/10 group-hover:text-violet-400 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Drag & drop files or click to upload</p>
                  <p className="text-xs text-zinc-500 mt-1">Supports PDF, DOCX, TXT up to 50MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Documents Showcase - Depending on the active tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Recent Documents</h3>
                {documents.length > 3 && (
                  <button 
                    onClick={() => setActiveTab("documents")}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    View All ({documents.length}) <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-black/40">
                {documents.length > 0 ? (
                  <div className="divide-y divide-zinc-900">
                    {documents.slice(0, 3).map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-violet-400">
                            <FileCode className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white hover:text-violet-400 cursor-pointer transition-colors leading-tight">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {doc.uploadedAt}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <button
                            onClick={() => router.push(`/chat/${doc.id}`)}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-violet-950/40 hover:text-violet-300 border border-zinc-800 hover:border-violet-900/50 text-xs font-semibold text-zinc-300 rounded-lg transition-all"
                          >
                            <span>Chat</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 rounded-lg transition-all"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-zinc-500 space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-zinc-700" />
                    <p className="text-sm font-medium">No documents uploaded yet</p>
                    <p className="text-xs text-zinc-650">Upload a PDF or TXT file above to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-white">Your Documents ({documents.length})</h3>
                
                {/* Search input */}
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs placeholder-zinc-500 text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-black/40">
                {filteredDocs.length > 0 ? (
                  <div className="divide-y divide-zinc-900">
                    {filteredDocs.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-violet-400">
                            <FileCode className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white hover:text-violet-400 cursor-pointer transition-colors leading-tight">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {doc.uploadedAt}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <button
                            onClick={() => router.push(`/chat/${doc.id}`)}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-violet-950/40 hover:text-violet-300 border border-zinc-800 hover:border-violet-900/50 text-xs font-semibold text-zinc-300 rounded-lg transition-all"
                          >
                            <span>Chat</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 rounded-lg transition-all"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-zinc-500 space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-zinc-700" />
                    <p className="text-sm font-medium">No documents found</p>
                    <p className="text-xs text-zinc-650">Try uploading a document or adjusting your search.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "chatbots" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">AI Chatbots</h3>
                <p className="text-xs text-zinc-400 mt-1">Deploy specialized chatbot instances configured for specific research tasks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-violet-950/50 border border-violet-850/30 flex items-center justify-center text-violet-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Document Reading Assistant</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Analyze page-by-page text, ask specific content questions, locate information with page citations, and generate summaries.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Active</span>
                    <button 
                      onClick={() => setActiveTab("documents")}
                      className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-white rounded-lg transition-colors"
                    >
                      Select Document
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/20 opacity-60 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-950/50 border border-indigo-850/30 flex items-center justify-center text-indigo-400">
                      <Brain className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Research Synthesizer (Pro)</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Compare facts and arguments across up to 10 documents simultaneously. Find contradictions, map citations, and write reviews.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Upgrade Required</span>
                    <button className="py-1.5 px-3 bg-violet-600/20 text-violet-300 border border-violet-900/50 text-xs font-semibold rounded-lg cursor-not-allowed">
                      Unlock Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">Workspace Settings</h3>
                <p className="text-xs text-zinc-400 mt-1">Configure your LLM model API configuration and user interface settings.</p>
              </div>

              <div className="border border-zinc-900 rounded-2xl p-6 bg-zinc-950/40 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">Active LLM Model</label>
                  <select className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500">
                    <option>Gemini 1.5 Flash (Default)</option>
                    <option>Gemini 1.5 Pro</option>
                    <option>Claude 3.5 Sonnet</option>
                    <option>GPT-4o</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">FastAPI chatbot route will fallback to local simulated agent if API keys are not provided.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">API Access Token</label>
                  <input 
                    type="password" 
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled
                  />
                  <p className="text-[10px] text-zinc-500">Provided by default workspace license for user Krishna Patel.</p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => alert("Settings saved successfully!")}
                    className="py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg active:scale-[0.98] transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
