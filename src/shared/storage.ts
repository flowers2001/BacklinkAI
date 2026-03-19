// ========================================
// Chrome Storage 存储封装
// ========================================

import type { StorageConfig, APIConfig, ProjectInfo, AIProvider } from './types';

/** 存储键名 */
const STORAGE_KEYS = {
  API_CONFIG: 'apiConfig',
  PROJECT_INFO: 'projectInfo',
} as const;

// ========================================
// 简单混淆（非真正加密，但可防止明文暴露）
// ========================================

function obfuscate(text: string): string {
  if (!text) return '';
  return btoa(text.split('').reverse().join(''));
}

function deobfuscate(text: string): string {
  if (!text) return '';
  try {
    return atob(text).split('').reverse().join('');
  } catch {
    return '';
  }
}

// ========================================
// 默认配置
// ========================================

export const DEFAULT_API_CONFIG: APIConfig = {
  provider: 'deepseek',
  deepseekApiKey: '',
  openaiApiKey: '',
};

export const DEFAULT_PROJECT_INFO: ProjectInfo = {
  targetUrl: '',
  keywords: '',
  brandName: '',
  description: '',
  email: '',
  name: '',
};

// ========================================
// API 配置存储
// ========================================

/**
 * 保存 API 配置（API Key 会进行混淆处理）
 */
export async function saveAPIConfig(config: APIConfig): Promise<void> {
  const stored = {
    provider: config.provider,
    deepseekApiKey: obfuscate(config.deepseekApiKey),
    openaiApiKey: obfuscate(config.openaiApiKey),
    customEndpoint: config.customEndpoint,
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.API_CONFIG]: stored });
}

/**
 * 获取 API 配置
 */
export async function getAPIConfig(): Promise<APIConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_CONFIG);
  const stored = result[STORAGE_KEYS.API_CONFIG];
  
  if (!stored) {
    return DEFAULT_API_CONFIG;
  }

  return {
    provider: stored.provider || 'deepseek',
    deepseekApiKey: deobfuscate(stored.deepseekApiKey || ''),
    openaiApiKey: deobfuscate(stored.openaiApiKey || ''),
    customEndpoint: stored.customEndpoint,
  };
}

/**
 * 获取当前选择的 API Key
 */
export async function getCurrentApiKey(): Promise<{ provider: AIProvider; apiKey: string } | null> {
  const config = await getAPIConfig();
  const apiKey = config.provider === 'deepseek' 
    ? config.deepseekApiKey 
    : config.openaiApiKey;
  
  if (!apiKey) {
    return null;
  }

  return { provider: config.provider, apiKey };
}

// ========================================
// 项目信息存储
// ========================================

/**
 * 保存项目信息
 */
export async function saveProjectInfo(info: ProjectInfo): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.PROJECT_INFO]: info });
}

/**
 * 获取项目信息
 */
export async function getProjectInfo(): Promise<ProjectInfo> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PROJECT_INFO);
  return result[STORAGE_KEYS.PROJECT_INFO] || DEFAULT_PROJECT_INFO;
}

// ========================================
// 完整配置操作
// ========================================

/**
 * 获取完整配置
 */
export async function getFullConfig(): Promise<StorageConfig> {
  const [api, project] = await Promise.all([
    getAPIConfig(),
    getProjectInfo(),
  ]);
  return { api, project };
}

/**
 * 保存完整配置
 */
export async function saveFullConfig(config: StorageConfig): Promise<void> {
  await Promise.all([
    saveAPIConfig(config.api),
    saveProjectInfo(config.project),
  ]);
}

/**
 * 检查配置是否完整
 */
export async function isConfigComplete(): Promise<{ complete: boolean; missing: string[] }> {
  const config = await getFullConfig();
  const missing: string[] = [];

  // 检查 API Key
  const hasApiKey = config.api.provider === 'deepseek'
    ? !!config.api.deepseekApiKey
    : !!config.api.openaiApiKey;
  
  if (!hasApiKey) {
    missing.push('API Key');
  }

  // 检查必填项目信息
  if (!config.project.targetUrl) {
    missing.push('推广网址');
  }
  if (!config.project.email) {
    missing.push('联系邮箱');
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

/**
 * 清除所有存储数据
 */
export async function clearAllStorage(): Promise<void> {
  await chrome.storage.local.clear();
}
