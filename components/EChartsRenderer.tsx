"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { 
  BarChart3, LineChart, ScatterChart, Download, 
  LayoutDashboard, Check, Loader2, Palette 
} from "lucide-react";
import { supabase } from "../src/utils/supabaseClient";

// Define background types
type BgTheme = "dark" | "white" | "black" | "transparent";

interface EChartsRendererProps {
  optionJson: string | object;
  height?: number;
  width?: string;
  className?: string;
  savedId?: string;
  initialTitle?: string;
  animate?: boolean;
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
  const chartRef = useRef<any>(null);
  
  // State
  const [chartType, setChartType] = useState<"line" | "bar" | "scatter">("line");
  const [bgTheme, setBgTheme] = useState<BgTheme>("dark"); // Default theme
  const [baseOption, setBaseOption] = useState<any>(null);
  
  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasSaved, setHasSaved] = useState(!!savedId);
  const [chartTitle, setChartTitle] = useState(initialTitle || "My Chart");

  // Sync saved state
  useEffect(() => {
    setHasSaved(!!savedId);
  }, [savedId]);

  // 1. Parse Input JSON
  useEffect(() => {
    try {
      if (!optionJson || optionJson === "NONE") return;
      const opt = typeof optionJson === "string" ? JSON.parse(optionJson) : optionJson;
      
      // Auto-detect initial type
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

  // 2. Generate Final Option (Memoized for performance)
  // Handles: Chart Type changes + Background Theme Text Color changes
  const finalOption = useMemo(() => {
    if (!baseOption) return null;

    const newOpt = JSON.parse(JSON.stringify(baseOption)); // Deep clone

    // --- A. Handle Series Type ---
    if (Array.isArray(newOpt.series)) {
      newOpt.series = newOpt.series.map((s: any) => ({
        ...s,
        type: chartType,
        symbolSize: chartType === "scatter" ? 10 : undefined,
        smooth: chartType === "line" ? false : undefined,
      }));
    }

    // --- B. Handle Dynamic Title ---
    if (newOpt.title && newOpt.title.text) {
      const oldTitle = newOpt.title.text;
      let typeText = "Chart";
      if (chartType === "line") typeText = "Line Plot";
      if (chartType === "bar") typeText = "Bar Chart";
      if (chartType === "scatter") typeText = "Scatter Plot";

      const regex = /\((Line|Bar|Scatter|Histogram) (Plot|Chart)\)/i;
      if (regex.test(oldTitle)) {
        newOpt.title.text = oldTitle.replace(regex, `(${typeText})`);
      } else if (!oldTitle.includes(`(${typeText})`)) {
        newOpt.title.text = `${oldTitle} (${typeText})`;
      }
      setChartTitle(newOpt.title.text); // Sync title state
    }

    // --- C. Handle Styling based on BgTheme ---
    // Define colors
    const isLightMode = bgTheme === "white";
    const textColor = isLightMode ? "#333333" : "#e4e4e7"; // Dark gray vs Light gray
    const axisColor = isLightMode ? "#666666" : "#a1a1aa";
    const splitLineColor = isLightMode ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

    // Apply global text style
    newOpt.textStyle = { ...newOpt.textStyle, color: textColor };
    newOpt.backgroundColor = "transparent"; // We handle background via CSS on container

    // Apply Title Color
    if (newOpt.title) {
        newOpt.title.textStyle = { ...newOpt.title.textStyle, color: textColor };
        newOpt.title.subtextStyle = { ...newOpt.title.subtextStyle, color: axisColor };
    }

    // Apply Legend Color
    if (newOpt.legend) {
        newOpt.legend.textStyle = { ...newOpt.legend.textStyle, color: textColor };
    }

    // Apply Axis Colors
    const updateAxis = (axis: any) => {
        if (!axis) return axis;
        return {
            ...axis,
            axisLabel: { ...axis.axisLabel, color: axisColor },
            nameTextStyle: { ...axis.nameTextStyle, color: textColor },
            splitLine: { ...axis.splitLine, lineStyle: { color: splitLineColor } },
            axisLine: { ...axis.axisLine, lineStyle: { color: axisColor } }
        };
    };

    if (newOpt.xAxis) newOpt.xAxis = Array.isArray(newOpt.xAxis) ? newOpt.xAxis.map(updateAxis) : updateAxis(newOpt.xAxis);
    if (newOpt.yAxis) newOpt.yAxis = Array.isArray(newOpt.yAxis) ? newOpt.yAxis.map(updateAxis) : updateAxis(newOpt.yAxis);

    // --- D. Layout Fixes ---
    if (!newOpt.grid) newOpt.grid = {};
    newOpt.grid = { ...newOpt.grid, top: 60, bottom: 40, containLabel: true };

    return newOpt;
  }, [baseOption, chartType, bgTheme]);

  // --- Actions ---
  
  const cycleBg = () => {
    const themes: BgTheme[] = ["dark", "white", "black", "transparent"];
    const nextIndex = (themes.indexOf(bgTheme) + 1) % themes.length;
    setBgTheme(themes[nextIndex]);
  };

  const handleDownload = () => {
    if (!chartRef.current) return;
    const instance = chartRef.current.getEchartsInstance();
    
    // Determine background color for the downloaded image
    let dlBg = "#18181b"; // Default dark
    if (bgTheme === "white") dlBg = "#ffffff";
    if (bgTheme === "black") dlBg = "#000000";
    if (bgTheme === "transparent") dlBg = "transparent";

    const base64 = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: dlBg,
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

      // Using your existing proxy path
      const response = await fetch(`/api/proxy/api/charts/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: chartTitle,
          chart_config: finalOption // Save the current state (including colors)
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

  // Background CSS mapping
  const bgStyles: Record<BgTheme, string> = {
    dark: "bg-zinc-900 border-zinc-700",
    white: "bg-white border-zinc-200 shadow-sm",
    black: "bg-black border-zinc-800",
    transparent: "bg-transparent border-dashed border-zinc-700/50",
  };

  if (!finalOption) return null;

  return (
    <div className={`w-full flex flex-col items-center group relative border rounded-xl transition-colors duration-300 ${bgStyles[bgTheme]} ${className}`}>
      
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/90 backdrop-blur p-1.5 rounded-lg border border-white/10 shadow-xl">
        
        {/* Theme Toggle */}
        <button 
            onClick={cycleBg}
            className="p-1 text-zinc-400 hover:text-white flex items-center gap-1"
            title={`Theme: ${bgTheme.toUpperCase()}`}
        >
            <Palette size={14} />
            <span className="text-[10px] uppercase font-mono hidden sm:inline">{bgTheme}</span>
        </button>

        <div className="w-[1px] h-3 bg-zinc-600 mx-1" />

        {/* Chart Type Toggle */}
        <div className="flex gap-1 border-r border-zinc-600 pr-2 mr-2">
          <button onClick={() => setChartType("line")} className={`p-1 rounded ${chartType === 'line' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><LineChart size={14} /></button>
          <button onClick={() => setChartType("bar")} className={`p-1 rounded ${chartType === 'bar' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><BarChart3 size={14} /></button>
          <button onClick={() => setChartType("scatter")} className={`p-1 rounded ${chartType === 'scatter' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}><ScatterChart size={14} /></button>
        </div>

        {/* Download */}
        <button onClick={handleDownload} className="p-1 text-zinc-400 hover:text-white" title="Download PNG">
          <Download size={14} />
        </button>

        {/* Save */}
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

      {/* Chart Instance */}
      <ReactECharts
        ref={chartRef}
        option={finalOption}
        style={{ height, width }}
        className="w-full rounded-xl overflow-hidden"
        notMerge={true} // Crucial for clean theme transitions
        lazyUpdate={true}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}