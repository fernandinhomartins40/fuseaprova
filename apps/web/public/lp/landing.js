(() => {
  const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const topo = document.getElementById('topo');
  const aoRolar = () => topo.classList.toggle('rolou', scrollY > 10);
  addEventListener('scroll', aoRolar, { passive: true }); aoRolar();

  // entrada ao rolar (blocos do bento também ganham .visivel para as micro-animações)
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { threshold: .18 });
  document.querySelectorAll('.surge, .bloco').forEach((el) => io.observe(el));

  // palavra que gira no título
  const palavras = [...document.querySelectorAll('#giro > span')];
  let i = 0;
  if (!semMovimento) setInterval(() => {
    const atual = palavras[i]; i = (i + 1) % palavras.length; const prox = palavras[i];
    atual.classList.remove('ativo'); atual.classList.add('saiu');
    prox.classList.remove('saiu'); prox.classList.add('ativo');
    setTimeout(() => atual.classList.remove('saiu'), 700);
  }, 2600);

  // celular 3D acompanha o ponteiro
  const cena = document.getElementById('cena'), cel = document.getElementById('cel');
  if (!semMovimento && matchMedia('(pointer: fine)').matches) {
    cena.addEventListener('pointermove', (ev) => {
      const r = cena.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
      cel.style.transform = `rotateY(${-14 + x * 18}deg) rotateX(${6 - y * 12}deg) rotateZ(2deg)`;
    });
    cena.addEventListener('pointerleave', () => { cel.style.transform = ''; });
  }

  // contadores (o HTML já traz o valor final, para quem não roda JS)
  const fmt = new Intl.NumberFormat('pt-BR');
  const contar = (el) => {
    const alvo = +el.dataset.conta, t0 = performance.now(), dur = 1400;
    const passo = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt.format(Math.round(alvo * (1 - (1 - p) ** 3))); if (p < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  };
  if (!semMovimento) {
    const ioN = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.querySelectorAll('[data-conta]').forEach(contar); ioN.unobserve(e.target); } }), { threshold: .4 });
    document.querySelectorAll('.numeros .grade').forEach((el) => ioN.observe(el));
  }

  // quiz
  const alts = [...document.querySelectorAll('#alts .alt')];
  const fb = document.getElementById('feedback'), caixa = document.getElementById('caixa'), titulo = document.getElementById('fb-titulo');
  alts.forEach((b) => b.addEventListener('click', () => {
    const ok = b.dataset.ok === '1';
    alts.forEach((a) => { a.disabled = true; if (a.dataset.ok === '1') a.classList.add('certa'); else if (a !== b) a.classList.add('apagada'); });
    if (!ok) b.classList.add('errada');
    titulo.textContent = ok ? 'Mandou bem! Letra B.' : 'Quase! A certa é a B.';
    caixa.classList.toggle('ruim', !ok);
    fb.classList.add('aberto');
    if (ok) { const xp = document.getElementById('xp'); xp.classList.remove('vai'); void xp.offsetWidth; xp.classList.add('vai'); confete(b); }
  }));

  function confete(origem) {
    if (semMovimento) return;
    const r = origem.getBoundingClientRect(), cores = ['#FF6A16', '#FFC233', '#16B47A', '#2F7BFF', '#7C4DFF', '#EC4899'];
    for (let k = 0; k < 60; k++) {
      const p = document.createElement('i');
      p.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:10px;height:6px;border-radius:2px;background:${cores[k % 6]};pointer-events:none;z-index:99`;
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2, vel = 6 + Math.random() * 10;
      p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * vel * 30}px, ${Math.sin(ang) * vel * 30 + 260}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }], { duration: 1200 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
    }
  }

  // linha do tempo acompanha a rolagem
  const tempo = document.getElementById('tempo'), eixo = document.getElementById('eixo'), marcos = [...tempo.querySelectorAll('.marco')];
  const atualizaTempo = () => {
    const r = tempo.getBoundingClientRect(), h = innerHeight;
    const p = semMovimento ? 1 : Math.max(0, Math.min(1, (h * .75 - r.top) / (r.height * .7)));
    eixo.parentElement.style.setProperty('--p', p);
    marcos.forEach((m) => m.classList.toggle('on', p >= +m.dataset.limite));
    if (p > .3) tempo.classList.add('visto');
  };
  addEventListener('scroll', atualizaTempo, { passive: true }); atualizaTempo();

  // como funciona: troca a tela do celular fixo
  const passos = [...document.querySelectorAll('.passo')], tela = document.getElementById('tela-cel'), fundo = document.getElementById('fundo-cel');
  const ioP = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    passos.forEach((p) => p.classList.toggle('ativo', p === e.target));
    fundo.style.setProperty('--cor-ativa', getComputedStyle(e.target).getPropertyValue('--cor').trim());
    const nova = e.target.dataset.tela;
    if (!tela.src.endsWith(nova)) { tela.classList.add('troca'); setTimeout(() => { tela.src = nova; tela.classList.remove('troca'); }, 200); }
  }), { rootMargin: '-45% 0px -45% 0px' });
  passos.forEach((p) => ioP.observe(p));
  passos[0].classList.add('ativo');

  // preços vigentes (D23: o superadmin muda pelo painel); sem resposta, fica o texto do HTML
  const reais = (c) => (c % 100 ? (c / 100).toFixed(2).replace('.', ',') : String(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  fetch('/api/config/publica', { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((c) => {
      if (!c || typeof c.precoCentavos !== 'number') return;
      document.querySelectorAll('.js-preco').forEach((el) => { el.textContent = reais(c.precoCentavos); });
      document.querySelectorAll('.js-preco-de').forEach((el) => {
        if (c.precoDeCentavos && c.precoDeCentavos > c.precoCentavos) el.textContent = 'R$ ' + reais(c.precoDeCentavos);
        else el.remove();
      });
    })
    .catch(() => {});
})();
