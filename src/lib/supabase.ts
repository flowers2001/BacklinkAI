// ========================================
// Supabase 客户端初始化
// ========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

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

// Google 登录（使用 Chrome Identity API，不依赖 Supabase Auth）
export async function signInWithGoogle() {
  return new Promise<{ data: any; error: any }>((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        resolve({
          data: null,
          error: { message: chrome.runtime.lastError?.message || '登录取消' }
        });
        return;
      }

      try {
        // 使用 token 获取用户信息
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('获取用户信息失败');
        }

        const userInfo = await response.json();
        
        // 构造用户对象（不依赖 Supabase Auth）
        const user = {
          id: userInfo.id,
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

        resolve({ data: { user }, error: null });
      } catch (error) {
        resolve({
          data: null,
          error: { message: error instanceof Error ? error.message : '登录失败' }
        });
      }
    });
  });
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
