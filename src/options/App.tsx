import { useState, useEffect, useCallback } from 'react';
import type { APIConfig, ProjectInfo, AIProvider } from '../shared/types';

// 默认配置
const DEFAULT_API_CONFIG: APIConfig = {
  provider: 'deepseek',
  deepseekApiKey: '',
  openaiApiKey: '',
};

const DEFAULT_PROJECT_INFO: ProjectInfo = {
  targetUrl: '',
  keywords: '',
  brandName: '',
  email: '',
  name: '',
};

function App() {
  // API 配置状态
  const [apiConfig, setApiConfig] = useState<APIConfig>(DEFAULT_API_CONFIG);
  // 项目信息状态
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(DEFAULT_PROJECT_INFO);
  // UI 状态
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);
  
  // Toast 自动消失
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
        setApiConfig(response.data.api);
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
  
  // 保存 API 配置
  const handleSaveAPIConfig = useCallback(async () => {
    setSaving(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_API_CONFIG',
        payload: apiConfig,
      });
      
      if (response.success) {
        showToast('success', 'API 配置已保存');
      } else {
        showToast('error', response.error || '保存失败');
      }
    } catch (error) {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  }, [apiConfig]);
  
  // 保存项目信息
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
  
  // 测试 API 连接
  const handleTestAPI = useCallback(async () => {
    const apiKey = apiConfig.provider === 'deepseek'
      ? apiConfig.deepseekApiKey
      : apiConfig.openaiApiKey;
    
    if (!apiKey) {
      showToast('error', '请先输入 API Key');
      return;
    }
    
    setTesting(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_API',
        payload: {
          provider: apiConfig.provider,
          apiKey,
          customEndpoint: apiConfig.customEndpoint,
        },
      });
      
      if (response.success) {
        showToast('success', 'API 连接成功');
      } else {
        showToast('error', response.message || '连接失败');
      }
    } catch (error) {
      showToast('error', '测试失败');
    } finally {
      setTesting(false);
    }
  }, [apiConfig]);
  
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
      <p className="page-subtitle">配置 API 和推广项目信息，设置完成后即可使用</p>
      
      {/* API 设置卡片 */}
      <div className="settings-card">
        <h2 className="settings-card-title">
          <span>API 设置</span>
        </h2>
        
        <div className="form-group">
          <label className="form-label">AI 服务商</label>
          <select
            className="form-select"
            value={apiConfig.provider}
            onChange={(e) => setApiConfig({ ...apiConfig, provider: e.target.value as AIProvider })}
          >
            <option value="deepseek">DeepSeek（推荐，性价比高）</option>
            <option value="openai">OpenAI（需要科学上网）</option>
          </select>
        </div>
        
        {apiConfig.provider === 'deepseek' ? (
          <div className="form-group">
            <label className="form-label">
              DeepSeek API Key
              <span className="form-label-hint"> - 从 platform.deepseek.com 获取</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={apiConfig.deepseekApiKey}
              onChange={(e) => setApiConfig({ ...apiConfig, deepseekApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">
              OpenAI API Key
              <span className="form-label-hint"> - 从 platform.openai.com 获取</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={apiConfig.openaiApiKey}
              onChange={(e) => setApiConfig({ ...apiConfig, openaiApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">
            自定义 API 端点
            <span className="form-label-hint"> - 可选，用于代理或自建服务</span>
          </label>
          <input
            type="url"
            className="form-input"
            value={apiConfig.customEndpoint || ''}
            onChange={(e) => setApiConfig({ ...apiConfig, customEndpoint: e.target.value || undefined })}
            placeholder="https://your-proxy.com/v1/chat/completions"
          />
        </div>
        
        <div className="action-bar">
          <button
            className="btn btn-secondary"
            onClick={handleTestAPI}
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveAPIConfig}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存 API 设置'}
          </button>
        </div>
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
          <li>填写上方的 API Key 和项目信息</li>
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
