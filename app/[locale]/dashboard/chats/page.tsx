"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function ChatsPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // إعادة التوجيه إلى الداشبورد مع hash للتمرير إلى قسم المحادثات
    router.push(`/${locale}/dashboard#chats`);
  }, [router, locale]);

  return null;
}
