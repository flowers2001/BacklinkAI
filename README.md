# BacklinkAI

一款专为 SEO 外链专员设计的 Chrome 浏览器插件，通过 **网页上下文感知 + AI 内容生成 + 自动表单填充** 的流程，大幅提升外链发布效率。

> 🚀 **安装指南**：查看 [INSTALL.md](./INSTALL.md) 了解如何从源码构建并安装插件

## 功能特性

- **智能内容抓取**：自动提取目标网页的标题、描述、正文等关键信息
- **AI 内容生成**：支持 DeepSeek / OpenAI API，生成个性化评论或站点描述
- **智能表单填充**：自动识别并填充表单字段（URL、邮箱、评论等）
- **两种工作模式**：
  - 评论模式：生成博客/论坛评论
  - 导航站模式：生成站点描述

## 技术栈

- React 18 + TypeScript
- Vite 5 构建
- Chrome Extension Manifest V3

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 加载插件

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载未打包的扩展程序」
4. 选择项目的 `dist` 目录

## 项目结构

```
BacklinkAI/
├── src/
│   ├── popup/           # Popup 界面 (React)
│   │   ├── App.tsx      # 主应用组件
│   │   ├── main.tsx     # 入口文件
│   │   ├── components/  # UI 组件
│   │   │   ├── ModeSelector.tsx    # 模式切换
│   │   │   ├── GenerateButton.tsx  # 操作按钮
│   │   │   ├── ContentPreview.tsx  # 内容预览
│   │   │   └── StatusIndicator.tsx # 状态指示
│   │   └── hooks/
│   │       └── useAIGenerate.ts    # 生成逻辑 Hook
│   ├── options/         # 设置页面 (React)
│   │   ├── App.tsx      # 设置页面组件
│   │   └── main.tsx     # 入口文件
│   ├── background/      # Service Worker
│   │   ├── index.ts     # 消息处理入口
│   │   ├── ai-client.ts # AI API 客户端
│   │   └── prompts.ts   # Prompt 模板
│   ├── content/         # Content Script
│   │   ├── index.ts     # 消息处理入口
│   │   ├── scraper.ts   # 页面内容抓取
│   │   └── form-filler.ts # 表单填充
│   ├── shared/          # 共享模块
│   │   ├── types.ts     # TypeScript 类型定义
│   │   ├── messages.ts  # 消息协议
│   │   └── storage.ts   # 存储封装
│   └── styles/
│       └── popup.css    # 全局样式
├── public/
│   ├── manifest.json    # 插件配置
│   └── icons/           # 图标资源
├── popup.html           # Popup 入口
├── options.html         # 设置页入口
├── vite.config.ts       # 构建配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 核心模块说明

### 1. 内容抓取 (scraper.ts)

- 提取页面标题、Meta Description、H1/H2 标题
- 智能识别主要内容区域（article、main 等）
- 自动清洗文本，排除导航、广告等干扰内容
- 支持 SPA 页面的动态加载

### 2. AI 生成 (ai-client.ts)

- 支持 DeepSeek 和 OpenAI 两种 API
- 评论模式：基于文章内容生成自然评论
- 导航站模式：生成专业的站点描述
- 内置 Prompt 模板，可自定义

### 3. 表单填充 (form-filler.ts)

- 智能识别表单字段（URL、邮箱、姓名、评论等）
- 支持多种选择器模式匹配
- 模拟人类输入行为，触发完整事件链
- 兼容 React/Vue 等框架构建的表单

### 4. 存储管理 (storage.ts)

- API Key 混淆存储
- 项目信息持久化
- 配置完整性检查

## 使用流程

1. **初始化配置**
   - 在设置页面填入 API Key（DeepSeek 或 OpenAI）
   - 配置推广网址、关键词、品牌名称等信息

2. **访问目标站点**
   - 打开要发外链的博客或导航站

3. **生成内容**
   - 点击插件图标打开面板
   - 选择模式（评论/导航站）
   - 点击"一键处理"

4. **填充表单**
   - 检查生成的内容，可编辑修改
   - 点击"填充表单"自动填充

5. **人工提交**
   - 检查填充结果
   - 手动点击页面的提交按钮

## 更新日志

### v1.0.4 (2026-03-23)

- **外链管理优化**：
  - 新增按日期分组显示功能（每天的记录独立显示，最新日期在前）
  - 新增折叠/展开功能（默认收起，点击日期可展开）
  - 新增灵活导出功能：
    - 支持单条记录勾选
    - 支持按日期一键全选
    - 支持全选/取消全选
    - 只导出选中的记录
  - 优化 CSV 导出格式：
    - 新增"日期"列（格式：`YYYY-MM-DD`）
    - 调整列顺序：日期 → URL → 提交内容 → 嵌入链接 → 类型 → 提交时间
    - 日期格式：`YYYY-MM-DD`
    - 提交时间格式：`HH:mm:ss`（只显示时分秒）
    - 修复 Excel 显示问题：日期和时间字段添加制表符，Excel 以文本格式显示（不会显示 `#####`）
  - 优化表格列显示：
    - 删除"域名"列（冗余信息）
    - 新增"提交内容"列（显示提交的评论或描述）
  - 优化表格布局和样式
- **添加推广网站弹窗优化**：
  - 新增右上角关闭按钮（X）
  - 优化弹窗布局（标题栏 + 内容区 + 底部操作栏）
  - 优化输入框样式（灰色背景 → focus 时变白色 + 蓝色边框）
  - 移除禁用状态的红色禁止光标

### v1.0.3 (2026-03-23)

- **修复图标问题**：将图标格式从 SVG 改为 PNG（Chrome 扩展不支持 SVG 图标）
- 更新图标设计：橙色背景 + 白色链条图案
- 插件名称统一为 "BacklinkAI"
- **安全加固**：强化应用层权限检查
  - `updatePromotionSite`：添加 `user_id` 验证，防止跨用户修改
  - `deletePromotionSite`：添加 `user_id` 验证，防止跨用户删除
  - `setActiveSite`：激活操作增加用户归属检查
  - `deleteBacklink`：添加 `user_id` 验证
  - `getBacklinksBySite`：添加 `user_id` 过滤
- 创建 `DISTRIBUTION_GUIDE.md` 小团队分发指南

### v1.0.2 (2026-03-23)

- 更新插件品牌名称（AI 外链助手 → BacklinkAI）
- 修复登出后下拉框不消失的问题
- 修复添加推广网站后下拉框不自动刷新的问题
- 增强 URL 输入验证（实时提示 + 保存按钮禁用）
- 修复侧边栏页面布局对齐问题
- 优化 "项目名称" 字段命名（原 "物料名称"）

### v1.0.1 (2026-03-23)

- 修复 Google OAuth 登录问题（切换为 launchWebAuthFlow）
- 修复 Supabase UUID 类型不匹配问题（使用 email 生成稳定 UUID）
- 禁用 RLS 以支持 Zeabur 部署环境
- 修复无效 URL 导致页面空白的问题

### v1.0.0 (2024-03)

- 初始化项目结构
- 实现 Popup UI 界面
- 实现 Settings 设置页面
- 集成 DeepSeek / OpenAI API
- 实现页面内容抓取模块
- 实现智能表单填充模块
- 添加消息通信机制
- 完成类型定义和存储封装

## 注意事项

- API Key 仅存储在本地，不会上传至任何服务器
- 建议在填充前人工审核 AI 生成的内容
- 某些复杂表单（Shadow DOM、iframe）可能需要手动填写
- 使用 DeepSeek API 无需科学上网

## 后期规划

- [ ] 分类自动识别
- [ ] 外链发布记录导出
- [ ] 多语言支持
- [ ] 多项目管理
- [ ] 自定义 Prompt 模板

## License

MIT
