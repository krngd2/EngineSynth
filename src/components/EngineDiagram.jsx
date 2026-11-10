import React,{useEffect,useRef,useState} from 'react';
import {LAYOUTS,DEFAULT_STATE,firingAngles} from '../model.js';
function smoothPath(points,offset=0) {
  const p=points.map(v=>({x:v.x,y:v.y+offset*v.r}));let d=`M${p[0].x},${p[0].y}`;
  for(let i=0;i<p.length-1;i++){const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],e=p[Math.min(p.length-1,i+2)];d+=` C${b.x+(c.x-a.x)/6},${b.y+(c.y-a.y)/6} ${c.x-(e.x-b.x)/6},${c.y-(e.y-b.y)/6} ${c.x},${c.y}`;}
  return d;
}
function Cylinder({x,y,angle,index,widthScale,lengthScale}) {
  return <g transform={`translate(${x} ${y}) rotate(${angle})`} className="cylinder"><g transform={`scale(${widthScale} ${lengthScale})`}>
    <path d="M-36-30L-47-173Q-48-181-39-184H39Q48-181 47-173L36-30" fill="#141b1b" stroke="#87928b" strokeWidth="1.7"/>
    {Array.from({length:13},(_,i)=><path key={i} d={`M-49 ${-172+i*9}h14m70 0h14`} stroke="#78837c" strokeWidth="2"/>)}
    <rect x="-32" y="-170" width="64" height="115" fill="#0c1110" stroke="#626e66"/>
    <path d="M-31-169H31V-115H-31Z" fill="url(#combustion)" className="combustion" data-cylinder={index}/>
    <g className="piston" data-cylinder={index}><rect x="-30" y="-125" width="60" height="39" rx="2" fill="url(#steel)" stroke="#b9c2b7"/>{[0,7,14].map(v=><path key={v} d={`M-30 ${-121+v}h60`} stroke="#090c0c" strokeWidth="2"/>)}<circle cy="-97" r="6" fill="#0d1410" stroke="#c0c8bb"/><path d="M-5-92V-5H5V-92" fill="#49544c" stroke="#929c91"/></g>
    <rect x="-42" y="-195" width="84" height="23" rx="3" fill="#18201d" stroke="#a9b2a7"/>{[-191,-185,-179].map(v=><path key={v} d={`M-47 ${v}h94`} stroke="#879288"/>)}
    <path d="M-6-195v-17H6v17M-9-204H9M-9-208H9" stroke="#cbd3c7"/>
    <path d="M-21-171v21m42-21v21m-28 0h14m28 0h14" stroke="#b6c0b3" strokeWidth="2"/>
    <path d="M-36-31L-25-8M36-31L25-8" stroke="#a7b3a6" strokeWidth="2"/>
  </g></g>;
}
export default function EngineDiagram({state,update,running,selected,onSelect,grid}) {
  const svg=useRef(),animation=useRef(),phaseRef=useRef(0),rpmRef=useRef(state.rpm),anglesRef=useRef([]),[drag,setDrag]=useState(null);
  rpmRef.current=state.rpm; anglesRef.current=firingAngles(state);
  const widthScale=Math.max(.72,Math.min(1.2,state.bore/DEFAULT_STATE.bore)),lengthScale=Math.max(.75,Math.min(1.22,state.stroke/DEFAULT_STATE.stroke));
  const points=state.points;
  useEffect(()=>{
    let frame,last=performance.now();
    function draw(t){if(running)phaseRef.current+=(t-last)*rpmRef.current/60000*.12;last=t;const phase=phaseRef.current;
      svg.current?.querySelectorAll('.piston').forEach((el,i)=>el.setAttribute('transform',`translate(0 ${Math.sin(phase*Math.PI*2-(anglesRef.current[i]??0)*Math.PI/180)*17})`));
      svg.current?.querySelectorAll('.combustion').forEach((el,i)=>el.style.opacity=running?0.25+Math.max(0,Math.sin(phase*Math.PI*2-(anglesRef.current[i]??0)*Math.PI/180))*.7:0.12);
      animation.current?.setAttribute('transform',`rotate(${phase*360} 185 351)`);frame=requestAnimationFrame(draw);
    }frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[running,state.layout]);
  function alter(i,p){update('points',points.map((v,j)=>j===i?{...v,...p}:v));}
  function down(e,i,kind='bend',side=1){e.preventDefault();onSelect(i);e.currentTarget.setPointerCapture(e.pointerId);setDrag({i,kind,side,startY:e.clientY,r:points[i].r});}
  function move(e){if(!drag)return;const matrix=svg.current.getScreenCTM(),position=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    if(drag.kind==='bend'){const {x,y}=position;alter(drag.i,{x:Math.max(drag.i===0?350:points[drag.i-1].x+28,Math.min(drag.i===4?778:points[drag.i+1].x-28,x)),y:Math.max(125,Math.min(385,y))});}
    else alter(drag.i,{r:Math.max(8,Math.min(58,drag.r+drag.side*(e.clientY-drag.startY)/matrix.a))});
  }
  const layout=state.layout;let cylinders;
  if(layout==='single')cylinders=[{x:185,y:351,a:0}];
  else if(layout==='boxer')cylinders=[{x:185,y:290,a:-90},{x:185,y:290,a:90}];
  else if(layout==='parallel'||layout==='inline4'){const n=layout==='inline4'?4:2;cylinders=Array.from({length:n},(_,i)=>({x:110+i*(n===4?55:115),y:351,a:0}));}
  else if(layout==='w12')cylinders=Array.from({length:12},(_,i)=>({x:185+(Math.floor(i/3)-1.5)*19,y:351-Math.floor(i/3)*10,a:(i%3-1)*state.bankAngle/2}));
  else {const n=LAYOUTS[layout].cylinders;cylinders=Array.from({length:n},(_,i)=>({x:185+(Math.floor(i/2)-(n/2-1)/2)*11,y:351-Math.floor(i/2)*6,a:(i%2?1:-1)*state.bankAngle/2}));}
  // Fit the projected block into the left side, including wide V8/V12 banks.
  let minX=121,maxX=249,minY=287;
  for(const c of cylinders){const a=c.a*Math.PI/180;for(const x of [-53*widthScale,53*widthScale])for(const y of [-215*lengthScale,0]){
    const px=c.x+x*Math.cos(a)-y*Math.sin(a),py=c.y+x*Math.sin(a)+y*Math.cos(a);
    minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);
  }}
  const projection=Math.min(1.2,330/(maxX-minX),360/(430-minY));
  const offsetX=20+(330-(maxX-minX)*projection)/2-minX*projection,offsetY=430-430*projection;
  const top=smoothPath(points,-1),bottom=smoothPath([...points].reverse(),1),tube=`${top} L${points.at(-1).x},${points.at(-1).y+points.at(-1).r}${bottom.replace(/^M[^C]+/,'')} Z`;
  return <div className={`diagram ${running?'running':''} ${grid?'grid-on':''}`}><div className="diagram-caption"><span>{state.carName?`${state.carName.toUpperCase()} / ${state.carModified?'CUSTOM':'SOUND STUDY'}`:LAYOUTS[layout].subtitle}</span><span>01 / LIVE SECTION</span></div>
    <svg ref={svg} viewBox="0 0 820 490" aria-label="Interactive engine cutaway. Drag green exhaust nodes to bend the pipe or drag pipe-edge handles to change diameter." onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)}>
      <defs><linearGradient id="steel" x1="0" x2="1"><stop stopColor="#555e56"/><stop offset=".35" stopColor="#a5ada0"/><stop offset=".55" stopColor="#66715f"/><stop offset="1" stopColor="#364239"/></linearGradient><linearGradient id="combustion" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d5a34a" stopOpacity=".65"/><stop offset="1" stopColor="#e7aa4c" stopOpacity=".05"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3"/></filter></defs>

      {cylinders.map((c,i)=>{
        const angle=c.a*Math.PI/180,side=c.a<0?-1:1;
        const px=(c.x+side*39*widthScale*Math.cos(angle)+160*lengthScale*Math.sin(angle))*projection+offsetX,py=(c.y+side*39*widthScale*Math.sin(angle)-160*lengthScale*Math.cos(angle))*projection+offsetY;
        const ix=(c.x-side*34*widthScale*Math.cos(angle)+185*lengthScale*Math.sin(angle))*projection+offsetX,iy=(c.y-side*34*widthScale*Math.sin(angle)-185*lengthScale*Math.cos(angle))*projection+offsetY;
        const exhaust=`M${px} ${py}C${Math.max(18,Math.min(350,px+side*(45+state.headerLength*60)))} ${py} ${Math.max(18,Math.min(350,px+side*(30+state.headerLength*57)))} ${points[0].y+45} ${points[0].x} ${points[0].y}`;
        const intake=`M${ix} ${iy}C${ix} ${iy-55} ${Math.max(18,ix-25)} ${iy-73} ${Math.max(18,ix-58)} ${iy-73}`;
        return <g key={`pipes-${i}`} fill="none"><path d={intake} stroke="#233e47" strokeWidth="14"/><path d={intake} stroke="#8dbac8" strokeWidth="1.2"/><path d={exhaust} stroke="#26331e" strokeWidth={state.headerDiameter/38*21}/><path d={exhaust} stroke="#92aa77" strokeWidth={state.headerDiameter/38*21+1.5}/><path d={exhaust} stroke="#26331e" strokeWidth={state.headerDiameter/38*21-1.5}/><path d={exhaust} stroke="#b7e47c" className="pressure-flow" strokeWidth="1" strokeDasharray="9 18"/></g>;
      })}
      <g transform={`translate(${offsetX} ${offsetY}) scale(${projection})`}>
      {cylinders.map((c,i)=><Cylinder key={i} x={c.x} y={c.y} angle={c.a} index={i} widthScale={widthScale} lengthScale={lengthScale}/>)}
      <path d="M123 317L107 410h156l-17-93M103 410v19h164v-19M95 430h181" fill="#151b17" stroke="#899483" strokeWidth="1.5"/>
      <circle cx="185" cy="351" r="64" fill="#171f19" stroke="#a8b5a1" strokeWidth="1.5"/><circle cx="185" cy="351" r="56" fill="url(#steel)" stroke="#a2ad99"/><circle cx="185" cy="351" r="41" fill="#29322a" stroke="#a2ad99"/>
      <g ref={animation}>{[0,120,240].map(a=><g key={a} transform={`rotate(${a} 185 351)`}><circle cx="185" cy="313" r="7" fill="#131b14" stroke="#adb6a4"/></g>)}<path d="M220 336a38 38 0 0 1-7 42l-2-12m2 12 12-3" fill="none" stroke="#d6dece" strokeWidth="1.5"/></g><circle cx="185" cy="351" r="19" fill="#151d15" stroke="#bdc5b4"/><circle cx="185" cy="351" r="11" fill="#404c3d" stroke="#bdc5b4"/>
      </g>
      <path d={tube} fill="#162011" stroke="#b6e67c" strokeWidth="1.6"/><path d={smoothPath(points)} fill="none" stroke="#b6e67c" strokeWidth="9" opacity=".12" filter="url(#glow)"/>
      <path d={smoothPath(points)} className="pressure-flow" fill="none" stroke="#c2f970" strokeWidth="1.8" strokeDasharray="14 18"/>
      {state.mechanism==='muffler'&&<g transform={`translate(${points[2].x-24} ${points[2].y-39})`}><rect width="95" height="78" rx="4" fill="#283126" stroke="#b1bf9f"/><path d="M7 0v78m80-78v78M18 13h60M18 65h60" stroke="#a8b99a"/>{Array.from({length:15},(_,i)=><circle key={i} cx={23+i%5*12} cy={25+Math.floor(i/5)*13} r="2" fill="#11180e"/>)}</g>}
      {state.mechanism==='resonator'&&<g transform={`translate(${points[2].x} ${points[2].y-points[2].r})`} fill="#1b2b15" stroke="#a6cd7c"><path d="M-7 0v-54h-40v-14h54V0"/><path d="M-47-59h54" strokeDasharray="3 4"/></g>}
      <g stroke="#c1dd9f" fill="none"><path d={`M${points[4].x} ${points[4].y-points[4].r}l24-5v${points[4].r*2+10}l-24-5`}/><ellipse cx={points[4].x+24} cy={points[4].y} rx="5" ry={points[4].r+5}/></g>
      <g className="diagram-label"><text x={points[2].x-30} y={points[2].y-70}>{state.mechanism==='open'?'EXPANSION':state.mechanism==='muffler'?'MUFFLER':'RESONATOR'}</text><path d={`M${points[2].x+12} ${points[2].y-61}l-9 22`}/><text x="731" y={points[4].y-69}>OUTLET</text><path d={`M756 ${points[4].y-61}l-8 30`}/></g>
      <g className="diagram-label"><text x="62" y="50">INTAKE</text><path d="M97 58l-12 28"/><text x="232" y="42">COMBUSTION</text><path d="M265 51l-15 43"/><text x="397" y="208">HEADER</text><path d={`M420 217L${points[0].x+10} ${points[0].y-30}`}/></g>
      {points.map((p,i)=><g key={i}>
        <circle cx={p.x} cy={p.y} r="17" fill="transparent" className="node-hit" onPointerDown={e=>down(e,i)}/>
        <circle role="slider" tabIndex="0" aria-label={`Exhaust node ${i+1}`} aria-valuemin={125} aria-valuemax={385} aria-valuenow={Math.round(p.y)} cx={p.x} cy={p.y} r={selected===i?7:6} className={`exhaust-node ${selected===i?'selected':''}`} onFocus={()=>onSelect(i)} onPointerDown={e=>down(e,i)} onKeyDown={e=>{
          if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
          e.preventDefault();onSelect(i);alter(i,{x:Math.max(i===0?350:points[i-1].x+28,Math.min(i===4?778:points[i+1].x-28,p.x+(e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0))),y:Math.max(125,Math.min(385,p.y+(e.key==='ArrowUp'?-5:e.key==='ArrowDown'?5:0)))});
        }}/>
        {[-1,1].map(side=><g key={side}>
          <circle className="width-hit" cx={p.x} cy={p.y+side*p.r} r={Math.min(11,p.r*.4)} fill="transparent" onPointerDown={e=>down(e,i,'width',side)}/>
          <circle role="slider" tabIndex="0" aria-label={`Pipe diameter ${i+1} ${side===-1?'upper':'lower'} edge`} aria-valuemin={Math.round(state.diameter*8/24)} aria-valuemax={Math.round(state.diameter*58/24)} aria-valuenow={Math.round(state.diameter*p.r/24)} cx={p.x} cy={p.y+side*p.r} r={selected===i?4:3} className={`width-handle ${selected===i?'selected':''}`} onFocus={()=>onSelect(i)} onPointerDown={e=>down(e,i,'width',side)} onKeyDown={e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();onSelect(i);alter(i,{r:Math.max(8,Math.min(58,p.r+(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1)))});}}/>
        </g>)}
      </g>)}
      <text x="400" y="427" className="canvas-note">DRAG THE CENTER TO BEND. EDGES TO RESIZE.</text><text x="400" y="446" className="canvas-subnote">Selected section: Ø{Math.round(state.diameter*points[selected].r/24)} mm · use Width for fine control.</text>
    </svg>
  </div>;
}
