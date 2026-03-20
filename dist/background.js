const p={API_CONFIG:"apiConfig",PROJECT_INFO:"projectInfo"};function P(r){return r?btoa(r.split("").reverse().join("")):""}function b(r){if(!r)return"";try{return atob(r).split("").reverse().join("")}catch{return""}}const i={provider:"azure",apiKey:"",azureEndpoint:"https://openai-baibei.openai.azure.com",azureDeployment:"gpt-4.1",azureApiVersion:"2024-12-01-preview"},O={targetUrl:"",keywords:"",brandName:"",title:"",tagline:"",description:"",email:"",name:""};async function g(r){const e={provider:r.provider,apiKey:P(r.apiKey),azureEndpoint:r.azureEndpoint,azureDeployment:r.azureDeployment,azureApiVersion:r.azureApiVersion};await chrome.storage.local.set({[p.API_CONFIG]:e})}async function w(){const e=(await chrome.storage.local.get(p.API_CONFIG))[p.API_CONFIG];return e?{provider:e.provider||"azure",apiKey:b(e.apiKey||""),azureEndpoint:e.azureEndpoint||i.azureEndpoint,azureDeployment:e.azureDeployment||i.azureDeployment,azureApiVersion:e.azureApiVersion||i.azureApiVersion}:i}async function E(r){await chrome.storage.local.set({[p.PROJECT_INFO]:r})}async function A(){return(await chrome.storage.local.get(p.PROJECT_INFO))[p.PROJECT_INFO]||O}async function $(){const[r,e]=await Promise.all([w(),A()]);return{api:r,project:e}}async function I(r){await Promise.all([g(r.api),E(r.project)])}function N(r){const e=(r.title+" "+r.bodyText.slice(0,500)).toLowerCase();return/[\u4e00-\u9fa5]/.test(e)?"zh":/[\u3040-\u309f\u30a0-\u30ff]/.test(e)?"ja":/[\uac00-\ud7af]/.test(e)?"ko":/[\u0400-\u04ff]/.test(e)?"ru":/\b(und|der|die|das|ist|für|mit)\b/.test(e)?"de":/\b(le|la|les|est|pour|avec|dans)\b/.test(e)?"fr":/\b(el|la|los|las|es|para|con)\b/.test(e)?"es":"en"}const T={zh:"中文",en:"英文",ja:"日文",ko:"韩文",de:"德文",fr:"法文",es:"西班牙文",ru:"俄文"};function _(r,e,t,a){const n=e?N(e):"en",o=T[n]||"英文";switch(r){case"comment":if(!e)throw new Error("评论模式需要页面内容");return C(e,t,n,o);case"directory":return S(t,a);default:throw new Error(`未知模式: ${r}`)}}function C(r,e,t,a){const n=r.title||"无标题",o=r.h1[0]||r.h2[0]||"",c=r.bodyText.slice(0,500),l=t==="zh";return`你是一个热情的博客读者，需要为一篇${a}文章写评论。

## 文章信息
- 标题：${n}
${o?`- 主标题：${o}`:""}
- 内容预览：${c}...
- 文章语言：${a}

## 你的背景
- 你是 ${e.brandName||"一个网站"} 的用户/运营者
- 你的网站：${e.targetUrl}
- 网站介绍：${e.description||e.keywords||"无"}

## 任务
请生成两个版本的评论，用 JSON 格式返回：

{
  "original": "用${a}写的评论（匹配文章语言）",
  "chinese": "中文版本的评论"
}

## 评论要求
1. 字数：100-200字
2. 语气自然真诚，像真正阅读过文章的读者
3. 结合文章内容和你的网站背景，分享相关经验或见解
4. **必须在评论中自然地附带网站链接 ${e.targetUrl}**
5. 链接要融入上下文，比如"我在 ${e.targetUrl} 也做过类似的..."
6. 不要像广告或垃圾评论，链接出现要有理由
7. original 必须用${a}写，要符合该语言的表达习惯
${l?"8. 如果文章是中文，original 和 chinese 内容相同即可":""}

请只返回 JSON，不要有其他内容。`}function S(r,e){let t,a="";if(e){const n=Math.floor(e*.85);t=`**字符限制：英文版本严格控制在 ${n} 个字符以内（包括空格、标点，表单最大允许 ${e} 字符）**`,a=`
⚠️ 极其重要：
- 英文版本必须 ≤ ${n} 个字符（characters），不是单词数！
- 字符数 = 字母 + 空格 + 标点符号，全部计入
- 超出限制会导致表单提交失败！
- 生成后请自行数一下字符数确保不超`}else t="英文版本：100-200个字符；中文版本：50-150个字符";return`你是 SEO 文案专家，需要为网站撰写导航站/目录站提交描述。

## 网站信息
- 品牌名称：${r.brandName||"待填写"}
- 网址：${r.targetUrl}
- 核心关键词：${r.keywords||"待填写"}
- 网站介绍：${r.description||"无"}

## 任务
基于上述网站信息，生成适合提交到导航站的描述。用 JSON 格式返回：

{
  "original": "英文版本",
  "chinese": "中文版本"
}

## 描述要求
1. ${t}
2. 基于网站介绍，用专业的语言重新表述
3. 突出核心功能、优势和目标用户
4. 自然融入关键词「${r.keywords}」
5. 不要照抄网站介绍，要改写优化
${a}

请只返回 JSON，不要有其他内容。`}function k(){return`你是专业的多语言内容创作助手。你能够：
1. 准确识别目标语言并用该语言写作
2. 写出符合当地语言习惯的自然内容
3. 同时提供中文版本便于用户理解

请严格按要求返回 JSON 格式，不要添加任何解释或 markdown 标记。`}const v=3e4;async function F(r,e,t){try{const a=await A();let n;const o="cd21199a32a8440c9bce461b7de7446b";if(o&&(n={provider:"azure",apiKey:o,azureEndpoint:"https://openai-baibei.openai.azure.com",azureDeployment:"gpt-4.1",azureApiVersion:"2024-12-01-preview"}),!a.targetUrl)return{success:!1,error:"请先配置推广网址"};const c=_(r,e,a,t),l=k(),d=await D(l,c,n);try{let s=d.trim();s.startsWith("```json")&&(s=s.slice(7)),s.startsWith("```")&&(s=s.slice(3)),s.endsWith("```")&&(s=s.slice(0,-3)),s=s.trim();const m=JSON.parse(s);return{success:!0,original:m.original||"",chinese:m.chinese||""}}catch{return{success:!0,original:d,chinese:""}}}catch(a){return{success:!1,error:a instanceof Error?a.message:String(a)}}}async function D(r,e,t){var s,m,y,f;const a=t.azureEndpoint||i.azureEndpoint,n=t.azureDeployment||i.azureDeployment,o=t.azureApiVersion||i.azureApiVersion,c=`${a}/openai/deployments/${n}/chat/completions?api-version=${o}`,l=new AbortController,d=setTimeout(()=>l.abort(),v);try{const u=await fetch(c,{method:"POST",headers:{"Content-Type":"application/json","api-key":t.apiKey},body:JSON.stringify({messages:[{role:"system",content:r},{role:"user",content:e}],temperature:.7,max_tokens:1500}),signal:l.signal});if(clearTimeout(d),!u.ok){const z=await u.json().catch(()=>({}));throw new Error(`API 错误 (${u.status}): ${((s=z.error)==null?void 0:s.message)||u.statusText}`)}const h=(f=(y=(m=(await u.json()).choices)==null?void 0:m[0])==null?void 0:y.message)==null?void 0:f.content;if(!h)throw new Error("API 返回内容为空");return h.trim()}catch(u){throw clearTimeout(d),u instanceof Error&&u.name==="AbortError"?new Error("API 请求超时"):u}}async function V(){var r;try{const e=await w();if(!e.apiKey)return{success:!1,message:"请先填写 API Key"};const t=e.azureEndpoint||i.azureEndpoint,a=e.azureDeployment||i.azureDeployment,n=e.azureApiVersion||i.azureApiVersion,o=`${t}/openai/deployments/${a}/chat/completions?api-version=${n}`,c=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json","api-key":e.apiKey},body:JSON.stringify({messages:[{role:"user",content:"Hi"}],max_tokens:5})});return c.ok?{success:!0,message:"连接成功"}:{success:!1,message:`连接失败: ${((r=(await c.json().catch(()=>({}))).error)==null?void 0:r.message)||c.statusText}`}}catch(e){return{success:!1,message:`连接失败: ${e instanceof Error?e.message:String(e)}`}}}console.log("[AI外链助手] Background Service Worker 已启动");chrome.action.onClicked.addListener(async r=>{try{await chrome.sidePanel.open({windowId:r.windowId})}catch(e){console.log("Side panel error:",e)}});chrome.runtime.onInstalled.addListener(r=>{r.reason==="install"&&chrome.runtime.openOptionsPage();try{chrome.sidePanel.setOptions({enabled:!0}),chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0})}catch{}});chrome.runtime.onMessage.addListener((r,e,t)=>(J(r,t),!0));async function J(r,e){try{switch(r.type){case"GENERATE_CONTENT":const t=r,a=await F(t.payload.mode,t.payload.pageContent,t.payload.charLimit);e(a);break;case"GET_CONFIG":const n=await $();e({success:!0,data:n});break;case"SAVE_CONFIG":await I(r.payload),e({success:!0});break;case"SAVE_PROJECT_INFO":await E(r.payload),e({success:!0});break;case"SAVE_API_CONFIG":await g(r.payload),e({success:!0});break;case"TEST_API":const o=await V();e(o);break;default:e({success:!1,error:"未知消息类型"})}}catch(t){const a=t instanceof Error?t.message:String(t);e({success:!1,error:a})}}
