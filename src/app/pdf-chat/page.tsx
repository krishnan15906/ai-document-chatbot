"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PdfChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to dashboard as PDF chat is handled via /chat/[docId]
    router.replace("/dashboard");
  }, [router]);

  return null;
}
