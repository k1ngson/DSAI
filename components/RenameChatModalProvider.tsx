"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import RenameChatDialogUI from "./RenameChatDialogUI";
import { supabase } from "../src/utils/supabaseClient";

type OpenRenameArgs = {
  conversationId: string;
  initialTitle: string;
  onDone?: (newTitle: string) => void;
};

type Ctx = {
  openRename: (args: OpenRenameArgs) => void;
};

const RenameChatModalContext = createContext<Ctx | null>(null);

export function useRenameChatModal() {
  const ctx = useContext(RenameChatModalContext);
  if (!ctx) throw new Error("useRenameChatModal must be used within RenameChatModalProvider");
  return ctx;
}

export default function RenameChatModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [conversationId, setConversationId] = useState<string>("");
  const [initialTitle, setInitialTitle] = useState<string>("");
  const [onDone, setOnDone] = useState<((t: string) => void) | undefined>(undefined);

  const openRename = useCallback((args: OpenRenameArgs) => {
    setConversationId(args.conversationId);
    setInitialTitle(args.initialTitle);
    setOnDone(() => args.onDone);
    setOpen(true);
  }, []);

  const api = useMemo(() => ({ openRename }), [openRename]);

  return (
    <RenameChatModalContext.Provider value={api}>
      {children}

      <RenameChatDialogUI
        open={open}
        initialValue={initialTitle}
        loading={loading}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        onConfirm={async (val: string) => {
          if (!conversationId) return;
          setLoading(true);
          try {
            const cleaned = val.trim().slice(0, 80) || "Untitled chat";
            const { error } = await supabase
              .from("conversations")
              .update({ title: cleaned })
              .eq("id", conversationId);

            if (error) throw new Error(error.message);

            setOpen(false);
            onDone?.(cleaned);

            const bc = new window.BroadcastChannel("dsai_chat");
            bc.postMessage({ type: "history_refresh" });
            bc.close();
          } finally {
            setLoading(false);
          }
        }}
      />
    </RenameChatModalContext.Provider>
  );
}
