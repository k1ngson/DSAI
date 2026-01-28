"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import ConfirmDeleteDialogUI from "./ConfirmDeleteDialogUI";
import { supabase } from "../src/utils/supabaseClient";

type OpenDeleteArgs = {
  conversationId: string;
  title?: string | null;
  onDone?: () => void;
};

type Ctx = {
  openDeleteChat: (args: OpenDeleteArgs) => void;
};

const DeleteChatModalContext = createContext<Ctx | null>(null);

export function useDeleteChatModal() {
  const ctx = useContext(DeleteChatModalContext);
  if (!ctx) throw new Error("useDeleteChatModal must be used within DeleteChatModalProvider");
  return ctx;
}

export default function DeleteChatModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [conversationId, setConversationId] = useState<string>("");
  const [title, setTitle] = useState<string | null>(null);
  const [onDone, setOnDone] = useState<(() => void) | undefined>(undefined);

  const openDeleteChat = useCallback((args: OpenDeleteArgs) => {
    setConversationId(args.conversationId);
    setTitle(args.title ?? null);
    setOnDone(() => args.onDone);
    setOpen(true);
  }, []);

  const api = useMemo(() => ({ openDeleteChat }), [openDeleteChat]);

  const broadcastRefresh = () => {
    const bc = new window.BroadcastChannel("dsai_chat");
    bc.postMessage({ type: "history_refresh" });
    bc.close();
  };

  return (
    <DeleteChatModalContext.Provider value={api}>
      {children}

      <ConfirmDeleteDialogUI
        open={open}
        title="Delete this chat?"
        description={`This will delete the conversation and all messages inside it.${
          title?.trim() ? `\n\nChat: "${title.trim().slice(0, 80)}"` : ""
        }`}
        confirmText="Delete chat"
        cancelText="Cancel"
        danger
        loading={loading}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={async () => {
          if (!conversationId) return;
          setLoading(true);
          try {
            const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
            if (error) throw new Error(error.message);

            setOpen(false);
            onDone?.();
            broadcastRefresh();
          } finally {
            setLoading(false);
          }
        }}
      />
    </DeleteChatModalContext.Provider>
  );
}
