// ========================================
// 核心业务类型定义
// ========================================

/** 工作模式 */
export type WorkMode = 'comment' | 'directory';

/** AI 服务提供商 */
export type AIProvider = 'azure' | 'openai';

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
  /** 网站标题（用于表单 title 字段） */
  title: string;
  /** 网站标语（一句话介绍，用于导航站简短描述字段） */
  tagline: string;
  /** 网站描述（用于 AI 生成内容） */
  description: string;
  /** 联系邮箱 */
  email: string;
  /** 联系人名称 */
  name: string;
}

/** API 配置 */
export interface APIConfig {
  /** 当前使用的 AI 提供商 */
  provider: AIProvider;
  /** API Key */
  apiKey: string;
  /** Azure OpenAI 端点 */
  azureEndpoint?: string;
  /** Azure OpenAI 部署名称 */
  azureDeployment?: string;
  /** Azure API 版本 */
  azureApiVersion?: string;
}

/** 完整存储配置 */
export interface StorageConfig {
  api: APIConfig;
  project: ProjectInfo;
}

/** AI 生成请求参数 */
export interface GenerateRequest {
  mode: WorkMode;
  pageContent: ScrapedContent | null;
  projectInfo: ProjectInfo;
  /** 字数限制（导航站模式） */
  charLimit?: number;
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
  /** 网站名称/品牌名 */
  sitename: string;
  /** 联系人/作者名称 */
  author: string;
  /** 标题 */
  title: string;
  /** 标语/简短描述 */
  tagline: string;
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
