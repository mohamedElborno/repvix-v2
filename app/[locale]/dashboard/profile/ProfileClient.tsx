"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
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
import { IconCamera, IconUser, IconMail } from "@tabler/icons-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
export default function ProfileClient() {
  const t = useTranslations("profile");
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    bio: "",
    location: "",
    username: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dominantColor, setDominantColor] = useState("#6366f1"); // Default indigo color
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    return `#${[r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")}`;
  };

  // Function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(99, 102, 241, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Function to extract dominant color from image
  const extractDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      // Skip if no image URL
      if (!imageUrl) {
        resolve("#6366f1");
        return;
      }

      const img = new Image();
      // Try with CORS, but don't fail if it doesn't work
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("#6366f1"); // Default indigo
            return;
          }

          // Limit canvas size for performance
          const maxSize = 200;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Sample pixels
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const colorCounts: Record<string, number> = {};
          let maxCount = 0;
          let dominantR = 99;
          let dominantG = 102;
          let dominantB = 241;

          // Sample pixels (every 4th pixel for performance)
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            // Quantize colors to reduce variations
            const qr = Math.floor(r / 10) * 10;
            const qg = Math.floor(g / 10) * 10;
            const qb = Math.floor(b / 10) * 10;
            const colorKey = `${qr},${qg},${qb}`;

            colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;

            if (colorCounts[colorKey] > maxCount) {
              maxCount = colorCounts[colorKey];
              dominantR = qr;
              dominantG = qg;
              dominantB = qb;
            }
          }

          const hexColor = rgbToHex(dominantR, dominantG, dominantB);
          console.log("Extracted dominant color:", hexColor);
          resolve(hexColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          resolve("#6366f1"); // Default indigo
        }
      };
      img.onerror = () => {
        resolve("#6366f1"); // Default indigo
      };
      img.src = imageUrl;
    });
  };

  // Update form data when user loads
  useEffect(() => {
    if (user) {
      // Initialize with Clerk user data
      const firstName = user.firstName || "";
      const lastName = user.lastName || "";
      const fullName =
        firstName && lastName
          ? `${firstName} ${lastName}`
          : user.fullName || firstName || lastName || "";

      setFormData({
        fullName,
        phone: user.primaryPhoneNumber?.phoneNumber || "",
        bio: (user.publicMetadata?.bio as string) || "",
        location: (user.publicMetadata?.location as string) || "",
        username: user.username || "",
      });
      const imageUrl = user.imageUrl || "";
      setAvatarUrl(imageUrl);

      // Extract dominant color from user's profile image
      if (imageUrl) {
        extractDominantColor(imageUrl).then(setDominantColor);
      }
    }
  }, [user]);

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
      toast.error(t("invalidImageFile"));
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("imageSizeError"));
      return;
    }

    if (!user) {
      toast.error(t("saveError"));
      return;
    }

    setIsUploading(true);

    try {
      // Create a data URL for immediate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
      };
      reader.readAsDataURL(file);

      // Upload image to Clerk immediately
      await user.setProfileImage({ file });

      // Reload user data to get the new image URL
      await user.reload();

      // Update avatar URL with the new Clerk image URL
      const newImageUrl = user.imageUrl || "";
      setAvatarUrl(newImageUrl);

      // Extract dominant color from new image
      if (newImageUrl) {
        extractDominantColor(newImageUrl).then(setDominantColor);
      }

      toast.success(t("uploadSuccess"));
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error?.errors?.[0]?.message || t("uploadError"));
      // Reset to original image on error
      setAvatarUrl(user.imageUrl || "");
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

      // Update Clerk user profile
      const updates: {
        firstName?: string;
        lastName?: string;
        username?: string;
        publicMetadata?: Record<string, any>;
      } = {};

      // Split full name into first and last name
      const nameParts = formData.fullName.trim().split(/\s+/);
      if (nameParts.length > 0) {
        updates.firstName = nameParts[0];
        updates.lastName = nameParts.slice(1).join(" ") || nameParts[0];
      }

      // Update username if provided
      if (formData.username) {
        updates.username = formData.username;
      }

      // Update public metadata (bio, location)
      updates.publicMetadata = {
        ...user.publicMetadata,
        bio: formData.bio || undefined,
        location: formData.location || undefined,
      };

      // Update user in Clerk
      await user.update(updates);

      // Reload user data to reflect changes
      await user.reload();

      // Update phone if changed
      if (
        formData.phone &&
        formData.phone !== user.primaryPhoneNumber?.phoneNumber
      ) {
        // Note: Phone number updates require verification in Clerk
        // This is a simplified version - you may want to add phone verification
        try {
          await user.createPhoneNumber({ phoneNumber: formData.phone });
        } catch (error) {
          // Phone might already exist or need verification
          console.warn("Phone update skipped:", error);
        }
      }

      toast.success(t("saveSuccess"));
    } catch (error: any) {
      console.error("Error saving profile:", error);

      // Handle specific errors
      if (
        error?.errors?.[0]?.message?.includes("username") ||
        error?.message?.includes("username") ||
        error?.message?.includes("Username")
      ) {
        toast.error(t("usernameExists"));
      } else if (error?.errors?.[0]?.message) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(t("saveError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 min-h-[calc(100vh-120px)]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      <Card
        className="bg-card border-border transition-all duration-300"
        style={{
          boxShadow: `0 10px 40px -10px ${hexToRgba(dominantColor, 0.4)}, 0 0 0 1px ${hexToRgba(dominantColor, 0.2)}`,
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <IconUser className="h-5 w-5" />
            {t("profileInfo")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("profileDescription")}
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
                <p className="text-xs text-muted-foreground">
                  {t("imageFormats")}
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
              <p className="text-xs text-muted-foreground">
                {t("usernameHint")}
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
                className="bg-muted cursor-not-allowed"
                placeholder={t("emailPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
            </div>

            {/* Phone */}
            {/*             <div className="space-y-2">
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
            </div> */}

            {/* Location */}
            {/*          <div className="space-y-2">
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
            </div> */}

            {/* Bio */}
            {/*             <div className="space-y-2">
              <Label htmlFor="bio">{t("bio") || "Bio"}</Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder={t("bioPlaceholder")}
                className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                rows={4}
              />
            </div> */}

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
                {isLoading ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
