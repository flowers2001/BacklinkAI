const u={API_CONFIG:"apiConfig",PROJECT_INFO:"projectInfo"};function y(e){return e?btoa(e.split("").reverse().join("")):""}function A(e){if(!e)return"";try{return atob(e).split("").reverse().join("")}catch{return""}}const T={provider:"deepseek",deepseekApiKey:"",openaiApiKey:""},S={targetUrl:"",keywords:"",brandName:"",email:"",name:""};async function h(e){const r={provider:e.provider,deepseekApiKey:y(e.deepseekApiKey),openaiApiKey:y(e.openaiApiKey),customEndpoint:e.customEndpoint};await chrome.storage.local.set({[u.API_CONFIG]:r})}async function w(){const r=(await chrome.storage.local.get(u.API_CONFIG))[u.API_CONFIG];return r?{provider:r.provider||"deepseek",deepseekApiKey:A(r.deepseekApiKey||""),openaiApiKey:A(r.openaiApiKey||""),customEndpoint:r.customEndpoint}:T}async function E(e){await chrome.storage.local.set({[u.PROJECT_INFO]:e})}async function I(){return(await chrome.storage.local.get(u.PROJECT_INFO))[u.PROJECT_INFO]||S}async function C(){const[e,r]=await Promise.all([w(),I()]);return{api:e,project:r}}async function _(e){await Promise.all([h(e.api),E(e.project)])}function b(e,r,t){switch(e){case"comment":return N(r,t);case"directory":return $(t);default:throw new Error(`未知模式: ${e}`)}}function N(e,r){const t=e.title||"无标题",o=e.metaDescription||"",s=e.h1[0]||e.h2[0]||"",n=e.bodyText.slice(0,500),i=/[\u4e00-\u9fa5]/.test(e.title+e.bodyText.slice(0,200))?"请用中文回复。":"Please respond in English.";return`你是一个热情的博客读者，刚刚阅读完一篇文章，想要留下一条有价值的评论。

## 文章信息
- 标题：${t}
${s?`- 主标题：${s}`:""}
${o?`- 摘要：${o}`:""}
- 内容预览：${n}...

## 你的背景
- 你关注${r.keywords}相关领域
- 你运营一个网站：${r.targetUrl}

## 任务
请写一条博客评论，要求：
1. 字数：50-100字
2. 语气自然真诚，像一个真正阅读过文章的读者
3. 可以选择以下任意一种风格：
   - 赞同作者观点并补充自己的见解
   - 分享相关的个人经验
   - 提出一个有深度的问题
4. 在适当的位置自然地提及你的网站（${r.targetUrl}）和你关注的领域（${r.keywords}）
5. 不要显得像广告或垃圾评论
6. 不要使用"很棒"、"好文章"等空洞的表述

${i}

请直接输出评论内容，不要有任何前缀或解释。`}function $(e){return`你是一名专业的 SEO 文案撰写专家，需要为一个网站撰写提交到导航站的描述。

## 网站信息
- 网站名称：${e.brandName||"待填写"}
- 网站地址：${e.targetUrl}
- 核心业务/关键词：${e.keywords}

## 任务
请撰写一段专业的网站描述，用于提交到各类导航站/网站目录。

## 要求
1. 字数：200-300字
2. 风格专业正式，具有说服力
3. 包含以下要素：
   - 网站名称和核心定位
   - 主要产品/服务/内容
   - 独特优势或差异化卖点
   - 目标用户群体
   - 品牌价值主张
4. SEO 友好：自然融入关键词（${e.keywords}）
5. 不要使用夸大或虚假宣传的措辞
6. 不要使用第一人称（我们、我）
7. 段落清晰，便于阅读

请直接输出网站描述，不要有任何前缀或解释。`}function v(){return`你是一个专业的内容创作助手，专注于帮助用户创作高质量的 SEO 相关内容。

核心原则：
1. 内容真实自然，不像 AI 生成
2. 符合人类的写作习惯和语气
3. 避免过度使用形容词和夸张表达
4. 关注读者价值，不纯粹为 SEO 而写
5. 遵守平台规则，不生成垃圾内容

输出规范：
- 直接输出最终内容
- 不要添加标题、前缀或解释
- 不要使用 Markdown 格式（除非明确要求）
- 保持指定的字数范围`}const P={deepseek:"https://api.deepseek.com/v1/chat/completions",openai:"https://api.openai.com/v1/chat/completions"},O={deepseek:"deepseek-chat",openai:"gpt-4o-mini"},F=3e4;async function K(e,r){try{const t=await w(),o=await I(),s=t.provider==="deepseek"?t.deepseekApiKey:t.openaiApiKey;if(!s)return{success:!1,error:`请先配置 ${t.provider==="deepseek"?"DeepSeek":"OpenAI"} API Key`};if(!o.targetUrl)return{success:!1,error:"请先配置推广网址"};const n=b(e,r,o),c=v();return{success:!0,content:await G(t.provider,s,c,n,t.customEndpoint)}}catch(t){const o=t instanceof Error?t.message:String(t);return console.error("[AI外链助手] AI 生成失败:",o),{success:!1,error:o}}}async function G(e,r,t,o,s){var p,m,d,f;const n=s||P[e],c=O[e],i=new AbortController,l=setTimeout(()=>i.abort(),F);try{const a=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r}`},body:JSON.stringify({model:c,messages:[{role:"system",content:t},{role:"user",content:o}],temperature:.7,max_tokens:1e3}),signal:i.signal});if(clearTimeout(l),!a.ok){const k=((p=(await a.json().catch(()=>({}))).error)==null?void 0:p.message)||a.statusText;throw new Error(`API 错误 (${a.status}): ${k}`)}const g=(f=(d=(m=(await a.json()).choices)==null?void 0:m[0])==null?void 0:d.message)==null?void 0:f.content;if(!g)throw new Error("API 返回内容为空");return g.trim()}catch(a){throw clearTimeout(l),a instanceof Error?a.name==="AbortError"?new Error("API 请求超时，请检查网络连接"):a:new Error("未知错误")}}async function D(e,r,t){var o;try{const s=t||P[e],n=O[e],c=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${r}`},body:JSON.stringify({model:n,messages:[{role:"user",content:"Hi"}],max_tokens:5})});return c.ok?{success:!0,message:"连接成功"}:{success:!1,message:`连接失败: ${((o=(await c.json().catch(()=>({}))).error)==null?void 0:o.message)||c.statusText}`}}catch(s){return{success:!1,message:`连接失败: ${s instanceof Error?s.message:String(s)}`}}}console.log("[AI外链助手] Background Service Worker 已启动");chrome.runtime.onInstalled.addListener(e=>{e.reason==="install"?(console.log("[AI外链助手] 插件已安装"),chrome.runtime.openOptionsPage()):e.reason==="update"&&console.log("[AI外链助手] 插件已更新到版本:",chrome.runtime.getManifest().version)});chrome.runtime.onMessage.addListener((e,r,t)=>(M(e,t),!0));async function M(e,r){console.log("[AI外链助手] 收到消息:",e.type);try{switch(e.type){case"GENERATE_CONTENT":await U(e,r);break;case"GET_CONFIG":await j(r);break;case"SAVE_CONFIG":await J(e.payload,r);break;case"SAVE_API_CONFIG":await L(e.payload,r);break;case"SAVE_PROJECT_INFO":await x(e.payload,r);break;case"TEST_API":await B(e.payload,r);break;default:console.warn("[AI外链助手] 未知消息类型:",e.type),r({success:!1,error:"未知消息类型"})}}catch(t){const o=t instanceof Error?t.message:String(t);console.error("[AI外链助手] 处理消息失败:",o),r({success:!1,error:o})}}async function U(e,r){const{mode:t,pageContent:o,projectInfo:s}=e.payload;console.log("[AI外链助手] 开始生成内容, 模式:",t);const n=await K(t,o);console.log("[AI外链助手] 生成完成:",n.success?"成功":n.error),r(n)}async function j(e){try{const r=await C();e({success:!0,data:r})}catch(r){const t=r instanceof Error?r.message:String(r);e({success:!1,error:t})}}async function J(e,r){try{await _(e),r({success:!0})}catch(t){const o=t instanceof Error?t.message:String(t);r({success:!1,error:o})}}async function L(e,r){try{await h(e),r({success:!0})}catch(t){const o=t instanceof Error?t.message:String(t);r({success:!1,error:o})}}async function x(e,r){try{await E(e),r({success:!0})}catch(t){const o=t instanceof Error?t.message:String(t);r({success:!1,error:o})}}async function B(e,r){const t=await D(e.provider,e.apiKey,e.customEndpoint);r(t)}
