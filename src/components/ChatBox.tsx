import React, { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "bot"; text: string };

type Props = {
  docId: string;
  onBack: () => void;
};

export default function ChatBox({ docId, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendQuestion = async () => {
    if (!input.trim()) return;
    const question = input.trim();
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
        body: JSON.stringify({ doc_id: docId, question }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "bot", text: "⚡️ Unable to reach server." }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto‑scroll to latest message
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendQuestion();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[70vh]">
      <button
        onClick={onBack}
        className="mb-2 text-sm underline hover:text-gray-300"
      >
        ← Back to documents
      </button>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-white/5 rounded-xl backdrop-filter backdrop-blur-md"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <p className="text-gray-300 italic">Thinking… 🤖</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Ask a question about the PDF…"
          className="flex-1 rounded-xl p-2 bg-white/10 text-white placeholder-gray-300 focus:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          onClick={sendQuestion}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
