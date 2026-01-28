import { Suspense } from "react";
import SettingsClient from "./SettingsClient";

// ✅ 解決 Vercel Build Error
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading settings...</div>}>
      <SettingsClient />
    </Suspense>
  );
}
