/**
 * Ícones de traço (2,2–3 px, pontas arredondadas) para ações simples: voltar, fechar,
 * setas, copiar etc. Os ícones ilustrados 3D vêm de <Imagem>.
 */
const CAMINHOS = {
  voltar: <path d="M15 5l-7 7 7 7" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  chevronBaixo: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M7 7l10 10M17 7L7 17" />,
  olho: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  olhoFechado: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.7 9.7 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-3.1 3.9M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
    </>
  ),
  copiar: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </>
  ),
  livro: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5A2.5 2.5 0 014 20.5z" />
    </>
  ),
  engrenagem: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  bandeira: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </>
  ),
  sair: <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
  baixar: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  lixeira: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  link: (
    <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 10-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 105.7 5.7l1-1" />
  ),
  marcador: <path d="M6 3h12v18l-6-4-6 4z" />,
  wifiOff: (
    <path d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.4-2.8M12 20h.01M16.7 10.6A10 10 0 0119 12.9M2 9.3A15 15 0 018 6.2M12 5a15 15 0 0110 4.3" />
  ),
} as const;

export type NomeIconeTraco = keyof typeof CAMINHOS;

export function IconeTraco({
  nome,
  tamanho = 24,
  espessura = 2.4,
  className,
  rotulo,
}: {
  nome: NomeIconeTraco;
  tamanho?: number;
  espessura?: number;
  className?: string;
  /** Rótulo acessível; sem ele o ícone é decorativo. */
  rotulo?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
    >
      {CAMINHOS[nome]}
    </svg>
  );
}

/** Ícones preenchidos dos contadores (ofensiva, gemas, vidas) e dos nós da trilha. */
export function IconeCheio({
  nome,
  tamanho = 24,
  className,
}: {
  nome:
    | 'chama'
    | 'gema'
    | 'coracao'
    | 'coracaoPartido'
    | 'estrela'
    | 'cadeado'
    | 'bau'
    | 'trofeu'
    | 'play'
    | 'coroa'
    | 'escudo';
  tamanho?: number;
  className?: string;
}) {
  const conteudo = {
    chama: (
      <path
        fill="#FF6A16"
        d="M12 2c1 3.2 4.8 5.3 4.8 10.3A4.8 4.8 0 0112 17a4.8 4.8 0 01-4.8-4.7c0-1.7.7-3 1.6-4 .2 1.6 1 2.6 2 2.9C10.4 8 11.2 4.8 12 2zm0 20a7 7 0 01-7-7c0-2.3 1-4.3 2.4-5.8-.2 3.5 2 5.6 4.6 5.6s4.8-2.1 4.6-5.6A8 8 0 0119 15a7 7 0 01-7 7z"
      />
    ),
    gema: (
      <>
        <path fill="#1D6FE0" d="M7 3h10l5 6-10 12L2 9z" />
        <path fill="#7DB4FF" d="M7 3l3 6H2zM17 3l-3 6h8z" />
        <path fill="#1550A8" d="M10 9h4l-2 12z" opacity=".35" />
      </>
    ),
    coracao: (
      <path
        fill="#E5484D"
        d="M12 21s-8.5-5.2-8.5-11.2A4.8 4.8 0 0112 6.7a4.8 4.8 0 018.5 3.1C20.5 15.8 12 21 12 21z"
      />
    ),
    coracaoPartido: (
      <>
        <path
          fill="#E5484D"
          d="M11 20.3C7.6 17.9 3.5 14.2 3.5 9.8A4.8 4.8 0 0111 6.2l1 2.8-2 3 2.2 2.6z"
        />
        <path
          fill="#E5484D"
          d="M13 20.3c3.4-2.4 7.5-6.1 7.5-10.5A4.8 4.8 0 0013 6.2l-.3 2.6 2 3.1-2.1 2.7z"
        />
      </>
    ),
    estrela: (
      <path
        fill="currentColor"
        d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"
      />
    ),
    cadeado: (
      <>
        <rect x="5" y="10.5" width="14" height="10" rx="2.6" fill="currentColor" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      </>
    ),
    bau: (
      <>
        <path fill="#C9874A" d="M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path fill="#A86A33" d="M5 4h14a2 2 0 012 2v4H3V6a2 2 0 012-2z" />
        <rect x="10" y="8.5" width="4" height="5" rx="1" fill="#FFC233" />
      </>
    ),
    trofeu: (
      <>
        <path fill="currentColor" d="M7 3h10v5a5 5 0 01-10 0zM10 14.5h4V18h-4zM7 19h10v2.5H7z" />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M7 5H4v1.5A3.5 3.5 0 007.5 10M17 5h3v1.5a3.5 3.5 0 01-3.5 3.5"
        />
      </>
    ),
    play: (
      <path
        fill="currentColor"
        d="M8 5.2v13.6a1 1 0 001.5.9l10.6-6.8a1 1 0 000-1.8L9.5 4.3A1 1 0 008 5.2z"
      />
    ),
    coroa: <path fill="currentColor" d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5z" />,
    escudo: <path fill="currentColor" d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" />,
  }[nome];
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {conteudo}
    </svg>
  );
}
