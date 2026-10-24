/** Senhas com argon2id (PRD 8.2). O padrão do @node-rs/argon2 é argon2id (m=19 MiB, t=2). */
import { hash, verify } from '@node-rs/argon2';

const ARGON2ID = 2; // Algorithm.Argon2id (const enum não atravessa isolatedModules)

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, { algorithm: ARGON2ID });
}

let hashFalso: Promise<string> | null = null;

/** Confere a senha. Sem hash (usuário inexistente), gasta o mesmo tempo e devolve false. */
export async function conferirSenha(hashGuardado: string | null | undefined, senha: string): Promise<boolean> {
  if (!hashGuardado) {
    hashFalso ??= gerarHashSenha('senha-inexistente-para-tempo-constante');
    await verify(await hashFalso, senha).catch(() => false);
    return false;
  }
  try {
    return await verify(hashGuardado, senha);
  } catch {
    return false;
  }
}
