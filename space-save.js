/* Space 游戏共用存档（和谜案、夜调、自走棋同一个账号和云存档）
   用法：
     <script src="space-save.js"></script>
     const data = SpaceSave.get('mygame');          // 读档（没有就是 null）
     SpaceSave.set('mygame', obj);                   // 存档（自动加 updated，自动同步云端）
     SpaceSave.button(document.querySelector('#btn')) // 把一个按钮变成 👤 账号按钮
     SpaceSave.onChange(()=>{ ...重新读档... })       // 云端拉到更新的进度 / 换账号时回调
   账号 = 名字（不用密码），本地键 whodunit:u:<名字>:s:<游戏id>，游客是 whodunit:s:<游戏id>
*/
(function(){
  const CLOUD=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'http://127.0.0.1:8787':'https://whodunit-save.newtycoonent.workers.dev';
  const store={get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  let P=(()=>{try{return localStorage.getItem('whodunit:player')||''}catch(e){return ''}})();
  const K=k=>P?`whodunit:u:${P}:${k}`:`whodunit:${k}`;
  let pulled=!P,state='',timer=null,last=0,pending={};const subs=[],btns=[];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function get(id){const o=store.get(K('s:'+id));return o&&!o.over?o:null}
  function set(id,obj){if(P&&!pulled){pending[id]=obj;return false}obj.updated=Date.now();store.set(K('s:'+id),obj);push();return true}
  function remove(id){store.set(K('s:'+id),{over:1,updated:Date.now()});push()}
  function bundle(){const saves={},pre=K('s:');try{Object.keys(localStorage).forEach(k=>{if(k.startsWith(pre))saves[k.slice(pre.length)]=store.get(k)})}catch(e){}return{prog:store.get(K('prog'))||{},saves}}
  function mergeIn(data){const changed=[];if(!data)return changed;const p=store.get(K('prog'))||{};
    Object.entries(data.prog||{}).forEach(([k,v])=>{if(typeof v==='number'&&v>(p[k]||0))p[k]=v});store.set(K('prog'),p);
    Object.entries(data.saves||{}).forEach(([id,s])=>{const mine=store.get(K('s:'+id));if(s&&(!mine||(s.updated||0)>(mine.updated||0))){store.set(K('s:'+id),s);changed.push(id)}});return changed}
  function setState(s){state=s;btns.forEach(render)}
  async function pull(){if(!P){pulled=true;return}const who=P;setState('sync');
    try{const r=await fetch(`${CLOUD}/save/${encodeURIComponent(who)}`);if(!r.ok)throw 0;const rec=await r.json();if(who!==P)return;
      const ch=mergeIn(rec.data);pulled=true;Object.keys(pending).forEach(id=>{if(!ch.includes(id)){pending[id].updated=Date.now();store.set(K('s:'+id),pending[id])}});pending={};if(ch.length)subs.forEach(f=>{try{f('cloud',ch)}catch(e){}});await push(true)}
    catch(e){pulled=true;Object.keys(pending).forEach(id=>{pending[id].updated=Date.now();store.set(K('s:'+id),pending[id])});pending={};if(who===P)setState('off')}}
  async function push(now){if(!P||!pulled)return;clearTimeout(timer);const wait=now?0:Math.max(0,8000-(Date.now()-last));
    if(wait){timer=setTimeout(()=>push(true),wait);return}const who=P;last=Date.now();setState('sync');
    try{const r=await fetch(`${CLOUD}/save/${encodeURIComponent(who)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(bundle()),keepalive:true});if(who===P)setState(r.ok?'ok':'off')}
    catch(e){if(who===P)setState('off')}}
  function players(){try{return JSON.parse(localStorage.getItem('whodunit:players'))||[]}catch(e){return []}}
  function setPlayer(name){name=(name||'').trim().slice(0,20);if(name===P)return;
    if(name){const list=players();if(!list.includes(name)){list.push(name);try{localStorage.setItem('whodunit:players',JSON.stringify(list))}catch(e){}
      if(!P){try{Object.keys(localStorage).forEach(k=>{const m=k.match(/^whodunit:(prog|s:.+)$/);if(m){localStorage.setItem(`whodunit:u:${name}:${m[1]}`,localStorage.getItem(k));localStorage.removeItem(k)}})}catch(e){}}}}
    P=name;try{name?localStorage.setItem('whodunit:player',name):localStorage.removeItem('whodunit:player')}catch(e){}
    state='';clearTimeout(timer);pulled=!name;pending={};btns.forEach(render);subs.forEach(f=>{try{f('player')}catch(e){}});if(name)pull()}
  function render(b){const icon={ok:' ☁️',sync:' ⏳',off:' ⚠️'}[state]||'';b.innerHTML=P?`👤<span class="ssName">${esc(P)}</span>${icon}`:'👤<span class="ssName">游客 · 点这里存档</span>';
    b.title=P?'和 Space 所有游戏共用这个账号，换设备输入同一个名字就能接着玩':'输入名字后进度会存到云端，Space 所有游戏共用'}
  function dialog(){const list=players();const d=document.createElement('div');
    d.setAttribute('style','position:fixed;inset:0;z-index:99999;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 system-ui,sans-serif');
    d.innerHTML=`<div style="background:#1f1916;color:#f3e9da;border:1px solid #e7b24a66;border-radius:16px;padding:18px;width:min(380px,100%);box-shadow:0 20px 50px #000c">
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">👤 存档账号</div>
      <div style="font-size:13px;color:#b8a998;margin-bottom:10px">Space 所有游戏共用一个账号。只要名字、不用密码，换手机输入同一个名字就能接着玩。名字起得独特一点，免得和别人撞名。</div>
      <input id="ssIn" maxlength="20" value="${esc(P)}" placeholder="你的名字" style="width:100%;box-sizing:border-box;font:16px system-ui;padding:10px 12px;border-radius:10px;border:1px solid #3d322c;background:#0f0c0b;color:#f3e9da">
      ${list.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${list.map(n=>`<button data-n="${esc(n)}" style="font:13px system-ui;padding:4px 10px;border-radius:999px;border:1px solid ${n===P?'#e7b24a':'#3d322c'};background:#2a221e;color:#f3e9da;cursor:pointer">${esc(n)}</button>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">${P?'<button data-a="out" style="margin-right:auto;font:14px system-ui;padding:8px 12px;border-radius:10px;border:1px solid #3d322c;background:transparent;color:#b8a998;cursor:pointer">退出</button>':''}
      <button data-a="no" style="font:14px system-ui;padding:8px 14px;border-radius:10px;border:1px solid #3d322c;background:#2a221e;color:#f3e9da;cursor:pointer">取消</button>
      <button data-a="ok" style="font:14px system-ui;font-weight:700;padding:8px 16px;border-radius:10px;border:1px solid #c8323c;background:#c8323c;color:#fff;cursor:pointer">确定</button></div></div>`;
    document.body.appendChild(d);const inp=d.querySelector('#ssIn');setTimeout(()=>inp.focus(),30);
    const done=v=>{d.remove();if(v!==undefined)setPlayer(v)};
    d.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===d)return done();if(!b)return;if(b.dataset.n)inp.value=b.dataset.n;
      if(b.dataset.a==='ok')done(inp.value);if(b.dataset.a==='no')done();if(b.dataset.a==='out')done('')});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')done(inp.value);if(e.key==='Escape')done()})}
  // 把游戏自己用的 localStorage 键（同一个前缀）整体同步进共用存档：老游戏不用改读写代码
  // 数字取较大值（最高分之类），其它以存档里的为准
  function mirror(id,prefix){
    const collect=()=>{const kv={};try{Object.keys(localStorage).forEach(k=>{if(k.startsWith(prefix))kv[k]=localStorage.getItem(k)})}catch(e){}return kv};
    const apply=()=>{const o=get(id);if(!o||!o.kv)return;Object.entries(o.kv).forEach(([k,v])=>{let cur=null;try{cur=localStorage.getItem(k)}catch(e){}
      const a=parseFloat(cur),b=parseFloat(v),num=cur!=null&&String(a)===cur&&String(b)===v;
      try{localStorage.setItem(k,num?String(Math.max(a,b)):v)}catch(e){}})};
    let lastJ='';const sync=()=>{const kv=collect(),j=JSON.stringify(kv);if(j!==lastJ&&Object.keys(kv).length){if(set(id,{kv}))lastJ=j}};
    apply();sync();setInterval(sync,4000);addEventListener('pagehide',sync);
    subs.push(()=>{apply();lastJ='';sync()})}
  function button(b){if(!b)return;btns.push(b);render(b);b.addEventListener('click',dialog)}
  addEventListener('pagehide',()=>{if(P&&pulled)push(true)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&P&&pulled)push(true)});
  window.SpaceSave={get,set,remove,pull,push,button,mirror,openDialog:dialog,setPlayer,onChange:f=>subs.push(f),get player(){return P},get ready(){return pulled},K};
  setTimeout(pull,0);
})();
