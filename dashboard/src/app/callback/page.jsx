"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Disc3 } from "lucide-react";
import { Suspense } from "react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.push("/");
      return;
    }

    api.callback(code)
      .then((data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("guilds", JSON.stringify(data.guilds));
        router.push("/dashboard");
      })
      .catch(() => {
        router.push("/");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Disc3 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Giriş yapılıyor...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Disc3 className="w-12 h-12 text-primary mx-auto animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
