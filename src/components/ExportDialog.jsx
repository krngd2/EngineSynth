import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { buildSoundModule } from '../export.js';
import modelSource from '../model.js?raw';
import { LAYOUTS } from '../model.js';
export default function ExportDialog({ state, onClose }) {
  const ref = useRef(), [copied, setCopied] = useState(false), [error, setError] = useState('');
  const source = useMemo(() => buildSoundModule(state, modelSource), [state]);
  useEffect(() => { ref.current.showModal(); }, []);
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const a = document.createElement('a'); a.href = url; a.download = `engine-synth-${state.carId??state.layout}.js`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopied(true); setError(''); }
    catch { setError('Clipboard unavailable. Select the code below or download the file.'); }
  }
  return <dialog ref={ref} className="export-dialog" aria-labelledby="export-title" onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <div className="export-content"><button className="close-help" aria-label="Close export" onClick={onClose}><X size={19}/></button>
      <span className="help-index">TAKE THE SOUND WITH YOU</span><h1 id="export-title">Export this engine.</h1>
      <p>{state.carName??LAYOUTS[state.layout].name} · {state.rpm.toLocaleString()} RPM · {Math.round(state.displacement)} cc</p>
      <p className="export-description">Standalone JavaScript with your cylinder dimensions, headers, exhaust shape, and sound engine. No dependencies or audio samples.</p>
      <div className="export-actions"><button className="power-button" onClick={download}><Download size={14}/>Download .js</button><button className="copy-code" onClick={copy}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy code'}</button></div>
      <label htmlFor="export-source">ENGINE-SYNTH-{(state.carId??state.layout).toUpperCase()}.JS</label>
      <textarea id="export-source" aria-label="Exported JavaScript" readOnly spellCheck={false} value={source}/>
      <p className="export-footnote">Import <code>createEngineSound()</code> and call <code>start()</code> from a click handler. Use localhost or HTTPS.</p>
      {error && <p role="alert">{error}</p>}
    </div>
  </dialog>;
}
