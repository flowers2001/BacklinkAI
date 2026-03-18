// ========================================
// Content Script 入口
// 负责页面内容抓取和表单填充
// ========================================

import { scrapePageContent, waitForContent } from './scraper';
import { fillForm, detectForms } from './form-filler';
import type { Message, ScrapeResultMessage, FillResultMessage } from '../shared/messages';

console.log('[AI外链助手] Content Script 已注入');

// ========================================
// 消息监听器
// ========================================

chrome.runtime.onMessage.addListener((
  message: Message,
  _sender,
  sendResponse: (response: ScrapeResultMessage['payload'] | FillResultMessage['payload']) => void
) => {
  // 处理消息
  handleMessage(message, sendResponse);
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理接收到的消息
 */
async function handleMessage(
  message: Message,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (message.type) {
    case 'SCRAPE_PAGE':
      await handleScrapePage(sendResponse);
      break;
      
    case 'FILL_FORM':
      await handleFillForm(message.payload, sendResponse);
      break;
      
    default:
      console.warn('[AI外链助手] 未知消息类型:', message);
  }
}

/**
 * 处理页面抓取请求
 */
async function handleScrapePage(
  sendResponse: (response: ScrapeResultMessage['payload']) => void
): Promise<void> {
  try {
    console.log('[AI外链助手] 开始抓取页面内容...');
    
    // 等待页面内容加载（针对 SPA）
    await waitForContent(2000);
    
    // 抓取内容
    const content = scrapePageContent();
    
    console.log('[AI外链助手] 抓取完成:', {
      title: content.title,
      bodyLength: content.bodyText.length,
    });
    
    sendResponse({
      success: true,
      data: content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AI外链助手] 抓取失败:', message);
    
    sendResponse({
      success: false,
      error: message,
    });
  }
}

/**
 * 处理表单填充请求
 */
async function handleFillForm(
  data: Parameters<typeof fillForm>[0],
  sendResponse: (response: FillResultMessage['payload']) => void
): Promise<void> {
  try {
    console.log('[AI外链助手] 开始填充表单...');
    
    const result = await fillForm(data);
    
    console.log('[AI外链助手] 填充完成:', result);
    
    sendResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AI外链助手] 填充失败:', message);
    
    sendResponse({
      success: false,
      filledFields: [],
      missingFields: [],
      errors: [message],
    });
  }
}

// ========================================
// 页面加载时自动检测表单
// ========================================

// 延迟检测，等待页面完全加载
setTimeout(() => {
  const detection = detectForms();
  if (detection.hasForm) {
    console.log('[AI外链助手] 检测到可填充表单:', detection.fields);
  }
}, 1000);
