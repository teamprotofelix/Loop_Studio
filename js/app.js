import { parseVideoInput, parseTime, formatTime, validSegment, normalizeSpeed, parseShare, makeShareUrl, atSegmentEnd } from './core.mjs';

const $ = (id) => document.getElementById(id);
const STORE = 'marie-loop-studio-v1';
const SPEEDS = [0.25,0.5,0.75,1,1.25,1.5,1.75,2];
const ytState = { UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5 };
let player = null;
let apiPromise = null;
let ready = false;
let playing = false;
let scrubbing = false;
let lastJumpAt = 0;
let noteSaveTimer = null;
let toastTimer = null;
let skipRateReset = false;
let desiredRate = 1;
let state = { id:null, a:0, b:null, duration:0, current:0, mode:'full', lastMode:'full', rate:1, volume:80, loopCount:0, pendingStart:0 };
let database = readData();

function readData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || '{}');
    return { presets:Array.isArray(data.presets) ? data.presets.slice(0,100) : [], notes:data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes) ? data.notes : {}, settings:data.settings && typeof data.settings === 'object' ? data.settings : {} };
  } catch { return { presets:[],notes:{},settings:{} }; }
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(database)); return true; }
  catch { toast('브라우저 저장 공간을 사용할 수 없습니다. 시크릿 모드 또는 저장 설정을 확인하세요.'); return false; }
}
function toast(msg) {
  const box=$('toast'); box.textContent=msg; box.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(() => box.hidden=true,4300);
}
function status(s) { $('playerState').innerHTML=''; const dot=document.createElement('span');dot.className='state-dot';$('playerState').append(dot,document.createTextNode(s)); }
function setPlaceholder(title, subtitle, hint='', error=false) {
  const p=$('playerPlaceholder'); p.replaceChildren(); p.classList.toggle('is-error',error); p.hidden=false;
  const symbol=error?document.createElement('div'):document.createElement('img');symbol.className=error?'placeholder-symbol':'placeholder-mascot';if(error){symbol.textContent='!';}else{symbol.src='assets/marie-mascot.webp';symbol.alt='';symbol.width=520;symbol.height=600;}
  const b=document.createElement('b');b.textContent=title;const sub=document.createElement('span');sub.textContent=subtitle;const small=document.createElement('small');small.textContent=hint;
  p.append(symbol,b,sub,small);
  if (error && state.id) {const a=document.createElement('a');a.textContent='YouTube에서 직접 열기 ↗';a.href=`https://www.youtube.com/watch?v=${state.id}`;a.target='_blank';a.rel='noopener noreferrer';a.style.color='var(--mint)';p.append(a);}
}
function hidePlaceholder() { const p=$('playerPlaceholder');p.hidden=true;p.classList.remove('is-error'); }
function callPlayer(method, ...args) { try { if (ready && player && typeof player[method]==='function') return player[method](...args); } catch(e) { console.warn('player method',method,e); } return undefined; }
function currentTime() { const value=callPlayer('getCurrentTime');return Number.isFinite(value) ? value : state.current; }
function duration() { const value=callPlayer('getDuration');if(Number.isFinite(value)&&value>0)state.duration=value;return state.duration; }
function valid() { return validSegment(state.a,state.b,state.duration); }

function drawMode() {
  document.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===state.mode;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
  const title=state.mode==='segment'?'A–B 반복 활성화':state.mode==='full'?'전체 무한 반복 활성화':'반복 사용 안 함';
  $('loopHint').textContent=state.mode==='segment'&&valid()?`${formatTime(state.a,true)}부터 ${formatTime(state.b,true)}까지 자동 반복합니다.`:title+(state.mode==='full'?' · 영상 종료 후 처음부터 재생됩니다.':'');
  $('loopCount').textContent=`반복 ${state.loopCount}회`;
}
function drawPoints(force=false) {
  if(force||document.activeElement!==$('inputA')) $('inputA').value=formatTime(state.a,true);
  if(force||document.activeElement!==$('inputB')) $('inputB').value=Number.isFinite(state.b)?formatTime(state.b,true):'';
  const d=duration();
  const aMark=$('startMarker'),bMark=$('endMarker'),bar=$('timelineSelection');
  aMark.style.display=state.id&&d>0?'block':'none';
  aMark.style.left=`${Math.min(100,Math.max(0,state.a/d*100||0))}%`;
  const showB=state.id&&d>0&&Number.isFinite(state.b);
  bMark.style.display=showB?'block':'none';
  if(showB){bMark.style.left=`${Math.min(100,Math.max(0,state.b/d*100))}%`;bar.style.display='block';bar.style.left=`${Math.max(0,state.a/d*100)}%`;bar.style.width=`${Math.max(0,Math.min(100,state.b/d*100)-state.a/d*100)}%`;}
  else bar.style.display='none';
  drawMode();
}
function drawProgress() {
  const oldDuration=state.duration; const d=duration();let t=currentTime(); if (!Number.isFinite(t))t=0;
  if(oldDuration!==d)drawPoints();
  state.current=t;
  if(!scrubbing){$('seekBar').max=String(d>0?d:100);$('seekBar').value=String(Math.max(0,Math.min(d||100,t)));$('timeCurrent').textContent=formatTime(t);}
  $('timeDuration').textContent=formatTime(d);
  $('seekBar').disabled=!ready||d<=0;
  $('seekBar').style.setProperty('--progress', `${d>0?Math.min(100,100*t/d):0}%`);
  if(d>0&&!$('startMarker').style.left)drawPoints();
}
function drawRate(actual=null) {
  if(Number.isFinite(actual)&&actual>0)state.rate=actual;
  $('speedValue').textContent=`${state.rate.toFixed(2)}×`;
}
function updateVideoLinks() {
  const link=$('youtubeOpen');link.classList.toggle('hidden',!state.id);
  if(state.id){link.href=`https://www.youtube.com/watch?v=${state.id}`;$('videoUrl').value=`https://www.youtube.com/watch?v=${state.id}`;}
}
function setPlaying(isPlaying){playing=isPlaying;$('playBtn').textContent=playing?'Ⅱ':'▶';$('playBtn').setAttribute('aria-label',playing?'일시정지':'재생');}
function playbackToggle(){if(!ready){toast('영상을 먼저 불러오세요.');return;}if(playing)callPlayer('pauseVideo');else{if(state.mode==='segment'&&valid()){const t=currentTime();if(t<state.a-.05||t>=state.b-.05)callPlayer('seekTo',state.a,true);}callPlayer('playVideo');}}
function jumpBy(seconds){if(!ready)return;const d=duration();const next=Math.max(0,Math.min(d||Infinity,currentTime()+seconds));callPlayer('seekTo',next,true);}
function jumpTo(t){if(!ready)return;const d=duration();const next=Math.min(d||Infinity,Math.max(0,t));callPlayer('seekTo',next,true);}
function setMode(mode, {silent=false}={}) {
  if(!['off','full','segment'].includes(mode))return;
  if(mode==='segment'&&!valid()){toast('A와 B를 올바르게 지정하세요. 최소 0.3초 이상이어야 합니다.');return;}
  state.mode=mode;if(mode!=='off')state.lastMode=mode;state.loopCount=0;
  if(mode==='segment'&&ready){lastJumpAt=performance.now();jumpTo(state.a);if(!silent)callPlayer('playVideo');}
  drawMode();database.settings.lastMode=state.lastMode;persist();
}
function markPoint(which, value) {
  if(!state.id){toast('영상을 먼저 불러오세요.');return;}
  if(!Number.isFinite(value)||value<0||state.duration>0&&value>state.duration+.25){toast('올바른 영상 시간을 입력하세요.');drawPoints(true);return;}
  if(which==='a')state.a=value;else state.b=value;
  if(Number.isFinite(state.b)&&state.b<=state.a+.2999){
    if(which==='a')state.b=null;
    else {toast('B는 A보다 0.3초 이상 뒤여야 합니다.');state.b=null;}
  }
  drawPoints(true);
  if(valid()&&state.mode!=='segment'){state.mode='segment';state.lastMode='segment';state.loopCount=0;drawMode();}
}
function changeSpeed(direction){const now=normalizeSpeed(state.rate);const idx=SPEEDS.indexOf(now);const next=SPEEDS[Math.max(0,Math.min(SPEEDS.length-1,idx+direction))];setSpeed(next);}
function setSpeed(rate){state.rate=normalizeSpeed(rate);desiredRate=state.rate;drawRate();if(ready)callPlayer('setPlaybackRate',state.rate);database.settings.rate=state.rate;persist();}
function onLoopTick() {
  if(!ready||!state.id)return;
  const t=currentTime();const d=duration();drawProgress();
  if(d>0&&Number.isFinite(state.b)&&$('endMarker').style.display==='none')drawPoints();
  if(state.mode==='segment'&&valid()&&playing&&atSegmentEnd(t,state.b,performance.now()-lastJumpAt)){
    lastJumpAt=performance.now();state.loopCount++;callPlayer('seekTo',state.a,true);callPlayer('playVideo');drawMode();
  }
}
function onPlayerState(event){
  switch(event.data){
    case ytState.PLAYING:
      setPlaying(true);status('재생 중');hidePlaceholder();
      if(state.pendingStart>0){let start=state.pendingStart;state.pendingStart=0;lastJumpAt=performance.now();callPlayer('seekTo',start,true);}
      if(!skipRateReset&&desiredRate!==1)callPlayer('setPlaybackRate',desiredRate);
      break;
    case ytState.PAUSED:setPlaying(false);status('일시 정지');break;
    case ytState.BUFFERING:status('로딩 중');break;
    case ytState.CUED:setPlaying(false);status('재생 준비');hidePlaceholder();break;
    case ytState.ENDED:
      setPlaying(false);
      if(state.mode==='full'||(state.mode==='segment'&&valid())){
        state.loopCount++;drawMode();lastJumpAt=performance.now();callPlayer('seekTo',state.mode==='segment'?state.a:0,true);callPlayer('playVideo');status('다시 재생 중');
      } else status('재생 종료');
      break;
    default:status('영상 준비 중');
  }
  duration();drawProgress();drawPoints();
}
function onError(event){
  const message=event.data===153?'YouTube에서 출처(Referer)를 확인하지 못했습니다. localhost 또는 HTTPS에서 실행하세요.':
    [101,150].includes(event.data)?'영상 소유자가 다른 웹사이트에서의 재생을 허용하지 않았습니다.':
    event.data===100?'영상이 삭제되었거나 비공개 상태입니다.':
    event.data===2?'YouTube 영상 주소가 올바르지 않습니다.':'YouTube 영상을 불러오지 못했습니다.';
  status('재생 오류');setPlaying(false);setPlaceholder('재생할 수 없는 영상',message,'다른 영상을 사용하거나 YouTube에서 직접 확인하세요.',true);toast(message);
}
function loadYoutubeApi() {
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
    if(window.YT&&window.YT.Player){resolve(window.YT);return;}
    const timer=setTimeout(()=>reject(new Error('YouTube API 응답 시간 초과')),15000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve(window.YT);};
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.onerror=()=>{clearTimeout(timer);reject(new Error('YouTube 서버에 연결할 수 없습니다.'));};document.head.appendChild(script);
  });
  return apiPromise;
}
async function attachPlayer() {
  try {
    await loadYoutubeApi();
    if(player) return;
    const config={rel:0,playsinline:1,controls:1,fs:1,enablejsapi:1};
    if(['http:','https:'].includes(location.protocol))config.origin=location.origin;
    player=new window.YT.Player('playerMount',{
      height:'100%',width:'100%',videoId:state.id,playerVars:config,
      events:{onReady:()=>{ready=true;$('playBtn').disabled=false;callPlayer('setVolume',state.volume);status('재생 준비');hidePlaceholder();drawPoints();drawProgress();
        // One-time URL timestamp; cue videos do not always apply seek until playback begins.
        if(state.pendingStart>0)callPlayer('cueVideoById',{videoId:state.id,startSeconds:state.pendingStart});
      },onStateChange:onPlayerState,onError,onAutoplayBlocked:()=>{status('클릭하여 재생');toast('브라우저의 자동 재생 제한입니다. 플레이어의 재생 버튼을 눌러주세요.');},onPlaybackRateChange:(e)=>{skipRateReset=true;drawRate(e.data);skipRateReset=false;}}
    });
    const frame=$('videoFrame');const observer=new MutationObserver(()=>{
      const iframe=frame.querySelector('iframe');if(iframe){iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');iframe.setAttribute('title','YouTube 반복 재생 플레이어');iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');observer.disconnect();}
    });observer.observe(frame,{childList:true,subtree:true});
    const frameIframe=frame.querySelector('iframe');if(frameIframe){frameIframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frameIframe.setAttribute('title','YouTube 반복 재생 플레이어');observer.disconnect();}
  } catch(error){console.error(error);status('연결 실패');setPlaceholder('YouTube 연결 실패',error.message,'인터넷 또는 사내망의 YouTube 접속 정책을 확인하세요.',true);toast(error.message);apiPromise=null;}
}
async function loadVideo({id,start=0,a=0,b=null,mode='full',rate=state.rate},{restore=false}={}) {
  if(state.id) saveNotes();
  state.id=id;state.current=0;state.duration=0;state.a=a;state.b=b;state.mode=mode;state.lastMode=mode==='off'?'full':mode;state.rate=rate;desiredRate=rate;state.loopCount=0;state.pendingStart=start>0?start:(mode==='segment'&&validSegment(a,b)?a:0);
  lastJumpAt=performance.now();setPlaying(false);updateVideoLinks();drawPoints(true);drawProgress();drawRate();renderNotes();
  status('영상 불러오는 중');setPlaceholder('영상을 불러오는 중', 'YouTube 플레이어를 연결하고 있습니다...', '재생은 브라우저의 자동재생 정책에 따라 클릭이 필요할 수 있습니다.');
  $('playBtn').disabled=true;
  database.settings.lastVideo=id;database.settings.rate=state.rate;database.settings.lastMode=state.lastMode;persist();
  if(restore===false){try{const u=new URL(location.href);u.searchParams.set('v',id);u.searchParams.delete('a');u.searchParams.delete('b');u.searchParams.delete('mode');u.searchParams.delete('rate');history.replaceState(null,'',u.toString());}catch{}}
  if(!player){await attachPlayer();return;}
  ready=true;
  callPlayer('loadVideoById',{videoId:id,startSeconds:state.pendingStart||0});
  // loadVideoById resets rate to 1; on PLAYING requests saved rate again.
  $('playBtn').disabled=false;
}

function renderPresets() {
  $('presetList').replaceChildren();$('presetCount').textContent=String(database.presets.length);
  if(!database.presets.length){const item=document.createElement('div');item.className='empty-content';item.innerHTML='<span>◇</span>저장한 반복 구간이 없습니다.<small>왼쪽의 ‘현재 반복 저장’을 눌러보세요.</small>';$('presetList').append(item);return;}
  for(const preset of database.presets){
    const item=document.createElement('div');item.className='preset-item';
    const load=document.createElement('button');load.type='button';load.className='preset-main';
    const title=document.createElement('strong');title.textContent=String(preset.name).slice(0,60);
    const detail=document.createElement('small');detail.textContent=preset.mode==='segment'?`${formatTime(preset.a,true)} — ${formatTime(preset.b,true)} · ${preset.rate}×`:`전체 반복 · ${preset.rate}×`;
    load.append(title,detail);load.addEventListener('click',()=>loadVideo({id:preset.id,a:preset.a,b:preset.b,mode:preset.mode,rate:preset.rate,start:preset.mode==='segment'?preset.a:0}));
    const del=document.createElement('button');del.className='preset-del';del.type='button';del.textContent='×';del.title='프리셋 삭제';del.setAttribute('aria-label',`${preset.name} 삭제`);
    del.addEventListener('click',()=>{database.presets=database.presets.filter(p=>p.key!==preset.key);persist();renderPresets();toast('저장된 반복 구간을 삭제했습니다.');});
    item.append(load,del);$('presetList').append(item);
  }
}
function renderNotes(){ $('notesArea').disabled=!state.id;$('notesArea').value=state.id?String(database.notes[state.id]||''):'';$('notesCount').textContent=`${$('notesArea').value.length}자`;$('notesStatus').textContent=state.id?'자동 저장':'저장 대기'; }
function saveNotes(){if(!state.id)return;const txt=$('notesArea').value.slice(0,30000);if(txt)database.notes[state.id]=txt;else delete database.notes[state.id];if(persist())$('notesStatus').textContent='저장 완료';}
function openSave(){if(!state.id){toast('먼저 영상을 불러오세요.');return;}if(state.mode==='segment'&&!valid()){toast('구간 시작과 종료 시간을 확인하세요.');return;}$('presetName').value=state.mode==='segment'?`구간 ${formatTime(state.a)} ~ ${formatTime(state.b)}`:`전체 반복 ${state.id}`;$('saveDialog').showModal();$('presetName').focus();$('presetName').select();}
function commitSave(){const name=$('presetName').value.trim();if(!name){toast('구간 이름을 입력하세요.');return false;}database.presets.unshift({key:`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,name:name.slice(0,60),id:state.id,a:state.a,b:state.b,mode:state.mode==='segment'?'segment':'full',rate:state.rate});database.presets=database.presets.slice(0,100);persist();renderPresets();toast('반복 구간을 브라우저에 저장했습니다.');return true;}
async function share(){if(!state.id){toast('공유할 영상을 먼저 불러오세요.');return;}const url=makeShareUrl(location.href,state);try{await navigator.clipboard.writeText(url);toast('반복 설정이 포함된 링크를 복사했습니다.');}catch{const box=document.createElement('textarea');box.value=url;document.body.append(box);box.select();let success=false;try{success=document.execCommand('copy');}catch{}box.remove();toast(success?'링크를 복사했습니다.':'클립보드 접근이 차단되어 링크를 복사하지 못했습니다.');}}
function syncInputs(id){const input=$(id);const parsed=parseTime(input.value);if(parsed===null){toast('시간 형식: 01:23 또는 01:23.500으로 입력하세요.');drawPoints(true);return;}markPoint(id==='inputA'?'a':'b',parsed);}
function bindEvents(){
  $('videoForm').addEventListener('submit',e=>{e.preventDefault();const result=parseVideoInput($('videoUrl').value);if(!result){toast('올바른 YouTube URL 또는 11자리 동영상 ID를 입력하세요.');return;}loadVideo({id:result.id,start:result.start,a:result.start,b:null,mode:'full',rate:state.rate});});
  $('demoBtn').addEventListener('click',()=>loadVideo({id:'M7lc1UVf-VE',a:0,b:null,start:0,mode:'full',rate:1}));
  $('pasteBtn').addEventListener('click',async()=>{try{$('videoUrl').value=await navigator.clipboard.readText();$('videoUrl').focus();}catch{toast('브라우저가 클립보드 접근을 거부했습니다. Ctrl+V로 붙여넣으세요.');}});
  $('playBtn').addEventListener('click',playbackToggle);$('backBtn').addEventListener('click',()=>jumpBy(-5));$('forwardBtn').addEventListener('click',()=>jumpBy(5));
  $('volumeSlider').addEventListener('input',e=>{state.volume=Number(e.target.value);callPlayer('setVolume',state.volume);database.settings.volume=state.volume;persist();});
  $('speedDown').addEventListener('click',()=>changeSpeed(-1));$('speedUp').addEventListener('click',()=>changeSpeed(1));$('speedValue').addEventListener('click',()=>setSpeed(1));
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('markA').addEventListener('click',()=>markPoint('a',currentTime()));$('markB').addEventListener('click',()=>markPoint('b',currentTime()));
  ['inputA','inputB'].forEach(id=>{$(id).addEventListener('change',()=>{if(id==='inputB'&&!$(id).value.trim()){state.b=null;drawPoints(true);return;}syncInputs(id);});$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){$(id).blur();}});});
  $('resetPoints').addEventListener('click',()=>{state.a=0;state.b=null;state.mode='full';state.loopCount=0;drawPoints(true);toast('A–B 구간이 초기화되었습니다.');});
  $('seekBar').addEventListener('pointerdown',()=>scrubbing=true);$('seekBar').addEventListener('pointerup',()=>scrubbing=false);
  $('seekBar').addEventListener('input',e=>{$('timeCurrent').textContent=formatTime(Number(e.target.value));e.target.style.setProperty('--progress',`${Math.min(100,100*e.target.value/(duration()||100))}%`);});
  $('seekBar').addEventListener('change',e=>{scrubbing=false;jumpTo(Number(e.target.value));});
  $('savePresetBtn').addEventListener('click',openSave);$('shareBtn').addEventListener('click',share);
  $('saveDialogForm').addEventListener('submit',e=>{if(e.submitter?.value==='save'){e.preventDefault();if(commitSave())$('saveDialog').close('save');}});
  $('notesArea').addEventListener('input',()=>{$('notesStatus').textContent='저장 중...';$('notesCount').textContent=`${$('notesArea').value.length}자`;clearTimeout(noteSaveTimer);noteSaveTimer=setTimeout(saveNotes,450);});
  $('themeToggle').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;database.settings.theme=next;persist();updateThemeButton();});
  window.addEventListener('keydown',e=>{
    if(e.altKey||e.metaKey||e.shiftKey&&e.key!=='+'||e.target?.matches?.('input, textarea, select')||e.target?.isContentEditable||e.target?.closest?.('dialog[open]'))return;
    const k=e.key.toLowerCase();
    if([' ','arrowleft','arrowright','a','b','l','1','2','0','+','=','-'].includes(k)&&!e.ctrlKey){
      if(k===' '){e.preventDefault();playbackToggle();}
      else if(k==='arrowleft'){e.preventDefault();jumpBy(-5);}
      else if(k==='arrowright'){e.preventDefault();jumpBy(5);}
      else if(k==='a')markPoint('a',currentTime());
      else if(k==='b')markPoint('b',currentTime());
      else if(k==='l')setMode(state.mode==='off'?state.lastMode:'off');
      else if(k==='1')setMode('full');else if(k==='2')setMode('segment');else if(k==='0')setMode('off');
      else if(k==='+'||k==='=')changeSpeed(1);else if(k==='-')changeSpeed(-1);
    }
    // Browser-reserved Ctrl+L / Ctrl+P are intentionally not intercepted.
  });
  window.addEventListener('beforeunload',()=>{clearTimeout(noteSaveTimer);saveNotes();});
}
function updateThemeButton(){$('themeToggle').textContent=document.documentElement.dataset.theme==='light'?'☾':'☼';}
function init(){
  document.documentElement.dataset.theme=database.settings.theme==='dark'?'dark':'light';updateThemeButton();
  const rate=Number(database.settings.rate);if(SPEEDS.includes(rate))state.rate=rate; desiredRate=state.rate;
  const volume=Number(database.settings.volume);if(Number.isFinite(volume)&&volume>=0&&volume<=100)state.volume=volume;
  $('volumeSlider').value=String(state.volume);drawRate();renderPresets();renderNotes();drawMode();bindEvents();
  if(location.protocol==='file:')$('runtimeHint').textContent='현재 파일 직접 실행 중입니다. YouTube 오류 153이 발생하면 start.bat로 localhost에서 실행하세요.';
  const share=parseShare(location.search);
  if(share){loadVideo(share,{restore:true});return;}
  if(database.settings.lastVideo&&/^[\w-]{11}$/.test(database.settings.lastVideo)){
    loadVideo({id:database.settings.lastVideo,a:0,b:null,mode:'full',rate:state.rate},{restore:true});
  }
}
init();
setInterval(onLoopTick,120);
