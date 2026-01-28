export interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    type?: 'text' | 'chart';
    chartData?: any;
    chartConfig?: any;
    timestamp: number;
  }
  
  export interface User {
    studentId: string;
    name: string;
  }
  
  export interface AppState {
    view: 'login' | 'chat' | 'settings' | 'dashboard';
    theme: 'light' | 'dark';
    user: User | null;
  }
  // ../types/index.ts

/**
 * 图表数据项通用类型（替代 any，明确数据格式，提升 TypeScript 严谨性）
 * 适配 ECharts 系列数据格式，同时兼容你原有项目的 data 结构
 */
export interface ChartDataItem {
  [key: string]: string | number | boolean; // 支持动态键值对，兼容各类图表数据
}

/**
 * 柱状图配置项（与你原有 `bars` 格式一致，保持兼容）
 */
export interface BarSeriesConfig {
  key: string; // 对应 data 中的键名，用于 ECharts series.dataKey
  color?: string; // 柱状图颜色，可选，有默认值
}

/**
 * 折线图配置项（与你原有 `lines` 格式一致，保持兼容）
 */
export interface LineSeriesConfig {
  key: string; // 对应 data 中的键名，用于 ECharts series.dataKey
  color: string; // 折线图颜色，必填（与你原有逻辑一致）
}

/**
 * 面积图配置项（继承折线图配置，补充填充色可选字段，适配 ECharts areaStyle）
 */
export interface AreaSeriesConfig extends LineSeriesConfig {
  fillColor?: string; // 面积图填充色，可选，默认使用线条颜色半透明
}

/**
 * 饼图配置项（适配 ECharts 饼图需求，新增专属配置，格式与其他图表统一）
 */
export interface PieSeriesConfig {
  nameKey: string; // 对应 data 中的「名称」键名（如 "category"）
  valueKey: string; // 对应 data 中的「数值」键名（如 "value"）
  colors?: string[]; // 饼图区块颜色数组，可选，有默认色集
}

/**
 * 核心 ChartResponse 接口（整合所有需求，区分不同图表类型的必填/可选字段）
 * 采用联合类型，明确不同图表类型对应的配置项，避免冗余和错误
 */
export type ChartResponse = 
  // 1. 柱状图（bar）：支持 bars 配置，必填 xAxisKey
  | {
      type: 'bar';
      title: string;
      xAxisKey: string; // 你原有必填字段，对应 data 中的 X 轴键名
      data: ChartDataItem[]; // 你原有必填字段，替换 any[] 为通用数据项类型
      bars?: BarSeriesConfig[]; // 你原有配置项，保持兼容
      xData?: never; // 饼图专属字段，此处禁用，避免错误
      seriesData?: never; // 已用 data 替代，禁用冗余字段
      lines?: never; // 非折线图，禁用
      area?: never; // 非面积图，禁用
      pie?: never; // 非饼图，禁用
    }
  // 2. 折线图（line）：支持 lines 配置，必填 xAxisKey
  | {
      type: 'line';
      title: string;
      xAxisKey: string; // 你原有必填字段
      data: ChartDataItem[]; // 你原有必填字段
      lines?: LineSeriesConfig[]; // 你原有配置项，保持兼容
      xData?: never;
      seriesData?: never;
      bars?: never; // 非柱状图，禁用
      area?: never; // 非面积图，禁用
      pie?: never; // 非饼图，禁用
    }
  // 3. 面积图（area）：基于折线图，支持 area 配置，必填 xAxisKey
  | {
      type: 'area';
      title: string;
      xAxisKey: string; // 面积图需要 X 轴，与折线图一致
      data: ChartDataItem[]; // 你原有必填字段
      area?: AreaSeriesConfig[]; // 面积图专属配置，格式与 lines 统一
      xData?: never;
      seriesData?: never;
      bars?: never; // 非柱状图，禁用
      lines?: never; // 非折线图，禁用
      pie?: never; // 非饼图，禁用
    }
  // 4. 饼图（pie）：无需 X 轴，支持 pie 专属配置，禁用 xAxisKey 等冗余字段
  | {
      type: 'pie';
      title: string;
      data: ChartDataItem[]; // 你原有必填字段，适配饼图数据
      pie?: PieSeriesConfig[]; // 饼图专属配置
      xAxisKey?: never; // 饼图无需 X 轴，禁用该字段，避免错误
      xData?: never;
      seriesData?: never;
      bars?: never; // 非柱状图，禁用
      lines?: never; // 非折线图，禁用
      area?: never; // 非面积图，禁用
    };

// 【可选】图表类型枚举（方便后续扩展和使用，避免手写字符串出错）
export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  AREA = 'area',
  PIE = 'pie',
}
  export interface SavedChart {
    id: string;
    timestamp: number;
    chartData: ChartResponse;
    note?: string;
  }
  