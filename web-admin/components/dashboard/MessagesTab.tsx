"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Announcement = {
  _id: Id<"announcements">;
  senderName: string;
  senderEmail: string;
  senderRole: "admin" | "teacher";
  text: string;
  imageUrl?: string;
  targetAudience?: "all" | "parents" | "teachers";
  locationId?: string;
  classId?: string;
  createdAt: number;
};

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

interface MessagesTabProps {
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserRole?: "admin" | "teacher";
}

export default function MessagesTab({
  currentUserName = "Admin User",
  currentUserEmail = "admin@sunshine.com",
  currentUserRole = "admin",
}: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState<"all" | "parents" | "teachers">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const announcements = useQuery(api.announcements.list, { limit: 50 }) as Announcement[] | undefined;
  const sendAnnouncement = useMutation(api.announcements.send);
  const deleteAnnouncement = useMutation(api.announcements.remove);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await sendAnnouncement({
      senderName: currentUserName,
      senderEmail: currentUserEmail,
      senderRole: currentUserRole,
      text: newMessage.trim(),
      targetAudience,
    });

    setNewMessage("");
    setIsFormOpen(false);
  };

  const handleDelete = async (id: Id<"announcements">) => {
    const ok = window.confirm("Are you sure you want to delete this announcement?");
    if (!ok) return;
    await deleteAnnouncement({ id });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Announcements</h2>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-black hover:bg-neutral-900 text-white font-medium px-4 py-2 transition duration-200 flex items-center gap-2 text-sm"
          >
            <span className="text-lg">+</span> New Announcement
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {!announcements ? (
        <div className="bg-white border border-neutral-200 p-12 text-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📢</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No announcements yet
          </h3>
          <p className="text-gray-500">
            Get started by creating your first announcement
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement._id}
              className="group bg-white border border-neutral-200 hover:border-neutral-400 transition-all duration-200 p-6"
            >
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

                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {announcement.text}
                  </p>

                  {announcement.imageUrl && (
                    <img
                      src={announcement.imageUrl}
                      alt="Attachment"
                      className="mt-4 max-w-md border border-neutral-200"
                    />
                  )}

                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="bg-white border border-neutral-200 hover:bg-red-50 hover:border-red-300 text-neutral-700 hover:text-red-600 font-medium px-4 py-2 transition-all duration-200 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="bg-white max-w-xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">
                New Announcement
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSend} className="p-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">
                    Send to
                  </span>
                  <select
                    className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as typeof targetAudience)}
                  >
                    <option value="all">Everyone</option>
                    <option value="parents">Parents only</option>
                    <option value="teachers">Teachers only</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-gray-700 font-medium mb-1 block">
                    Message *
                  </span>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your announcement..."
                    rows={5}
                    className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                    required
                  />
                </label>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Attach image (coming soon)
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium px-6 py-3 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="flex-1 bg-black hover:bg-neutral-900 text-white font-medium px-6 py-3 transition duration-200 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
