import React,{useEffect,useRef} from 'react';
import {PanelTitle} from './Controls.jsx';
export default function LiveOutput({audio,running}) {
  const ref=useRef();
  useEffect(()=>{let frame;const canvas=ref.current,ctx=canvas.getContext('2d');const wave=new Float32Array(2048),freq=new Uint8Array(1024);
    function draw(){const box=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
      if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=box.width*dpr;canvas.height=box.height*dpr;}
      ctx.setTransform(dpr,0,0,dpr,0,0);const w=box.width,h=box.height;ctx.clearRect(0,0,w,h);
      const top=29,wh=h*.36,second=top+wh+55,sh=h-second-24;
      ctx.font='9px ui-monospace, monospace';ctx.fillStyle='#9baba0';ctx.fillText('OSCILLOSCOPE',13,12);ctx.textAlign='right';ctx.fillText('AUTO GAIN',w-13,12);ctx.textAlign='left';
      ctx.fillText('FREQUENCY SPECTRUM',13,second-14);ctx.textAlign='right';ctx.fillText('0 — 8 KHZ',w-13,second-14);ctx.textAlign='left';
      function grid(y,height){ctx.strokeStyle='#26302b';ctx.lineWidth=.5;for(let i=0;i<9;i++){let x=32+i*(w-49)/8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+height);ctx.stroke();}for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(32,y+i*height/4);ctx.lineTo(w-17,y+i*height/4);ctx.stroke();}}
      grid(top,wh);grid(second,sh);ctx.fillStyle='#66746a';ctx.fillText('1',10,top+3);ctx.fillText('0',10,top+wh/2+3);ctx.fillText('−1',7,top+wh+3);ctx.fillText('0',12,second+3);ctx.fillText('−40',4,second+sh/2);ctx.fillText('−80',4,second+sh);for(let i=0;i<5;i++)ctx.fillText(i===0?'0':`${i*2}k`,32+i*(w-49)/4,second+sh+17);
      const analyser=audio.current.analyser;if(analyser){analyser.getFloatTimeDomainData(wave);analyser.getByteFrequencyData(freq);}
      let peak=.015;for(const value of wave)peak=Math.max(peak,Math.abs(value));
      ctx.beginPath();ctx.strokeStyle='#c2f970';ctx.lineWidth=1.2;
      for(let i=0;i<1024;i++){const x=32+i/1023*(w-49),v=analyser?wave[i*2]/peak:0,y=top+wh/2-v*wh*.48;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
      if(analyser){ctx.fillStyle='#d5ac64';const bars=72;for(let i=0;i<bars;i++){const index=Math.floor(i/bars*8000/(audio.current.context.sampleRate/2)*1024);const v=freq[index]/255;ctx.fillRect(33+i*(w-50)/bars,second+sh-v*sh,(w-50)/bars-2,v*sh);}}
      else {ctx.fillStyle='#596950';ctx.textAlign='center';ctx.fillText('START ENGINE TO MONITOR',w/2,second+sh/2);ctx.textAlign='left';}
      frame=requestAnimationFrame(draw);
    }frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[audio,running]);
  return <section className="panel output-panel"><PanelTitle aside={running?'SIGNAL LIVE':'STANDBY'}>Live output</PanelTitle><canvas ref={ref} aria-label="Live audio waveform and frequency spectrum"/></section>;
}
