"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sun, LogOut, Shield, Zap, Lock, Activity, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../../src/utils/supabaseClient";

type Theme = "dark" | "light";

const TOKEN_LIMITS = {
  student: 20000,
  teacher: 40000,
  admin: 150000
};

const emailToStudentId = (email?: string | null) => (email ? email.split("@")[0] : "UNKNOWN");

// ✅ Renamed to SettingsClient
export default function SettingsClient() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: 12000 });

  const studentId = useMemo(() => emailToStudentId(email), [email]);
  const displayName = useMemo(() => (studentId ? `Student ${studentId}` : "Student"), [studentId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = authData.user;
      setEmail(user?.email ?? null);

      if (user) {
        // 1. Fetch Real Role from 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const realRole = profile?.role || "student";
        setRole(realRole);

        // 2. Fetch Token Usage
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await supabase
          .from('daily_token_usage')
          .select('used_tokens')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();
        
        const limit = TOKEN_LIMITS[realRole as keyof typeof TOKEN_LIMITS] || 12000;
        
        setTokenUsage({
          used: usageData?.used_tokens || 0,
          limit: limit
        });
      }

      // Force Dark Mode
      const savedTheme = "dark"; 
      applyTheme(savedTheme);
      setTheme(savedTheme);
      setIsLoaded(true);
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const applyTheme = (currentTheme: Theme) => {
    if (currentTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    window.location.href = "/login";
  };

  if (!isLoaded) return null;

  // Calculate percentage
  const usagePercent = Math.min((tokenUsage.used / tokenUsage.limit) * 100, 100);
  const isLowBattery = usagePercent > 80;

  return (
    <div className="min-h-full p-8 lg:p-12 overflow-y-auto bg-gray-50 dark:bg-[#050505] text-black dark:text-white transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase">System Configuration</h1>
          <p className="text-gray-500 font-mono text-xs tracking-widest">USER_PREFERENCES // ID: {studentId}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Col: Digital ID Card & Usage Stats */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* ID Card */}
            <motion.div
              initial={{ rotateX: 20, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden bg-black dark:bg-[#111] text-white shadow-2xl group perspective-1000 border border-white/5"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_20%,transparent_75%)] bg-[length:250%_250%] animate-shine pointer-events-none"></div>

              <div className="relative z-20 p-8 lg:p-7 flex flex-col justify-between h-full border border-white/10 rounded-3xl m-1.5">
                <div className="flex justify-between items-start">
                  <div className="h-5"></div>
                  <Shield size={22} className="opacity-100" />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.25em] leading-none">
                    Identity
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white/90">{displayName}</h2>
                  <p className="font-mono text-sm opacity-40 tracking-[0.2em]">
                    {studentId !== "UNKNOWN" ? studentId.match(/.{1,4}/g)?.join(" ") : "0000 0000"}
                  </p>
                </div>

                <div className="flex justify-between items-end border-t border-white/10 pt-5">
                  <div>
                    <p className="text-[9px] uppercase text-gray-500 tracking-[0.3em] font-bold mb-1">Access Level</p>
                    <p className="text-base font-black tracking-widest text-white uppercase">{role}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${role === 'admin' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.3)] ${role === 'admin' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Token Usage Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 shadow-sm transition-all hover:border-black/20 dark:hover:border-white/20">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500"/>
                    Daily Token Usage
                 </h3>
                 <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isLowBattery ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {usagePercent.toFixed(1)}%
                 </span>
              </div>
              
              <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2 text-gray-500">
                        <span>USED: {tokenUsage.used.toLocaleString()}</span>
                        <span>LIMIT: {tokenUsage.limit.toLocaleString()}</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-4 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5 relative">
                        {/* Striped Background Pattern */}
                        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] dark:bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff_100%)] bg-[length:10px_10px]"></div>
                        
                        {/* Actual Progress */}
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full relative z-10 ${isLowBattery ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                        />
                    </div>
                  </div>

                  {isLowBattery && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                          <p>Warning: You are approaching your daily limit. Please conserve usage or request an upgrade.</p>
                      </div>
                  )}
              </div>
            </div>
          </div>

          {/* Right Col: Settings Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 🔒 Theme Switcher (DISABLED) */}
            <div className="relative p-6 rounded-3xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 flex items-center justify-between opacity-60 cursor-not-allowed select-none overflow-hidden group">
              <div className="absolute inset-0 bg-gray-100/10 dark:bg-black/20 backdrop-blur-[1px] z-20 flex items-center justify-center">
                 <div className="bg-black/80 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2 border border-white/20 shadow-lg">
                    <Lock size={10} /> Locked
                 </div>
              </div>

              <div className="flex items-center gap-4 opacity-50">
                <div className="p-3 rounded-full bg-gray-100 dark:bg-white/5 text-black dark:text-white">
                  <Moon size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Interface Theme</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dark Mode Only</p>
                </div>
              </div>

              <button disabled className="w-16 h-8 rounded-full p-1 border border-gray-200 dark:border-white/10 relative z-10 flex items-center bg-white justify-end opacity-50 cursor-not-allowed">
                <div className="w-6 h-6 rounded-full shadow-md bg-black" />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-8 p-6 rounded-3xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all flex items-center justify-center gap-3 font-bold group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              TERMINATE SESSION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
