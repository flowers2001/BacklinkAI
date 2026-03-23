// ========================================
// 推广网站数据访问层
// ========================================

import { getSupabaseClient } from '../lib/supabase';
import type { PromotionSite } from '../shared/supabase-types';

/**
 * 获取用户的所有推广网站
 */
export async function getPromotionSites(userId: string): Promise<PromotionSite[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('promotion_sites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ 获取推广网站失败:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * 获取激活的推广网站
 */
export async function getActiveSite(userId: string): Promise<PromotionSite | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('promotion_sites')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('❌ 获取激活网站失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 创建推广网站
 */
export async function createPromotionSite(site: PromotionSite): Promise<PromotionSite> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('promotion_sites')
    .insert(site)
    .select()
    .single();
  
  if (error) {
    console.error('❌ 创建推广网站失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 更新推广网站
 */
export async function updatePromotionSite(id: string, userId: string, updates: Partial<PromotionSite>): Promise<PromotionSite> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('promotion_sites')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('❌ 更新推广网站失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 删除推广网站
 */
export async function deletePromotionSite(id: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('promotion_sites')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ 删除推广网站失败:', error);
    throw error;
  }
}

/**
 * 设置激活的推广网站（取消其他网站的激活状态）
 */
export async function setActiveSite(userId: string, siteId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // 1. 取消所有激活
  await supabase
    .from('promotion_sites')
    .update({ is_active: false })
    .eq('user_id', userId);
  
  // 2. 激活指定网站（必须是该用户的网站）
  const { error } = await supabase
    .from('promotion_sites')
    .update({ is_active: true })
    .eq('id', siteId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ 设置激活网站失败:', error);
    throw error;
  }
}
