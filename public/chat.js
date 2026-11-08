/* Chat: Vortex chat (vtx.chat), opened through the proxy inside its own app. Your sign-in is kept in this browser (the proxy saves the
   site's cookies and storage, and Nex.Velo asks the browser not to clear them), so you don't have to sign in again each time. */
(() => {
  "use strict";
  const NV = window.NV, page = document.getElementById("page-chat");
  if (!NV || !page) return;
  const { esc } = NV;
  const $ = (s) => page.querySelector(s);
  const SITE = "https://vtx.chat/";

  const style = document.createElement("style");
  style.textContent = `
.ch{display:flex;flex-direction:column;height:100%}
.ch-bar{flex:none;display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;font-size:.8125rem}
.ch-bar b{font-weight:500}.ch-bar .note{color:var(--dim);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ch-bar .sp{flex:1}
.ch-bar .btn{height:2rem;padding:0 .75rem;flex:none}
.ch-frame{position:relative;flex:1;min-height:0;background:#fff}
.ch-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.ch-load{position:absolute;inset:0;z-index:2;display:grid;place-content:center;gap:.25rem;padding:1.5rem;text-align:center;color:var(--dim);background:var(--panel);font-size:.875rem}
`;
  document.head.appendChild(style);

  page.innerHTML = `<div class="ch"><div class="ch-bar"><b>Chat</b><span class="note">Vortex chat · your sign-in is saved on this device</span><span class="sp"></span><button class="btn" id="ch-reload" type="button">reload</button><button class="btn" id="ch-tab" type="button">open in its own tab</button></div><div class="ch-frame" id="ch-frame"></div></div>`;

  let frame = null, token = 0, timer = 0;
  async function start() {
    const my = ++token, host = $("#ch-frame"); frame = null;
    host.innerHTML = '<div class="ch-load" id="ch-load"><span>connecting to Vortex chat through the proxy…</span><small>the first load can take a little while</small></div>';
    let f;
    try { f = await NV.proxyFrame(SITE); }
    catch (e) { if (my === token) host.innerHTML = `<div class="ch-load"><span>couldn't start the proxy</span><small>${esc(e && e.message || e)}</small></div>`; return; }
    if (my !== token) return;
    f.allow = "fullscreen; autoplay; microphone; camera; display-capture; clipboard-read; clipboard-write; notifications";
    frame = f; host.appendChild(f);
    f.addEventListener("load", () => { const l = $("#ch-load"); if (l) l.remove(); clearTimeout(timer); });
    clearTimeout(timer);
    timer = setTimeout(() => { const l = $("#ch-load"); if (l && my === token) l.innerHTML = "<span>still loading…</span><small>if this stays blank, press reload or “open in its own tab”.</small>"; }, 20000);
  }
  // opening the tab again keeps the chat that is already there (and signed in)
  NV.onChatOpen = () => { if (!frame || !frame.isConnected) start(); };
  $("#ch-reload").addEventListener("click", start);
  $("#ch-tab").addEventListener("click", () => NV.openUrl(SITE));

  NV.loaded.chat = true;
  if (page.parentNode && page.parentNode.id !== "pages") NV.onChatOpen(); // this tab was restored before the file finished loading
})();
