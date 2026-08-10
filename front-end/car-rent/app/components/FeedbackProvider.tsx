"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type NoticeType = "info" | "success" | "warning" | "error";

type Notice = {
  id: number;
  message: string;
  type: NoticeType;
};

let pushExternalNotice: ((message: string, type?: NoticeType) => void) | null = null;

export function notify(message: string, type: NoticeType = "info") {
  pushExternalNotice?.(message, type);
}

export default function FeedbackProvider() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const originalAlert = window.alert;

    const push = (message: string, type: NoticeType = "warning") => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      setNotices((current) => [...current, { id, message, type }]);
      window.setTimeout(() => {
        setNotices((current) => current.filter((notice) => notice.id !== id));
      }, type === "error" ? 7000 : 4500);
    };

    pushExternalNotice = push;
    window.alert = (message?: unknown) => push(String(message ?? ""), "warning");

    return () => {
      pushExternalNotice = null;
      window.alert = originalAlert;
    };
  }, []);

  return (
    <div className="fixed top-20 right-4 z-[1000] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3 pointer-events-none">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={`pointer-events-auto rounded-2xl border bg-white p-4 shadow-2xl flex items-start gap-3 ${
            notice.type === "success"
              ? "border-green-200"
              : notice.type === "error"
                ? "border-red-200"
                : notice.type === "warning"
                  ? "border-amber-200"
                  : "border-blue-200"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : notice.type === "error" ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : notice.type === "warning" ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <Info className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 text-sm leading-6 text-gray-700">{notice.message}</div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() =>
              setNotices((current) => current.filter((item) => item.id !== notice.id))
            }
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
