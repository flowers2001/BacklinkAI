// ========================================
// AI API 客户端
// 支持 DeepSeek 和 OpenAI
// ========================================

import type { AIProvider, ScrapedContent, ProjectInfo, WorkMode, GenerateResult } from '../shared/types';
import { getAPIConfig, getProjectInfo } from '../shared/storage';
import { buildPrompt, getSystemPrompt } from './prompts';

/** API 端点配置 */
const API_ENDPOINTS: Record<AIProvider, string> = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
};

/** 默认模型配置 */
const DEFAULT_MODELS: Record<AIProvider, string> = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
};

/** API 请求超时（毫秒） */
const API_TIMEOUT = 30000;

/**
 * 调用 AI API 生成内容
 */
export async function generateContent(
  mode: WorkMode,
  pageContent: ScrapedContent
): Promise<GenerateResult> {
  try {
    // 获取配置
    const apiConfig = await getAPIConfig();
    const projectInfo = await getProjectInfo();
    
    // 验证 API Key
    const apiKey = apiConfig.provider === 'deepseek'
      ? apiConfig.deepseekApiKey
      : apiConfig.openaiApiKey;
    
    if (!apiKey) {
      return {
        success: false,
        error: `请先配置 ${apiConfig.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API Key`,
      };
    }
    
    // 验证项目信息
    if (!projectInfo.targetUrl) {
      return {
        success: false,
        error: '请先配置推广网址',
      };
    }
    
    // 构建 Prompt
    const userPrompt = buildPrompt(mode, pageContent, projectInfo);
    const systemPrompt = getSystemPrompt();
    
    // 调用 API
    const content = await callAPI(
      apiConfig.provider,
      apiKey,
      systemPrompt,
      userPrompt,
      apiConfig.customEndpoint
    );
    
    return {
      success: true,
      content,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AI外链助手] AI 生成失败:', message);
    
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * 调用 AI API
 */
async function callAPI(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  customEndpoint?: string
): Promise<string> {
  const endpoint = customEndpoint || API_ENDPOINTS[provider];
  const model = DEFAULT_MODELS[provider];
  
  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`API 错误 (${response.status}): ${errorMessage}`);
    }
    
    const data = await response.json();
    
    // 提取生成的内容
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('API 返回内容为空');
    }
    
    return content.trim();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('API 请求超时，请检查网络连接');
      }
      throw error;
    }
    
    throw new Error('未知错误');
  }
}

/**
 * 测试 API 连接
 */
export async function testAPIConnection(
  provider: AIProvider,
  apiKey: string,
  customEndpoint?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const endpoint = customEndpoint || API_ENDPOINTS[provider];
    const model = DEFAULT_MODELS[provider];
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: 'Hi' },
        ],
        max_tokens: 5,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      return {
        success: false,
        message: `连接失败: ${errorMessage}`,
      };
    }
    
    return {
      success: true,
      message: '连接成功',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `连接失败: ${message}`,
    };
  }
}
