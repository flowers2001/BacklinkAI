const l={API_CONFIG:"apiConfig",PROJECT_INFO:"projectInfo"};function m(t){return t?btoa(t.split("").reverse().join("")):""}function f(t){if(!t)return"";try{return atob(t).split("").reverse().join("")}catch{return""}}const w={provider:"deepseek",deepseekApiKey:"",openaiApiKey:""},A={targetUrl:"",keywords:"",brandName:"",description:"",email:"",name:""};async function O(t){const e={provider:t.provider,deepseekApiKey:m(t.deepseekApiKey),openaiApiKey:m(t.openaiApiKey),customEndpoint:t.customEndpoint};await chrome.storage.local.set({[l.API_CONFIG]:e})}async function P(){const e=(await chrome.storage.local.get(l.API_CONFIG))[l.API_CONFIG];return e?{provider:e.provider||"deepseek",deepseekApiKey:f(e.deepseekApiKey||""),openaiApiKey:f(e.openaiApiKey||""),customEndpoint:e.customEndpoint}:w}async function y(t){await chrome.storage.local.set({[l.PROJECT_INFO]:t})}async function h(){return(await chrome.storage.local.get(l.PROJECT_INFO))[l.PROJECT_INFO]||A}async function E(){const[t,e]=await Promise.all([P(),h()]);return{api:t,project:e}}async function b(t){await Promise.all([O(t.api),y(t.project)])}function $(t){const e=(t.title+" "+t.bodyText.slice(0,500)).toLowerCase();return/[\u4e00-\u9fa5]/.test(e)?"zh":/[\u3040-\u309f\u30a0-\u30ff]/.test(e)?"ja":/[\uac00-\ud7af]/.test(e)?"ko":/[\u0400-\u04ff]/.test(e)?"ru":/\b(und|der|die|das|ist|für|mit)\b/.test(e)?"de":/\b(le|la|les|est|pour|avec|dans)\b/.test(e)?"fr":/\b(el|la|los|las|es|para|con)\b/.test(e)?"es":"en"}const k={zh:"中文",en:"英文",ja:"日文",ko:"韩文",de:"德文",fr:"法文",es:"西班牙文",ru:"俄文"};function I(t,e,r,s){const o=e?$(e):"en",a=k[o]||"英文";switch(t){case"comment":if(!e)throw new Error("评论模式需要页面内容");return N(e,r,o,a);case"directory":return T(r,s);default:throw new Error(`未知模式: ${t}`)}}function N(t,e,r,s){const o=t.title||"无标题",a=t.h1[0]||t.h2[0]||"",u=t.bodyText.slice(0,500),n=r==="zh";return`你是一个热情的博客读者，需要为一篇${s}文章写评论。

## 文章信息
- 标题：${o}
${a?`- 主标题：${a}`:""}
- 内容预览：${u}...
- 文章语言：${s}

## 你的背景
- 你是 ${e.brandName||"一个网站"} 的用户/运营者
- 你的网站：${e.targetUrl}
- 网站介绍：${e.description||e.keywords||"无"}

## 任务
请生成两个版本的评论，用 JSON 格式返回：

{
  "original": "用${s}写的评论（匹配文章语言）",
  "chinese": "中文版本的评论"
}

## 评论要求
1. 字数：50-100字
2. 语气自然真诚，像真正阅读过文章的读者
3. 结合文章内容和你的网站背景，分享相关经验或见解
4. **必须在评论中自然地附带网站链接 ${e.targetUrl}**
5. 链接要融入上下文，比如"我在 ${e.targetUrl} 也做过类似的..."
6. 不要像广告或垃圾评论，链接出现要有理由
7. original 必须用${s}写，要符合该语言的表达习惯
${n?"8. 如果文章是中文，original 和 chinese 内容相同即可":""}

请只返回 JSON，不要有其他内容。`}function T(t,e){let r,s="";if(e){const o=Math.floor(e*.85);r=`**字符限制：英文版本严格控制在 ${o} 个字符以内（包括空格、标点，表单最大允许 ${e} 字符）**`,s=`
⚠️ 极其重要：
- 英文版本必须 ≤ ${o} 个字符（characters），不是单词数！
- 字符数 = 字母 + 空格 + 标点符号，全部计入
- 超出限制会导致表单提交失败！
- 生成后请自行数一下字符数确保不超`}else r="英文版本：100-200个字符；中文版本：50-150个字符";return`你是 SEO 文案专家，需要为网站撰写导航站/目录站提交描述。

## 网站信息
- 品牌名称：${t.brandName||"待填写"}
- 网址：${t.targetUrl}
- 核心关键词：${t.keywords||"待填写"}
- 网站介绍：${t.description||"无"}

## 任务
基于上述网站信息，生成适合提交到导航站的描述。用 JSON 格式返回：

{
  "original": "英文版本（简短精炼）",
  "chinese": "中文版本"
}

## 描述要求
1. ${r}
2. 基于网站介绍，用专业的语言重新表述
3. 突出核心功能、优势和目标用户
4. 自然融入关键词「${t.keywords}」
5. 不要照抄网站介绍，要改写优化
${s}

请只返回 JSON，不要有其他内容。`}function _(){return`你是专业的多语言内容创作助手。你能够：
1. 准确识别目标语言并用该语言写作
2. 写出符合当地语言习惯的自然内容
3. 同时提供中文版本便于用户理解

请严格按要求返回 JSON 格式，不要添加任何解释或 markdown 标记。`}const c={endpoint:"https://openai-baibei.openai.azure.com",deployment:"gpt-4.1",apiKey:"cd21199a32a8440c9bce461b7de7446b",apiVersion:"2024-12-01-preview"},C=3e4;async function S(t,e,r){try{const s=await h();if(!s.targetUrl)return{success:!1,error:"请先配置推广网址"};const o=I(t,e,s,r),a=_(),u=await F(a,o);try{let n=u.trim();n.startsWith("```json")&&(n=n.slice(7)),n.startsWith("```")&&(n=n.slice(3)),n.endsWith("```")&&(n=n.slice(0,-3)),n=n.trim();const d=JSON.parse(n);return{success:!0,original:d.original||"",chinese:d.chinese||""}}catch{return{success:!0,original:u,chinese:""}}}catch(s){return{success:!1,error:s instanceof Error?s.message:String(s)}}}async function F(t,e){var a,u,n,d;const r=`${c.endpoint}/openai/deployments/${c.deployment}/chat/completions?api-version=${c.apiVersion}`,s=new AbortController,o=setTimeout(()=>s.abort(),C);try{const i=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json","api-key":c.apiKey},body:JSON.stringify({messages:[{role:"system",content:t},{role:"user",content:e}],temperature:.7,max_tokens:1500}),signal:s.signal});if(clearTimeout(o),!i.ok){const g=await i.json().catch(()=>({}));throw new Error(`API 错误 (${i.status}): ${((a=g.error)==null?void 0:a.message)||i.statusText}`)}const p=(d=(n=(u=(await i.json()).choices)==null?void 0:u[0])==null?void 0:n.message)==null?void 0:d.content;if(!p)throw new Error("API 返回内容为空");return p.trim()}catch(i){throw clearTimeout(o),i instanceof Error&&i.name==="AbortError"?new Error("API 请求超时"):i}}async function v(){var t;try{const e=`${c.endpoint}/openai/deployments/${c.deployment}/chat/completions?api-version=${c.apiVersion}`,r=await fetch(e,{method:"POST",headers:{"Content-Type":"application/json","api-key":c.apiKey},body:JSON.stringify({messages:[{role:"user",content:"Hi"}],max_tokens:5})});return r.ok?{success:!0,message:"连接成功"}:{success:!1,message:`连接失败: ${((t=(await r.json().catch(()=>({}))).error)==null?void 0:t.message)||r.statusText}`}}catch(e){return{success:!1,message:`连接失败: ${e instanceof Error?e.message:String(e)}`}}}console.log("[AI外链助手] Background Service Worker 已启动");chrome.action.onClicked.addListener(async t=>{try{await chrome.sidePanel.open({windowId:t.windowId})}catch(e){console.log("Side panel error:",e)}});chrome.runtime.onInstalled.addListener(t=>{t.reason==="install"&&chrome.runtime.openOptionsPage();try{chrome.sidePanel.setOptions({enabled:!0}),chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0})}catch{}});chrome.runtime.onMessage.addListener((t,e,r)=>(J(t,r),!0));async function J(t,e){try{switch(t.type){case"GENERATE_CONTENT":const r=t,s=await S(r.payload.mode,r.payload.pageContent,r.payload.charLimit);e(s);break;case"GET_CONFIG":const o=await E();e({success:!0,data:o});break;case"SAVE_CONFIG":await b(t.payload),e({success:!0});break;case"SAVE_PROJECT_INFO":await y(t.payload),e({success:!0});break;case"TEST_API":const a=await v();e(a);break;default:e({success:!1,error:"未知消息类型"})}}catch(r){const s=r instanceof Error?r.message:String(r);e({success:!1,error:s})}}
