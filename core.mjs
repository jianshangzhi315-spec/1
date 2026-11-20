export const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function monday(date) { const d=new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate()-(d.getDay()+6)%7); return d; }
export function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d;}
export function colorRange(note,start,end,color){
  if(start>=end)return;
  const next=[];
  for(const m of note.marks){
    if(m.end<=start||m.start>=end)next.push(m);
    else {if(m.start<start)next.push({...m,end:start});if(m.end>end)next.push({...m,start:end});}
  }
  if(color)next.push({start,end,color});
  note.marks=next.sort((a,b)=>a.start-b.start);
}
export function remapAnnotations(note,text){
  const old=note.text;if(text===old)return 0;
  let prefix=0;while(prefix<old.length&&prefix<text.length&&old[prefix]===text[prefix])prefix++;
  let suffix=0;while(suffix<old.length-prefix&&suffix<text.length-prefix&&old[old.length-1-suffix]===text[text.length-1-suffix])suffix++;
  let removed=0;
  for(const key of ['marks','tasks'])note[key]=note[key].flatMap(r=>{
    if(r.end<=prefix)return [r];
    if(r.start>=old.length-suffix)return [{...r,start:r.start+text.length-old.length,end:r.end+text.length-old.length}];
    removed++;return [];
  });
  note.text=text;return removed;
}
export function validateData(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.notes)||!Array.isArray(raw.colors)||raw.colors.length>12||raw.notes.length>50000)throw Error('备份格式不正确');
  const colors=raw.colors.map(c=>{if(typeof c.id!=='string'||typeof c.name!=='string'||!/^#[0-9a-f]{6}$/i.test(c.hex))throw Error('色标格式不正确');return {id:c.id,name:c.name.slice(0,20),hex:c.hex};});
  if(new Set(colors.map(c=>c.id)).size!==colors.length)throw Error('重复的色标编号');
  const ids=new Set();
  const notes=raw.notes.map(n=>{
    if(typeof n.id!=='string'||ids.has(n.id)||typeof n.text!=='string'||!n.text.trim()||n.text.length>20000||!Number.isFinite(new Date(n.created).getTime())||!Array.isArray(n.marks)||!Array.isArray(n.tasks))throw Error('记录格式不正确');ids.add(n.id);
    const valid=r=>Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end<=n.text.length&&r.start<r.end;
    const marks=n.marks.map(r=>{if(!valid(r)||!colors.some(c=>c.id===r.color))throw Error('色标范围不正确');return {start:r.start,end:r.end,color:r.color};});
    const taskIds=new Set();
    const tasks=n.tasks.map(t=>{if(!valid(t)||typeof t.id!=='string'||taskIds.has(t.id))throw Error('待办格式不正确');taskIds.add(t.id);return {id:t.id,start:t.start,end:t.end,done:!!t.done};});
    return {id:n.id,text:n.text,created:new Date(n.created).toISOString(),marks,tasks,demo:!!n.demo};
  });return {version:1,colors,notes};
}
