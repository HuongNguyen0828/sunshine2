"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AnnouncementComposerProps {
  isOpen: boolean;
  onClose: () => void;
  senderName: string;
  senderEmail: string;
  senderRole: "admin" | "teacher";
}

export default function AnnouncementComposer({
  isOpen,
  onClose,
  senderName,
  senderEmail,
  senderRole,
}: AnnouncementComposerProps) {
  const [text, setText] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "parents" | "teachers">("all");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.announcements.generateUploadUrl);
  const sendAnnouncement = useMutation(api.announcements.send);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsUploading(true);

    try {
      let imageStorageId: Id<"_storage"> | undefined;

      // Upload image if selected
      if (selectedImage) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        const { storageId } = await result.json();
        imageStorageId = storageId;
      }

      // Send announcement
      await sendAnnouncement({
        senderName,
        senderEmail,
        senderRole,
        text: text.trim(),
        targetAudience,
        imageStorageId,
      });

      // Reset form
      setText("");
      setSelectedImage(null);
      setImagePreview(null);
      setTargetAudience("all");
      onClose();
    } catch (error) {
      console.error("Failed to send announcement:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">New Announcement</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700 font-medium mb-1 block">Send to</span>
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
                Message <span className="text-slate-400 font-normal">(supports markdown)</span>
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your announcement... Use **bold**, *italic*, [links](url), or ![images](url)"
                rows={5}
                className="appearance-none w-full px-4 py-2 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none font-mono text-sm"
                required
              />
            </label>

            {/* Image upload section */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-xs max-h-48 border border-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2 border border-dashed border-neutral-300 px-4 py-3 hover:border-neutral-400 transition-colors w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Attach an image
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-medium px-6 py-3 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim() || isUploading}
              className="flex-1 bg-black hover:bg-neutral-900 text-white font-medium px-6 py-3 transition duration-200 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {isUploading ? "Sending..." : "Send Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
