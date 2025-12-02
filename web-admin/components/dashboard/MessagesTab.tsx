"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnnouncementCard, AnnouncementComposer } from "@/components/announcements";

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
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const announcements = useQuery(api.announcements.list, { limit: 50 }) as Announcement[] | undefined;
  const deleteAnnouncement = useMutation(api.announcements.remove);

  const handleDelete = async (id: Id<"announcements">) => {
    await deleteAnnouncement({ id });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800">Announcements</h2>
          <button
            onClick={() => setIsComposerOpen(true)}
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
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Composer Modal */}
      <AnnouncementComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        senderName={currentUserName}
        senderEmail={currentUserEmail}
        senderRole={currentUserRole}
      />
    </div>
  );
}
