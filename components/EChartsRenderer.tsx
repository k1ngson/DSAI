"use client";

import React, { useRef, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Download, LayoutDashboard, Check, Loader2, Palette, BarChart3, LineChart, ScatterChart } from "lucide-react";
import { supabase } from "../src/utils/supabaseClient";

interface EChartsRendererProps {
  optionJson: string | object;
  height?: number;
  className?: string;
  animate?: boolean;
  savedId?: string;
  initialTitle?: string;
  animationDuration?: number;
  animationEasing?: string;
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
}

// 輔助函數：判斷背景色是深是淺
const getContrastTextColor = (hexColor: string) => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
};

export default function EChartsRenderer({
  optionJson,
  height = 360,
  className = "",
  animate = true,
  savedId = "",
  initialTitle = "",
  animationDuration = 1000,
  animationEasing = "cubicOut",
  animationDurationUpdate = 500,
  animationEasingUpdate = "cubicOut",
}: EChartsRendererProps) {
  const echartRef = useRef<any>(null);
  const [parsedOption, setParsedOption] = useState<any>(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeType, setActiveType] = useState<string>("line"); // 追蹤當前圖表類型
  
  // 儲存相關
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(!!savedId);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [chartTitle, setChartTitle] = useState(initialTitle || "My Chart");

  // Sync savedId
  useEffect(() => {
    setHasSaved(!!savedId);
  }, [savedId]);

  // 初始化 Option
  useEffect(() => {
    if (!optionJson) return;
    try {
      const opt = typeof optionJson === "string" ? JSON.parse(optionJson) : JSON.parse(JSON.stringify(optionJson));
      
      if (animate) {
        opt.animation = true;
        opt.animationDuration = animationDuration;
        opt.animationEasing = animationEasing;
        opt.animationDurationUpdate = animationDurationUpdate;
        opt.animationEasingUpdate = animationEasingUpdate;
      }

      // --- FIX: 強制調整標題與 Grid 位置 (避免太低或重疊) ---
      if (!opt.title) opt.title = {};
      // 如果標題是 array (多標題)，就處理第一個，或者針對 object 處理
      if (!Array.isArray(opt.title)) {
          opt.title.top = 0;      // 標題置頂
          opt.title.left = "center";
      }
      
      if (!opt.grid) opt.grid = {};
      opt.grid.top = 60;      // 下移 Grid，留空間給標題
      opt.grid.containLabel = true;
      // ----------------------------------------------------

      // 偵測初始類型
      if (opt.series && opt.series.length > 0) {
          setActiveType(opt.series[0].type);
      }

      setParsedOption(opt);
      if (opt.title?.text && !initialTitle) {
        setChartTitle(opt.title.text);
      }
    } catch (e) {
      console.error("Failed to parse chart JSON", e);
    }
  }, [optionJson, animate, initialTitle, animationDuration, animationEasing, animationDurationUpdate, animationEasingUpdate]);

  // 切換圖表類型函數
  const switchChartType = (newType: string) => {
      if (!parsedOption) return;
      const newOption = JSON.parse(JSON.stringify(parsedOption));
      
      if (newOption.series && newOption.series.length > 0) {
          // 1. 針對 Series 進行切換
          newOption.series.forEach((s: any) => {
              s.type = newType;
              // 如果切換回 Line，預設 smooth: false
              if (newType === 'line') s.smooth = false;
              // Scatter 需要設定 symbolSize 避免太小
              if (newType === 'scatter') s.symbolSize = Math.max(s.symbolSize || 10, 10);
          });
          
          // 2. --- FIX: 動態更新標題文字 (Regex) ---
          if (newOption.title && newOption.title.text) {
              const typeLabelMap: Record<string, string> = {
                  line: "Line Plot",
                  bar: "Bar Chart",
                  scatter: "Scatter Plot"
              };
              const newLabel = typeLabelMap[newType] || "Chart";
              
              // Regex: 尋找 (Line/Bar/Scatter/Histogram/Frequency Plot/Chart) 並替換
              // 這樣可以處理 "Title (Line Plot)" -> "Title (Bar Chart)"
              const regex = /\((Line|Bar|Scatter|Histogram|Frequency) (Plot|Chart)\)/i;
              
              if (regex.test(newOption.title.text)) {
                  newOption.title.text = newOption.title.text.replace(regex, `(${newLabel})`);
                  setChartTitle(newOption.title.text); // 同步更新內部 title state
              }
          }

          // 3. --- FIX: 確保切換後位置依然正確 ---
          if (!newOption.title) newOption.title = {};
          if (!Array.isArray(newOption.title)) {
              newOption.title.top = 0; 
              newOption.title.left = "center";
          }
          if (!newOption.grid) newOption.grid = {};
          newOption.grid.top = 60;

          setActiveType(newType);
          setParsedOption(newOption);
      }
  };

  // 監聽背景顏色改變
  useEffect(() => {
    if (!parsedOption) return;

    const textColor = getContrastTextColor(bgColor);
    const newOption = JSON.parse(JSON.stringify(parsedOption));

    if (!newOption.title) newOption.title = {};
    if (Array.isArray(newOption.title)) {
      newOption.title.forEach((t: any) => t.textStyle = { ...t.textStyle, color: textColor });
    } else {
      newOption.title.textStyle = { ...newOption.title.textStyle, color: textColor };
    }

    if (!newOption.legend) newOption.legend = {};
    newOption.legend.textStyle = { ...newOption.legend.textStyle, color: textColor };

    const updateAxis = (axis: any) => {
      if (!axis) return;
      if (!axis.axisLabel) axis.axisLabel = {};
      axis.axisLabel.color = textColor;
      if (!axis.nameTextStyle) axis.nameTextStyle = {};
      axis.nameTextStyle.color = textColor;
    };

    if (newOption.xAxis) {
        if (Array.isArray(newOption.xAxis)) newOption.xAxis.forEach(updateAxis);
        else updateAxis(newOption.xAxis);
    }
    if (newOption.yAxis) {
        if (Array.isArray(newOption.yAxis)) newOption.yAxis.forEach(updateAxis);
        else updateAxis(newOption.yAxis);
    }

    setParsedOption(newOption);
  }, [bgColor]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!echartRef.current) return;
    const instance = echartRef.current.getEchartsInstance();
    const base64 = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: bgColor,
      excludeComponents: ["toolbox"],
    });
    const a = document.createElement("a");
    a.href = base64;
    a.download = `${chartTitle.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowColorPicker(false);
  };

  const handleSaveToDashboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please login first");
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  // 判斷是否顯示切換器 (Boxplot 和 Pie 通常不適合隨意切換到 Line/Bar)
  const canSwitch = ["line", "bar", "scatter"].includes(activeType) || ["line", "bar", "scatter"].includes(parsedOption?.series?.[0]?.type);

  return (
    <div className={`relative group ${className}`}>
      
      {/* 工具列 */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
        
        {/* Type Switcher */}
        {canSwitch && (
            <div className="flex bg-zinc-800/90 backdrop-blur rounded-lg p-1 border border-zinc-700 shadow-sm">
                <button 
                    onClick={() => switchChartType("bar")} 
                    className={`p-1.5 rounded ${activeType === 'bar' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Bar Chart / Histogram"
                >
                    <BarChart3 size={16} />
                </button>
                <button 
                    onClick={() => switchChartType("line")} 
                    className={`p-1.5 rounded ${activeType === 'line' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Line Chart"
                >
                    <LineChart size={16} />
                </button>
                <button 
                    onClick={() => switchChartType("scatter")} 
                    className={`p-1.5 rounded ${activeType === 'scatter' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Scatter Plot"
                >
                    <ScatterChart size={16} />
                </button>
            </div>
        )}

        {/* 下載與顏色區 */}
        <div className="relative flex items-center bg-zinc-800/90 backdrop-blur rounded-lg p-1 border border-zinc-700 shadow-sm">
          {showColorPicker && (
            <input 
              type="color" 
              value={bgColor} 
              onChange={(e) => setBgColor(e.target.value)}
              className="w-6 h-6 mr-2 cursor-pointer border-none bg-transparent rounded"
            />
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} 
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Palette size={16} />
          </button>
          
          <div className="w-px h-4 bg-zinc-600 mx-1"></div>

          <button 
            onClick={handleDownload} 
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Download size={16} />
          </button>
        </div>

        {/* 儲存按鈕 */}
        {!hasSaved && (
          <button
            onClick={handleSaveToDashboard}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm border
              ${saveStatus === "success" 
                ? "bg-green-500/20 text-green-300 border-green-500/50" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent"
              }`}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saveStatus === "success" ? (
              <>
                <Check size={14} />
                <span>Saved</span>
              </>
            ) : (
              <>
                <LayoutDashboard size={14} />
                <span>Save</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className={savedId ? "pointer-events-none" : ""}>
        <ReactECharts
          ref={echartRef}
          option={parsedOption}
          style={{ height: height, width: "100%" }}
          notMerge={true} 
        />
      </div>
    </div>
  );
}
