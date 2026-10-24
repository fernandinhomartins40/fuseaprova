import { useNavigate } from 'react-router-dom';
import { Botao3D, Capi, Pagina } from '../ui';

export default function NaoEncontrada() {
  const navegar = useNavigate();
  return (
    <Pagina>
      <div
        style={{
          display: 'grid',
          gap: 16,
          justifyItems: 'center',
          textAlign: 'center',
          paddingTop: 60,
        }}
      >
        <Capi pose="explicando" tamanho={200} carregamento="eager" />
        <h1>Página não encontrada</h1>
        <p>Esse caminho não existe. Vamos voltar para os estudos?</p>
        <Botao3D onClick={() => navegar('/')}>Ir para o início</Botao3D>
      </div>
    </Pagina>
  );
}
