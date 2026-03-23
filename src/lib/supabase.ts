// ========================================
// Supabase 客户端初始化
// ========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// ========================================
// UUID 生成工具（基于 email 生成稳定的 UUID v5）
// ========================================

async function generateUUIDFromEmail(email: string): Promise<string> {
  // UUID v5 命名空间（DNS）
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  
  // 将 email 转为 Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(namespace + email);
  
  // 使用 SHA-1 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // 转为 UUID 格式
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // UUID v5 格式：xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '5' + hex.substring(13, 16),
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-');
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('请在 .env 文件中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}

// 获取当前登录用户（从本地存储读取，不依赖 Supabase Auth）
export async function getCurrentUser() {
  try {
    const result = await chrome.storage.local.get(['supabase_user']);
    return result.supabase_user || null;
  } catch (error) {
    console.error('获取用户失败:', error);
    return null;
  }
}

// Google 登录（使用 launchWebAuthFlow 方式，兼容 Web 应用 Client ID）
export async function signInWithGoogle() {
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return {
        data: null,
        error: { message: '请在 .env 中配置 VITE_GOOGLE_CLIENT_ID' }
      };
    }

    // 获取插件 ID（从 chrome.runtime.id 获取）
    const redirectURL = chrome.identity.getRedirectURL();
    
    // 构建 OAuth2 授权 URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectURL);
    authUrl.searchParams.set('scope', 'openid email profile');

    // 启动 Web 认证流程
    const responseUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true,
        },
        (callbackUrl) => {
          if (chrome.runtime.lastError || !callbackUrl) {
            reject(new Error(chrome.runtime.lastError?.message || '登录取消'));
            return;
          }
          resolve(callbackUrl);
        }
      );
    });

    // 从回调 URL 提取 access_token
    const params = new URL(responseUrl).hash.slice(1);
    const urlParams = new URLSearchParams(params);
    const token = urlParams.get('access_token');

    if (!token) {
      throw new Error('未获取到访问令牌');
    }

    // 使用 token 获取用户信息
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('获取用户信息失败');
    }

    const userInfo = await response.json();
    
    // 从 email 生成稳定的 UUID（使用 UUID v5 命名空间）
    const userId = await generateUUIDFromEmail(userInfo.email);
    
    // 构造用户对象
    const user = {
      id: userId,  // 使用生成的 UUID
      email: userInfo.email,
      user_metadata: {
        name: userInfo.name,
        avatar_url: userInfo.picture,
      }
    };

    // 保存到本地存储
    await chrome.storage.local.set({ 
      'supabase_user': user,
      'google_token': token 
    });

    return { data: { user }, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : '登录失败' }
    };
  }
}

// 登出
export async function signOut() {
  try {
    // 清除 Google Token
    const result = await chrome.storage.local.get(['google_token']);
    if (result.google_token) {
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: result.google_token }, () => {
          resolve();
        });
      });
    }
    
    // 清除本地用户数据
    await chrome.storage.local.remove(['supabase_user', 'google_token']);
    
    return { error: null };
  } catch (error) {
    return { error: { message: '登出失败' } };
  }
}
