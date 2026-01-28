import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

// ✅ 解決 Vercel Build Error 的關鍵
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  );
}
