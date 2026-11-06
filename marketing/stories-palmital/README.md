# Stories Palmital (Remotion)

Vídeo vertical 1080×1920, 30 fps, 54 s, para Stories/Reels: oferta de R$ 397 por R$ 197.
Usa as telas de `design/png`, a Capi, os ícones e as fontes do app (copiados para `public/`).

```bash
npm install
pip install edge-tts numpy
npm run audio    # narração (edge-tts, pt-BR-FranciscaNeural) + trilha e efeitos sintetizados
npm run studio   # edita e pré-visualiza no navegador
npm run render   # gera out/stories-palmital-197-final.mp4 (áudio masterizado)
```

- Falas: `scripts/narracao.py`. Cada fala é um clipe; a duração das cenas e o momento das animações saem dela (`src/linhaDoTempo.ts`).
- Trilha: `scripts/trilha.py` (pop/house 122 BPM, autoral, sem samples). O volume abaixa sozinho sob a voz.
- Textos e cenas: `src/cenas.tsx`. Transições: `src/Raiz.tsx`. Cores: `src/tema.ts`.
- O topo (250 px) e a base (340 px) ficam livres para a interface do Instagram.
