# Kit Fuse Aprova

Tudo o que o Claude Code precisa para implementar o Fuse Aprova.

## Como usar
1. Crie uma pasta vazia para o projeto e descompacte este kit dentro dela, de modo que `CLAUDE.md`, `docs/`, `design/` e `dados/` fiquem na raiz.
2. Abra o Claude Code nessa pasta.
3. Envie: **"Leia o CLAUDE.md e implemente o Fuse Aprova completo, seguindo o PRD e o design."**

## Conteúdo
| Caminho | O que é |
|---|---|
| `CLAUDE.md` | Instruções para o Claude Code: regras, estrutura, ordem de trabalho, variáveis |
| `docs/PRD.md` | Requisitos completos: regras de negócio, telas, gamificação, conteúdo, arquitetura, dados, API, aceite |
| `docs/DESIGN-SYSTEM.md` | Cores, tipografia, componentes, mascote, acessibilidade |
| `design/png/` | 13 telas finais em PNG (1170×2532) |
| `design/html/` | As mesmas telas em HTML estático, que abrem no navegador, com as fontes inclusas |
| `design/tokens.css` | Tokens de design (cores, fontes, raios, sombras) |
| `design/fonts/` | Baloo 2 e Nunito (woff2, licença OFL) |
| `design/mascote/` | Capi em 5 poses (SVG) |
| `dados/catalogo_fau.json` | 246 certames FAU encerrados, com o padrão de prova e a amostra de provas do PCI |
| `dados/catalogo_fau_certames.csv` | O mesmo catálogo em planilha |
| `dados/fau_certames.txt`, `dados/pci_provas.txt` | Listas brutas coletadas, usadas pelo coletor |

## Ordem das telas
01 Boas-vindas · 02 Cadastro · 03 Pagamento · 04 Trilha · 05 Pergunta · 06 Acerto · 07 Erro · 08 Fim da lição · 09 Ofensiva · 10 Revisar · 11 Simulado · 12 Liga · 13 Perfil

As telas sem desenho (login, escolha de cargo, simulado em andamento, resultado, configurações, admin…) estão descritas no PRD, seção 5, marcadas com ✏️.

## Observações
- A questão de crase que aparece nas telas é um exemplo autoral, não uma questão real da FAU. O chip "[Órgão] · [Ano]" é um espaço reservado.
- Nomes, notas e XP nas telas são dados de exemplo.
- Confira a API do Asaas na documentação oficial antes de colocar em produção.
