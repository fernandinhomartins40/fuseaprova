import { Botao, CampoTexto, estilos as s } from './ui';

export interface LinkForm {
  titulo: string;
  url: string;
}

/** Lista editável de links oficiais (edital, cronograma, gabarito…). */
export function EditorLinks(props: {
  links: LinkForm[];
  aoMudar: (l: LinkForm[]) => void;
  erros?: Record<string, string>;
}) {
  const { links, aoMudar, erros = {} } = props;
  const mudar = (i: number, k: keyof LinkForm, v: string) =>
    aoMudar(links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <fieldset className={s.formulario}>
      <legend className={s.rotulo}>Links oficiais</legend>
      {links.length === 0 ? <span className={s.suave}>Nenhum link.</span> : null}
      {links.map((l, i) => (
        <div key={i} className={s.linha}>
          <CampoTexto
            rotulo={`Título do link ${i + 1}`}
            value={l.titulo}
            onChange={(e) => mudar(i, 'titulo', e.target.value)}
            erro={erros[`links.${i}.titulo`]}
          />
          <CampoTexto
            rotulo={`Endereço do link ${i + 1}`}
            type="url"
            value={l.url}
            onChange={(e) => mudar(i, 'url', e.target.value)}
            erro={erros[`links.${i}.url`]}
          />
          <div className={s.acoes}>
            <Botao pequeno variante="fantasma" onClick={() => aoMudar(links.filter((_, j) => j !== i))}>
              Remover link
            </Botao>
          </div>
        </div>
      ))}
      <div>
        <Botao pequeno onClick={() => aoMudar([...links, { titulo: '', url: '' }])}>
          Adicionar link
        </Botao>
      </div>
    </fieldset>
  );
}
