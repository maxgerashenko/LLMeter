// Economy tab charts: pies, ledgers, projection and unemployment scale. Palette comes from economy.css.
(function(){
  const css = n => getComputedStyle(document.getElementById("panel-economy")).getPropertyValue(n).trim();
  const fmtP = m => m.toFixed(1)+"M";
  const fmt = b => b>=1000 ? "$"+(b/1000).toFixed(2)+"T" : "$"+Math.round(b)+"B";
  const GDI = 30908, LF = 170.68, WC = 7522, WCJ = 87.14;
  const r1 = [
    {g:"Paid to employees · $15.72T · 51% of GDP"},
    {n:"White-collar",a:7522,b:87.14,c:"--e-white",hlw:true},
    {n:"Blue-collar",a:1948,b:35.19,c:"--e-blue"},
    {n:"Pink-collar & service",a:1380,b:33.16,c:"--e-pink"},
    {n:"Other: wages outside OES",a:2150,c:"--e-othercomp"},
    {n:"Other: benefits & payroll taxes",a:2720,c:"--e-othercomp",hatch:true},
    {n:"Other employed (self-employed, farm, household)",b:8.12,c:"--e-othercomp"},
    {n:"Unemployed",b:7.07,c:"--e-crit"},
    {g:"Not paid as wages · $15.19T · 49% of GDP"},
    {n:"Depreciation (fixed capital)",a:5055,c:"--e-cfc"},
    {n:"Corporate profits",a:4025,c:"--e-profit"},
    {n:"Self-employed (proprietors)",a:2017,c:"--e-prop"},
    {n:"Rental income",a:1140,c:"--e-rent"},
    {n:"Production taxes, net interest, other",a:2951,c:"--e-tax"},
  ];
  const r2 = [
    {n:"Management",a:1617,b:11.13,c:"--e-mgmt"},
    {n:"Healthcare practitioners",a:1068,b:9.82,c:"--e-pink"},
    {n:"Business & financial",a:1003,b:10.54,c:"--e-profit"},
    {n:"Office & admin support",a:915,b:17.75,c:"--e-othercomp"},
    {n:"Sales",a:738,b:13.42,c:"--e-prop"},
    {n:"Education & library",a:615,b:9.10,c:"--e-cfc"},
    {n:"Software developers",a:250,b:1.69,c:"--e-dev",hl:true},
    {n:"Other computer & math",a:382,b:3.57,c:"--e-blue"},
    {n:"Architecture & engineering",a:280,b:2.62,c:"--e-tax"},
    {n:"Legal, science, social service, arts",a:653,b:7.50,c:"--e-rent"},
  ];
  const side = (rows,k) => {let g=0; const out=[]; rows.forEach(r=>{if(r.g){g++;return;} if(r[k]) out.push({n:r.n,v:r[k],c:r.c,hatch:r.hatch,g});}); return out;};
  // which slices in each group: computed per row at map time

  function dual(tbl, rows, tA, tB, labA, labB){
    const sw=d=>d.hatch?'background:repeating-linear-gradient(45deg,var(--e-othercomp) 0 3px,transparent 3px 5px)':'background:var('+d.c+')';
    const pc=(v,t)=>v?(100*v/t).toFixed(1)+'%':'—';
    let h='<thead><tr><th class="side">$</th><th>'+labA+'</th><th class="xnm">Group</th><th>'+labB+'</th><th class="side">People</th></tr></thead><tbody>';
    rows.forEach(d=>{
      if(d.g){h+='<tr class="group"><td colspan="5" style="text-align:center">'+d.g+'</td></tr>';return;}
      const nm='<span class="sw" style="'+sw(d)+'"></span>'+(d.hl||d.hlw?'<b>'+d.n+'</b>':d.n);
      h+='<tr'+(d.hl?' class="hl"':d.hlw?' class="hlw"':'')+'><td class="xn'+(d.a?'':' dash')+'">'+(d.a?fmt(d.a):'—')+'</td><td class="xn'+(d.a?'':' dash')+'">'+pc(d.a,tA)+'</td><td class="xnm">'+nm+'</td><td class="xn'+(d.b?'':' dash')+'">'+pc(d.b,tB)+'</td><td class="xn'+(d.b?'':' dash')+'">'+(d.b?fmtP(d.b):'—')+'</td></tr>';
    });
    h+='<tr class="total"><td class="xn">'+fmt(tA)+'</td><td class="xn">100%</td><td class="xnm">Total</td><td class="xn">100%</td><td class="xn">'+fmtP(tB)+'</td></tr></tbody>';
    tbl.innerHTML=h;
  }
  const SH={base:.027,low:.9/155.5,high:.042}, EALL=25;
  const r5 = [
    {n:"Office & admin support",j:17.75,e:46,c:"--e-othercomp"},
    {n:"Sales",j:13.42,e:31,c:"--e-prop"},
    {n:"Management",j:11.13,e:32,c:"--e-mgmt"},
    {n:"Business & financial",j:10.54,e:35,c:"--e-profit"},
    {n:"Healthcare practitioners",j:9.82,e:28,c:"--e-pink"},
    {n:"Education & library",j:9.10,e:27,c:"--e-cfc"},
    {n:"Software developers",j:1.69,e:29,c:"--e-dev",hl:true},
    {n:"Other computer & math",j:3.57,e:29,c:"--e-blue"},
    {n:"Architecture & engineering",j:2.62,e:37,c:"--e-tax"},
    {n:"Legal, science, social service, arts",j:7.50,e:33.6,c:"--e-rent"},
  ].map(d=>Object.assign(d,{b:SH.base*d.e/EALL,lo:SH.low*d.e/EALL,hi:SH.high*d.e/EALL}));
  const fmtJ = m => m>=1 ? m.toFixed(1)+"M" : Math.round(m*1000)+"K";
  function projTable(tbl){
    let h='<thead><tr><th class="side">2025 jobs</th><th class="xnm">Group</th><th>Work AI can automate (GS)</th><th>Cut by 2029</th><th>Range</th><th class="side">2029 jobs</th></tr></thead><tbody>';
    let T={j:0,d:0,lo:0,hi:0,e:0};
    r5.forEach(d=>{const dd=d.j*d.b; T.j+=d.j;T.d+=dd;T.lo+=d.j*d.lo;T.hi+=d.j*d.hi;T.e+=d.j*d.e;
      h+='<tr'+(d.hl?' class="hl"':'')+'><td class="xn">'+fmtP(d.j)+'</td><td class="xnm"><span class="sw" style="background:var('+d.c+')"></span>'+(d.hl?'<b>'+d.n+'</b>':d.n)+'</td><td class="xn">'+Math.round(d.e)+'%</td><td class="xn" style="color:var(--e-crit)">−'+fmtJ(dd)+' · '+(100*d.b).toFixed(1)+'%</td><td class="xn">'+(100*d.lo).toFixed(1)+'–'+(100*d.hi).toFixed(1)+'%</td><td class="xn">'+fmtP(d.j-dd)+'</td></tr>';});
    h+='<tr class="total"><td class="xn">'+fmtP(T.j)+'</td><td class="xnm">Total white-collar</td><td class="xn">'+Math.round(T.e/T.j)+'%</td><td class="xn" style="color:var(--e-crit)">−'+fmtJ(T.d)+' · '+(100*T.d/T.j).toFixed(1)+'%</td><td class="xn">'+fmtJ(T.lo)+'–'+fmtJ(T.hi)+'</td><td class="xn">'+fmtP(T.j-T.d)+'</td></tr></tbody>';
    tbl.innerHTML=h;
  }
  function pie(svg, data, total, centerTop, centerBot, f, explode){
    f=f||fmt;
    const ns="http://www.w3.org/2000/svg", cx=210, cy=210, R=explode?180:200, r=explode?98:108, OFF=16;
    svg.innerHTML="";
    const defs=document.createElementNS(ns,"defs");
    defs.innerHTML='<pattern id="'+svg.id+'h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="'+css("--e-othercomp")+'"/><rect width="2.5" height="6" fill="'+css("--surface")+'" opacity=".55"/></pattern>';
    svg.appendChild(defs);
    let a=-Math.PI/2;
    let exA=null, exB=null, inA=null, inB=null;
    if(explode){let t=-Math.PI/2; data.forEach(d=>{const s=d.v/total*2*Math.PI; if(d.g===explode){if(exA===null)exA=t; exB=t+s;} else {if(inA===null)inA=t; inB=t+s;} t+=s;});}
    const exM = explode ? (exA+exB)/2 : 0, dx = explode?OFF*Math.cos(exM):0, dy = explode?OFF*Math.sin(exM):0;
    data.filter(d=>d.v).forEach(d=>{
      const shift = explode && d.g===explode;
      const s=d.v/total*2*Math.PI, a2=a+s, big=s>Math.PI?1:0;
      const p=(t,rr)=>[cx+rr*Math.cos(t),cy+rr*Math.sin(t)];
      const [x1,y1]=p(a,R),[x2,y2]=p(a2,R),[x3,y3]=p(a2,r),[x4,y4]=p(a,r);
      const path=document.createElementNS(ns,"path");
      path.setAttribute("d",`M${x1} ${y1}A${R} ${R} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${big} 0 ${x4} ${y4}Z`);
      path.setAttribute("fill", d.hatch?`url(#${svg.id}h)`:css(d.c));
      path.setAttribute("stroke",css("--surface")); path.setAttribute("stroke-width","2");
      if(d.c==="--e-white"){path.setAttribute("stroke",css("--e-white-edge"));path.setAttribute("stroke-width","1.2");}
      const t=document.createElementNS(ns,"title"); t.textContent=d.n+": "+f(d.v)+" ("+(100*d.v/total).toFixed(1)+"%)"; path.appendChild(t);
      if(shift) path.setAttribute("transform",`translate(${dx} ${dy})`);
      svg.appendChild(path);
      const pct=100*d.v/total;
      if(pct>=4){const val=f(d.v).replace(/\.(\d)\dT$/,".$1T");const m=(a+a2)/2,[lx,ly]=p(m,(R+r)/2);const tx=document.createElementNS(ns,"text");
        tx.setAttribute("x",lx);tx.setAttribute("y",ly+5);tx.setAttribute("text-anchor","middle");tx.setAttribute("font-size","18");tx.setAttribute("font-weight","700");tx.style.fill=d.c==="--e-white"?"#3a3220":"#fff";tx.textContent=val;if(shift)tx.setAttribute("transform",`translate(${dx} ${dy})`);svg.appendChild(tx);}
      a=a2;
    });
    if(explode){
      const arc=(A,B,rr,ox,oy,col,dash)=>{const p=(t)=>[cx+ox+rr*Math.cos(t),cy+oy+rr*Math.sin(t)];const [x1,y1]=p(A+.02),[x2,y2]=p(B-.02);const e=document.createElementNS(ns,"path");e.setAttribute("d",`M${x1} ${y1}A${rr} ${rr} 0 ${B-A>Math.PI?1:0} 1 ${x2} ${y2}`);e.setAttribute("fill","none");e.setAttribute("stroke",css(col));e.setAttribute("stroke-width","4");e.setAttribute("stroke-linecap","round");if(dash)e.setAttribute("stroke-dasharray","2 7");svg.appendChild(e);};
      arc(inA,inB,R+8,0,0,"--fg",false);
      arc(exA,exB,R+8,dx,dy,"--muted",true);
    }
    [[centerTop,-4,30,800],[centerBot,22,13,500]].forEach(([s,dy,fs,fw])=>{const tx=document.createElementNS(ns,"text");tx.setAttribute("x",cx);tx.setAttribute("y",cy+dy);tx.setAttribute("text-anchor","middle");tx.setAttribute("font-size",fs);tx.setAttribute("font-weight",fw);tx.textContent=s;svg.appendChild(tx);});
  }
  function ledger(tbl, data, total, col, f, unit){
    f=f||fmt; unit=unit||'$';
    let h='<thead><tr><th>Slice</th><th>'+unit+'</th><th>'+col+'</th></tr></thead><tbody>';
    data.forEach(d=>{
      if(d.g){h+='<tr class="group"><td colspan="3">'+d.g+'</td></tr>';return;}
      const sw=d.hatch?`background:repeating-linear-gradient(45deg,var(--e-othercomp) 0 3px,transparent 3px 5px)`:`background:var(${d.c})`;
      h+='<tr'+(d.hl?' class="hl"':'')+'><td><span class="sw" style="'+sw+'"></span>'+(d.hl?'<b>'+d.n+'</b>':d.n)+'</td><td class="xn">'+f(d.v)+'</td><td class="xn">'+(100*d.v/total).toFixed(1)+'%</td></tr>';
    });
    h+='<tr class="total"><td>Total</td><td class="xn">'+f(total)+'</td><td class="xn">100%</td></tr></tbody>';
    tbl.innerHTML=h;
  }
  function scale(svg){
    const L=30, R=975, y=150, brk=30, xb=L+(R-L)*0.5;
    const X=v=> v<=brk ? L+(xb-L)*v/brk : xb+(R-xb)*(v-brk)/(85-brk);
    let s='';
    const zones=[[0,4.6,"--e-ok","Normal",.5],[4.6,11,"--e-warn","Recession",.5],[11,25,"--e-crit","Severe",.45],[25,30,"--e-crit","Depression",.7],[30,85,"--e-crit","Collapse zone",.9]];
    zones.forEach(([a,b,c,t,o])=>{s+=`<rect x="${X(a)}" y="${y-10}" width="${X(b)-X(a)}" height="20" fill="${css(c)}" opacity="${o}"/>`;
      s+=`<text class="zone" x="${(X(a)+X(b))/2}" y="${y+4}" text-anchor="middle" style="fill:#fff;font-weight:700;font-family:var(--f-display);font-size:${X(b)-X(a)<90?10:11}px">${(X(b)-X(a))>t.length*5.6?t:''}</text>`;});
    [0,5,10,15,20,25,30,40,50,60,70,80].forEach(v=>{s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${y+10}" y2="${y+16}" stroke="${css("--muted")}"/><text x="${X(v)}" y="${y+28}" text-anchor="middle">${v}%</text>`;});
    s+=`<text x="${xb+4}" y="${y+42}" style="font-size:10px">scale compressed above 30% →</text>`;
    const up=[[4.1,"Today 4.1%","Oct 2026",1],[4.6,"Sahm signal ~4.6%","recession starts",3],[10,"2009: 10%","GDP −4%",2],[14.8,"COVID 14.8%","$5T of aid",4],[24.9,"US 1933: 24.9%","GDP −27%",1],[27.9,"Greece 2013: 27.9%","GDP −25%",2],[30,"Germany 1932: ~30%","republic fell",3]];
    up.forEach(([v,t,sub,lv])=>{const yy=y-18-lv*22;s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${yy+4}" y2="${y-10}" stroke="${css("--text")}" stroke-width="1"/><text class="lab" x="${X(v)+4}" y="${yy}">${t} <tspan style="fill:${css("--muted")};font-weight:400">· ${sub}</tspan></text>`;});
    const dn=[[5.1,"AI 2029 base: 4.6–6.0%",1,"--e-warn"],[55.2,"S1 direct 55%",1,"--e-crit"],[62.9,"S1 + knock-on 63%",2,"--e-crit"],[75.8,"S2 direct 76%",3,"--e-crit"],[81,"S2 + knock-on 81%",4,"--e-crit"]];
    dn.forEach(([v,t,lv,c])=>{const yy=y+58+lv*24;s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${y+10}" y2="${yy-12}" stroke="${css(c)}" stroke-width="2"/><text class="lab" x="${(v>70||v===55.2)?X(v)-4:X(v)+4}" text-anchor="${(v>70||v===55.2)?'end':'start'}" y="${yy}" style="fill:${css(c)};font-weight:700">${t}</text>`;});
    svg.innerHTML=s;
  }
  function minis(){
    const bar=(id,rows,max,unit)=>{document.getElementById(id).innerHTML=rows.map(([n,v,c,lab])=>`<div class="xbar"><span class="xbl" title="${n}">${n}</span><span class="xbt"><span class="xbf" style="display:block;width:${100*v/max}%;background:var(${c})"></span></span><span class="xbv">${lab||v+unit}</span></div>`).join('');};
    bar("m1",[["Office & admin",46,"--e-othercomp"],["Legal",44,"--e-rent"],["Engineering",37,"--e-tax"],["Business",35,"--e-profit"],["Management",32,"--e-mgmt"],["Sales",31,"--e-prop"],["Computer",29,"--e-blue"],["Doctors, nurses",28,"--e-pink"],["Education",27,"--e-cfc"],["Construction",6,"--muted"],["Repair",4,"--muted"]],50,"%");
    document.getElementById("m2").innerHTML='<div class="stk"><div style="width:7%;background:var(--e-crit)"></div><div style="width:63%;background:var(--e-blue)">63%</div><div style="width:30%;background:var(--e-othercomp)">30%</div></div><div class="stkl"><span><span class="sw" style="background:var(--e-crit)"></span>7% replaced</span><span><span class="sw" style="background:var(--e-blue)"></span>63% helped by AI</span><span><span class="sw" style="background:var(--e-othercomp)"></span>30% not affected</span></div>';
    bar("m3",[["2023 estimate",6.5,"--e-warn","6–7%"],["2026 estimate",9,"--e-crit","9%+"],["2026 high end",14,"--e-crit","14%"]],15,"%");
    bar("m4",[["High-income",34,"--e-crit"],["World",25,"--e-warn"],["Low-income",11,"--e-othercomp"]],40,"%");
    const m=[["J",7.6],["F",4.7],["M",15.3],["A",21.5],["M",38.6],["J",14.0],["J",11.0],["A",3.5],["S",4.0],["O",1.3]];
    document.getElementById("m5").innerHTML=m.map(([l,v])=>`<div class="c"><span class="cv">${v>=10?Math.round(v)+'K':''}</span><span class="cb" style="height:${70*v/38.6}px"></span><span class="cl">${l}</span></div>`).join('');
  }
  function draw(){
    pie(document.getElementById("pie1"), side(r1,"a"), GDI, "$30.9T", "US GDI 2025", fmt, 2);
    pie(document.getElementById("pie3"), side(r1,"b"), LF, "170.7M", "Labor force", fmtP);
    dual(document.getElementById("led1"), r1, GDI, LF, "% GDP", "% people");
    pie(document.getElementById("pie2"), side(r2,"a"), WC, "$7.52T", "White-collar wages");
    pie(document.getElementById("pie4"), side(r2,"b"), WCJ, "87.1M", "White-collar jobs", fmtP);
    dual(document.getElementById("led2"), r2, WC, WCJ, "% pay", "% jobs");
    pie(document.getElementById("pie5"), r5.map(d=>({n:d.n,v:d.j,c:d.c})), 87.14, "87.1M", "Jobs 2025", fmtP);
    const after = r5.map(d=>({n:d.n,v:d.j*(1-d.b),c:d.c})); const cut = r5.reduce((t,d)=>t+d.j*d.b,0);
    pie(document.getElementById("pie6"), after.concat([{n:"Cut or not refilled because of AI",v:cut,c:"--e-crit"}]), 87.14, "83.9M", "Jobs late 2029", fmtP);
    projTable(document.getElementById("led5"));
    scale(document.getElementById("scale"));
    minis();
  }
  draw();
  try{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",draw);
    new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});}catch(e){}
})();
