const l={API_CONFIG:"apiConfig",PROJECT_INFO:"projectInfo"};function m(e){return e?btoa(e.split("").reverse().join("")):""}function f(e){if(!e)return"";try{return atob(e).split("").reverse().join("")}catch{return""}}const w={provider:"deepseek",deepseekApiKey:"",openaiApiKey:""},A={targetUrl:"",keywords:"",brandName:"",email:"",name:""};async function O(e){const t={provider:e.provider,deepseekApiKey:m(e.deepseekApiKey),openaiApiKey:m(e.openaiApiKey),customEndpoint:e.customEndpoint};await chrome.storage.local.set({[l.API_CONFIG]:t})}async function P(){const t=(await chrome.storage.local.get(l.API_CONFIG))[l.API_CONFIG];return t?{provider:t.provider||"deepseek",deepseekApiKey:f(t.deepseekApiKey||""),openaiApiKey:f(t.openaiApiKey||""),customEndpoint:t.customEndpoint}:w}async function y(e){await chrome.storage.local.set({[l.PROJECT_INFO]:e})}async function h(){return(await chrome.storage.local.get(l.PROJECT_INFO))[l.PROJECT_INFO]||A}async function E(){const[e,t]=await Promise.all([P(),h()]);return{api:e,project:t}}async function b(e){await Promise.all([O(e.api),y(e.project)])}function I(e){const t=(e.title+" "+e.bodyText.slice(0,500)).toLowerCase();return/[\u4e00-\u9fa5]/.test(t)?"zh":/[\u3040-\u309f\u30a0-\u30ff]/.test(t)?"ja":/[\uac00-\ud7af]/.test(t)?"ko":/[\u0400-\u04ff]/.test(t)?"ru":/\b(und|der|die|das|ist|für|mit)\b/.test(t)?"de":/\b(le|la|les|est|pour|avec|dans)\b/.test(t)?"fr":/\b(el|la|los|las|es|para|con)\b/.test(t)?"es":"en"}const $={zh:"中文",en:"英文",ja:"日文",ko:"韩文",de:"德文",fr:"法文",es:"西班牙文",ru:"俄文"};function k(e,t,r){const s=I(t),o=$[s]||"英文";switch(e){case"comment":return T(t,r,s,o);case"directory":return C(r,s,o);default:throw new Error(`未知模式: ${e}`)}}function T(e,t,r,s){const o=e.title||"无标题",a=e.h1[0]||e.h2[0]||"",n=e.bodyText.slice(0,500),u=r==="zh";return`你是一个热情的博客读者，需要为一篇${s}文章写评论。

## 文章信息
- 标题：${o}
${a?`- 主标题：${a}`:""}
- 内容预览：${n}...
- 文章语言：${s}

## 你的背景
- 你关注 ${t.keywords||"相关"} 领域
- 你的网站：${t.targetUrl}

## 任务
请生成两个版本的评论，用 JSON 格式返回：

{
  "original": "用${s}写的评论（匹配文章语言）",
  "chinese": "中文版本的评论"
}

## 评论要求
1. 字数：50-100字
2. 语气自然真诚，像真正阅读过文章的读者
3. 可以赞同观点、分享经验或提出问题
4. 适当提及你的网站（${t.targetUrl}）
5. 不要像广告或垃圾评论
6. original 必须用${s}写，要符合该语言的表达习惯
${u?"7. 如果文章是中文，original 和 chinese 内容相同即可":""}

请只返回 JSON，不要有其他内容。`}function C(e,t,r){const s=t==="zh";return`你是 SEO 文案专家，需要为网站撰写导航站提交描述。

## 网站信息
- 名称：${e.brandName||"待填写"}
- 网址：${e.targetUrl}
- 关键词：${e.keywords}
- 目标导航站语言：${r}

## 任务
请生成两个版本的网站描述，用 JSON 格式返回：

{
  "original": "用${r}写的网站描述（匹配导航站语言）",
  "chinese": "中文版本的网站描述"
}

## 描述要求
1. 字数：200-300字
2. 专业正式，有说服力
3. 包含核心业务、优势、目标用户
4. SEO 友好，自然融入关键词
5. 不要夸大宣传
6. original 必须用${r}写，符合该语言的表达习惯
${s?"7. 如果是中文导航站，original 和 chinese 内容相同即可":""}

请只返回 JSON，不要有其他内容。`}function N(){return`你是专业的多语言内容创作助手。你能够：
1. 准确识别目标语言并用该语言写作
2. 写出符合当地语言习惯的自然内容
3. 同时提供中文版本便于用户理解

请严格按要求返回 JSON 格式，不要添加任何解释或 markdown 标记。`}const c={endpoint:"https://openai-baibei.openai.azure.com",deployment:"gpt-4.1",apiKey:"cd21199a32a8440c9bce461b7de7446b",apiVersion:"2024-12-01-preview"},_=3e4;async function S(e,t){try{const r=await h();if(!r.targetUrl)return{success:!1,error:"请先配置推广网址"};const s=k(e,t,r),o=N(),a=await F(o,s);try{let n=a.trim();n.startsWith("```json")&&(n=n.slice(7)),n.startsWith("```")&&(n=n.slice(3)),n.endsWith("```")&&(n=n.slice(0,-3)),n=n.trim();const u=JSON.parse(n);return{success:!0,original:u.original||"",chinese:u.chinese||""}}catch{return{success:!0,original:a,chinese:""}}}catch(r){return{success:!1,error:r instanceof Error?r.message:String(r)}}}async function F(e,t){var a,n,u,p;const r=`${c.endpoint}/openai/deployments/${c.deployment}/chat/completions?api-version=${c.apiVersion}`,s=new AbortController,o=setTimeout(()=>s.abort(),_);try{const i=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json","api-key":c.apiKey},body:JSON.stringify({messages:[{role:"system",content:e},{role:"user",content:t}],temperature:.7,max_tokens:1500}),signal:s.signal});if(clearTimeout(o),!i.ok){const g=await i.json().catch(()=>({}));throw new Error(`API 错误 (${i.status}): ${((a=g.error)==null?void 0:a.message)||i.statusText}`)}const d=(p=(u=(n=(await i.json()).choices)==null?void 0:n[0])==null?void 0:u.message)==null?void 0:p.content;if(!d)throw new Error("API 返回内容为空");return d.trim()}catch(i){throw clearTimeout(o),i instanceof Error&&i.name==="AbortError"?new Error("API 请求超时"):i}}async function v(){var e;try{const t=`${c.endpoint}/openai/deployments/${c.deployment}/chat/completions?api-version=${c.apiVersion}`,r=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json","api-key":c.apiKey},body:JSON.stringify({messages:[{role:"user",content:"Hi"}],max_tokens:5})});return r.ok?{success:!0,message:"连接成功"}:{success:!1,message:`连接失败: ${((e=(await r.json().catch(()=>({}))).error)==null?void 0:e.message)||r.statusText}`}}catch(t){return{success:!1,message:`连接失败: ${t instanceof Error?t.message:String(t)}`}}}console.log("[AI外链助手] Background Service Worker 已启动");chrome.action.onClicked.addListener(async e=>{try{await chrome.sidePanel.open({windowId:e.windowId})}catch(t){console.log("Side panel error:",t)}});chrome.runtime.onInstalled.addListener(e=>{e.reason==="install"&&chrome.runtime.openOptionsPage();try{chrome.sidePanel.setOptions({enabled:!0}),chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0})}catch{}});chrome.runtime.onMessage.addListener((e,t,r)=>(J(e,r),!0));async function J(e,t){try{switch(e.type){case"GENERATE_CONTENT":const r=e,s=await S(r.payload.mode,r.payload.pageContent);t(s);break;case"GET_CONFIG":const o=await E();t({success:!0,data:o});break;case"SAVE_CONFIG":await b(e.payload),t({success:!0});break;case"SAVE_PROJECT_INFO":await y(e.payload),t({success:!0});break;case"TEST_API":const a=await v();t(a);break;default:t({success:!1,error:"未知消息类型"})}}catch(r){const s=r instanceof Error?r.message:String(r);t({success:!1,error:s})}}
