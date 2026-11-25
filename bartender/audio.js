// Space 夜调 — procedural audio (no audio files): lounge-jazz BGM + bar sound effects.
// Everything is synthesised with WebAudio after the first user gesture.
(function(){
  let ctx=null,master=null,bgmGain=null,sfxGain=null,verb=null,on=true,started=false;
  try{on=localStorage.getItem('bar:snd')!=='0'}catch(e){}
  const listeners=[];
  function init(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ctx=new AC();
    master=ctx.createGain();master.gain.value=on?1:0;master.connect(ctx.destination);
    // small generated reverb
    verb=ctx.createConvolver();const len=ctx.sampleRate*2.2,ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)}
    verb.buffer=ir;const vg=ctx.createGain();vg.gain.value=.35;verb.connect(vg);vg.connect(master);
    bgmGain=ctx.createGain();bgmGain.gain.value=.5;bgmGain.connect(master);bgmGain.connect(verb);
    sfxGain=ctx.createGain();sfxGain.gain.value=.8;sfxGain.connect(master);
    return true;
  }
  let noiseBuf=null;
  function noise(){if(noiseBuf)return noiseBuf;noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return noiseBuf}
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  function env(g,t,a,peak,dec,sus=0){g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(Math.max(sus,0.0001),t+a+dec)}
  function tone(freq,t,dur,{type='sine',vol=.2,a=.005,out=sfxGain,detune=0}={}){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;o.detune.value=detune;
    o.connect(g);g.connect(out);env(g,t,a,vol,dur);o.start(t);o.stop(t+a+dur+.05);return o;
  }
  function noiseHit(t,dur,{freq=2000,q=1,type='bandpass',vol=.2,out=sfxGain,a=.002}={}){
    const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
    const g=ctx.createGain();s.connect(f);f.connect(g);g.connect(out);env(g,t,a,vol,dur);s.start(t,Math.random());s.stop(t+a+dur+.05);return {s,f,g};
  }

  // ---------------- BGM: lounge ii-V-I with rhodes, walking bass, brushes ----------------
  const BPM=74,beat=60/BPM;
  // chords as midi voicings (rootless), bass roots
  const PROG=[
    {v:[53,57,60,64],b:[38,41,45,48]}, // Dm9
    {v:[53,57,59,64],b:[43,47,50,47]}, // G13
    {v:[52,55,59,62],b:[36,40,43,45]}, // Cmaj9
    {v:[55,58,61,65],b:[45,44,43,40]}, // A7b9
    {v:[53,57,60,64],b:[38,41,45,48]},
    {v:[53,57,59,64],b:[43,41,40,38]},
    {v:[52,55,59,64],b:[36,43,40,43]},
    {v:[51,55,58,62],b:[39,43,46,43]}  // Eb maj7 (passing)
  ];
  let bar=0,nextT=0,sched=null,mood='lounge',rhodesBus=null,lp=null;
  function rhodes(m,t,dur,vol){
    const f=mtof(m);
    const o1=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),trem=ctx.createOscillator(),tg=ctx.createGain();
    o1.type='sine';o2.type='triangle';o1.frequency.value=f;o2.frequency.value=f*2;o2.detune.value=4;
    const g2=ctx.createGain();g2.gain.value=.18;o2.connect(g2);g2.connect(g);o1.connect(g);
    trem.frequency.value=4.2;tg.gain.value=.25;trem.connect(tg);
    const tv=ctx.createGain();tv.gain.value=1;tg.connect(tv.gain);g.connect(tv);tv.connect(rhodesBus);
    env(g,t,.01,vol,dur,vol*.02);
    [o1,o2,trem].forEach(o=>{o.start(t);o.stop(t+dur+.3)});
  }
  function scheduleBar(t){
    const c=PROG[bar%PROG.length],swing=beat*.62;
    // comping: chord on 1 and the "and" of 2, sometimes 4
    const hits=[[0,beat*1.4,.07],[beat+swing,beat*1.2,.05]];if(bar%2)hits.push([beat*3,beat*.9,.04]);
    hits.forEach(([dt,dur,vol])=>c.v.forEach((m,i)=>rhodes(m,t+dt+i*.012,dur,vol)));
    // melody sparkle every other bar
    if(bar%4===1||bar%4===3){const top=c.v[3]+12,notes=[top,top-3,top-5,top-3];notes.forEach((m,i)=>{if(Math.random()<.65)rhodes(m+(Math.random()<.3?2:0),t+beat*2+i*swing*.5,beat*.6,.035)})}
    // walking bass
    c.b.forEach((m,i)=>{const o=tone(mtof(m),t+i*beat,beat*.9,{type:'triangle',vol:.16,a:.01,out:bgmGain});});
    // brushes: swung 8th hats + soft kick on 1
    for(let i=0;i<4;i++){noiseHit(t+i*beat,.12,{freq:7000,q:.7,type:'highpass',vol:.018,out:bgmGain});noiseHit(t+i*beat+swing,.07,{freq:8000,q:.7,type:'highpass',vol:.01,out:bgmGain})}
    tone(55,t,.25,{vol:.12,out:bgmGain});
    bar++;
  }
  function startBGM(){
    if(started||!ctx)return;started=true;
    rhodesBus=ctx.createGain();rhodesBus.gain.value=1;lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;rhodesBus.connect(lp);lp.connect(bgmGain);
    // vinyl/room bed
    const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;const g=ctx.createGain();g.gain.value=.012;s.connect(f);f.connect(g);g.connect(bgmGain);s.start();
    nextT=ctx.currentTime+.15;
    sched=setInterval(()=>{if(!ctx)return;while(nextT<ctx.currentTime+1.2){scheduleBar(nextT);nextT+=beat*4}},250);
  }
  function setMood(m){mood=m;if(!lp)return;const t=ctx.currentTime;
    lp.frequency.setTargetAtTime(m==='dark'?700:m==='mix'?3200:2600,t,.6);
    bgmGain.gain.setTargetAtTime(m==='dark'?.32:m==='mix'?.38:.5,t,.6)}

  // ---------------- ambience: rain ----------------
  let rain=null;
  function setRain(onR){
    if(!ctx)return;
    if(onR&&!rain){const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1400;f.Q.value=.4;
      const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(master);s.start();g.gain.setTargetAtTime(.09,ctx.currentTime,.8);rain={s,g}}
    else if(!onR&&rain){const r=rain;rain=null;r.g.gain.setTargetAtTime(0,ctx.currentTime,.6);setTimeout(()=>{try{r.s.stop()}catch(e){}},2500)}
  }

  // ---------------- SFX ----------------
  let pourN=null;
  const S={
    tap(){tone(1200,ctx.currentTime,.05,{type:'triangle',vol:.06})},
    choice(){const t=ctx.currentTime;tone(660,t,.12,{vol:.07});tone(990,t+.06,.18,{vol:.06})},
    select(){const t=ctx.currentTime;tone(880,t,.08,{type:'triangle',vol:.07});tone(1320,t+.05,.12,{vol:.05})},
    clink(){const t=ctx.currentTime;[2637,3520,4186].forEach((f,i)=>tone(f*(1+Math.random()*.02),t+i*.01,.5,{vol:.05}))},
    ice(n=3){const t=ctx.currentTime;for(let i=0;i<n;i++){const tt=t+i*.09+Math.random()*.03;tone(2200+Math.random()*1800,tt,.18,{vol:.06});noiseHit(tt,.05,{freq:5000,q:2,vol:.05})}},
    splash(){const t=ctx.currentTime;const n=noiseHit(t,.35,{freq:900,q:1.5,vol:.12,a:.02});n.f.frequency.exponentialRampToValueAtTime(400,t+.35)},
    pourStart(){if(pourN)return;const t=ctx.currentTime;const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=3;
      const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=7;lg.gain.value=220;lfo.connect(lg);lg.connect(f.frequency);
      const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(sfxGain);s.start();lfo.start();g.gain.setTargetAtTime(.16,t,.05);
      f.frequency.setTargetAtTime(1300,t,4);pourN={s,g,lfo}},
    pourStop(){if(!pourN)return;const p=pourN;pourN=null;p.g.gain.setTargetAtTime(0,ctx.currentTime,.06);setTimeout(()=>{try{p.s.stop();p.lfo.stop()}catch(e){}},400)},
    shakeTick(){const t=ctx.currentTime;noiseHit(t,.09,{freq:3200,q:.8,vol:.16});tone(2600+Math.random()*900,t+.01,.08,{vol:.03})},
    stirTick(){tone(3100+Math.random()*300,ctx.currentTime,.25,{vol:.025})},
    serve(){const t=ctx.currentTime;noiseHit(t,.12,{freq:300,q:1,type:'lowpass',vol:.15});[784,988,1175].forEach((f,i)=>tone(f,t+.08+i*.07,.4,{vol:.06}))},
    win(){const t=ctx.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.07,.5,{type:'triangle',vol:.07}))},
    fail(){const t=ctx.currentTime;[392,330,262].forEach((f,i)=>tone(f,t+i*.12,.4,{type:'triangle',vol:.07}))},
    affUp(){const t=ctx.currentTime;[880,1109,1319].forEach((f,i)=>tone(f,t+i*.06,.35,{vol:.06}))},
    affDown(){const t=ctx.currentTime;tone(330,t,.35,{type:'triangle',vol:.07});tone(311,t+.12,.5,{type:'triangle',vol:.06})},
    clue(){const t=ctx.currentTime;tone(1568,t,.25,{vol:.06});tone(2093,t+.09,.4,{vol:.05})},
    card(){const t=ctx.currentTime;const o=tone(110,t,1.6,{type:'sine',vol:.12,a:.4});o.frequency.exponentialRampToValueAtTime(82,t+1.8)},
    thunder(){const t=ctx.currentTime;const n=noiseHit(t,2.4,{freq:180,q:.5,type:'lowpass',vol:.5,a:.02});noiseHit(t+.05,.4,{freq:900,q:.5,vol:.18})},
    thud(){const t=ctx.currentTime;const o=tone(90,t,.35,{vol:.35});o.frequency.exponentialRampToValueAtTime(45,t+.3);noiseHit(t,.15,{freq:400,type:'lowpass',vol:.2})},
    tick(){tone(1800,ctx.currentTime,.03,{type:'square',vol:.015})},
    emo(){tone(1500,ctx.currentTime,.12,{type:'triangle',vol:.04})},
    door(){const t=ctx.currentTime;[1319,1047].forEach((f,i)=>tone(f,t+i*.25,.9,{vol:.06}))}
  };
  const AU={
    get on(){return on},
    play(name,...a){if(!on||!ctx||!S[name])return;try{if(ctx.state==='suspended')ctx.resume();S[name](...a)}catch(e){}},
    mood(m){if(ctx)setMood(m)},
    rain(r){if(ctx)setRain(r)},
    toggle(){on=!on;try{localStorage.setItem('bar:snd',on?'1':'0')}catch(e){}
      if(on){init();startBGM();if(ctx.state==='suspended')ctx.resume()}
      if(master)master.gain.setTargetAtTime(on?1:0,ctx.currentTime,.1);if(!on)S.pourStop&&ctx&&S.pourStop();
      listeners.forEach(f=>f(on));return on},
    onChange(f){listeners.push(f)},
    unlock(){if(!on)return;if(init()){if(ctx.state==='suspended')ctx.resume();startBGM()}}
  };
  window.AU=AU;
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>AU.unlock(),{capture:true}));
})();
