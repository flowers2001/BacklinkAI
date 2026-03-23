// ========================================
// Background Service Worker 入口
// ========================================

import type { Message, GenerateContentMessage } from '../shared/messages';
import { generateContent, testAPIConnection } from './ai-client';
import { getFullConfig, saveFullConfig, saveProjectInfo, saveAPIConfig } from '../shared/storage';
import type { StorageConfig } from '../shared/types';

console.log('[AI外链助手] Background Service Worker 已启动');

// 点击图标打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // @ts-ignore
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (e) {
    console.log('Side panel error:', e);
  }
});

// 插件安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
  
  try {
    // @ts-ignore
    chrome.sidePanel.setOptions({ enabled: true });
    // @ts-ignore
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (e) {}
});

// 消息监听
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

async function handleMessage(
  message: Message | { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'GENERATE_CONTENT':
        const genMsg = message as GenerateContentMessage;
        const result = await generateContent(
          genMsg.payload.mode, 
          genMsg.payload.pageContent,
          genMsg.payload.charLimit,
          genMsg.payload.projectInfo
        );
        sendResponse(result);
        break;
        
      case 'GET_CONFIG':
        const config = await getFullConfig();
        sendResponse({ success: true, data: config });
        break;
        
      case 'SAVE_CONFIG':
        await saveFullConfig(message.payload as StorageConfig);
        sendResponse({ success: true });
        break;
        
      case 'SAVE_PROJECT_INFO':
        await saveProjectInfo(message.payload as Parameters<typeof saveProjectInfo>[0]);
        sendResponse({ success: true });
        break;
      
      case 'SAVE_API_CONFIG':
        await saveAPIConfig(message.payload as Parameters<typeof saveAPIConfig>[0]);
        sendResponse({ success: true });
        break;
        
      case 'TEST_API':
        const testResult = await testAPIConnection();
        sendResponse(testResult);
        break;
        
      default:
        sendResponse({ success: false, error: '未知消息类型' });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: msg });
  }
}
