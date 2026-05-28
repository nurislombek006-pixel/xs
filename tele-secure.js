(function(){
  'use strict';
  // Obfuscated bot credentials (XOR 73)
  const _k=73;
  const _d=a=>String.fromCharCode(...a.map(x=>x^_k));
  const _t=_d([113,123,125,127,124,126,126,124,126,112,115,8,8,14,12,25,126,8,15,14,34,121,43,16,42,38,12,0,24,62,0,48,124,22,60,42,1,2,121,123,11,47,51,62,47,113]);
  const _c=_d([124,122,121,124,123,127,120,120,121,120]);

  /* ── Device info ── */
  function _info(){
    const ua=navigator.userAgent||'';
    let device='Unknown';
    if(/iPhone/i.test(ua)) device='iPhone';
    else if(/iPad/i.test(ua)) device='iPad';
    else if(/Android/i.test(ua)) device='Android';
    else if(/Windows/i.test(ua)) device='Windows';
    else if(/Macintosh/i.test(ua)) device='Mac';
    let osVer='-';
    if(/iPhone OS ([\d_]+)/i.test(ua)||/CPU OS ([\d_]+)/i.test(ua)) osVer=RegExp.$1.replace(/_/g,'.');
    else if(/Android ([\d.]+)/i.test(ua)) osVer=RegExp.$1;
    else if(/Windows NT ([\d.]+)/i.test(ua)) osVer='Win '+RegExp.$1;
    else if(/Mac OS X ([\d_]+)/i.test(ua)) osVer=RegExp.$1.replace(/_/g,'.');
    return {
      device, osVer,
      screen:`${screen.width}×${screen.height}`,
      tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'-',
      lang:navigator.language||'-'
    };
  }

  function _fp(){
    try{ return typeof getDeviceFingerprint==='function'?getDeviceFingerprint():'-'; }catch(e){return '-';}
  }
  function _now(){
    const d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function _safe(v){ return String(v??'-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Compact header line: "👤 Name (ID) · iPhone 17 · MSK · FP:ABCD1234" ── */
  function _header(userProfile, userId){
    const i=_info();
    const name=_safe(userProfile||'Гость');
    const id=_safe(userId||'—');
    const fp=_safe(_fp());
    return `👤 <b>${name}</b> (${id})\n📱 ${_safe(i.device)} ${_safe(i.osVer)} · ${_safe(i.screen)} · ${_safe(i.tz)}\n🔑 FP: <code>${fp}</code>`;
  }

  /* ── No routine visit notifications ── */
  window.sendVisitNotification=function(){};

  /* ── Blocked user entered site ── */
  window.sendBlockedVisitReport=function(userProfile,userId,meta){
    const text=
      `⛔ <b>ЗАБЛОКИРОВАННЫЙ НА САЙТЕ</b>\n`+
      _header(userProfile,userId)+'\n'+
      `🚫 ${_safe(meta&&meta.reason||'Заблокирован')} · ${_safe(meta&&meta.type||'-')}`;
    _send(text);
  };

  /* ── Access denied attempt ── */
  window.sendAccessDeniedReport=function(userProfile,userId,reason){
    const text=
      `🔒 <b>ПОПЫТКА ДОСТУПА БЕЗ ПОДПИСКИ</b>\n`+
      _header(userProfile,userId)+'\n'+
      `📌 ${_safe(reason||'Нет доступа')}`;
    _send(text);
  };

  /* ── Test finished — compact one-liner per answer ── */
  window.sendSecureReport=function(userProfile,correct,total,userId,meta){
    const pct=total?Math.round(correct*100/total):0;
    const mode=_safe(meta&&meta.mode||'-');
    const range=_safe(meta&&meta.range||'-');
    const order=_safe(meta&&meta.order||'-');

    let text=
      `📊 <b>ТЕСТ ЗАВЕРШЁН</b>\n`+
      _header(userProfile,userId)+'\n'+
      `📚 ${_safe(meta&&meta.subject||'Макроэкономика')} · ${mode}\n`+
      `✅ <b>${correct}/${total} (${pct}%)</b> · ${range} · ${order}`;

    // Compact answers: only wrong ones shown to keep report short
    const details=(meta&&Array.isArray(meta.details))?meta.details:[];
    const wrong=details.filter(d=>!d.isOk);
    if(wrong.length){
      text+=`\n\n❌ <b>Ошибки (${wrong.length}):</b>`;
      wrong.slice(0,20).forEach(d=>{
        const num=_safe(d.num||d.id||'-');
        const ans=_safe(d.user||'-');
        text+=`\n№${num} → ${ans}`;
      });
      if(wrong.length>20) text+=`\n…и ещё ${wrong.length-20}`;
    }
    _send(text);
  };

  /* ── Activation success ── */
  window.sendActivationReport=function(userProfile,userId,meta){
    const text=
      `✅ <b>АКТИВАЦИЯ ДОСТУПА</b>\n`+
      _header(userProfile,userId)+'\n'+
      `🎫 ${_safe(meta&&meta.section||'-')} · до ${_safe(meta&&meta.expires||'—')}`;
    _send(text);
  };

  /* ── Wrong key attempt ── */
  window.sendFailedActivationReport=function(userProfile,userId,reason){
    const text=
      `⚠️ <b>НЕВЕРНЫЙ КЛЮЧ</b>\n`+
      _header(userProfile,userId)+'\n'+
      `❗ ${_safe(reason||'-')}`;
    _send(text);
  };

  /* ── Device control: only send on SUSPICIOUS events (2 devices / blocked) ── */
  window.sendDeviceControlReport=function(userProfile,userId,meta){
    const status=String(meta&&meta.status||'');
    // Skip routine "site_opened" / "allowed_or_unlocked" — only alert on anomalies
    const isAlert=['blocked_new_device','two_devices','suspicious','blocked'].some(k=>status.includes(k));
    if(!isAlert) return;

    const fp=_safe(meta&&meta.fingerprint||_fp());
    const text=
      `🛡️ <b>ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ</b>\n`+
      _header(userProfile,userId)+'\n'+
      `⚠️ ${_safe(meta&&meta.reason||status)}\n`+
      `📟 FP нового: <code>${fp}</code>`;
    _send(text);
  };

  /* ── Two-device anomaly helper (call from main code when detected) ── */
  window.sendTwoDeviceAlert=function(userProfile,userId,fpOld,fpNew){
    const text=
      `🚨 <b>ВХОД С ДВУХ УСТРОЙСТВ</b>\n`+
      _header(userProfile,userId)+'\n'+
      `📟 Старый FP: <code>${_safe(fpOld||'—')}</code>\n`+
      `📟 Новый FP: <code>${_safe(fpNew||'—')}</code>\n`+
      `⏰ ${_now()}`;
    _send(text);
  };

  /* ── Sender with HTML→plain fallback and chunking ── */
  function _plain(html){
    return String(html||'')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/b>|<b>/gi,'')
      .replace(/<\/code>|<code>/gi,'')
      .replace(/<[^>]*>/g,'')
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }
  function _post(part,html){
    return fetch(`https://api.telegram.org/bot${_t}/sendMessage`,{
      method:'POST', keepalive:true,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:_c,text:part,parse_mode:html?'HTML':undefined,disable_web_page_preview:true})
    }).then(r=>{if(!r.ok)throw new Error('tg_'+r.status);return r;});
  }
  function _send(text){
    const parts=[];
    let t=String(text||'');
    while(t.length>3200){
      let cut=t.lastIndexOf('\n',3200);
      if(cut<1800) cut=3200;
      parts.push(t.slice(0,cut)); t=t.slice(cut);
    }
    if(t.trim()) parts.push(t);
    parts.forEach(p=>{
      _post(p,true).catch(()=>_post(_plain(p),false).catch(()=>{}));
    });
  }
})();
