"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3, LineChart, ScatterChart, Download, LayoutDashboard, Check, Loader2 } from "lucide-react";
import { supabase } from "../src/utils/supabaseClient"; // 確保路徑正確

interface EChartsRendererProps {
  optionJson: string | object;
  height?: number;
  width?: string;
  className?: string;
  savedId?: string; // 支援儲存狀態判斷
  initialTitle?: string;
  animate?: boolean
}

export default function EChartsRenderer({
  optionJson,
  height = 400,
  width = "100%",
  className = "",
  savedId = "",
  initialTitle = "",
  animate = true,
}: EChartsRendererProps) {
  const chartRef = useRef<any>(null); // 使用 any 比較方便呼叫 getEchartsInstance
  const [chartType, setChartType] = useState<"line" | "bar" | "scatter">("line");
  const [baseOption, setBaseOption] = useState<any>(null);
  const [parsedOption, setParsedOption] = useState<any>(null);
  
  // 儲存相關狀態
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasSaved, setHasSaved] = useState(!!savedId);
  const [chartTitle, setChartTitle] = useState(initialTitle || "My Chart");

  useEffect(() => {
    setHasSaved(!!savedId);
  }, [savedId]);

  // 1. 解析傳入的 JSON
  useEffect(() => {
    try {
      if (!optionJson || optionJson === "NONE") return;
      const opt = typeof optionJson === "string" ? JSON.parse(optionJson) : optionJson;
      
      const firstSeries = Array.isArray(opt.series) ? opt.series[0] : opt.series;
      if (firstSeries && firstSeries.type) {
        setChartType(firstSeries.type);
      }
      
      setBaseOption(opt);
      if (opt.title?.text) setChartTitle(opt.title.text);
    } catch (e) {
      console.error("Failed to parse chart JSON", e);
    }
  }, [optionJson]);

  // 2. 根據 chartType 產生新的 Option
  useEffect(() => {
    if (!baseOption) return;

    const newOpt = JSON.parse(JSON.stringify(baseOption)); // Deep clone

    // --- Series Type Update ---
    if (Array.isArray(newOpt.series)) {
      newOpt.series = newOpt.series.map((s: any) => ({
        ...s,
        type: chartType,
        symbolSize: chartType === "scatter" ? 10 : undefined,
        smooth: chartType === "line" ? false : undefined,
      }));
    }

    // --- Dynamic Title Update ---
    if (newOpt.title && newOpt.title.text) {
      const oldTitle = newOpt.title.text;
      let typeText = "Chart";
      if (chartType === "line") typeText = "Line Plot";
      if (chartType === "bar") typeText = "Bar Chart";
      if (chartType === "scatter") typeText = "Scatter Plot";

      const regex = /\((Line|Bar|Scatter|Histogram) (Plot|Chart)\)/i;
      
      if (regex.test(oldTitle)) {
        newOpt.title.text = oldTitle.replace(regex, `(${typeText})`);
      } else {
        // 避免重複添加
        if (!oldTitle.includes(`(${typeText})`)) {
             newOpt.title.text = `${oldTitle} (${typeText})`;
        }
      }
      setChartTitle(newOpt.title.text);
    }

    // --- Layout Adjustment ---
    if (!newOpt.title) newOpt.title = {};
    newOpt.title.top = 5;
    newOpt.title.left = "center";

    if (!newOpt.grid) newOpt.grid = {};
    newOpt.grid.top = 60;
    newOpt.grid.bottom = 40;
    newOpt.grid.left = "5%";
    newOpt.grid.right = "5%";
    newOpt.grid.containLabel = true;

    // --- Styling ---
    newOpt.backgroundColor = "transparent";
    if (!newOpt.textStyle) newOpt.textStyle = {};
    newOpt.textStyle.color = "#a1a1aa"; 

    setParsedOption(newOpt);
  }, [baseOption, chartType]);

  // --- Actions ---
  const handleDownload = () => {
    if (!chartRef.current) return;
    const instance = chartRef.current.getEchartsInstance();
    const base64 = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#18181b", // Dark background
    });
    const a = document.createElement("a");
    a.href = base64;
    a.download = `${chartTitle.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveToDashboard = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please login first");
        return;
      }

      // 注意：這裡假設你的後端 API 路徑是 /api/proxy/api/charts/save
      const response = await fetch(`/api/proxy/api/charts/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: chartTitle,
          chart_config: parsedOption
        })
      });

      if (!response.ok) throw new Error("Save failed");
      
      setHasSaved(true);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);

    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!parsedOption) return null;

  return (
    <div className={`w-full flex flex-col items-center group relative ${className}`}>
      {/* 切換按鈕與工具列 (Hover 顯示) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur p-1.5 rounded-lg border border-white/10">
        
        {/* 圖表類型切換 */}
        <div className="flex gap-1 border-r border-white/10 pr-2 mr-2">
          <button onClick={() => setChartType("bar")} className={`p-1 rounded ${chartType === 'bar' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><BarChart3 size={14} /></button>
          <button onClick={() => setChartType("line")} className={`p-1 rounded ${chartType === 'line' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><LineChart size={14} /></button>
          <button onClick={() => setChartType("scatter")} className={`p-1 rounded ${chartType === 'scatter' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><ScatterChart size={14} /></button>
        </div>

        {/* 下載 */}
        <button onClick={handleDownload} className="p-1 text-zinc-400 hover:text-white" title="Download PNG">
          <Download size={14} />
        </button>

        {/* 儲存 */}
        {!hasSaved && (
             <button 
                onClick={handleSaveToDashboard} 
                disabled={isSaving}
                className="ml-1 p-1 text-zinc-400 hover:text-indigo-400 disabled:opacity-50"
                title="Save to Dashboard"
             >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveStatus === 'success' ? <Check size={14} className="text-green-400"/> : <LayoutDashboard size={14} />}
             </button>
        )}
      </div>

      {/* 圖表本體 */}
      <ReactECharts
        ref={chartRef}
        option={parsedOption}
        style={{ height, width }}
        className="w-full"
        theme="dark" // 如果你的 ECharts 有註冊 dark theme
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}
