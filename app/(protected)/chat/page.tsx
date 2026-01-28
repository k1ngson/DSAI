"use client";

import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { Plus, FileText, ArrowUp, X, BarChart3, Pause, Pencil, Check, ChevronDown, ChevronUp, Sparkles, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SimpleMarkdownRenderer  from "../../../components/SimpleMarkdownRenderer";
import RenameChatDialog  from "../../../components/RenameChatDialogUI";
import "./chatstyle.css";
import { supabase } from "../../../src/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import EChartsRenderer from "../../../components/EChartsRenderer";

// ---- types ----
type Role = "user" | "assistant" | "system";
type MessageUI = {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  type?: "text";
};
type StreamState = Record<
  string,
  { content: string; controller: AbortController | null; isStreaming: boolean }
>;
type DbMessageRow = {
  id: string;
  role: Role;
  content: string | null;
  chart_data: string | null;
  created_at: string;
};

const SimpleBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-black via-zinc-950 to-black"></div>
);

// ---- helpers ----
function packAssistantMessage(explanation: string, chart: string, sawChart: boolean): string {
  return `[EXPLANATION]\n${explanation}${sawChart ? `\n[CHART]\n${chart}` : "\n[CHART]\nNONE"}`;
}

function unpack(content: string): { explanation: string; chartData: string } {
  let text = content;
  if (text.startsWith("[EXPLANATION]")) {
    text = text.replace("[EXPLANATION]", "").trimStart();
  }
  const chartIdx = text.indexOf("[CHART]");
  if (chartIdx === -1) {
    return { explanation: text.trim(), chartData: "NONE" };
  }
  return {
    explanation: text.slice(0, chartIdx).trim(),
    chartData: text.slice(chartIdx + "[CHART]".length).trim() || "NONE",
  };
}

function broadcastHistoryRefresh() {
  if (typeof window === "undefined") return;
  const bc = new (window as any).BroadcastChannel("dsai-chat");
  bc.postMessage({ type: "history-refresh" });
  bc.close();
}

async function requireAccessToken(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`getSession failed: ${sessionError.message}`);
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No access token (not logged in). Please login again.");
  return token;
}

function isTmpCid(cid: string | null | undefined): boolean {
  return !!cid && cid.startsWith("tmp-");
}

function makeTmpCid(): string {
  return `tmp-${Date.now()}`;
}

function looksLikeChartRequest(text: string): boolean {
  const t = (text || "").toLowerCase();
  const keys = ["plot", "line plot", "bar chart", "scatter", "pie", "chart", "graph", "visualize", "visualise", "echarts"];
  return keys.some((k) => t.includes(k));
}

function findPrevUserText(messages: MessageUI[], assistantMsgId: string): string {
  const idx = messages.findIndex((m) => m.id === assistantMsgId);
  if (idx <= 0) return "";
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

async function mockRewritePrompt(original: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  if (!original) return "";
  return `Could you please provide a detailed analysis regarding "${original}"? I am particularly interested in key trends, data visualization, and a comprehensive breakdown of the underlying factors.`;
}

// ---- MessageBubble ----
const MessageBubble = memo(
  ({
    msg,
    explanation,
    isStreaming,
    chartData,
    canEdit,
    isEditing,
    editValue,
    onEditStart,
    onEditChange,
    onEditCancel,
    onEditSave,
    expectedChart,
  }: {
    msg: MessageUI;
    explanation: string;
    isStreaming: boolean;
    chartData: string;
    canEdit: boolean;
    isEditing: boolean;
    editValue: string;
    onEditStart: (id: string, current: string) => void;
    onEditChange: (v: string) => void;
    onEditCancel: () => void;
    onEditSave: (id: string) => void;
    expectedChart: boolean;
  }) => {
    const [expanded, setExpanded] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (isEditing && editTextareaRef.current) {
        editTextareaRef.current.style.height = "auto";
        editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
      }
    }, [isEditing, editValue]);

    const showChart = msg.role === "assistant" && chartData !== "NONE" && typeof chartData === "string" && chartData.trim().length > 0;
    const showChartGenerating = msg.role === "assistant" && expectedChart && (!chartData || chartData === "NONE") && explanation.trim().length > 0;

    return (
      <div className="w-full mb-6 flex flex-col">
        <div
          className={`relative px-5 py-4 rounded-2xl border shadow-sm group ${
            msg.role === "user"
              ? "self-end bg-zinc-800/30 border-white/5 max-w-[70%]"
              : "self-start bg-transparent border-white/5 w-full max-w-full"
          }`}
        >
          {canEdit && !isEditing && (
            <button
              onClick={() => onEditStart(msg.id, msg.role === "user" ? msg.content : explanation)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10"
              title="Edit"
              type="button"
            >
              <Pencil size={12} />
            </button>
          )}

          <div className="text-base leading-relaxed">
            {!isEditing ? (
              <SimpleMarkdownRenderer content={explanation} />
            ) : (
              <div className="text-left w-full">
                <textarea
                  ref={editTextareaRef}
                  value={editValue}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="w-full min-h-[120px] bg-black/40 border border-zinc-700/60 rounded-xl p-4 text-base text-white outline-none focus:border-indigo-500/50 transition-colors resize-none leading-relaxed"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={onEditCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors" type="button">
                    Cancel
                  </button>
                  <button onClick={() => onEditSave(msg.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-2" type="button">
                    <Check size={14} /> Save & Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>

          {(showChartGenerating || showChart) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  <BarChart3 size={16} className="text-indigo-400" />
                  Data Visualization
                </div>

                {showChart && (
                  <button onClick={() => setExpanded((v) => !v)} className="text-xs px-3 py-1.5 rounded-full bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60 border border-white/10 flex items-center gap-1" type="button">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                )}
              </div>

              {showChartGenerating && (
                <div className="w-full rounded-xl border border-white/10 bg-black/20 p-6 flex flex-col items-center justify-center gap-3">
                  <div className="flex items-end gap-1 h-8">
                    <motion.div animate={{ height: [10, 24, 10] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 bg-indigo-500/80 rounded-sm" />
                    <motion.div animate={{ height: [16, 32, 16] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.1 }} className="w-2 bg-indigo-400/80 rounded-sm" />
                    <motion.div animate={{ height: [12, 20, 12] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-2 bg-indigo-300/80 rounded-sm" />
                    <motion.div animate={{ height: [20, 12, 20] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }} className="w-2 bg-indigo-200/80 rounded-sm" />
                  </div>
                  <div className="text-sm font-medium text-zinc-300 animate-pulse">Generating graph...</div>
                </div>
              )}

              {showChart && <EChartsRenderer optionJson={chartData} height={expanded ? 560 : 360} className="mt-2" animate={true} />}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";

function SkeletonBubbles() {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-6 pb-44 w-full">
      <div className="mb-6 flex justify-end">
        <div className="px-5 py-4 rounded-2xl bg-zinc-800/20 border border-white/5 max-w-[60%]">
          <div className="h-4 w-32 bg-zinc-700/30 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="mb-6 flex justify-start">
        <div className="px-5 py-4 rounded-2xl bg-zinc-900/25 border border-white/10 max-w-[70%]">
          <div className="h-4 w-64 bg-zinc-700/30 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-zinc-700/25 rounded animate-pulse mt-3"></div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("c");

  const [conversationId, setConversationId] = useState<string | null>(conversationIdFromUrl);
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [streamState, setStreamState] = useState<StreamState>({});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const [currentStreamingMsgId, setCurrentStreamingMsgId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [tmpCid, setTmpCid] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStreamBufferRef = useRef<{ text: string; chart: string; sawChart: boolean } | null>(null);
  const lastLoadedCidRef = useRef<string | null>(null);

  const isChatting = messages.length > 0;
  const hasCid = !!conversationIdFromUrl;
  const isConversationMode = hasCid;
  const isTmpConversationInUrl = isTmpCid(conversationIdFromUrl);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // 靜默更新 URL
  const replaceConversationQuery = useCallback(
    (cid: string) => {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("c", cid);
        window.history.replaceState({}, "", url.toString());
        // 更新 state，但不觸發 router 刷新
        setConversationId(cid);
      }
    },
    []
  );

  const createConversation = useCallback(async () => {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw new Error(sessionErr.message);
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Not logged in");
    const { data, error } = await supabase.from("conversations").insert({ user_id: userId, title: null }).select("id").single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }, []);

  const setConversationTitle = useCallback(async (cid: string, title: string) => {
    const cleaned = title.trim().slice(0, 80) || "Untitled chat";
    const { error } = await supabase.from("conversations").update({ title: cleaned }).eq("id", cid);
    if (error) throw new Error(error.message);
  }, []);

  const updateUserMessage = useCallback(async (messageId: string, newContent: string) => {
    const { error } = await supabase.from("messages").update({ content: newContent }).eq("id", messageId);
    if (error) throw new Error(error.message);
  }, []);

  const deleteMessagesAfter = useCallback(async (cid: string, afterCreatedAtIso: string) => {
    const { error } = await supabase.from("messages").delete().eq("conversation_id", cid).gt("created_at", afterCreatedAtIso);
    if (error) throw new Error(error.message);
  }, []);

  const loadMessages = useCallback(async (cid: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, chart_data, created_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ui: MessageUI[] =
      (data as DbMessageRow[] | null)?.map((m) => {
        const packed =
          m.role === "assistant"
            ? packAssistantMessage(m.content ?? "", m.chart_data ?? "NONE", m.chart_data !== null)
            : m.content ?? "";
        return {
          id: m.id,
          role: m.role,
          content: packed,
          timestamp: new Date(m.created_at).getTime(),
          type: "text",
        };
      }) ?? [];
    setMessages(ui);
    lastLoadedCidRef.current = cid;
    
    // 只有在真的需要時才滾動 (避免編輯時亂跳)
    if (ui.length > 0) {
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, []);

  // ✅ FIX: 核心修復 - 智能 Loading 控制
  useEffect(() => {
    const cid = conversationIdFromUrl;
    if (!cid) {
      setConversationId(null);
      setTmpCid(null);
      setMessages([]);
      setStreamState({});
      setCurrentStreamingMsgId(null);
      setIsLoading(false);
      setLoadingHistory(false);
      lastLoadedCidRef.current = null;
      return;
    }
    
    setConversationId(cid);
    if (!hasHydrated) return;

    // 如果正在串流，絕對不要重載 (防止 URL 變化導致的刷新)
    if (currentStreamingMsgId) {
      setLoadingHistory(false);
      return;
    }

    // 如果已經有這個對話的訊息（例如剛發送完第一條），也不要顯示 Loading
    // 這樣即使背景重抓資料，使用者也不會感覺到閃爍
    const alreadyHasMessages = lastLoadedCidRef.current === cid || (messages.length > 0 && conversationId === cid);
    
    // 只有當「完全沒有資料」且「不是臨時對話」時，才顯示骨架屏
    if (!alreadyHasMessages && !isTmpCid(cid)) {
      setLoadingHistory(true);
    }

    if (isTmpCid(cid)) {
      setLoadingHistory(false);
      return;
    }

    // 執行加載 (如果是已經有資料的情況，這就是一個「靜默更新」)
    const run = () =>
      loadMessages(cid)
        .catch((e) => console.error(e))
        .finally(() => setLoadingHistory(false));
        
    const ric = (window as any).requestIdleCallback as
      | undefined
      | ((cb: () => void, opts?: { timeout?: number }) => number);
      
    if (ric) {
      const id = ric(run, { timeout: 1200 });
      return () => (window as any).cancelIdleCallback?.(id);
    } else {
      const t = window.setTimeout(run, 0);
      return () => window.clearTimeout(t);
    }
  }, [conversationIdFromUrl, hasHydrated, currentStreamingMsgId, loadMessages]); // 移除 messages 依賴，防止循環

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setStreamState({});
    setInput("");
    setAttachedFile(null);
    setIsLoading(false);
    setCurrentStreamingMsgId(null);
    setConversationId(null);
    setTmpCid(null);
    setEditingMsgId(null);
    setEditingValue("");
    setLoadingHistory(false);
    lastLoadedCidRef.current = null;
    router.push("/chat");
  }, [router]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsUserScrolling(distanceFromBottom > 100);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const sendStreamRequest = useCallback(
    async (userMsg: MessageUI, cid: string) => {
      const botMsgId = `tmp-assistant-${Date.now()}`;
      setCurrentStreamingMsgId(botMsgId);
      setIsUserScrolling(false);

      activeStreamBufferRef.current = { text: "", chart: "", sawChart: false };
      
      const controller = new AbortController();
      setStreamState((prev) => ({
        ...prev,
        [botMsgId]: { content: "", controller, isStreaming: true },
      }));

      const EXPLTAG = "[EXPLANATION]";
      const CHARTTAG = "[CHART]";
      const KEEPFORTAG = CHARTTAG.length - 1;

      let buffer = "";
      let sawChart = false;
      let seenExplanationTag = false;
      let streamedText = "";
      let chartBuf = "";
      let mode: "explanation" | "chart" = "explanation";
      
      let hasAddedAssistantMsg = false;

      const ensureAssistantMsgInUI = () => {
        if (!hasAddedAssistantMsg) {
          hasAddedAssistantMsg = true;
          setMessages((prev) => [
            ...prev,
            { id: botMsgId, role: "assistant", content: "", type: "text", timestamp: Date.now() },
          ]);
        }
      };

      const updateStreaming = (explanation: string) => {
        setStreamState((prev) => ({
          ...prev,
          [botMsgId]: { ...prev[botMsgId], content: explanation },
        }));
      };

      const persistToMessagesUI = (explanation: string, chart: string) => {
        const packed = packAssistantMessage(explanation, chart, sawChart);
        setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: packed } : m)));
      };

      const syncBuffer = (txt: string, chart: string, saw: boolean) => {
        activeStreamBufferRef.current = { text: txt, chart: chart, sawChart: saw };
        updateStreaming(txt);
      };

      const token = await requireAccessToken();

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      try {
        const response = await fetch(`${API_URL}/stream-analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            conversation_id: cid,
            user_query: userMsg.content,
            context_text: attachedFile?.content || "",
            need_reasoning: isDeepThink,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`API Error ${response.status}`);
        if (!response.body) throw new Error("Response body is null");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        const processBuffer = () => {
          while (buffer.length > 0) {
            ensureAssistantMsgInUI();

            if (!seenExplanationTag) {
              const idx = buffer.indexOf(EXPLTAG);
              if (idx === -1) {
                const keep = EXPLTAG.length - 1;
                buffer = buffer.length > keep ? buffer.slice(-keep) : buffer;
                return;
              }
              buffer = buffer.slice(idx + EXPLTAG.length);
              seenExplanationTag = true;
              continue;
            }

            if (mode === "explanation") {
              const idx = buffer.indexOf(CHARTTAG);
              if (idx !== -1) {
                const delta = buffer.slice(0, idx);
                if (delta) {
                  streamedText += delta;
                  syncBuffer(streamedText.trimStart(), chartBuf, sawChart);
                }
                buffer = buffer.slice(idx + CHARTTAG.length);
                sawChart = true;
                mode = "chart";
                if (activeStreamBufferRef.current) activeStreamBufferRef.current.sawChart = true;
                continue;
              }

              if (buffer.length > KEEPFORTAG) {
                const safe = buffer.slice(0, buffer.length - KEEPFORTAG);
                streamedText += safe;
                syncBuffer(streamedText.trimStart(), chartBuf, sawChart);
                buffer = buffer.slice(buffer.length - KEEPFORTAG);
              }
              return;
            }

            if (mode === "chart") {
              chartBuf += buffer;
              buffer = "";
              if (activeStreamBufferRef.current) activeStreamBufferRef.current.chart = chartBuf;
              return;
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          processBuffer();

          if (!isUserScrolling && messagesContainerRef.current) {
            setTimeout(() => {
                if (!isUserScrolling) {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }
            }, 50);
          }
        }
        
        ensureAssistantMsgInUI();

        if (buffer) {
          if (!seenExplanationTag) streamedText += buffer;
          else if (mode === "explanation") streamedText += buffer;
          else chartBuf += buffer;
          buffer = "";
        }

        const finalExplanation = streamedText.trimStart();
        const finalChartData = sawChart ? chartBuf.trim() || "NONE" : "NONE";

        persistToMessagesUI(finalExplanation, finalChartData);

        // ✅ 移除這裡的 loadMessages，防止重複閃爍
        // if (!isTmpCid(cid)) await loadMessages(cid); 
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.log("Stream stopped. Rescuing data from buffer ref...");
          const savedData = activeStreamBufferRef.current;
          let finalText = streamedText;
          let finalChart = chartBuf;
          let finalSawChart = sawChart;
          if (savedData) {
            finalText = savedData.text || streamedText;
            finalChart = savedData.chart || chartBuf;
            finalSawChart = savedData.sawChart || sawChart;
          }
          if (buffer) {
            if (mode === "explanation") finalText += buffer;
          }
          ensureAssistantMsgInUI();
          const safeText = finalText.trimStart();
          const safeChart = finalSawChart ? finalChart.trim() || "NONE" : "NONE";
          persistToMessagesUI(safeText, safeChart);
        } else if (err instanceof Error) {
          ensureAssistantMsgInUI();
          const packed = `[EXPLANATION]\n${err.message}`;
          setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: packed } : m)));
        }
      } finally {
        setIsLoading(false);
        setStreamState((prev) => ({
          ...prev,
          [botMsgId]: { ...prev[botMsgId], isStreaming: false },
        }));
        setCurrentStreamingMsgId(null);
        activeStreamBufferRef.current = null;
      }
    },
    [attachedFile, isDeepThink, isUserScrolling] // remove loadMessages dep
  );

  const stopStream = useCallback(() => {
    if (!currentStreamingMsgId) return;

    const currentBuffer = activeStreamBufferRef.current;
    if (currentBuffer) {
      const botId = currentStreamingMsgId;
      const packed = packAssistantMessage(currentBuffer.text, currentBuffer.chart, currentBuffer.sawChart);
      setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: packed } : m)));
    }

    const stream = streamState[currentStreamingMsgId];
    if (stream?.controller) {
      stream.controller.abort();
      console.log("Stop signal sent");
    }
  }, [streamState, currentStreamingMsgId]);

  const parseMessageContent = useCallback(
    (content: string, messageId: string): { explanation: string; chartData: string } => {
      const stream = streamState[messageId];
      if (stream?.isStreaming) {
        return { explanation: stream.content || "", chartData: "NONE" };
      }
      return unpack(content);
    },
    [streamState]
  );

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "36px";
    const scrollHeight = textareaRef.current.scrollHeight;
    const maxHeight = isChatting ? 120 : 100;
    textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, [input, isChatting]);

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;
    if (isLoading) return;

    setIsLoading(true);
    setIsUserScrolling(false);

    const userContent = attachedFile ? `${input}\n\n[File: ${attachedFile.name}]` : input;
    const userMsg: MessageUI = {
      id: `tmp-user-${Date.now()}`,
      role: "user",
      content: userContent,
      timestamp: Date.now(),
      type: "text",
    };

    const urlCid = conversationIdFromUrl;

    if (!urlCid) {
      const newTmp = makeTmpCid();
      setTmpCid(newTmp);
      setConversationId(newTmp);
      replaceConversationQuery(newTmp);
      setMessages([userMsg]);
      setInput("");
      setAttachedFile(null);

      try {
        const realCid = await createConversation();
        
        // 這裡不需要立即 setConversationId(realCid)，因為 replaceConversationQuery 會觸發
        // 但為了 UI 穩定，我們同步狀態
        setConversationId(realCid);
        setTmpCid(null);
        await setConversationTitle(realCid, userContent);
        broadcastHistoryRefresh();
        
        // 先切換 URL，這會觸發 useEffect，但因為 currentStreamingMsgId 即將被設置
        // 或者我們可以利用 lastLoadedCidRef 來防止重載
        lastLoadedCidRef.current = realCid; 
        replaceConversationQuery(realCid);

        await sendStreamRequest(userMsg, realCid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessages((prev) => [
          ...prev,
          {
            id: `tmp-assistant-err-${Date.now()}`,
            role: "assistant",
            content: `[EXPLANATION]\n❌ Error creating chat: ${msg}`,
            timestamp: Date.now(),
            type: "text",
          },
        ]);
        setIsLoading(false);
      }
      return;
    }

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFile(null);

    if (isTmpCid(urlCid)) {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-assistant-err-${Date.now()}`,
          role: "assistant",
          content: "[EXPLANATION]\n⏳ Your conversation is still initializing. Please retry in a second.",
          timestamp: Date.now(),
          type: "text",
        },
      ]);
      return;
    }

    await sendStreamRequest(userMsg, urlCid);
  };

  const handleEditStart = useCallback((id: string, current: string) => {
    setEditingMsgId(id);
    setEditingValue(current);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMsgId(null);
    setEditingValue("");
  }, []);

  const handleEditSave = useCallback(
    async (messageId: string) => {
      const newText = editingValue.trim();
      if (!newText) return;

      setIsLoading(true);
      setIsUserScrolling(false);

      const isTmpMsg = messageId.startsWith("tmp-");
      if (!isTmpMsg) {
        if (!conversationId || isTmpCid(conversationId)) return;
        await updateUserMessage(messageId, newText);

        const msgRow = messages.find((m) => m.id === messageId);
        if (msgRow) {
          const { data: rowData } = await supabase.from("messages").select("created_at").eq("id", messageId).single();
          if (rowData) await deleteMessagesAfter(conversationId, rowData.created_at);
        }
      }

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === messageId);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], content: newText };
        return copy.slice(0, idx + 1);
      });

      setEditingMsgId(null);
      setEditingValue("");

      const userMsg: MessageUI = {
        id: messageId,
        role: "user",
        content: newText,
        timestamp: Date.now(),
        type: "text",
      };
      const targetCid = conversationId || makeTmpCid();
      await sendStreamRequest(userMsg, targetCid);
    },
    [conversationId, deleteMessagesAfter, editingValue, messages, sendStreamRequest, updateUserMessage]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedFile({ name: file.name, content: ev.target?.result as string });
    };
    reader.onerror = () => alert(`Failed to read file ${file.name}`);
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRewritePrompt = async () => {
    if (!input.trim() || isRewriting) return;
    setIsRewriting(true);
    try {
      const enhanced = await mockRewritePrompt(input);
      setInput(enhanced);
    } finally {
      setIsRewriting(false);
    }
  };

  const canEditMessages = useMemo(() => !currentStreamingMsgId && !isLoading, [currentStreamingMsgId, isLoading]);

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden">
      <SimpleBackground />

      <header className="flex-shrink-0 h-16 flex items-center justify-end px-6 z-50 gap-2">
        <button
          onClick={() => setRenameOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/60 border border-white/10"
          title="Rename"
          disabled={!conversationId || isTmpCid(conversationId)}
        >
          Rename
        </button>
        <button onClick={handleNewChat} className="p-2 hover:bg-black/5 rounded-full text-zinc-400 transition-all" title="New Chat">
          <Plus size={22} />
        </button>
      </header>

      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto w-full custom-scrollbar relative">
          {isConversationMode ? (
            loadingHistory || (!isChatting && !isTmpConversationInUrl) ? (
              <SkeletonBubbles />
            ) : (
              <div className="max-w-4xl mx-auto px-6 pt-6 pb-44 w-full">
                {!isChatting && isTmpConversationInUrl ? (
                  <SkeletonBubbles />
                ) : (
                  <>
                    {messages.map((msg) => {
                      const { explanation, chartData } = parseMessageContent(msg.content, msg.id);
                      const isStreaming = streamState[msg.id]?.isStreaming || false;
                      const isEditing = editingMsgId === msg.id;
                      const canEdit = canEditMessages && msg.role === "user";
                      const prevUser = msg.role === "assistant" ? findPrevUserText(messages, msg.id) : "";
                      const expectedChart = msg.role === "assistant" && looksLikeChartRequest(prevUser);

                      return (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          explanation={explanation}
                          isStreaming={isStreaming}
                          chartData={chartData}
                          canEdit={canEdit}
                          isEditing={isEditing}
                          editValue={editingValue}
                          onEditStart={handleEditStart}
                          onEditChange={setEditingValue}
                          onEditCancel={handleEditCancel}
                          onEditSave={handleEditSave}
                          expectedChart={expectedChart}
                        />
                      );
                    })}
                    
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                      <div className="flex items-center text-zinc-400 text-sm px-6 py-2">
                        <span className="animate-pulse">{isDeepThink ? "Deep thinking..." : "Thinking..."}</span>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <h1 className="text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-800 -translate-y-40">
                DSAI
              </h1>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isLoading && currentStreamingMsgId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-32 left-0 right-0 z-50 flex justify-center pointer-events-none"
            >
              <button onClick={stopStream} className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-lg backdrop-blur transition-all active:scale-95 cursor-pointer">
                <StopCircle size={18} />
                <span className="font-bold text-sm tracking-wide">Stop Generating</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`w-full flex justify-center px-6 z-50 transition-all duration-500 ${isConversationMode ? "relative pb-6 items-end" : "absolute top-[43%] items-start"}`}>
          <motion.div layout transition={{ type: "spring", stiffness: 300, damping: 35 }} className="w-full max-w-2xl">
            <div className="relative">
              <div className="relative flex flex-col bg-zinc-950/60 backdrop-blur-xl border border-zinc-700/30 rounded-[32px] shadow-xl overflow-hidden group focus-within:ring-1 focus-within:ring-white/20 transition-all">
                {attachedFile && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-5 pt-3">
                    <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-xl w-fit border border-white/10">
                      <FileText size={14} className="text-white-500" />
                      <span className="text-xs font-bold text-zinc-300">{attachedFile.name}</span>
                      <X size={12} className="cursor-pointer text-zinc-400 hover:text-red-500" onClick={() => setAttachedFile(null)} />
                    </div>
                  </motion.div>
                )}

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent border-none focus:ring-0 outline-none focus:outline-none shadow-none text-base text-white px-5 py-3 resize-none min-h-[56px] custom-scrollbar placeholder:text-zinc-500 font-medium"
                />

                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all" title="Attach file">
                      <Plus size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.json,.csv,.pdf,.doc,.docx" />

                    <button
                      onClick={() => setIsDeepThink(!isDeepThink)}
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase transition-all border ${
                        isDeepThink ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-zinc-500 border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      Deep Think
                    </button>

                    <button
                      onClick={handleRewritePrompt}
                      disabled={!input.trim() || isRewriting}
                      className={`p-2 rounded-full transition-all flex items-center gap-1 ${
                        input.trim() ? "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10" : "text-zinc-600 cursor-not-allowed"
                      }`}
                      title="Enhance prompt with AI"
                    >
                      <Sparkles size={16} className={isRewriting ? "animate-spin" : ""} />
                    </button>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !attachedFile) || isLoading}
                    className={`p-2 rounded-2xl transition-all duration-300 ${
                      (!input.trim() && !attachedFile) || isLoading
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-white text-black hover:scale-110 shadow-lg shadow-white/10"
                    }`}
                  >
                    {isLoading ? <Pause size={18} fill="currentColor" /> : <ArrowUp size={18} strokeWidth={3} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <RenameChatDialog
        open={renameOpen}
        initialValue={messages.find((m) => m.role === "user")?.content || "".slice(0, 80)}
        loading={renameLoading}
        onClose={() => setRenameOpen(false)}
        onConfirm={async (val) => {
          if (!conversationId || isTmpCid(conversationId)) return;
          setRenameLoading(true);
          try {
            await setConversationTitle(conversationId, val);
            setRenameOpen(false);
            broadcastHistoryRefresh();
          } finally {
            setRenameLoading(false);
          }
        }}
      />
    </div>
  );
}
