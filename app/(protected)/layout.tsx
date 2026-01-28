"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Hexagon,
  LayoutDashboard,
  Plus,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";
import { supabase } from "../../src/utils/supabaseClient";

import RenameChatModalProvider, { useRenameChatModal } from "../../components/RenameChatModalProvider";
import DeleteChatModalProvider, { useDeleteChatModal } from "../../components/DeleteChatModalProvider";

type AuthState = "checking" | "authed" | "guest";

type ConversationItem = {
  id: string;
  title: string | null;
  updated_at: string;
};

// 導航按鈕組件
function NavButton({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`
        relative group w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
        ${
          active
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="ml-3 text-sm font-medium hidden xl:block">{label}</span>
      
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-transparent xl:hidden" />
      )}
    </Link>
  );
}

function ProtectedLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { openRename } = useRenameChatModal();
  const { openDeleteChat } = useDeleteChatModal();

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [convos, setConvos] = useState<ConversationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  const studentId = useMemo(() => (email ? email.split("@")[0] : null), [email]);
  const displayName = useMemo(() => (studentId ? `Student ${studentId}` : "Student"), [studentId]);

  const activeConversationId = useMemo(() => {
    if (pathname !== "/chat") return null;
    return searchParams.get("cid"); 
  }, [pathname, searchParams]);
  

  // Auth Check Effect
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        setAuthState("guest");
        window.location.replace("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      setAuthState("authed");
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthState("guest");
        window.location.replace("/login");
        return;
      }
      setEmail(session.user.email ?? null);
      setAuthState("authed");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  // Load History Logic
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      setConvos((data ?? []) as ConversationItem[]);
    } catch (e) {
      console.error("loadHistory error:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "authed") return;
    loadHistory();
  }, [authState, loadHistory, pathname]);

  useEffect(() => {
    if (authState !== "authed") return;
    if (typeof window === "undefined") return;

    const bc = new window.BroadcastChannel("dsai_chat");
    bc.onmessage = (ev) => {
      if (ev?.data?.type === "history_refresh") loadHistory();
    };
    return () => bc.close();
  }, [authState, loadHistory]);

  // Handlers
  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);

    if (error) {
      alert(error.message);
      return;
    }
    window.location.replace("/login");
  };

  const handleNewChat = () => router.push("/chat");
  const handleOpenConversation = (id: string) => router.push(`/chat?cid=${id}`); // ✅ 改成 cid

  const handleRenameConversation = (e: React.MouseEvent, id: string, currentTitle: string | null) => {
    e.stopPropagation();
    openRename({
      conversationId: id,
      initialTitle: currentTitle ?? "",
      onDone: async () => {
        await loadHistory();
      },
    });
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string, currentTitle: string | null) => {
    e.stopPropagation();
    openDeleteChat({
      conversationId: id,
      title: currentTitle ?? null,
      onDone: async () => {
        if (activeConversationId === id) router.push("/chat");
        await loadHistory();
      },
    });
  };

  const filteredConvos = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) => (c.title ?? "").toLowerCase().includes(q));
  }, [convos, historyQuery]);

  // Loading / Guest States
  if (authState === "checking") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500 text-sm">
        Checking session...
      </div>
    );
  }

  if (authState === "guest") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500 text-sm">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-zinc-950 transition-colors duration-300 overflow-hidden font-sans">
      {/* Sidebar Container */}
      <aside className="hidden lg:flex w-20 xl:w-[280px] flex-shrink-0 bg-zinc-50/50 dark:bg-zinc-900/30 border-r border-zinc-200 dark:border-zinc-800 flex-col relative z-20">
        
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-center xl:justify-start px-4 xl:px-6 mb-2">
          <div className="flex items-center gap-3 text-zinc-900 dark:text-white">
            <div className="p-2 bg-white dark:bg-zinc-200 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700/50">
              <Hexagon size={20} strokeWidth={2.5} className="text-zinc-600 dark:text-zinc-400" />
            </div>
            <span className="hidden xl:block text-lg font-bold tracking-tight">DSAI</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-none px-3 xl:px-4 space-y-1">
          <NavButton href="/chat" active={pathname === "/chat" && !activeConversationId} icon={<MessageSquare size={18} />} label="New Chat" />
          <NavButton href="/dashboard" active={pathname === "/dashboard"} icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavButton href="/settings" active={pathname === "/settings"} icon={<SettingsIcon size={18} />} label="Settings" />
        </nav>

        {/* Chat History Section */}
        <div className="flex-1 flex flex-col min-h-0 mt-6 xl:mt-8">
          {/* Section Header */}
          <div className="px-4 xl:px-6 flex items-center justify-between mb-2 group">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              History
            </span>
            <button
              onClick={handleNewChat}
              className="hidden xl:flex items-center justify-center w-5 h-5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              title="Create new chat"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-3 xl:px-4 mb-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-300 transition-colors" size={14} />
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-zinc-100 dark:bg-zinc-900/50 border-none rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 outline-none transition-all"
              />
            </div>
          </div>

          {/* Chat List (Cool Scrollbar) */}
          <div className="flex-1 overflow-y-auto px-3 xl:px-4 space-y-0.5 custom-scrollbar pb-4 hover:pr-2 transition-all">
            {loadingHistory ? (
              <div className="px-2 py-4 text-center text-xs text-zinc-400 animate-pulse">Loading history...</div>
            ) : filteredConvos.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <p className="text-xs text-zinc-400 mb-2">No conversations found</p>
                <button onClick={handleNewChat} className="text-xs text-indigo-500 hover:underline">Start a new one</button>
              </div>
            ) : (
              filteredConvos.map((c) => {
                const isActive = activeConversationId === c.id;
                const label = c.title?.trim() || "Untitled Conversation";

                return (
                  <div
                    key={c.id}
                    onClick={() => handleOpenConversation(c.id)}
                    className={`
                      group relative flex items-center w-full p-2 rounded-lg cursor-pointer transition-all border border-transparent
                      ${
                        isActive
                          ? "bg-white dark:bg-zinc-800 shadow-sm border-zinc-100 dark:border-zinc-700/50 z-10"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                      }
                    `}
                  >
                    <div className={`mr-3 ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 group-hover:text-zinc-500"}`}>
                       <MessageSquare size={14} />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-xs truncate ${isActive ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}`}>
                        {label}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 bg-gradient-to-l from-zinc-100 via-zinc-100 to-transparent dark:from-zinc-800 dark:via-zinc-800 rounded-r-lg">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleRenameConversation(e, c.id, c.title)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors"
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, c.id, c.title)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer / User Profile (Clean Version) */}
        <div className="flex-none p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between group cursor-default">
            
            {/* User Info (No Circle Icon) */}
            <div className="flex flex-col min-w-0 mr-2 hidden xl:flex">
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                 {displayName}
              </span>
              <span className="text-[10px] text-zinc-500 truncate font-mono">
                 ID: {studentId || "Guest"}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
          
          {/* Mobile Logout */}
          <button
              onClick={handleLogout}
              className="xl:hidden w-full flex items-center justify-center p-2 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden bg-white dark:bg-black">
        {children}
      </main>
      
      {/* Cool Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px; /* Initially hidden */
          background: transparent;
        }
        .custom-scrollbar:hover::-webkit-scrollbar {
          width: 4px; /* Show on hover */
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(161, 161, 170, 0.3); /* Zinc-400 with opacity */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(161, 161, 170, 0.6);
        }
      `}</style>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RenameChatModalProvider>
      <DeleteChatModalProvider>
        <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
      </DeleteChatModalProvider>
    </RenameChatModalProvider>
  );
}
