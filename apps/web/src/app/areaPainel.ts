/**
 * D24: cada papel tem a sua página de login. Aqui ficam o caminho de cada uma e a lembrança da
 * última área de equipe que entrou neste navegador, para que um 401 em /super/conteudo leve o
 * admin a /admin/entrar e o superadmin a /super/entrar (o /super/conteudo é dos dois).
 */
import { AREA_DO_PAPEL, type AreaConta, type Papel } from '@fuse/shared';

const CHAVE = 'fuse.areaPainel';

export const LOGIN_DA_AREA: Record<AreaConta, string> = {
  aluno: '/entrar',
  conteudo: '/admin/entrar',
  super: '/super/entrar',
};

export function loginDoPapel(papel: Papel): string {
  return LOGIN_DA_AREA[AREA_DO_PAPEL[papel]];
}

/** Guarda a área da equipe que acabou de entrar (preferência local; falhar não tem efeito). */
export function lembrarArea(area: AreaConta): void {
  try {
    if (area === 'aluno') return;
    window.localStorage.setItem(CHAVE, area);
  } catch {
    /* sem armazenamento */
  }
}

export function areaLembrada(): AreaConta | null {
  try {
    const v = window.localStorage.getItem(CHAVE);
    return v === 'conteudo' || v === 'super' ? v : null;
  } catch {
    return null;
  }
}

/** A página de login de quem estava em `pathname` (painel: pela área lembrada). */
export function loginParaCaminho(pathname: string): string {
  if (pathname.startsWith('/super/conteudo') || pathname.startsWith('/admin')) {
    return areaLembrada() === 'super' ? LOGIN_DA_AREA.super : LOGIN_DA_AREA.conteudo;
  }
  if (pathname.startsWith('/super')) return LOGIN_DA_AREA.super;
  return LOGIN_DA_AREA.aluno;
}

/** `voltar` só aceita um caminho interno do painel (nada de URL externa). */
export function voltarSeguro(valor: string | null | undefined, prefixo = '/super'): string | null {
  if (!valor || !valor.startsWith(prefixo) || valor.startsWith('//')) return null;
  if (valor.startsWith('/super/entrar') || valor.startsWith('/super/2fa')) return null;
  return valor;
}
