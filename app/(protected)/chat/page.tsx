import { Suspense } from "react";
import ChatClient from "./ChatClient";

// 這一行現在有效了，因為這是 Server Component
export const dynamic = "force-dynamic"; 

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black text-zinc-500">Loading chat...</div>}>
      <ChatClient />
    </Suspense>
  );
}
