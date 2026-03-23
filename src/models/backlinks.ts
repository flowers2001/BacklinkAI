// ========================================
// 外链记录数据访问层
// ========================================

import { getSupabaseClient } from '../lib/supabase';
import type { Backlink } from '../shared/supabase-types';

/**
 * 获取用户的所有外链记录
 */
export async function getBacklinks(userId: string, limit?: number): Promise<Backlink[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('backlinks')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ 获取外链记录失败:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * 获取指定推广网站的外链记录
 */
export async function getBacklinksBySite(siteId: string, userId: string): Promise<Backlink[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('backlinks')
    .select('*')
    .eq('site_id', siteId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });
  
  if (error) {
    console.error('❌ 获取外链记录失败:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * 创建外链记录
 */
export async function createBacklink(backlink: Backlink): Promise<Backlink> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('backlinks')
    .insert(backlink)
    .select()
    .single();
  
  if (error) {
    console.error('❌ 创建外链记录失败:', error);
    throw error;
  }
  
  return data;
}

/**
 * 删除外链记录
 */
export async function deleteBacklink(id: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('backlinks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ 删除外链记录失败:', error);
    throw error;
  }
}

/**
 * 获取外链统计
 */
export async function getBacklinkStats(userId: string): Promise<{
  total: number;
  commentCount: number;
  directoryCount: number;
}> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('backlinks')
    .select('mode')
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ 获取外链统计失败:', error);
    return { total: 0, commentCount: 0, directoryCount: 0 };
  }
  
  const total = data?.length || 0;
  const commentCount = data?.filter(b => b.mode === 'comment').length || 0;
  const directoryCount = data?.filter(b => b.mode === 'directory').length || 0;
  
  return { total, commentCount, directoryCount };
}
