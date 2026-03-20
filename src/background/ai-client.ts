// ========================================
// AI API 客户端
// 使用 Azure OpenAI
// ========================================

import type { ScrapedContent, WorkMode, APIConfig } from '../shared/types';
import { getProjectInfo, getAPIConfig, DEFAULT_API_CONFIG } from '../shared/storage';
import { buildPrompt, getSystemPrompt } from './prompts';

const API_TIMEOUT = 30000;

export interface DualContentResult {
  success: boolean;
  original?: string;
  chinese?: string;
  error?: string;
}

/**
 * 生成内容（同时生成原文和中文版本）
 */
export async function generateContent(
  mode: WorkMode,
  pageContent: ScrapedContent | null,
  charLimit?: number
): Promise<DualContentResult> {
  try {
    const projectInfo = await getProjectInfo();
    
    // 优先使用环境变量中的 API Key
    let apiConfig: APIConfig;
    const envApiKey = import.meta.env.VITE_AZURE_API_KEY;
    
    if (envApiKey) {
      // 使用环境变量配置
      apiConfig = {
        provider: 'azure',
        apiKey: envApiKey,
        azureEndpoint: import.meta.env.VITE_AZURE_ENDPOINT || 'https://openai-baibei.openai.azure.com',
        azureDeployment: import.meta.env.VITE_AZURE_DEPLOYMENT || 'gpt-4.1',
        azureApiVersion: import.meta.env.VITE_AZURE_API_VERSION || '2024-12-01-preview',
      };
    } else {
      // 从用户配置读取
      apiConfig = await getAPIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, error: '请先配置 API Key' };
      }
    }
    
    if (!projectInfo.targetUrl) {
      return { success: false, error: '请先配置推广网址' };
    }
    
    const userPrompt = buildPrompt(mode, pageContent, projectInfo, charLimit);
    const systemPrompt = getSystemPrompt();
    const response = await callAzureOpenAI(systemPrompt, userPrompt, apiConfig);
    
    // 解析 JSON 响应
    try {
      // 清理可能的 markdown 代码块标记
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      cleanResponse = cleanResponse.trim();
      
      const parsed = JSON.parse(cleanResponse);
      return {
        success: true,
        original: parsed.original || '',
        chinese: parsed.chinese || '',
      };
    } catch {
      // 如果解析失败，把整个响应作为原文
      return {
        success: true,
        original: response,
        chinese: '',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * 调用 Azure OpenAI API
 */
async function callAzureOpenAI(
  systemPrompt: string,
  userPrompt: string,
  config: APIConfig
): Promise<string> {
  const endpoint = config.azureEndpoint || DEFAULT_API_CONFIG.azureEndpoint;
  const deployment = config.azureDeployment || DEFAULT_API_CONFIG.azureDeployment;
  const apiVersion = config.azureApiVersion || DEFAULT_API_CONFIG.azureApiVersion;
  
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  
  // 🖨️ 打印发送给模型的 Prompt
  // console.log('\n=========================== 📤 发送给模型的 Prompt ===========================');
  // console.log('\n【System Prompt】:');
  // console.log(systemPrompt);
  // console.log('\n【User Prompt】:');
  // console.log(userPrompt);
  // console.log('\n================================================================================\n');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 错误 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('API 返回内容为空');
    
    // 🖨️ 打印模型返回的内容
    // console.log('\n=========================== 📥 模型返回的内容 ===========================');
    // console.log(content.trim());
    // console.log('\n==========================================================================\n');
    
    return content.trim();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('API 请求超时');
    }
    throw error;
  }
}

/**
 * 测试 API 连接
 */
export async function testAPIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getAPIConfig();
    
    if (!config.apiKey) {
      return { success: false, message: '请先填写 API Key' };
    }
    
    const endpoint = config.azureEndpoint || DEFAULT_API_CONFIG.azureEndpoint;
    const deployment = config.azureDeployment || DEFAULT_API_CONFIG.azureDeployment;
    const apiVersion = config.azureApiVersion || DEFAULT_API_CONFIG.azureApiVersion;
    
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: `连接失败: ${errorData.error?.message || response.statusText}` };
    }
    
    return { success: true, message: '连接成功' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message: `连接失败: ${message}` };
  }
}
