/* CincoQuadras — site.js. Sem bibliotecas. O conteúdo já está todo no HTML; aqui só entram interações e movimento. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#5DAE76" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- regra do site: toda página abre no início (exceto quando o endereço traz uma âncora) ---------- */
  var toTop = function () { if (!location.hash) { try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); } } };
  toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', function (e) { if (e.persisted) toTop(); });

  /* ---------- cabeçalho: sombra depois de rolar ---------- */
  var hdr = $('.hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 4); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- menu do celular ---------- */
  var menu = $('#menu'), openBtn = $('.hdr__btn'), closeBtn = $('.menu__close');
  if (menu && openBtn) {
    var lastFocus = null;
    var focusables = function () { return $$('a[href],button:not([disabled])', menu).filter(function (e) { return e.offsetParent !== null || e === closeBtn; }); };
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      d.body.style.overflow = open ? 'hidden' : '';
      if (open) { lastFocus = d.activeElement; if (closeBtn) closeBtn.focus(); }
      else if (lastFocus) { lastFocus.focus(); }
    };
    openBtn.addEventListener('click', function () { setMenu(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (menu.classList.contains('open')) { d.body.style.overflow = ''; menu.classList.remove('open'); openBtn.setAttribute('aria-expanded', 'false'); } }); });
    d.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width:1020px)').addEventListener('change', function (m) { if (m.matches && menu.classList.contains('open')) setMenu(false); });
  }

  /* ---------- entrada ao rolar ---------- */
  var revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    $$('[data-stagger]').forEach(function (g) {
      $$('[data-reveal]', g).forEach(function (el, i) { el.style.setProperty('--d', (i * 80) + 'ms'); });
    });
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.2 });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }
  /* linha do tempo e caminho: a rua se desenha quando a seção entra */
  $$('.tl, .path').forEach(function (t) {
    if (reduce || !('IntersectionObserver' in window)) { t.classList.add('in'); return; }
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { t.classList.add('in'); o.disconnect(); } }); }, { threshold: 0.25 });
    o.observe(t);
  });

  /* ---------- barra de âncoras: destaca a frente atual ---------- */
  var anchors = $$('.anchors a');
  if (anchors.length) {
    var bar = $('.anchors');
    var secs = anchors.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); });
    var curIdx = -2, lock = false, lockTimer = null, lockSec = null, ticking = false;
    var setIdx = function (i) {
      if (i === curIdx) return;
      curIdx = i;
      anchors.forEach(function (a, k) {
        if (k === i) {
          a.setAttribute('aria-current', 'true');
          var ul = a.closest('ul');
          if (ul && ul.scrollWidth > ul.clientWidth) { ul.scrollTo({ left: a.parentNode.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); }
        } else { a.removeAttribute('aria-current'); }
      });
    };
    /* frente atual = a última cujo topo já passou da barra fixa (o mesmo ponto onde o clique a posiciona);
       nenhuma antes da primeira nem depois da última */
    var update = function () {
      ticking = false;
      if (lock) return;
      var line = (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight + 24, idx = -1;
      for (var k = 0; k < secs.length; k++) {
        if (secs[k] && secs[k].getBoundingClientRect().top <= line) idx = k;
      }
      if (idx > -1 && secs[idx].getBoundingClientRect().bottom <= line) idx = -1;
      setIdx(idx);
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var unlock = function () { lock = false; clearTimeout(lockTimer); request(); };
    anchors.forEach(function (a, k) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        lock = true; lockSec = secs[k]; setIdx(k);
        clearTimeout(lockTimer); lockTimer = setTimeout(unlock, 1500);
      });
    });
    /* só encerra o travamento quando a seção clicada chegou ao lugar; um fim de rolagem intermediário não conta */
    window.addEventListener('scrollend', function () {
      if (!lock) return;
      var sp = parseFloat(getComputedStyle(d.documentElement).scrollPaddingTop) || 0;
      if (!lockSec || Math.abs(lockSec.getBoundingClientRect().top - sp) < 6) unlock();
    });
    window.addEventListener('scroll', function () { if (lock) { clearTimeout(lockTimer); lockTimer = setTimeout(unlock, 350); } else { request(); } }, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('load', request);
    update();
  }

  /* ---------- mapa da abertura ---------- */
  $$('.map').forEach(function (m) {
    var go = function () { m.classList.add('in'); };
    if (reduce) { go(); } else {
      var start = function () { requestAnimationFrame(function () { requestAnimationFrame(go); }); };
      if (d.fonts && d.fonts.ready) { Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, 600); })]).then(start); } else { start(); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { m.classList.toggle('live', e.isIntersecting); }); }).observe(m);
    }
  });

  /* ---------- peças animadas (sem clique): cartão "Para você liberar" e folha de prestação de contas ---------- */
  function cycle(el, steps) {
    var timers = [], running = false;
    var stop = function () { running = false; timers.forEach(clearTimeout); timers = []; };
    var run = function (i) {
      if (!running) return;
      steps[i][0]();
      timers.push(setTimeout(function () { run((i + 1) % steps.length); }, steps[i][1]));
    };
    var start = function () { if (!running) { running = true; run(0); } };
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }, { threshold: 0.45 }).observe(el);
  }

  var lib = $('#liberar');
  if (lib) {
    var pays = $$('.pay', lib), count = $('#liberar-count', lib);
    var paint = function () {
      var left = pays.filter(function (p) { return !p.classList.contains('done'); }).length;
      count.textContent = left === 0 ? 'Tudo liberado' : (left + (left === 1 ? ' pagamento' : ' pagamentos'));
    };
    if (reduce) {
      pays.forEach(function (p) { p.classList.add('done'); }); paint();
    } else {
      var st = [[function () { pays.forEach(function (p) { p.classList.remove('done', 'press'); }); paint(); }, 1300]];
      pays.forEach(function (p) {
        st.push([function () { p.classList.add('press'); }, 300]);
        st.push([function () { p.classList.remove('press'); p.classList.add('done'); paint(); }, 1100]);
      });
      st[st.length - 1][1] = 3000;
      cycle(lib, st);
    }
  }

  var sheet = $('#sheet');
  if (sheet && !reduce) {
    var rows = $$('.rw', sheet);
    var open = function (k) { rows.forEach(function (r, i) { r.classList.toggle('open', i === k); }); };
    cycle(sheet, rows.map(function (r, i) { return [function () { open(i); }, i === rows.length - 1 ? 2600 : 2300]; }));
  }

  /* ---------- vídeo do manifesto ---------- */
  $$('.vid').forEach(function (box) {
    var v = $('video', box), b = $('.vplay', box);
    if (!v || !b) return;
    var src = v.getAttribute('data-src');
    b.addEventListener('click', function () {
      if (src && !v.getAttribute('src')) { v.setAttribute('src', src); }
      v.controls = true; box.classList.add('on');
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () { /* o visitante usa os controles */ });
      v.focus();
    });
    v.addEventListener('ended', function () {
      v.controls = false; box.classList.remove('on'); v.removeAttribute('src'); v.load();
      b.focus();
    });
  });

  /* ---------- diagnóstico rápido ---------- */
  var FR = ['Financeiro', 'Prestação de contas', 'Cobrança', 'Portaria', 'Atendimento', 'Assembleias', 'Manutenção e compras'];
  var opts = $$('.opt'), pcard = $('#pcard');
  var chosen = [];
  var marked = $('#marked'), markedList = $('#marked-list'), hidden = $('#f-pesa');
  function plural(n) { return n === 1 ? '1 frente indicada' : (n + ' frentes indicadas'); }
  function diag() {
    chosen = opts.filter(function (o) { return o.getAttribute('aria-pressed') === 'true'; });
    var on = {};
    chosen.forEach(function (o) { o.getAttribute('data-f').split(',').forEach(function (i) { on[i] = true; }); });
    $$('#pcard li').forEach(function (li, i) { li.classList.toggle('on', !!on[i]); });
    var n = Object.keys(on).length;
    var c = $('#pcard-count'); if (c) c.textContent = n ? plural(n) : 'Marque ao lado o que mais pesa hoje.';
    var labels = chosen.map(function (o) { return $('.t', o).textContent; });
    if (hidden) hidden.value = labels.join(' | ');
    if (marked && markedList) {
      marked.hidden = !labels.length;
      markedList.innerHTML = '';
      labels.forEach(function (t) { var li = d.createElement('li'); li.textContent = t; markedList.appendChild(li); });
    }
  }
  opts.forEach(function (o) {
    o.addEventListener('click', function () { o.setAttribute('aria-pressed', o.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); diag(); });
  });
  if (opts.length) diag();

  /* ---------- formulário em passos ---------- */
  var form = $('#form-analise');
  if (form) {
    var box = form.parentNode, sum = $('#errsum', box), demo = $('#demo', box);
    var steps = $$('.fstep', form), last = steps.length - 1, cur = 0, sending = false;
    var progT = $('#fprog-t'), bars = $$('.fprog__bar li', form);
    var bNext = $('#fnext'), bBack = $('#fback'), bSend = $('#fsend');
    var val = function (n) { var e = form.elements[n]; return e && e.value != null ? String(e.value) : ''; };
    var byId = function (id) { return d.getElementById(id); };
    var via = function () { return val('via'); };
    var isMail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); };
    var isPhone = function (v) { var dg = v.replace(/\D/g, ''); return /^[\d\s()+\-.]+$/.test(v.trim()) && dg.length >= 10 && dg.length <= 13; };
    /* cada campo: passo, nome(s) no formulário, regra, mensagem e onde o foco vai */
    var fields = [
      { k: 'tipoed', step: 0, names: ['tipo_edificio'], node: 'w-tipoed', focus: 'f-tipoed-res', ok: function () { return val('tipo_edificio') !== ''; }, msg: 'Escolha se o edifício é residencial, comercial ou misto.' },
      { k: 'condo', step: 0, names: ['condo'], node: 'f-condo', focus: 'f-condo', ok: function () { return val('condo').trim().length > 2; }, msg: 'Informe o nome do condomínio.' },
      { k: 'unidades', step: 0, names: ['unidades'], node: 'f-unid', focus: 'f-unid', ok: function () { var v = val('unidades').replace(/[\s.]/g, ''); return /^\d{1,5}$/.test(v) && +v > 0; }, msg: 'Informe o número de unidades, só com números.' },
      { k: 'nome', step: 1, names: ['nome'], node: 'f-nome', focus: 'f-nome', ok: function () { return val('nome').trim().length > 1; }, msg: 'Informe o seu nome.' },
      { k: 'tipo', step: 1, names: ['tipo'], node: 'f-tipo', focus: 'f-tipo', ok: function () { return val('tipo') !== ''; }, msg: 'Escolha como você se relaciona com o condomínio.' },
      { k: 'via', step: 2, names: ['via'], node: 'w-via', focus: 'f-via-whats', ok: function () { return via() !== ''; }, msg: 'Escolha como prefere ser chamado.' },
      { k: 'whatsapp', step: 2, names: ['whatsapp'], node: 'f-whats', focus: 'f-whats', only: function () { return via() === 'WhatsApp'; }, ok: function () { return isPhone(val('whatsapp')); }, msg: 'Informe um WhatsApp com DDD. Ex.: (11) 91234-5678' },
      { k: 'email', step: 2, names: ['email'], node: 'f-email', focus: 'f-email', only: function () { return via() === 'E-mail'; }, ok: function () { return isMail(val('email')); }, msg: 'Informe um e-mail válido. Ex.: nome@empresa.com.br' },
      { k: 'consent', step: 2, names: ['consent'], node: 'f-consent', focus: 'f-consent', ok: function () { return !!form.elements.consent.checked; }, msg: 'Para continuar, é preciso concordar com o contato.' }
    ];
    var active = function (f) { return !f.only || f.only(); };
    var fldOf = function (f) { return byId(f.node).closest('.fld'); };
    var setErr = function (f, bad) {
      var fl = fldOf(f), n = byId(f.node);
      fl.classList.toggle('err', bad);
      if (bad) n.setAttribute('aria-invalid', 'true'); else n.removeAttribute('aria-invalid');
    };
    var clearSum = function () { sum.classList.remove('on'); sum.innerHTML = ''; };
    var showErrors = function (bad) {
      bad.forEach(function (f) { setErr(f, true); });
      sum.innerHTML = '<b>Revise os campos abaixo:</b><ul>' + bad.map(function (f) { return '<li><a href="#' + f.focus + '" data-f="' + f.focus + '">' + f.msg + '</a></li>'; }).join('') + '</ul>';
      sum.classList.add('on'); sum.focus();
      $$('a', sum).forEach(function (a) { a.addEventListener('click', function (ev) { ev.preventDefault(); var t = byId(a.getAttribute('data-f')); if (t) t.focus(); }); });
    };
    var badIn = function (n) { return fields.filter(function (f) { return f.step === n && active(f) && !f.ok(); }); };

    /* limpa o erro assim que o campo fica certo. Não avisa ao sair do campo: a mensagem empurraria o botão e o clique se perderia */
    fields.forEach(function (f) {
      $$('[name="' + f.names[0] + '"]', form).forEach(function (el) {
        var recheck = function () { if (fldOf(f).classList.contains('err') && f.ok()) setErr(f, false); };
        el.addEventListener('input', recheck); el.addEventListener('change', recheck);
      });
    });

    /* só o canal escolhido (WhatsApp ou e-mail) aparece */
    var syncVia = function () {
      $$('[data-via]', form).forEach(function (el) { el.hidden = el.getAttribute('data-via') !== via(); });
      fields.forEach(function (f) { if ((f.k === 'whatsapp' || f.k === 'email') && !active(f)) setErr(f, false); });
    };
    $$('[name="via"]', form).forEach(function (r) { r.addEventListener('change', syncVia); });
    syncVia();

    var show = function (n, move) {
      cur = n;
      steps.forEach(function (st, i) { st.hidden = i !== n; });
      if (progT) progT.textContent = 'Passo ' + (n + 1) + ' de ' + steps.length + ': ' + steps[n].getAttribute('data-title');
      bars.forEach(function (b, i) { b.classList.toggle('on', i <= n); });
      if (bBack) bBack.hidden = n === 0;
      if (bNext) bNext.hidden = n === last;
      if (bSend) bSend.hidden = n !== last;
      clearSum();
      if (move) {
        var t = $('.fstep__t', steps[n]); if (t) t.focus({ preventScroll: true });
        var r = box.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight * 0.45) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    };
    var goNext = function () {
      var bad = badIn(cur);
      if (bad.length) { showErrors(bad); return; }
      show(cur + 1, true);
    };
    if (bNext) bNext.addEventListener('click', goNext);
    if (bBack) bBack.addEventListener('click', function () { if (cur > 0) show(cur - 1, true); });
    show(0, false);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.empresa_site && form.elements.empresa_site.value) return; /* campo-isca */
      if (cur < last) { goNext(); return; }
      var bad = fields.filter(function (f) { return active(f) && !f.ok(); });
      if (bad.length) {
        var n = bad[0].step; if (n !== cur) show(n, true);
        showErrors(bad.filter(function (f) { return f.step === n; }));
        return;
      }
      clearSum();
      if (sending) return;
      sending = true;
      var label = bSend.innerHTML;
      bSend.disabled = true; bSend.textContent = 'Enviando…';
      var fail = function (msg) {
        sending = false; bSend.disabled = false; bSend.innerHTML = label;
        var wa = form.getAttribute('data-wa-url'), wl = form.getAttribute('data-wa-label');
        sum.innerHTML = '<b>' + (msg || 'Não foi possível enviar agora.') + '</b>' +
          (wa ? '<ul><li>Tente de novo em instantes ou chame no WhatsApp: <a href="' + wa + '" target="_blank" rel="noopener">' + wl + '</a></li></ul>' : '');
        sum.classList.add('on'); sum.focus();
      };
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          clearTimeout(timer);
          if (res.ok && res.j && res.j.ok) {
            box.classList.add('sent'); demo.classList.add('on'); demo.setAttribute('tabindex', '-1'); demo.focus();
            sending = false;
          } else {
            fail(res.j && res.j.erro);
          }
        })
        .catch(function () { clearTimeout(timer); fail(); });
    });
  }
})();
