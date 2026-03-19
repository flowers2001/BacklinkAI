// ========================================
// Chrome 消息通信协议
// ========================================

import type { 
  ScrapedContent, 
  FillData, 
  FillResult, 
  GenerateRequest, 
  GenerateResult 
} from './types';

/** 消息类型枚举 */
export type MessageType =
  | 'SCRAPE_PAGE'        // Popup -> Content: 请求抓取页面
  | 'SCRAPE_RESULT'      // Content -> Popup: 返回抓取结果
  | 'GENERATE_CONTENT'   // Popup -> Background: 请求 AI 生成
  | 'GENERATE_RESULT'    // Background -> Popup: 返回生成结果
  | 'FILL_FORM'          // Popup -> Content: 请求填充表单
  | 'FILL_RESULT'        // Content -> Popup: 返回填充结果
  | 'SCROLL_TO_FORM'     // Popup -> Content: 滚动到表单位置
  | 'DETECT_FORM'        // Popup -> Content: 检测表单字段
  | 'GET_CONFIG'         // 任意 -> Background: 获取配置
  | 'CONFIG_RESULT'      // Background -> 任意: 返回配置
  | 'SAVE_CONFIG';       // Options -> Background: 保存配置

/** 基础消息结构 */
export interface BaseMessage<T extends MessageType, P = undefined> {
  type: T;
  payload: P;
}

// ========================================
// 具体消息类型定义
// ========================================

/** 抓取页面请求 */
export type ScrapePageMessage = BaseMessage<'SCRAPE_PAGE'>;

/** 抓取结果响应 */
export type ScrapeResultMessage = BaseMessage<'SCRAPE_RESULT', {
  success: boolean;
  data?: ScrapedContent;
  error?: string;
}>;

/** AI 生成请求 */
export type GenerateContentMessage = BaseMessage<'GENERATE_CONTENT', GenerateRequest>;

/** AI 生成结果 */
export type GenerateResultMessage = BaseMessage<'GENERATE_RESULT', GenerateResult>;

/** 填充表单请求 */
export type FillFormMessage = BaseMessage<'FILL_FORM', FillData>;

/** 填充结果响应 */
export type FillResultMessage = BaseMessage<'FILL_RESULT', FillResult>;

/** 滚动到表单请求 */
export type ScrollToFormMessage = BaseMessage<'SCROLL_TO_FORM'>;

/** 检测表单字段请求 */
export type DetectFormMessage = BaseMessage<'DETECT_FORM'>;

/** 所有消息类型联合 */
export type Message =
  | ScrapePageMessage
  | ScrapeResultMessage
  | GenerateContentMessage
  | GenerateResultMessage
  | FillFormMessage
  | FillResultMessage
  | ScrollToFormMessage
  | DetectFormMessage;

// ========================================
// 消息发送辅助函数
// ========================================

/**
 * 向当前活动标签页的 Content Script 发送消息
 */
export async function sendToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('无法获取当前标签页');
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

/**
 * 向 Background Service Worker 发送消息
 */
export async function sendToBackground<T>(message: Message): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

/**
 * 创建消息响应
 */
export function createResponse<T extends MessageType, P>(
  type: T,
  payload: P
): BaseMessage<T, P> {
  return { type, payload };
}
