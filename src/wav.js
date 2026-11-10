export function encodeWav(chunks,sampleRate) {
    const length = chunks.reduce((n,c)=>n+c.length,0), buffer = new ArrayBuffer(44+length*2), v = new DataView(buffer);
    const str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j));};
    str(0,'RIFF');v.setUint32(4,36+length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*2,true);
    let i=44;for(const c of chunks)for(const x of c){v.setInt16(i,Math.max(-1,Math.min(1,x))*32767,true);i+=2;}
    return new Blob([buffer],{type:'audio/wav'});
}
