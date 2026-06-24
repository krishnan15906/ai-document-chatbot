import React, { useEffect, useState } from "react";

type Document = {
  id: string;
  name: string;
  size: string;
  type: string;
};

type Props = {
  onSelect: (docId: string) => void;
};

export default function DocumentList({ onSelect }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/documents")
      .then((r) => r.json())
      .then((data) => {
        setDocs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center">Loading documents…</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between bg-white/10 rounded-xl p-4 backdrop-filter backdrop-blur-sm"
        >
          <div>
            <p className="font-medium">{doc.name}</p>
            <p className="text-sm text-gray-300">
              {doc.size} • {doc.type?.toUpperCase()}
            </p>
          </div>
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded transition"
            onClick={() => onSelect(doc.id)}
          >
            Open Chat
          </button>
        </div>
      ))}
    </div>
  );
}
