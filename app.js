import {dayKey,monday,addDays,colorRange,remapAnnotations,validateData} from './core.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const icons={plus:'M12 5v14M5 12h14',notes:'M7 4h10a2 2 0 0 1 2 2v14H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3ZM8 4v16M11 9h5M11 13h4',calendar:'M5 5h14v15H5ZM8 3v4M16 3v4M5 10h14M9 14h1M14 14h1',check:'m8 12 3 3 6-7M19 13v7H4V5h10',square:'M5 5h14v14H5Z',search:'M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12L21 21',sliders:'M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',close:'m6 6 12 12M18 6 6 18',download:'M12 3v11m-5-4 5 5 5-5M5 16v5h14v-5',upload:'M12 16V4m-5 5 5-5 5 5M5 16v5h14v-5',pen:'m4 20 2-7L17 2l5 5L11 18ZM6 13l5 5M4 20h13',erase:'m5 15 9-11 7 6-9 11H7l-5-5 3-1Zm4-5 7 6M13 21h9',more:'M5 12h.01M12 12h.01M19 12h.01'};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]||icons.notes}"/></svg>`;}
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.() || `n${Date.now()}${Math.random().toString(36).slice(2)}`;
const KEY='shiji.notes.v1', DRAFT='shiji.draft.v1';
const now=new Date();let week=monday(now),month=new Date(now.getFullYear(),now.getMonth(),1),view='stream',filter='all',query='',todoFilter='pending',composeTodo=false,selection=null,editing=null,editSelection=null,toastTimer,exportUrls=[];
const baseColors=[{id:'green',name:'想画的',hex:'#72936b'},{id:'blue',name:'画面与氛围',hex:'#739aaf'},{id:'pink',name:'小灵感',hex:'#c18c9c'},{id:'gold',name:'生活碎片',hex:'#ba9b58'}];
function seed(){
  const specs=[
    [4,'09:18','想画一家开在森林里的面包店。\n门口有只等着第一炉面包出炉的狐狸，围着一条旧围巾。','green','想画一家开在森林里的面包店。',null],
    [3,'12:40','公交车窗上的雨滴，把外面的路灯变成了一颗颗小星星。这个画面可以留着画。','blue','把外面的路灯变成了一颗颗小星星',null],
    [2,'18:06','给角色设计一双不一样的袜子，左边是月亮，右边是小鱼。\n想给这种小小的不对称留一点位置。','pink','左边是月亮，右边是小鱼',null],
    [1,'20:35','周末找一些雨天光影参考。\n顺便整理一下相册里存了很久的配色。','gold','顺便整理一下相册里存了很久的配色。','周末找一些雨天光影参考。'],
    [0,'09:42','想画一个撑透明伞的女孩，伞沿挂着几颗星星。\n背景试试夜晚的便利店，暖光从玻璃门里透出来。','green','想画一个撑透明伞的女孩','找参考'],
    [0,'11:26','忽然想到：云也许是天空没来得及寄出的信。\n可以画成一组小小的明信片。','pink','云也许是天空没来得及寄出的信',null],
    [0,'14:08','去买一本可以摊平的速写本。','gold','速写本','去买一本可以摊平的速写本。']
  ];
  const notes=specs.map(([days,time,text,c,mark,task])=>{const d=addDays(now,-days);const [h,m]=time.split(':');d.setHours(+h,+m,0,0);const n={id:uid(),text,created:d.toISOString(),marks:[],tasks:[],demo:true};const p=text.indexOf(mark);colorRange(n,p,p+mark.length,c);if(task&&text.includes(task))n.tasks.push({id:uid(),start:text.indexOf(task),end:text.indexOf(task)+task.length,done:false});return n;});
  const n=notes[4],p=n.text.indexOf('背景');colorRange(n,p,n.text.length,'blue');return {version:1,colors:baseColors,notes};
}
let data,storageBlocked=false;
try{const saved=localStorage.getItem(KEY);data=saved?validateData(JSON.parse(saved)):seed();if(!saved)localStorage.setItem(KEY,JSON.stringify(data));}catch(e){data={version:1,colors:baseColors,notes:[]};storageBlocked=true;setTimeout(()=>toast('无法读取本地记录，未覆盖原数据。请先检查浏览器存储。'),100);}
function transact(change,message){const previous=structuredClone(data);try{if(storageBlocked)throw Error();change();localStorage.setItem(KEY,JSON.stringify(data));}catch(e){data=previous;toast('保存失败，原记录和输入已保留。请检查浏览器存储空间。');return false;}render();if(message)toast(message);return true;}
function toast(message,undo){clearTimeout(toastTimer);const el=$('#toast');el.replaceChildren(document.createTextNode(message));if(undo){const b=document.createElement('button');b.textContent='撤销';b.onclick=()=>{undo();el.classList.add('hidden');};el.append(b);}el.classList.remove('hidden');toastTimer=setTimeout(()=>el.classList.add('hidden'),undo?9000:4500);}
function color(id){return data.colors.find(c=>c.id===id);}
function inWeek(n){const d=new Date(n.created);return d>=week&&d<addDays(week,7);}
const fmtDate=d=>new Date(d).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
const fmtTime=d=>new Date(d).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
function dateHeading(key){const d=new Date(key+'T12:00:00');let lead=fmtDate(d);if(key===dayKey(now))lead='今天';else if(key===dayKey(addDays(now,-1)))lead='昨天';return `<b>${lead}</b><span>${d.toLocaleDateString('zh-CN',{weekday:'long'})}</span>${lead==='今天'||lead==='昨天'?`<span>${fmtDate(d)}</span>`:''}`;}
function textHTML(n){
  const points=[...new Set([0,n.text.length,...n.marks.flatMap(r=>[r.start,r.end]),...n.tasks.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b);
  return points.slice(0,-1).map((start,i)=>{const end=points[i+1],mark=n.marks.find(r=>r.start<=start&&r.end>=end),task=n.tasks.find(r=>r.start<=start&&r.end>=end),c=color(mark?.color);return `<span class="${c?'marked ':''}${task?(task.done?'done-range':'task-range'):''}"${c?` style="--mark:${c.hex}" title="${escape(c.name)}"`:''}>${escape(n.text.slice(start,end))}</span>`;}).join('');
}
function taskHTML(n,t,remove=false){return `<label class="task-row ${t.done?'done':''}"><input type="checkbox" data-task="${escape(t.id)}" data-note="${escape(n.id)}" ${t.done?'checked':''} aria-label="${t.done?'取消完成':'完成'}：${escape(n.text.slice(t.start,t.end))}"><span>${escape(n.text.slice(t.start,t.end))}</span></label>${remove?`<button class="subtle-button" data-edit="${escape(n.id)}">查看原文</button>`:''}`;}
function noteHTML(n){return `<article class="note" data-note-id="${escape(n.id)}"><div class="note-meta"><span class="time"><time datetime="${n.created}">${fmtTime(n.created)}</time>${n.demo?'<span class="sample-tag">示例</span>':''}</span><button class="icon-button note-menu" data-edit="${escape(n.id)}" aria-label="编辑 ${fmtTime(n.created)} 的记录">${icon('more')}</button></div><div class="note-text" data-text-id="${escape(n.id)}">${textHTML(n)}</div>${n.tasks.length?`<div class="note-tasks">${n.tasks.map(t=>taskHTML(n,t)).join('')}</div>`:''}</article>`;}
function filtered(){return data.notes.filter(n=>{const q=query.toLocaleLowerCase();const matches=!q||n.text.toLocaleLowerCase().includes(q)||dayKey(n.created).includes(q);const colors=filter==='all'||(filter==='marked'?n.marks.length>0:filter==='plain'?n.marks.length===0:n.marks.some(r=>r.color===filter));return matches&&colors;}).sort((a,b)=>new Date(a.created)-new Date(b.created));}
function empty(title,body){return `<div class="empty-state">${icon('pen')}<h2>${title}</h2><p>${body}</p></div>`;}
function render(){
  $('#totalCount').textContent=data.notes.length;$('#todoCount').textContent=data.notes.reduce((a,n)=>a+n.tasks.filter(t=>!t.done).length,0);
  $('#demoBanner').classList.toggle('hidden',!data.notes.some(n=>n.demo));
  $('#sidebarColors').innerHTML=data.colors.map(c=>`<button class="color-filter ${filter===c.id?'active':''}" data-filter="${escape(c.id)}"><span class="color-dot" style="--mark:${c.hex}"></span>${escape(c.name||'未命名色标')}</button>`).join('');
  const labels={stream:['把灵感留下来','不必整理好，想到就记。','所有记录'],week:['这一周，拾到的灵感','慢慢回看，让零散的想法连成一页。','一周回顾'],todos:['让想法，往前一步','想做的慢慢来，做过的也留下。','待办事项']};
  const [title,subtitle,crumb]=labels[view];$('#pageTitle').textContent=title;$('#pageSubtitle').textContent=subtitle;$('#crumb').textContent=crumb;
  $$('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.body.className='view-'+view;$('#weekTools').classList.toggle('hidden',view!=='week');
  const choices=view==='todos'?[['pending','未完成'],['completed','已完成'],['all','全部']]:[['all','全部'],['marked','已标色'],['plain','未标色'],...(color(filter)?[[filter,color(filter).name]]:[])];
  $('#colorSelect').classList.toggle('hidden',view==='todos');$('#colorSelect').innerHTML='<option value="all">按色标</option>'+data.colors.map(c=>`<option value="${escape(c.id)}" ${filter===c.id?'selected':''}>${escape(c.name)}</option>`).join('');
  $('#filterBar').innerHTML=choices.map(([id,name])=>`<button class="${(view==='todos'?todoFilter:filter)===id?'active':''}" data-filter="${escape(id)}" aria-pressed="${(view==='todos'?todoFilter:filter)===id}">${color(id)?`<span class="color-dot" style="--mark:${color(id).hex}"></span>`:''}${escape(name)}</button>`).join('');
  const notes=filtered();let html='';
  if(view==='todos'){
    const tasks=notes.flatMap(n=>n.tasks.map(t=>({n,t}))).filter(({t})=>todoFilter==='all'||(todoFilter==='completed'?t.done:!t.done));
    $('#resultCount').textContent=`${tasks.length} 项`;html=tasks.map(({n,t})=>`<article class="task-list-note"><div class="todo-date">${fmtDate(n.created)} · ${fmtTime(n.created)}${n.demo?' · 示例':''}</div>${taskHTML(n,t,true)}</article>`).join('')||empty(todoFilter==='completed'?'还没有已完成的事项':'暂时没有待办','选中记录里的具体事项，就能把它设为待办。');
  }else if(view==='week'){
    const selected=notes.filter(inWeek);$('#resultCount').textContent=`${selected.length} 条`;$('#weekLabel').textContent=`${fmtDate(week)} — ${fmtDate(addDays(week,6))}`;
    html=Array.from({length:7},(_,i)=>{const key=dayKey(addDays(week,i)),rows=selected.filter(n=>dayKey(n.created)===key);return `<section class="week-day ${rows.length?'':'empty'}"><h2 class="day-heading">${dateHeading(key)}</h2>${rows.map(noteHTML).join('')||'<p class="week-empty">这一天，留一点空白。</p>'}</section>`;}).join('');
  }else{
    $('#resultCount').textContent=`${notes.length} 条`;let last='';for(const n of notes){const key=dayKey(n.created);if(key!==last){html+=`<h2 class="day-heading">${dateHeading(key)}</h2>`;last=key;}html+=noteHTML(n);}
    if(!notes.length)html=empty(data.notes.length?'没有找到这些记录':'从一个小想法开始',data.notes.length?'换个关键词或色标，再找找看。':'在下面写点什么，点「记下来」就好。');
  }
  $('#feed').innerHTML=html;$('#feedEnd').classList.toggle('hidden',view==='todos');renderRail();
}
function renderRail(){
  $('#monthLabel').textContent=month.toLocaleDateString('zh-CN',{year:'numeric',month:'long'});
  const lead=(month.getDay()+6)%7,days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();let html='<span></span>'.repeat(lead);
  for(let i=1;i<=days;i++){const d=new Date(month.getFullYear(),month.getMonth(),i),key=dayKey(d),has=data.notes.some(n=>dayKey(n.created)===key);html+=`<button data-date="${key}" aria-label="${fmtDate(d)}${has?'，有记录':''}" class="${key===dayKey(now)?'today ':''}${d>=week&&d<addDays(week,7)?'in-week ':''}${has?'has-notes':''}">${i}</button>`;}
  $('#calendarGrid').innerHTML=html;const rows=data.notes.filter(inWeek);$('#weekNoteCount').textContent=rows.length;$('#weekDayCount').textContent=new Set(rows.map(n=>dayKey(n.created))).size;$('#weekRange').textContent=`${week.getMonth()+1}.${week.getDate()} — ${addDays(week,6).getMonth()+1}.${addDays(week,6).getDate()}`;
  $('#weekActivity').innerHTML=Array.from({length:7},(_,i)=>{const count=rows.filter(n=>dayKey(n.created)===dayKey(addDays(week,i))).length;return `<div class="activity-day"><span class="activity-mark ${count>2?'strong':count?'filled':''}" title="${fmtDate(addDays(week,i))}：${count} 条">${count||'·'}</span><span>${'一二三四五六日'[i]}</span></div>`;}).join('');
}
function switchView(next){view=next;filter='all';selection=null;$('#selectionBar').classList.add('hidden');render();window.scrollTo({top:0});}
function syncDraft(){const el=$('#draft');$('#sendButton').disabled=!el.value.trim();el.style.height='auto';el.style.height=Math.min(el.scrollHeight,160)+'px';try{localStorage.setItem(DRAFT,JSON.stringify({text:el.value,todo:composeTodo}));$('#draftStatus').textContent=el.value?'草稿已保留':'随手写，不用起标题';}catch{$('#draftStatus').textContent='草稿未能保存';}}
try{const saved=JSON.parse(localStorage.getItem(DRAFT)||'{}');$('#draft').value=typeof saved.text==='string'?saved.text:'';composeTodo=!!saved.todo;}catch{}
function renderDraftTodo(){$('#draftTodo').setAttribute('aria-pressed',composeTodo);$('#draftTodo').innerHTML=icon(composeTodo?'check':'square')+'记为待办';}
$('#draft').addEventListener('input',syncDraft);$('#draftTodo').onclick=()=>{composeTodo=!composeTodo;renderDraftTodo();syncDraft();};
$('#composerForm').onsubmit=e=>{e.preventDefault();const text=$('#draft').value.trim();if(!text)return;const n={id:uid(),text,created:new Date().toISOString(),marks:[],tasks:[],demo:false};if(composeTodo)n.tasks.push({id:uid(),start:0,end:text.length,done:false});if(transact(()=>data.notes.push(n),'记下来了')){$('#draft').value='';composeTodo=false;renderDraftTodo();syncDraft();filter='all';query='';$('#search').value='';view='stream';render();requestAnimationFrame(()=>document.querySelector(`[data-note-id="${n.id}"]`)?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));$('#draft').focus({preventScroll:true});}};
$('#draft').onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();$('#composerForm').requestSubmit();}};
$('#search').oninput=e=>{query=e.target.value;render();};
$('#colorSelect').onchange=e=>{filter=e.target.value;render();};
document.addEventListener('change',e=>{if(e.target.matches('[data-task]')){const n=data.notes.find(n=>n.id===e.target.dataset.note),t=n?.tasks.find(t=>t.id===e.target.dataset.task);if(t)transact(()=>t.done=e.target.checked,t.done?'已恢复为待办':'又完成了一件小事');}});
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a.brand');if(!b)return;
  if(b.matches('a.brand')){e.preventDefault();switchView('stream');return;}
  if(b.dataset.close){$('#'+b.dataset.close).close();return;}
  if(b.dataset.view){switchView(b.dataset.view);return;}
  if(b.dataset.filter){if(b.classList.contains('color-filter')){view='stream';filter=b.dataset.filter;}else if(view==='todos')todoFilter=b.dataset.filter;else filter=b.dataset.filter;render();return;}
  if(b.dataset.edit){openEditor(b.dataset.edit);return;}
  if(b.dataset.date){week=monday(new Date(b.dataset.date+'T12:00:00'));switchView('week');return;}
  const a=b.dataset.action;if(!a)return;
  if(a==='new'){switchView('stream');$('#draft').focus();}
  if(a==='settings')openSettings();
  if(a==='search'){$('#searchBox').classList.remove('hidden');$('#search').focus();window.scrollTo({top:0});}
  if(a==='close-search'){query='';$('#search').value='';$('#searchBox').classList.add('hidden');render();}
  if(a==='prev-week'||a==='next-week'){week=addDays(week,a==='prev-week'?-7:7);month=new Date(week.getFullYear(),week.getMonth(),1);render();}
  if(a==='this-week'){week=monday(now);render();}
  if(a==='prev-month'||a==='next-month'){month=new Date(month.getFullYear(),month.getMonth()+(a==='prev-month'?-1:1),1);renderRail();}
  if(a==='clear-demo'){const removed=data.notes.filter(n=>n.demo);if(transact(()=>data.notes=data.notes.filter(n=>!n.demo)))toast('示例已清除，你的记录已保留',()=>transact(()=>data.notes.push(...removed)));}
  if(a==='selection-todo')applySelection('todo');
  if(a==='selection-clear')applySelection('clear');
  if(a==='selection-close'){selection=null;getSelection()?.removeAllRanges();$('#selectionBar').classList.add('hidden');}
  if(a==='export-week')exportWeek();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#selectionBar').classList.add('hidden');selection=null;}if(e.key==='n'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.matches('input,textarea,[contenteditable]')&&!document.querySelector('dialog[open]')){e.preventDefault();switchView('stream');$('#draft').focus();}});
function captureSelection(){
  const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount||document.querySelector('dialog[open]'))return;
  const r=s.getRangeAt(0),start=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,end=r.endContainer.nodeType===1?r.endContainer:r.endContainer.parentElement;
  const el=start.closest?.('[data-text-id]');if(!el||end.closest?.('[data-text-id]')!==el)return;
  const before=r.cloneRange();before.selectNodeContents(el);before.setEnd(r.startContainer,r.startOffset);const offset=before.toString().length;
  selection={id:el.dataset.textId,start:offset,end:offset+r.toString().length};
  $('#selectionColors').innerHTML=data.colors.map(c=>`<button data-color="${escape(c.id)}" aria-label="标记为${escape(c.name)}" title="${escape(c.name)}"><span class="swatch" style="--mark:${c.hex}"></span></button>`).join('');$('#selectionBar').classList.remove('hidden');
}
document.addEventListener('selectionchange',()=>setTimeout(captureSelection,30));
$('#selectionBar').addEventListener('pointerdown',e=>e.preventDefault());
$('#selectionColors').onclick=e=>{const b=e.target.closest('[data-color]');if(b)applySelection(b.dataset.color);};
function applySelection(action){if(!selection)return;const {id,start,end}=selection;const n=data.notes.find(n=>n.id===id);if(!n)return;
  if(action==='todo'&&n.tasks.some(t=>t.start===start&&t.end===end)){toast('这段文字已经是待办了');return;}
  transact(()=>{if(action==='todo')n.tasks.push({id:uid(),start,end,done:false});else colorRange(n,start,end,action==='clear'?null:action);},action==='todo'?'已把选中内容设为待办':'色标已更新');selection=null;getSelection()?.removeAllRanges();$('#selectionBar').classList.add('hidden');
}
let longPress,startPoint;
$('#feed').addEventListener('pointerdown',e=>{if(e.target.closest('button,input,label'))return;const note=e.target.closest('[data-note-id]');if(!note)return;startPoint={x:e.clientX,y:e.clientY};longPress=setTimeout(()=>{if(!getSelection()?.toString())openEditor(note.dataset.noteId);},750);});
$('#feed').addEventListener('pointermove',e=>{if(startPoint&&Math.hypot(e.clientX-startPoint.x,e.clientY-startPoint.y)>8)clearTimeout(longPress);});['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(longPress)));
function openEditor(id){const n=data.notes.find(n=>n.id===id);if(!n)return;editing=structuredClone(n);editSelection=null;$('#editText').value=n.text;$('#editorSelection').textContent='未选择文字 · 操作整条记录';$('#editorPalette').innerHTML=data.colors.map(c=>`<button data-editor-color="${escape(c.id)}"><span class="swatch" style="--mark:${c.hex}"></span>${escape(c.name)}</button>`).join('');renderEditPreview();$('#selectionBar').classList.add('hidden');$('#editDialog').showModal();}
function renderEditPreview(){$('#editPreview').innerHTML=`<div class="note-text">${textHTML(editing)}</div>${editing.tasks.map(t=>`<div class="task-row"><span>${t.done?'已完成':'待办'} · ${escape(editing.text.slice(t.start,t.end))}</span><button data-remove-task="${escape(t.id)}">移除待办</button></div>`).join('')}`;}
$('#editText').oninput=()=>{const dropped=remapAnnotations(editing,$('#editText').value);editSelection=null;$('#editorSelection').textContent=dropped?'改写部分的旧标记已移除，可重新标记。':'未选择文字 · 操作整条记录';renderEditPreview();};
function captureEditSelection(){const t=$('#editText');editSelection=t.selectionStart<t.selectionEnd?{start:t.selectionStart,end:t.selectionEnd}:null;$('#editorSelection').textContent=editSelection?`已选 ${editSelection.end-editSelection.start} 个字符 · 只标记这一段`:'未选择文字 · 操作整条记录';}
['select','keyup','pointerup'].forEach(ev=>$('#editText').addEventListener(ev,captureEditSelection));
$('#editorPalette').onpointerdown=e=>e.preventDefault();$('#editorPalette').onclick=e=>{const b=e.target.closest('[data-editor-color]');if(!b)return;const r=editSelection||{start:0,end:editing.text.length};colorRange(editing,r.start,r.end,b.dataset.editorColor);renderEditPreview();};
$('#editTodo').onpointerdown=e=>e.preventDefault();$('#editTodo').onclick=()=>{const r=editSelection||{start:0,end:editing.text.length};if(r.start===r.end)return;if(editing.tasks.some(t=>t.start===r.start&&t.end===r.end)){toast('这段内容已经是待办');return;}editing.tasks.push({...r,id:uid(),done:false});renderEditPreview();};
$('#editClear').onpointerdown=e=>e.preventDefault();$('#editClear').onclick=()=>{const r=editSelection||{start:0,end:editing.text.length};colorRange(editing,r.start,r.end,null);renderEditPreview();};
$('#editPreview').onclick=e=>{const b=e.target.closest('[data-remove-task]');if(b){editing.tasks=editing.tasks.filter(t=>t.id!==b.dataset.removeTask);renderEditPreview();}};
$('#saveNote').onclick=()=>{if(!editing.text.trim()){toast('写一点内容再保存吧');return;}if(transact(()=>data.notes=data.notes.map(n=>n.id===editing.id?editing:n),'修改已保存'))$('#editDialog').close();};
$('#deleteNote').onclick=()=>{const removed=data.notes.find(n=>n.id===editing.id);if(transact(()=>data.notes=data.notes.filter(n=>n.id!==editing.id))){$('#editDialog').close();toast('记录已删除',()=>transact(()=>data.notes.push(removed)));}};
let settingsColors=[];
function openSettings(){settingsColors=structuredClone(data.colors);renderColorSettings();$('#settingsDialog').showModal();}
function renderColorSettings(){$('#colorSettings').innerHTML=settingsColors.map((c,i)=>`<div class="color-setting"><input type="color" value="${c.hex}" data-color-index="${i}" aria-label="${escape(c.name)}的颜色"><input type="text" value="${escape(c.name)}" maxlength="20" data-name-index="${i}" aria-label="色标名称 ${i+1}"></div>`).join('');$('#addColor').disabled=settingsColors.length>=8;}
$('#colorSettings').oninput=e=>{if(e.target.dataset.colorIndex!==undefined)settingsColors[+e.target.dataset.colorIndex].hex=e.target.value;if(e.target.dataset.nameIndex!==undefined)settingsColors[+e.target.dataset.nameIndex].name=e.target.value;};
$('#addColor').onclick=()=>{if(settingsColors.length<8){settingsColors.push({id:uid(),name:'新色标',hex:'#759486'});renderColorSettings();}};
$('#saveSettings').onclick=()=>{if(transact(()=>data.colors=settingsColors.map(c=>({...c,name:c.name.trim()||'未命名色标'})),'色标已更新，已有标记也同步换色'))$('#settingsDialog').close();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('#backupExport').onclick=()=>download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),`拾记备份-${dayKey(new Date())}.json`);
$('#backupImport').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>25*1024*1024)throw Error('备份文件过大');const imported=validateData(JSON.parse(await f.text()));let added=0;const merged=structuredClone(data);const map=new Map();for(const c of imported.colors){const existing=merged.colors.find(x=>x.id===c.id);const id=existing&&(existing.hex!==c.hex||existing.name!==c.name)?uid():c.id;map.set(c.id,id);if(!merged.colors.some(x=>x.id===id))merged.colors.push({...c,id});}for(const n of imported.notes)if(!merged.notes.some(x=>x.id===n.id)){merged.notes.push({...n,marks:n.marks.map(m=>({...m,color:map.get(m.color)}))});added++;}if(merged.colors.length>12)throw Error('合并后的色标过多，请使用同一套色标的备份');if(transact(()=>data=merged,`已合并 ${added} 条记录，现有内容已保留`)){$('#settingsDialog').close();}}catch(err){toast('导入失败：'+err.message);}e.target.value='';};
paintIcons();render();renderDraftTodo();syncDraft();
async function exportWeek(){
  // Capture a complete unfiltered week. Long weeks are paginated to keep mobile canvases safe.
  const rows=data.notes.filter(inWeek).sort((a,b)=>new Date(a.created)-new Date(b.created));
  const measure=document.createElement('canvas').getContext('2d');measure.font='26px "Microsoft YaHei", sans-serif';
  const width=1000,pad=64,lineHeight=46,maxY=6200;let pages=[],ops=[],y=0;
  function newPage(){if(ops.length)pages.push({ops,height:y+90});ops=[];y=80;ops.push({type:'title',text:'拾记 / 一周灵感',y});y+=51;ops.push({type:'meta',text:`${week.getFullYear()}年 ${fmtDate(week)} — ${fmtDate(addDays(week,6))}  ·  ${rows.length} 条记录`,y});y+=70;}
  function ensure(height){if(y+height>maxY)newPage();}
  function line(text,n,start){ensure(lineHeight);ops.push({type:'line',text,n,start,y});y+=lineHeight;}
  newPage();
  for(let i=0;i<7;i++){
    const d=addDays(week,i),notes=rows.filter(n=>dayKey(n.created)===dayKey(d));ensure(150);ops.push({type:'day',text:`${fmtDate(d)}  ${d.toLocaleDateString('zh-CN',{weekday:'long'})}`,y});y+=56;
    if(!notes.length){ops.push({type:'meta',text:'这一天，留一点空白。',y});y+=70;continue;}
    for(const n of notes){ensure(105);ops.push({type:'meta',text:`${fmtTime(n.created)}${n.demo?' · 示例':''}`,y});y+=44;let buffer='',start=0,offset=0;
      for(const char of n.text){if(char==='\n'){line(buffer,n,start);buffer='';offset+=char.length;start=offset;continue;}if(measure.measureText(buffer+char).width>width-pad*2){line(buffer,n,start);buffer='';start=offset;}buffer+=char;offset+=char.length;}
      if(buffer)line(buffer,n,start);
      for(const t of n.tasks){const raw=(t.done?'☑ 已完成：':'☐ 待办：')+n.text.slice(t.start,t.end);let buf='';for(const ch of raw){if(ch==='\n'||measure.measureText(buf+ch).width>width-pad*2){line(buf,null,0);buf='';if(ch==='\n')continue;}buf+=ch;}if(buf)line(buf,null,0);}
      y+=34;
    }y+=20;
  }
  pages.push({ops,height:y+90});exportUrls.forEach(URL.revokeObjectURL);exportUrls=[];$('#imagePreview').replaceChildren();
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
    const page=pages[pageIndex],canvas=document.createElement('canvas');canvas.width=width;canvas.height=page.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fafbf8';ctx.fillRect(0,0,width,canvas.height);
    for(const o of page.ops){ctx.fillStyle='#344335';ctx.font=o.type==='title'?'bold 39px "Microsoft YaHei", sans-serif':o.type==='day'?'bold 29px "Microsoft YaHei", sans-serif':o.type==='meta'?'22px "Microsoft YaHei", sans-serif':'26px "Microsoft YaHei", sans-serif';if(o.type==='meta')ctx.fillStyle='#6e7b69';ctx.fillText(o.text,pad,o.y);
      if(o.type==='line'&&o.n){for(const m of o.n.marks){const s=Math.max(m.start,o.start),e=Math.min(m.end,o.start+o.text.length),c=color(m.color);if(e>s&&c){ctx.strokeStyle=c.hex;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pad+ctx.measureText(o.text.slice(0,s-o.start)).width,o.y+9);ctx.lineTo(pad+ctx.measureText(o.text.slice(0,e-o.start)).width,o.y+9);ctx.stroke();}}for(const t of o.n.tasks.filter(t=>t.done)){const s=Math.max(t.start,o.start),e=Math.min(t.end,o.start+o.text.length);if(e>s){ctx.strokeStyle='#7e897b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pad+ctx.measureText(o.text.slice(0,s-o.start)).width,o.y-9);ctx.lineTo(pad+ctx.measureText(o.text.slice(0,e-o.start)).width,o.y-9);ctx.stroke();}}}
    }
    ctx.fillStyle='#7b8876';ctx.font='20px sans-serif';ctx.fillText(`想到的，都值得留下。                     ${pageIndex+1} / ${pages.length}`,pad,canvas.height-38);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){toast('图片生成失败，请重试');return;}const url=URL.createObjectURL(blob);exportUrls.push(url);const img=new Image();img.src=url;img.alt=`一周回顾第 ${pageIndex+1} 张`;$('#imagePreview').append(img);
  }
  $('#exportInfo').textContent=pages.length>1?`内容较长，分成 ${pages.length} 张完整图片`:`${rows.length} 条记录 · PNG 图片`;
  $('#downloadImage').textContent=pages.length>1?'下载全部图片':'下载图片';$('#imageDialog').showModal();
}
$('#downloadImage').onclick=()=>exportUrls.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.download=`拾记-${dayKey(week)}-${i+1}.png`;a.click();});
