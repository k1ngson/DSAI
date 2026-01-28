"use client";

import React, { useMemo, forwardRef, useImperativeHandle, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Check, Image as ImageIcon } from "lucide-react";
// 导入优化后的全局 ChartResponse 类型
import { ChartResponse } from "../types";

// 动态导入 ECharts-for-React
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

// 【新增】定义背景色选项类型（贴合 ECharts 导出配置，支持扩展）
type ExportBgOption = "white" | "transparent" | "black";
interface ExportBgConfig {
  label: string;
  value: ExportBgOption;
  color: string; // 对应 ECharts 导出的 backgroundColor 值
}

// 定义 ECharts 组件暴露的方法类型
type EChartsRendererExposed = {
  getEchartsInstance: () => any | null;
  exportToPng: (fileName?: string, bgColor?: string) => void; // 【新增】接收背景色参数
};

// 图表组件 Props 类型（保留 onSave/isSaved 支持 Save 按钮）
interface ChartRendererProps {
  chartData: ChartResponse;
  height?: number;
  className?: string;
  onSave?: () => void; // 保留 Save 按钮回调
  isSaved?: boolean; // 保留 Save 按钮禁用状态（已保存）
}

// 【新增】背景色配置列表（供下拉选择，可扩展）
const exportBgList: ExportBgConfig[] = [
  { label: "White Background", value: "white", color: "#ffffff" },
  { label: "Transparent", value: "transparent", color: "transparent" },
  { label: "Black Background", value: "black", color: "#000000" },
];

// 继续使用 forwardRef 向上层暴露方法
const ChartRenderer = forwardRef<EChartsRendererExposed, ChartRendererProps>((
  {
    chartData,
    height = 320,
    className = "",
    onSave,
    isSaved = false,
  },
  ref
) => {
  // 原有状态：保存 ECharts 实例
  const [echartsInstance, setEchartsInstance] = useState<any | null>(null);
  // 原有状态：Save 按钮点击后的短暂提示
  const [justSaved, setJustSaved] = useState(false);
  // 【新增】状态：下载相关
  const [selectedBg, setSelectedBg] = useState<ExportBgOption>("white"); // 默认白色背景
  const [isExporting, setIsExporting] = useState(false); // 导出中加载态（避免重复点击）

  // 原有逻辑：通过 onChartReady 获取 ECharts 实例
  const handleChartReady = (instance: any) => {
    setEchartsInstance(instance);
  };

  // 原有逻辑：Save 按钮点击处理
  const handleSave = () => {
    if (!onSave || isSaved || justSaved) return;
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // 【新增】核心：下载 PNG 处理（支持自定义背景色）
  const handleDownloadPng = () => {
    if (!echartsInstance || isExporting) return; // 实例不存在或正在导出，直接返回

    setIsExporting(true);
    const fileName = `chart-${chartData.title}-${new Date().toLocaleDateString().replace(/\//g, "-")}`;
    const bgConfig = exportBgList.find(item => item.value === selectedBg);
    const bgColor = bgConfig?.color || "#ffffff";

    try {
      // 调用 ECharts 实例导出方法，传入选择的背景色
      const dataUrl = echartsInstance.getDataURL({
        type: "png",
        pixelRatio: 2, // 2倍分辨率，避免模糊
        backgroundColor: bgColor, // 【关键】使用选择的背景色
      });

      // 触发浏览器下载
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export PNG:", error);
      alert("Download failed, please try again later.");
    } finally {
      // 结束加载态（短暂延迟，避免用户快速重复点击）
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  // 暴露方法给上层组件（新增背景色参数支持）
  useImperativeHandle(ref, () => ({
    getEchartsInstance: () => {
      return echartsInstance;
    },
    exportToPng: (fileName = `chart-${Date.now()}`, bgColor = "#ffffff") => {
      if (!echartsInstance) return;

      const dataUrl = echartsInstance.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: bgColor,
      });

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    }
  }), [echartsInstance]);

  // 构建 ECharts option 配置（原有逻辑不变）
  const option = useMemo(() => {
    if (!chartData || !chartData.type) return null;

    const baseOption: any = {
      backgroundColor: "transparent",
      textStyle: { color: "#e5e7eb" },
      tooltip: {
        trigger: chartData.type === "pie" ? "item" : "axis",
        backgroundColor: "rgba(26,26,26,0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: "#e5e7eb" },
      },
      animationDuration: 1500,
      animationEasing: "cubicOut",
    };

    switch (chartData.type) {
      case "bar":
        baseOption.grid = { left: 48, right: 20, top: 48, bottom: 40, containLabel: true };
        baseOption.xAxis = { 
          type: "category", 
          data: chartData.data.map(item => item[chartData.xAxisKey]), 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.yAxis = { 
          type: "value", 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.series = [{
          type: "bar",
          data: chartData.data.map(item => item[chartData.bars?.[0]?.key || "value"]),
          itemStyle: { color: chartData.bars?.[0]?.color || "#3b82f6", borderRadius: [2, 2, 0, 0] },
        }];
        break;

      case "line":
        baseOption.grid = { left: 48, right: 20, top: 48, bottom: 40, containLabel: true };
        baseOption.xAxis = { 
          type: "category", 
          data: chartData.data.map(item => item[chartData.xAxisKey]), 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.yAxis = { 
          type: "value", 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.series = [{
          type: "line",
          data: chartData.data.map(item => item[chartData.lines?.[0]?.key || "value"]),
          lineStyle: { color: chartData.lines?.[0]?.color || "#3b82f6", width: 2 },
          symbol: "none",
          activeDot: { r: 4, fill: "#fff" },
        }];
        break;

      case "area":
        baseOption.grid = { left: 48, right: 20, top: 48, bottom: 40, containLabel: true };
        baseOption.xAxis = { 
          type: "category", 
          data: chartData.data.map(item => item[chartData.xAxisKey]), 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.yAxis = { 
          type: "value", 
          axisLine: { show: false }, 
          tickLine: { show: false }, 
          textStyle: { color: "#555" } 
        };
        baseOption.series = [{
          type: "line",
          data: chartData.data.map(item => item[chartData.area?.[0]?.key || "value"]),
          lineStyle: { color: chartData.area?.[0]?.color || "#3b82f6", width: 2 },
          symbol: "none",
          activeDot: { r: 4, fill: "#fff" },
          areaStyle: { color: chartData.area?.[0]?.fillColor || `rgba(59, 130, 246, 0.2)` },
        }];
        break;

      case "pie":
        const pieConfig = chartData.pie?.[0];
        baseOption.series = [{
          type: "pie",
          data: chartData.data.map(item => ({
            name: item[pieConfig?.nameKey || "name"],
            value: item[pieConfig?.valueKey || "value"],
          })),
          radius: ["40%", "70%"],
          center: ["50%", "50%"],
          itemStyle: {
            borderRadius: 4,
            borderColor: "#111",
            borderWidth: 2,
          },
          label: { show: false },
          color: pieConfig?.colors || ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
        }];
        break;

      default:
        return null;
    }

    return baseOption;
  }, [chartData]);

  // 禁用状态：图表未加载完成 || 正在导出
  const isBtnDisabled = !echartsInstance || !option || isExporting;

  return (
    <div
      className={`w-full rounded-xl border border-white/10 bg-black/20 overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* 【新增】按钮组：Save + Download + 背景选择（贴合项目暗黑风格） */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
            <ImageIcon size={12} className="text-blue-500" />
            {chartData?.title || "Chart"}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* 原有 Save 按钮（保留所有逻辑和样式） */}
          {onSave && (
            <button 
              onClick={handleSave}
              disabled={isSaved || justSaved || isBtnDisabled}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all
                ${isSaved || justSaved 
                  ? 'bg-green-500/10 text-green-500 cursor-default' 
                  : isBtnDisabled
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {isSaved || justSaved ? (
                <>
                  <Check size={12} />
                  Saved
                </>
              ) : (
                <>
                  <Download size={12} />
                  Save Chart
                </>
              )}
            </button>
          )}

          {/* 【新增】分隔线（视觉区分两个按钮） */}
          {onSave && <div className="w-[1px] h-6 bg-white/10"></div>}

          {/* 【新增】下载区域：Download 按钮 + 背景选择下拉框 */}
          <div className="flex items-center gap-2">
            {/* 背景选择下拉框 */}
            <select
              value={selectedBg}
              onChange={(e) => setSelectedBg(e.target.value as ExportBgOption)}
              disabled={isBtnDisabled}
              className={`
                px-2 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all
                bg-white/5 border border-white/10 text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500
                ${isBtnDisabled ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-white/10 hover:text-white'}
              `}
            >
              {exportBgList.map((bg) => (
                <option key={bg.value} value={bg.value} className="bg-[#111] text-gray-200">
                  {bg.label}
                </option>
              ))}
            </select>

            {/* 下载 PNG 按钮 */}
            <button
              onClick={handleDownloadPng}
              disabled={isBtnDisabled}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all
                ${isBtnDisabled
                  ? 'bg-blue-500/10 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300'
                }
              `}
            >
              <Download size={12} />
              {isExporting ? "Exporting..." : "Download PNG"}
            </button>
          </div>
        </div>
      </div>

      {/* ECharts 渲染容器 */}
      <div style={{ height: `calc(100% - 56px)` }}> {/* 减去按钮组高度，避免溢出 */}
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          notMerge={true}
          lazyUpdate={true}
          autoResize={true}
          opts={{ renderer: "canvas" }}
          onChartReady={handleChartReady}
        />
      </div>
    </div>
  );
});

export default ChartRenderer;