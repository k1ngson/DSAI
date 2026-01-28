"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Clock, BarChart2, MessageSquare, Trash2, Pencil, Search, Calendar, Loader2, Check, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../src/utils/supabaseClient";
import { useRouter } from "next/navigation";
import EChartsRenderer from "@/components/EChartsRenderer";
import { useRenameChatModal } from "@/components/RenameChatModalProvider";
import { useDeleteChatModal } from "@/components/DeleteChatModalProvider";

// --- Types ---
type Tab = "history" | "saved";

type ConversationItem = {
  id: string;
  title: string | null;
  updated_at: string;
  created_at: string;
};

interface SavedChart {
  id: string;
  title: string;
  chart_config: any;
  created_at: string;
}

const emailToStudentId = (email?: string | null) => (email ? email.split("@")[0] : "UNKNOWN");

// --- Delete Confirmation Modal Component ---
const DeleteChartModal = ({
  isOpen,
  chartTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  isOpen: boolean;
  chartTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-red-500/20 shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-white/10 bg-red-50 dark:bg-red-950/20">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Chart</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">This action cannot be undone</p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              disabled={isDeleting}
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{chartTitle}"</span>?
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-3 rounded-lg">
              <Calendar size={12} />
              <span>Once deleted, this chart cannot be recovered.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Chart
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Sub-component: ChartCardItem ---
const ChartCardItem = ({
  chart,
  onDelete,
  onRename,
}: {
  chart: SavedChart;
  onDelete: (id: string, title: string) => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(chart.title || "Untitled Chart");
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    setTitle(chart.title || "Untitled Chart");
  }, [chart.title]);

  const handleSaveTitle = async () => {
    if (title.trim() === chart.title || !title.trim()) {
      setTitle(chart.title || "Untitled Chart");
      setIsEditing(false);
      return;
    }

    setSavingTitle(true);
    await onRename(chart.id, title);
    setSavingTitle(false);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden group hover:border-gray-300 dark:hover:border-zinc-700 transition-colors"
    >
      {/* Card Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
        <div className="flex-1 min-w-0 mr-4">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white dark:bg-black border border-indigo-500 rounded px-2 py-1 text-sm outline-none text-black dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitle(chart.title);
                    setIsEditing(false);
                  }
                }}
                onBlur={handleSaveTitle}
              />
              <button disabled={savingTitle} className="text-green-500 shrink-0">
                {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h3
                className="font-bold text-sm truncate cursor-pointer select-none"
                title={chart.title}
                onDoubleClick={() => setIsEditing(true)}
              >
                {chart.title || "Untitled Chart"}
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-indigo-400 transition-opacity p-1"
                title="Rename (Double-click title)"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500 mt-1">
            <Calendar size={10} />
            <span>{new Date(chart.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <button
          onClick={() => onDelete(chart.id, chart.title)}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
          title="Delete Chart"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Chart Content */}
      <div className="p-4 h-[300px]">
        {/* 👇 FIX: 使用正確的 optionJson prop */}
        <EChartsRenderer
          optionJson={chart.chart_config}
          height={280}
          animate={false}
          savedId={chart.id}
          initialTitle={chart.title}
        />
      </div>
    </motion.div>
  );
};

// --- Main Page Component (Renamed to DashboardClient) ---
export default function DashboardClient() {
  const router = useRouter();
  const { openRename } = useRenameChatModal();
  const { openDeleteChat } = useDeleteChatModal();

  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const [email, setEmail] = useState<string | null>(null);

  const studentId = useMemo(() => emailToStudentId(email), [email]);

  // Data States
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [convos, setConvos] = useState<ConversationItem[]>([]);

  // Loading States
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [historyQuery, setHistoryQuery] = useState("");

  const broadcastRefresh = () => {
    if (typeof window === "undefined") return;
    const bc = new window.BroadcastChannel("dsai_chat");
    bc.postMessage({ type: "history_refresh" });
    bc.close();
  };

  // 1. Load User & Initial Data
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!data.user) {
        router.push("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      setIsLoaded(true);
      fetchCharts();
    };
    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  // 2. Fetch Saved Charts
  const fetchCharts = async () => {
    setLoadingCharts(true);
    const { data, error } = await supabase
      .from("saved_charts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching charts:", error);
    } else {
      setSavedCharts(data || []);
    }
    setLoadingCharts(false);
  };

  // 3. Fetch History
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      setConvos((data ?? []) as ConversationItem[]);
    } catch (e) {
      console.error("loadHistory error:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 4. Delete Chart - Open Modal
  const initiateDelete = (id: string, title: string) => {
    setChartToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  // 5. Confirm Delete
  const confirmDelete = async () => {
    if (!chartToDelete) return;

    setIsDeleting(true);
    const originalCharts = [...savedCharts];

    // Optimistic update
    setSavedCharts(savedCharts.filter((c) => c.id !== chartToDelete.id));

    const { error } = await supabase.from("saved_charts").delete().eq("id", chartToDelete.id);

    if (error) {
      console.error("Delete failed:", error);
      alert("Delete failed: " + error.message);
      setSavedCharts(originalCharts); // Revert
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setChartToDelete(null);
  };

  // 6. Rename Chart
  const handleRenameChart = async (id: string, newTitle: string) => {
    setSavedCharts((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));

    const { error } = await supabase.from("saved_charts").update({ title: newTitle }).eq("id", id);

    if (error) {
      console.error("Update failed", error);
      alert("Failed to update title");
      fetchCharts();
    }
  };

  // --- Handlers ---
  const openConversation = (id: string) => router.push(`/chat?c=${id}`);

  const renameConversation = (id: string, currentTitle: string | null) => {
    openRename({
      conversationId: id,
      initialTitle: currentTitle ?? "",
      onDone: async () => {
        await loadHistory();
        broadcastRefresh();
      },
    });
  };

  const deleteConversation = (id: string, title: string | null) => {
    openDeleteChat({
      conversationId: id,
      title,
      onDone: async () => {
        await loadHistory();
        broadcastRefresh();
      },
    });
  };

  const filteredConvos = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) => (c.title ?? "").toLowerCase().includes(q));
  }, [convos, historyQuery]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-full p-8 lg:p-12 overflow-y-auto bg-gray-50 dark:bg-[#050505] text-black dark:text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase text-black dark:text-white">
              My Dashboard
            </h1>
            <p className="text-gray-500 font-mono text-xs tracking-widest">
              ARCHIVES & ANALYTICS // ID: {studentId}
            </p>
          </div>

          <div className="flex p-1 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <button
              onClick={() => {
                setActiveTab("saved");
                fetchCharts();
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "saved"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-lg"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <BarChart2 size={16} />
              Saved Charts
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                loadHistory();
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "history"
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-lg"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              }`}
            >
              <Clock size={16} />
              Chat History
            </button>
          </div>
        </header>

        {/* Delete Confirmation Modal */}
        <DeleteChartModal
          isOpen={deleteModalOpen}
          chartTitle={chartToDelete?.title || ""}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setChartToDelete(null);
          }}
          isDeleting={isDeleting}
        />

        {/* Tab Content: Saved Charts */}
        {activeTab === "saved" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loadingCharts ? (
              <div className="col-span-full flex justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading charts...
              </div>
            ) : savedCharts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400">
                <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>No charts saved yet.</p>
                <p className="text-xs mt-2 text-gray-600">Go to chat and ask AI to plot a graph!</p>
              </div>
            ) : (
              savedCharts.map((chart) => (
                <ChartCardItem
                  key={chart.id}
                  chart={chart}
                  onDelete={initiateDelete}
                  onRename={handleRenameChart}
                />
              ))
            )}
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10">
              <Search size={16} className="text-gray-400" />
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search chat title..."
                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
              />
            </div>

            {loadingHistory ? (
              <div className="col-span-full flex justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading history...
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>No chat history available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConvos.map((c) => (
                  <div
                    key={c.id}
                    className="w-full p-5 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button className="flex-1 text-left min-w-0" onClick={() => openConversation(c.id)}>
                        <div className="text-sm font-bold truncate">
                          {(c.title?.trim() || "Untitled chat").slice(0, 120)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          Updated: {new Date(c.updated_at).toLocaleString()}
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => renameConversation(c.id, c.title)}
                          className="p-2 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                          title="Rename"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteConversation(c.id, c.title)}
                          className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
