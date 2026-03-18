// ========================================
// Background Service Worker 入口
// 处理消息通信和 AI API 调用
// ========================================

import type { Message, GenerateContentMessage, GenerateResultMessage } from '../shared/messages';
import { generateContent, testAPIConnection } from './ai-client';
import { getFullConfig, saveFullConfig, getAPIConfig, saveAPIConfig, saveProjectInfo } from '../shared/storage';
import type { StorageConfig, AIProvider } from '../shared/types';

console.log('[AI外链助手] Background Service Worker 已启动');

// ========================================
// 插件安装/更新事件
// ========================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AI外链助手] 插件已安装');
    // 打开设置页面引导用户配置
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('[AI外链助手] 插件已更新到版本:', chrome.runtime.getManifest().version);
  }
});

// ========================================
// 消息监听器
// ========================================

chrome.runtime.onMessage.addListener((
  message: Message | { type: string; payload?: unknown },
  _sender,
  sendResponse: (response: unknown) => void
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
  message: Message | { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[AI外链助手] 收到消息:', message.type);
  
  try {
    switch (message.type) {
      case 'GENERATE_CONTENT':
        await handleGenerateContent(message as GenerateContentMessage, sendResponse);
        break;
        
      case 'GET_CONFIG':
        await handleGetConfig(sendResponse);
        break;
        
      case 'SAVE_CONFIG':
        await handleSaveConfig(message.payload as StorageConfig, sendResponse);
        break;
        
      case 'SAVE_API_CONFIG':
        await handleSaveAPIConfig(message.payload as Parameters<typeof saveAPIConfig>[0], sendResponse);
        break;
        
      case 'SAVE_PROJECT_INFO':
        await handleSaveProjectInfo(message.payload as Parameters<typeof saveProjectInfo>[0], sendResponse);
        break;
        
      case 'TEST_API':
        await handleTestAPI(message.payload as { provider: AIProvider; apiKey: string; customEndpoint?: string }, sendResponse);
        break;
        
      default:
        console.warn('[AI外链助手] 未知消息类型:', message.type);
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AI外链助手] 处理消息失败:', errorMessage);
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * 处理 AI 内容生成请求
 */
async function handleGenerateContent(
  message: GenerateContentMessage,
  sendResponse: (response: GenerateResultMessage['payload']) => void
): Promise<void> {
  const { mode, pageContent, projectInfo } = message.payload;
  
  console.log('[AI外链助手] 开始生成内容, 模式:', mode);
  
  const result = await generateContent(mode, pageContent);
  
  console.log('[AI外链助手] 生成完成:', result.success ? '成功' : result.error);
  
  sendResponse(result);
}

/**
 * 处理获取配置请求
 */
async function handleGetConfig(
  sendResponse: (response: { success: boolean; data?: StorageConfig; error?: string }) => void
): Promise<void> {
  try {
    const config = await getFullConfig();
    sendResponse({ success: true, data: config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: message });
  }
}

/**
 * 处理保存配置请求
 */
async function handleSaveConfig(
  config: StorageConfig,
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    await saveFullConfig(config);
    sendResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: message });
  }
}

/**
 * 处理保存 API 配置请求
 */
async function handleSaveAPIConfig(
  config: Parameters<typeof saveAPIConfig>[0],
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    await saveAPIConfig(config);
    sendResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: message });
  }
}

/**
 * 处理保存项目信息请求
 */
async function handleSaveProjectInfo(
  info: Parameters<typeof saveProjectInfo>[0],
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    await saveProjectInfo(info);
    sendResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: message });
  }
}

/**
 * 处理 API 连接测试请求
 */
async function handleTestAPI(
  payload: { provider: AIProvider; apiKey: string; customEndpoint?: string },
  sendResponse: (response: { success: boolean; message: string }) => void
): Promise<void> {
  const result = await testAPIConnection(
    payload.provider,
    payload.apiKey,
    payload.customEndpoint
  );
  sendResponse(result);
}
