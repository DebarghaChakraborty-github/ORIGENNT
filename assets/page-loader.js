/* ORIGENNT shared page loader — same seal loader as the homepage.
   Include as the first element inside <body>: <script src="assets/page-loader.js"></script>
   Pages that already carry the loader markup (index, careers, contact_us, enquiry, gci) are left alone. */
(function(){
  if(document.getElementById('orx-page-loader'))return;

  const script=document.currentScript;
  const sealSrc=new URL('origennt_seal.png',script&&script.src?script.src:location.href).href;

  if(!document.getElementById('orx-page-loader-style')){
    const style=document.createElement('style');
    style.id='orx-page-loader-style';
    style.textContent=[
      '#orx-page-loader{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;overflow:hidden;background:#f7f6f2;color:#171416;opacity:1;visibility:visible;transition:opacity .65s cubic-bezier(.22,1,.36,1),visibility 0s linear .65s}',
      '#orx-page-loader:before{content:"";position:absolute;inset:22px;border:1px solid rgba(104,19,38,.12);pointer-events:none}',
      '#orx-page-loader:after{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:linear-gradient(90deg,#681326,#c62c3d,#d8b36b);transform-origin:left;animation:orxLoaderTopline 2.1s cubic-bezier(.2,.7,.2,1) both}',
      '#orx-page-loader.is-hidden{opacity:0;visibility:hidden;pointer-events:none}',
      '#orx-page-loader .loader-inner{position:relative;z-index:1;width:min(84vw,390px);display:flex;flex-direction:column;align-items:center;text-align:center}',
      '#orx-page-loader .loader-seal-wrap{position:relative;width:clamp(118px,17vw,176px);aspect-ratio:1;display:grid;place-items:center;margin-bottom:27px}',
      '#orx-page-loader .loader-seal-wrap:before{content:"";position:absolute;inset:-12px;border:1px solid rgba(104,19,38,.18);border-radius:50%;animation:orxLoaderPulse 2.4s ease-in-out infinite}',
      '#orx-page-loader .loader-seal-wrap:after{content:"";position:absolute;inset:-19px;border:1px solid transparent;border-top-color:#681326;border-right-color:rgba(104,19,38,.22);border-radius:50%;animation:orxLoaderSpin 3.8s linear infinite}',
      '#orx-page-loader img{width:100%;height:100%;object-fit:contain;display:block;animation:orxLoaderBreath 2.4s ease-in-out infinite}',
      '#orx-page-loader .loader-eyebrow{font:700 9px/1.4 Arial,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:#8b2639;margin-bottom:12px}',
      "#orx-page-loader .loader-wordmark{font-family:Georgia,'Times New Roman',serif;font-size:clamp(23px,3.5vw,31px);font-weight:600;line-height:1.1;letter-spacing:.025em;color:#171416}",
      '#orx-page-loader .loader-subline{margin-top:10px;font:500 9px/1.6 Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:#65605e}',
      '#orx-page-loader .loader-status{margin-top:32px;min-height:14px;color:#6d6664;font:600 8px/1.5 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase}',
      '#orx-page-loader .loader-bar{width:min(210px,56vw);height:2px;margin-top:12px;background:#e2dcd7;overflow:hidden}',
      '#orx-page-loader .loader-bar i{display:block;width:38%;height:100%;background:#681326;animation:orxLoaderBar 1.35s cubic-bezier(.4,0,.2,1) infinite}',
      '#orx-page-loader .loader-foot{position:absolute;bottom:calc(22px + 16px);left:0;right:0;text-align:center;font:600 7px/1.4 Arial,sans-serif;letter-spacing:.22em;color:#8a8380;text-transform:uppercase}',
      '@keyframes orxLoaderSpin{to{transform:rotate(360deg)}}',
      '@keyframes orxLoaderPulse{0%,100%{transform:scale(.985);opacity:.45}50%{transform:scale(1.025);opacity:.95}}',
      '@keyframes orxLoaderBreath{0%,100%{transform:scale(.99)}50%{transform:scale(1)}}',
      '@keyframes orxLoaderBar{0%{transform:translateX(-140%)}100%{transform:translateX(360%)}}',
      '@keyframes orxLoaderTopline{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}',
      '@media(max-width:520px){#orx-page-loader:before{inset:12px}#orx-page-loader .loader-inner{width:84vw}#orx-page-loader .loader-seal-wrap{width:126px}#orx-page-loader .loader-foot{bottom:26px;font-size:6px}}',
      '@media(prefers-reduced-motion:reduce){#orx-page-loader:after,#orx-page-loader .loader-seal-wrap:before,#orx-page-loader .loader-seal-wrap:after,#orx-page-loader img,#orx-page-loader .loader-bar i{animation:none}#orx-page-loader,#orx-page-loader.is-hidden{transition:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  const loader=document.createElement('div');
  loader.id='orx-page-loader';
  loader.setAttribute('role','status');
  loader.setAttribute('aria-live','polite');
  loader.setAttribute('aria-label','Loading ORIGENNT');
  loader.innerHTML=
    '<div class="loader-inner">'+
      '<div class="loader-seal-wrap"><img src="'+sealSrc+'" alt="ORIGENNT Private Limited company seal"></div>'+
      '<div class="loader-eyebrow">Management Consulting · Business Enablement</div>'+
      '<div class="loader-wordmark">ORIGENNT</div>'+
      '<div class="loader-subline">Structure. Strategy. Execution.</div>'+
      '<div class="loader-status" id="orx-loader-status">Preparing your experience</div>'+
      '<div class="loader-bar" aria-hidden="true"><i></i></div>'+
    '</div>'+
    '<div class="loader-foot">ORIGENNT PRIVATE LIMITED · BHUBANESWAR, INDIA</div>';
  (document.body||document.documentElement).insertBefore(loader,(document.body||document.documentElement).firstChild);

  const started=performance.now();
  const status=loader.querySelector('#orx-loader-status');
  const messages=['Preparing your experience','Connecting the business system','Bringing strategy into focus'];
  let closed=false,messageIndex=0;
  const messageTimer=setInterval(()=>{if(status&&!closed){messageIndex=(messageIndex+1)%messages.length;status.textContent=messages[messageIndex];}},850);
  function closeLoader(){
    if(closed)return;
    const elapsed=performance.now()-started;
    if(elapsed<700){setTimeout(closeLoader,700-elapsed);return;}
    closed=true;clearInterval(messageTimer);
    if(status)status.textContent='Ready';
    loader.classList.add('is-hidden');
    document.documentElement.classList.add('orx-loader-ready');
    setTimeout(()=>loader.remove(),700);
  }
  // Pages with their own inline loader script (founders_circle, partner program) close it themselves.
  document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('orx-page-loader-script')){closed=true;clearInterval(messageTimer);}},{once:true});
  if(document.readyState==='complete')closeLoader();
  else window.addEventListener('load',closeLoader,{once:true});
  // Fail-safe: never trap visitors behind the loader if a remote asset stalls.
  setTimeout(closeLoader,2600);
})();
