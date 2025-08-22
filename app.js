(function(){
  function $id(id){ return document.getElementById(id); }
  function nowTime(){ const d = new Date(); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function addMessage(text, who){
    const box = $id('messages');
    const div = document.createElement('div');
    div.className = 'msg ' + (who || 'bot');
    div.innerHTML = String(text || '').replace(/\n/g,'<br>') + '<span class="time">'+ nowTime() +'</span>';
    box.appendChild(div); box.scrollTop = box.scrollHeight; return div;
  }
  function setStatus(t){ $id('status').textContent = t || ''; }

  async function callWebhook(userText){
    const cfg = window.CHAT_CONFIG || {};
    const url = cfg.N8N_WEBHOOK_URL;
    if (!url) throw new Error('لم يتم ضبط N8N_WEBHOOK_URL في الصفحة.');
    const token = cfg.AUTH_TOKEN || '';
    const timeout = Number(cfg.TIMEOUT_MS || 15000);
    const retries = Number(cfg.MAX_RETRIES || 0);

    for (let attempt=0; attempt<=retries; attempt++){
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      try{
        const resp = await fetch(url, {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? {'Authorization': 'Bearer ' + token} : {})
          },
          body: JSON.stringify({ query: { message: userText } }) // << هنا التغيير
        });
        clearTimeout(timer);
        if(!resp.ok) throw new Error('HTTP '+resp.status);
        const data = await resp.json();
        return data.reply || JSON.stringify(data);
      }catch(err){
        clearTimeout(timer);
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 400*(attempt+1)));
      }
    }
  }

  function wire(){
    const form = $id('chat-form'), input = $id('chat-text'), btn = $id('sendBtn');
    async function send(){
      const text = (input.value||'').trim(); if(!text) return;
      addMessage(text, 'me'); input.value=''; input.focus();
      let loader; if ((window.CHAT_CONFIG||{}).SHOW_TYPING) loader = addMessage('...', 'bot loading');
      setStatus('جاري الاتصال…');
      try{ const reply = await callWebhook(text); if (loader) loader.remove(); addMessage(reply,'bot'); setStatus(''); }
      catch(e){ if(loader) loader.remove(); addMessage('❌ تعذّر الاتصال. تأكد من رابط الويب هوك والصلاحيات.','bot'); setStatus(String(e.message||e)); console.error(e); }
    }
    btn.addEventListener('click', send);
    form.addEventListener('submit', function(e){ e.preventDefault(); send(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
