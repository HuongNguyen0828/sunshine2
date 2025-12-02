"use client";

import ReactMarkdown from "react-markdown";
import { Id } from "@/convex/_generated/dataModel";

type Announcement = {
  _id: Id<"announcements">;
  senderName: string;
  senderEmail: string;
  senderRole: "admin" | "teacher";
  text: string;
  imageUrl?: string;
  targetAudience?: "all" | "parents" | "teachers";
  createdAt: number;
};

interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete: (id: Id<"announcements">) => void;
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AnnouncementCard({ announcement, onDelete }: AnnouncementCardProps) {
  const handleDelete = () => {
    const ok = window.confirm("Are you sure you want to delete this announcement?");
    if (ok) {
      onDelete(announcement._id);
    }
  };

  return (
    <div className="group bg-white border border-neutral-200 hover:border-neutral-400 transition-all duration-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600 flex-shrink-0">
          {getInitials(announcement.senderName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-800 truncate group-hover:text-neutral-600 transition-colors">
              {announcement.senderName}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
              {announcement.senderRole}
            </span>
            {announcement.targetAudience && announcement.targetAudience !== "all" && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-500 border border-slate-100">
                → {announcement.targetAudience}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mb-3">
            {formatTime(announcement.createdAt)}
          </div>

          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown
              components={{
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt || "Image"}
                    className="max-w-md border border-neutral-200 mt-2"
                  />
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-700 underline hover:text-black"
                  >
                    {children}
                  </a>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">
                    {children}
                  </p>
                ),
              }}
            >
              {announcement.text}
            </ReactMarkdown>
          </div>

          {announcement.imageUrl && (
            <img
              src={announcement.imageUrl}
              alt="Attachment"
              className="mt-4 max-w-md border border-neutral-200"
            />
          )}

          <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleDelete}
              className="bg-white border border-neutral-200 hover:bg-red-50 hover:border-red-300 text-neutral-700 hover:text-red-600 font-medium px-4 py-2 transition-all duration-200 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
