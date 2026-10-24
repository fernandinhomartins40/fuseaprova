import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconeTraco } from './IconeTraco';
import s from './Toast.module.css';

export type TipoToast = 'info' | 'sucesso' | 'erro';
interface ItemToast {
  id: number;
  texto: string;
  tipo: TipoToast;
}

type Mostrar = (texto: string, tipo?: TipoToast) => void;
const ContextoToast = createContext<Mostrar>(() => undefined);

/** Toasts curtos ("Código copiado"), anunciados por aria-live. */
export function ProvedorToast({
  children,
  duracaoMs = 2600,
}: {
  children: ReactNode;
  duracaoMs?: number;
}) {
  const [itens, setItens] = useState<ItemToast[]>([]);
  const proximo = useRef(1);
  const mostrar = useCallback<Mostrar>(
    (texto, tipo = 'info') => {
      const id = proximo.current++;
      setItens((l) => [...l.slice(-2), { id, texto, tipo }]);
      window.setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), duracaoMs);
    },
    [duracaoMs],
  );
  const valor = useMemo(() => mostrar, [mostrar]);
  return (
    <ContextoToast.Provider value={valor}>
      {children}
      <div className={s.area} aria-live="polite" aria-atomic="false">
        {itens.map((i) => (
          <div key={i.id} className={[s.toast, s[i.tipo]].join(' ')} role="status">
            <IconeTraco nome={i.tipo === 'erro' ? 'alerta' : 'check'} tamanho={18} espessura={3} />
            <span>{i.texto}</span>
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast(): Mostrar {
  return useContext(ContextoToast);
}
