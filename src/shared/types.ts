// ========================================
// 核心业务类型定义
// ========================================

/** 工作模式 */
export type WorkMode = 'comment' | 'directory';

/** AI 服务提供商 */
export type AIProvider = 'deepseek' | 'openai';

/** 抓取的页面内容 */
export interface ScrapedContent {
  /** 页面标题 */
  title: string;
  /** Meta Description */
  metaDescription: string;
  /** H1 标题列表 */
  h1: string[];
  /** H2 标题列表 */
  h2: string[];
  /** 正文内容（前1500字符） */
  bodyText: string;
  /** 页面 URL */
  url: string;
  /** 页面语言 */
  lang: string;
}

/** 项目/推广信息配置 */
export interface ProjectInfo {
  /** 推广网址 */
  targetUrl: string;
  /** 核心关键词 */
  keywords: string;
  /** 品牌名称 */
  brandName: string;
  /** 联系邮箱 */
  email: string;
  /** 联系人名称 */
  name: string;
}

/** API 配置 */
export interface APIConfig {
  /** 当前使用的 AI 提供商 */
  provider: AIProvider;
  /** DeepSeek API Key */
  deepseekApiKey: string;
  /** OpenAI API Key */
  openaiApiKey: string;
  /** 自定义 API 端点（可选） */
  customEndpoint?: string;
}

/** 完整存储配置 */
export interface StorageConfig {
  api: APIConfig;
  project: ProjectInfo;
}

/** AI 生成请求参数 */
export interface GenerateRequest {
  mode: WorkMode;
  pageContent: ScrapedContent;
  projectInfo: ProjectInfo;
}

/** AI 生成结果 */
export interface GenerateResult {
  success: boolean;
  content?: string;
  error?: string;
}

/** 表单填充数据 */
export interface FillData {
  /** 推广 URL */
  url: string;
  /** 联系邮箱 */
  email: string;
  /** 联系人名称 */
  name: string;
  /** 标题（品牌名或关键词） */
  title: string;
  /** 评论/描述内容 */
  content: string;
}

/** 表单填充结果 */
export interface FillResult {
  success: boolean;
  /** 已填充的字段 */
  filledFields: string[];
  /** 未找到的字段 */
  missingFields: string[];
  /** 错误信息 */
  errors?: string[];
}

/** 应用状态 */
export type AppStatus = 
  | 'idle'           // 空闲
  | 'scraping'       // 正在抓取
  | 'generating'     // 正在生成
  | 'filling'        // 正在填充
  | 'success'        // 成功
  | 'error';         // 错误

/** 状态信息 */
export interface StatusInfo {
  status: AppStatus;
  message: string;
}
