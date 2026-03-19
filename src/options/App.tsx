import { useState, useEffect, useCallback } from 'react';
import type { ProjectInfo } from '../shared/types';

const DEFAULT_PROJECT_INFO: ProjectInfo = {
  targetUrl: '',
  keywords: '',
  brandName: '',
  description: '',
  email: '',
  name: '',
};

function App() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(DEFAULT_PROJECT_INFO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const loadConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (response.success && response.data) {
        setProjectInfo(response.data.project);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };
  
  const handleSaveProjectInfo = useCallback(async () => {
    setSaving(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROJECT_INFO',
        payload: projectInfo,
      });
      
      if (response.success) {
        showToast('success', '项目信息已保存');
      } else {
        showToast('error', response.error || '保存失败');
      }
    } catch (error) {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  }, [projectInfo]);
  
  const handleTestAPI = useCallback(async () => {
    setTesting(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TEST_API' });
      
      if (response.success) {
        showToast('success', 'Azure OpenAI 连接成功');
      } else {
        showToast('error', response.message || '连接失败');
      }
    } catch (error) {
      showToast('error', '测试失败');
    } finally {
      setTesting(false);
    }
  }, []);
  
  if (loading) {
    return (
      <div className="options-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <h1 className="page-title">AI 外链助手设置</h1>
      <p className="page-subtitle">配置推广项目信息</p>
      
      {/* API 状态卡片 */}
      <div className="settings-card">
        <h2 className="settings-card-title">
          <span>API 状态</span>
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          已配置 Azure OpenAI (gpt-4.1)
        </p>
        <button
          className="btn btn-secondary"
          onClick={handleTestAPI}
          disabled={testing}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
      
      {/* 项目信息卡片 */}
      <div className="settings-card">
        <h2 className="settings-card-title">
          <span>推广项目信息</span>
        </h2>
        
        <div className="form-group">
          <label className="form-label">
            推广网址 <span style={{ color: '#ef4444' }}>*</span>
            <span className="form-label-hint"> - 你要推广的落地页地址</span>
          </label>
          <input
            type="url"
            className="form-input"
            value={projectInfo.targetUrl}
            onChange={(e) => setProjectInfo({ ...projectInfo, targetUrl: e.target.value })}
            placeholder="https://your-website.com"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            核心关键词
            <span className="form-label-hint"> - 希望在外链中锚定的关键词</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={projectInfo.keywords}
            onChange={(e) => setProjectInfo({ ...projectInfo, keywords: e.target.value })}
            placeholder="AI工具, 在线设计, SaaS"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            品牌名称
            <span className="form-label-hint"> - 你的公司或网站名称</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={projectInfo.brandName}
            onChange={(e) => setProjectInfo({ ...projectInfo, brandName: e.target.value })}
            placeholder="你的品牌名"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            网站描述 <span style={{ color: '#ef4444' }}>*</span>
            <span className="form-label-hint"> - AI 会根据此描述生成内容</span>
          </label>
          <textarea
            className="form-input form-textarea"
            value={projectInfo.description}
            onChange={(e) => setProjectInfo({ ...projectInfo, description: e.target.value })}
            placeholder="简要描述你的网站是做什么的、有什么特点、目标用户是谁&#10;例如：ExtractAny 是一款 AI 数据提取工具，可以从网页和表单中批量提取结构化数据，适合需要数据采集的企业和开发者。"
            rows={4}
          />
        </div>
        
        <div className="divider" />
        
        <div className="form-group">
          <label className="form-label">
            联系邮箱 <span style={{ color: '#ef4444' }}>*</span>
            <span className="form-label-hint"> - 用于自动填充表单</span>
          </label>
          <input
            type="email"
            className="form-input"
            value={projectInfo.email}
            onChange={(e) => setProjectInfo({ ...projectInfo, email: e.target.value })}
            placeholder="contact@example.com"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">
            联系人名称
            <span className="form-label-hint"> - 用于自动填充姓名/作者字段</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={projectInfo.name}
            onChange={(e) => setProjectInfo({ ...projectInfo, name: e.target.value })}
            placeholder="张三"
          />
        </div>
        
        <div className="action-bar">
          <button
            className="btn btn-primary btn-full"
            onClick={handleSaveProjectInfo}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存项目信息'}
          </button>
        </div>
      </div>
      
      {/* 使用说明 */}
      <div className="settings-card" style={{ background: '#f9fafb' }}>
        <h2 className="settings-card-title">使用说明</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>填写上方的项目信息</li>
          <li>打开目标外链页面（博客评论区或导航站提交页）</li>
          <li>点击浏览器右上角的插件图标</li>
          <li>选择模式：评论模式或导航站模式</li>
          <li>点击"一键处理"，等待内容生成</li>
          <li>检查生成的内容，可以编辑修改</li>
          <li>点击"填充表单"自动填充到页面</li>
          <li>人工检查后提交表单</li>
        </ol>
      </div>
      
      {/* Toast 通知 */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
