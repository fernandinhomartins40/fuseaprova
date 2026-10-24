import type { ZodError } from 'zod';
import type { ProximoPasso } from '@fuse/shared/api';

/** Primeiro erro de cada campo de um ZodError (mesmo schema usado pela API). */
export function errosPorCampo(e: ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? '_');
    if (!(k in campos)) campos[k] = i.message;
  }
  return campos;
}

/** Rota da PWA para o `proximo` devolvido por cadastro/login/redefinição. */
export function rotaDoProximo(p: ProximoPasso): string {
  switch (p) {
    case 'pagamento':
      return '/pagamento';
    case 'onboarding':
      return '/onboarding';
    case 'admin':
      return '/admin';
    default:
      return '/aprender';
  }
}
