"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IconCamera,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ProfileClientProps {
  userId: string;
}

export default function ProfileClient({ userId }: ProfileClientProps) {
  const t = useTranslations("profile");
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Get profile from Convex
  /*   const profile = useQuery({query: api.profiles.getProfile, args: {userId}});
  const updateProfile = useMutation(api.profiles.updateProfile); */

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    bio: "",
    location: "",
    username: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when profile loads
  useEffect(
    () => {
      /*     if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        phone: "", // Phone is stored in Clerk, not in profile
        bio: profile.bio || "",
        location: profile.location || "",
        username: profile.username || "",
      });
      setAvatarUrl(profile.avatarUrl || "");
    } else if (user) {
      // Initialize with Clerk user data if no profile exists
      setFormData({
        fullName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.fullName || "",
        phone: user.primaryPhoneNumber?.phoneNumber || "",
        bio: "",
        location: "",
        username: user.username || "",
      });
      setAvatarUrl(user.imageUrl || "");
    } */
    },
    [
      /* profile, user */
    ]
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("invalidImageFile") || "Invalid image file");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("imageSizeError") || "Image size must be less than 2MB");
      return;
    }

    setIsUploading(true);

    try {
      // TODO: Upload to Clerk or your file storage service
      // For now, we'll use Clerk's user image update
      // You can integrate with Clerk's file upload or use a service like Cloudinary

      // Create a data URL for preview (temporary solution)
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        toast.success(t("uploadSuccess") || "Image uploaded successfully");
      };
      reader.readAsDataURL(file);

      // TODO: Upload to actual storage and get URL
      // Example with Clerk (if you have file upload configured):
      // const formData = new FormData();
      // formData.append("file", file);
      // const response = await fetch("/api/upload-avatar", {
      //   method: "POST",
      //   body: formData,
      // });
      // const data = await response.json();
      // setAvatarUrl(data.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("uploadError") || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error("User not found");
      }

      /*       await updateProfile({
        userId: user.id,
        fullName: formData.fullName,
        username: formData.username || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: formData.bio || undefined,
        location: formData.location || undefined,
      }); */

      toast.success(t("saveSuccess") || "Profile saved successfully");
    } catch (error: any) {
      console.error("Error saving profile:", error);

      // Handle specific errors
      if (error?.message?.includes("Username already exists")) {
        toast.error(t("usernameExists") || "Username already exists");
      } else {
        toast.error(t("saveError") || "Failed to save profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title") || "Profile"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("subtitle") || "Manage your profile information"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            {t("profileInfo") || "Profile Information"}
          </CardTitle>
          <CardDescription>
            {t("profileDescription") || "Update your profile information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={avatarUrl || user.imageUrl}
                  alt={t("avatarAlt") || "Avatar"}
                />
                <AvatarFallback className="text-lg">
                  {formData.fullName?.charAt(0) ||
                    user.firstName?.charAt(0) ||
                    user.emailAddresses[0]?.emailAddress?.charAt(0) ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <IconCamera className="h-4 w-4" />
                  {isUploading
                    ? t("uploading") || "Uploading..."
                    : t("changeImage") || "Change Image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">
                  {t("imageFormats") || "JPG, PNG, GIF up to 2MB"}
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName") || "Full Name"}</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder={t("fullNamePlaceholder") || "Enter your full name"}
                required
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{t("username") || "Username"}</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={t("usernamePlaceholder") || "Enter your username"}
              />
              <p className="text-xs text-gray-500">
                {t("usernameHint") || "This will be your unique identifier"}
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <IconMail className="h-4 w-4" />
                {t("email") || "Email"}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={user.emailAddresses[0]?.emailAddress || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                placeholder={t("emailPlaceholder") || "Email address"}
              />
              <p className="text-xs text-gray-500">
                {t("emailHint") || "Email cannot be changed"}
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <IconPhone className="h-4 w-4" />
                {t("phone") || "Phone"}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder={t("phonePlaceholder") || "Enter your phone number"}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <IconMapPin className="h-4 w-4" />
                {t("location") || "Location"}
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder={t("locationPlaceholder") || "Enter your location"}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">{t("bio") || "Bio"}</Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder={t("bioPlaceholder") || "Tell us about yourself"}
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                rows={4}
              />
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("saving") || "Saving..."
                  : t("saveChanges") || "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
