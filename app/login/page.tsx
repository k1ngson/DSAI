"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Lock, User as UserIcon, Hexagon } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/utils/supabaseClient";

// ✅ Make animation client-only to avoid hydration mismatch from random values.
// Next.js supports disabling SSR for specific components via dynamic(..., { ssr: false }). [page:0]
const MathAnimation = dynamic(() => import("../../components/MathAnimation"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#050505]" />,
});

// PolyU email mapping: id -> id@connect.polyu.hk
const studentIdToEmail = (studentId: string) => {
  const sid = studentId.trim();
  return sid.includes("@") ? sid : `${sid}@connect.polyu.hk`;
};

export default function LoginPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const sid = studentId.trim();
    if (!sid || !password) return;

    setIsLoading(true);
    try {
      const email = studentIdToEmail(sid);

      // Supabase email+password sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMsg("Login failed: missing session.");
        setIsLoading(false);
        return;
      }

      // Login success -> go to chat
      router.push("/chat");
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err instanceof Error ? err.message : "Unknown login error");
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans">
      {/* LEFT PANEL */}
      <div className="hidden lg:block relative w-[60%] h-full bg-[#050505] overflow-hidden border-r border-white/5">
        <div className="absolute inset-0">
          <MathAnimation />
        </div>

        <div className="absolute top-12 left-12 z-20 pointer-events-none mix-blend-difference">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Hexagon size={32} className="text-white fill-white/10" strokeWidth={1} />
              <span className="text-2xl font-black tracking-tight text-white">DSAI</span>
            </div>
            <p className="text-sm font-mono text-gray-400 max-w-xs leading-relaxed">
              Neural Architecture v2.0
              <br />
              Data Science & Mathematics Engine
            </p>
          </motion.div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[40%] h-full flex flex-col justify-center items-center p-8 relative z-10 bg-black text-white">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <Hexagon size={24} className="text-white" />
          <span className="font-bold">DSAI</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight mb-2 text-white">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Enter your PolyU Student ID and password to continue.</p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-sm font-medium text-gray-400 mb-1.5 group-focus-within:text-blue-500 transition-colors">
                  Student ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="e.g. xxxxxxxxd"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 font-mono">
                  Will sign in as:{" "}
                  <span className="text-gray-300">
                    {studentId ? studentIdToEmail(studentId) : "id@connect.polyu.hk"}
                  </span>
                </p>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-400 mb-1.5 group-focus-within:text-blue-500 transition-colors">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 hover:shadow-blue-600/30"
            >
              {isLoading ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-150" />
                </div>
              ) : (
                <span className="flex items-center">
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 font-mono">
              System Protected by <span className="text-gray-300">DSAI SecureAuth™</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
