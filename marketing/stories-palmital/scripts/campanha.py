"""Campanha "R$ 197 em até 6x até 05/12" (24 vídeos, v23 a v46): fonte única dos roteiros.

    python scripts/campanha.py            # grava roteiros/vNN.json, src/vNN/ (index + momentos), src/venda/registro.ts
                                          # e out/campanha-ate-05-12/CALENDARIO.md

Depois: narracao.py vNN (voz) e render.py vNN; scripts/campanha_saida.py copia os finais para as pastas de cada dia.
Regras dos anúncios: sem salário, sem preço riscado, sem promessa de aprovação; o aviso de rodapé sai em todo vídeo.
"""
import json
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

LARANJA, VERMELHO, VERDE, AZUL, ROXO, PETROLEO = '#E8590C', '#D92D20', '#15803D', '#1D6FE0', '#7C3AED', '#0f6e70'
OFERTA_FALA = 'Até cinco de dezembro, sai por cento e noventa e sete reais, em até seis vezes sem juros no cartão.'
LINK = 'O link tá na bio.'


def f(falado, legenda, tipo, **kw):
    return dict(falado=falado, legenda=legenda, tipo=tipo, **kw)


def txt(falado, legenda, linhas, cor=LARANJA, **kw):
    return f(falado, legenda, 'texto', linhas=linhas, cor=cor, **kw)


def oferta(falado=OFERTA_FALA, legenda='*R$ 197* em até *6x sem juros*', **kw):
    return f(falado, legenda, 'oferta', **kw)


def link(falado=LINK, legenda='*Link na bio*', **kw):
    return f(falado, legenda, 'oferta', capi='celebrando', **kw)


# (dia, título, falas). Técnica da "coceira": a 1ª fala abre uma curiosidade, o meio não responde, a resposta vem no fim,
# colada na oferta. Funciona no mudo: a legenda grande diz tudo.
VIDEOS = [
    ('25/11', 'A notícia', [
        txt('Tenho uma notícia pra quem ia deixar o Fuse Aprova pra depois.', 'Uma notícia pra quem *deixou pra depois*', ['Notícia', 'pra quem deixou', 'pra depois'], capi='acenando'),
        txt('Ontem era pra ser o último dia de uma coisa.', 'Ontem era *o último dia*...', ['Ontem era', 'o último dia'], AZUL, capi='constancia'),
        f('Uma coisa no preparatório pro concurso da Prefeitura de Palmital.', '...de algo *no preparatório*', 'trilha', capi='explicando'),
        f('Com trilha do seu cargo, questões no estilo da FAU e simulado oficial.', 'Trilha, questões e *simulado oficial*', 'simulado', capi='estudando'),
        oferta('A notícia: prorrogamos! Cento e noventa e sete reais, em até seis vezes sem juros, até cinco de dezembro.', '*Prorrogamos!* R$ 197 até *5/12*', capi='celebrando'),
        link('No dia seis, sobe pra duzentos e noventa e sete. O link tá na bio.', 'Dia 6, *R$ 297*. Link na bio'),
    ]),
    ('25/11', 'A palavra de uma letra', [
        txt('Tem uma palavrinha de uma letra só que derruba muita gente em prova de concurso.', 'Uma palavra de *1 letra* derruba muita gente', ['1 letra'], VERMELHO, capi='constancia'),
        f('Ela cai em Português, que é matéria de todos os cargos. Olha essa questão.', 'Olha *essa questão*', 'questao', capi='explicando'),
        f('Quem marcou a letra A caiu na pegadinha.', 'Marcou a A? *Pegadinha*', 'erro', capi='explicando'),
        txt('A palavrinha é a crase. Cidade sem artigo não leva crase: vai a Curitiba, volta de Curitiba.', 'É a *crase*. Volta *de* Curitiba? Sem crase', ['À ou A?', 'volta DE: sem crase'], PETROLEO, capi='celebrando'),
        oferta('No Fuse Aprova, cada erro vem com explicação. Cento e noventa e sete reais, em até seis vezes, até cinco de dezembro.', 'Explicação em cada erro. *R$ 197* até *5/12*', capi='incentivando'),
        link(),
    ]),
    ('25/11', 'A pergunta que ninguém faz', [
        txt('Antes de estudar pro concurso de Palmital, tem uma pergunta que quase ninguém faz.', 'A pergunta que *quase ninguém faz*', ['1 pergunta', 'antes de estudar'], AZUL, capi='constancia'),
        txt('E ela pode jogar meses de estudo no lixo.', 'Pode jogar *meses de estudo* fora', ['meses', 'de estudo'], VERMELHO, capi='explicando'),
        f('Tem cargo que exige CNH. Tem cargo que exige experiência.', 'Cargo que exige *CNH*. Que exige *experiência*', 'edital', capi='explicando'),
        f('A pergunta é: eu atendo aos requisitos do meu cargo? No Fuse Aprova, você descobre pelo edital.', 'Eu atendo *aos requisitos*?', 'cargo', capi='celebrando'),
        oferta('E estuda pela trilha do seu cargo. Cento e noventa e sete reais, em até seis vezes, até cinco de dezembro.', 'Trilha do cargo por *R$ 197*', capi='incentivando'),
        link(),
    ]),
    ('25/11', 'Quanto custa?', [
        txt('Quanto você acha que custa se preparar pro concurso da Prefeitura de Palmital?', 'Quanto custa se *preparar pra Palmital*?', ['Quanto', 'custa?'], capi='acenando'),
        f('Com a trilha do seu cargo e mais de dez mil questões no estilo da FAU.', '*+10 mil questões* no estilo FAU', 'questao', capi='estudando'),
        f('Com revisão dos erros e simulado no formato oficial, até o dia da prova.', 'Revisão e *simulado oficial*', 'simulado', capi='explicando'),
        txt('Trinta e dois reais e oitenta e três por mês, em até seis vezes sem juros.', '*R$ 32,83* por mês', ['6x de', 'R$ 32,83', 'sem juros'], ROXO, capi='celebrando'),
        oferta('São cento e noventa e sete reais, só até cinco de dezembro.', '*R$ 197* só até *5/12*', capi='incentivando'),
        link(),
    ]),
    ('26/11', 'A resposta escondida no edital', [
        txt('Tem uma resposta escondida no edital que muda o que você vai estudar.', 'Uma resposta *escondida no edital*', ['Edital', 'nº 01/2026'], PETROLEO, capi='constancia'),
        txt('Ela não tá na primeira página. Nem na segunda.', 'Não tá na *1ª página*', ['nem na', '1ª página'], AZUL, capi='explicando'),
        f('Ela fica nos anexos, cargo por cargo.', 'Tá *nos anexos*, cargo por cargo', 'datas', capi='explicando'),
        f('É o que o edital pede pro seu cargo. No Fuse Aprova, você pergunta, e a resposta vem com o item citado.', 'O que *o seu cargo* pede', 'edital', capi='celebrando'),
        oferta('E a trilha foca nisso. Cento e noventa e sete reais, em até seis vezes, até cinco de dezembro.', 'Trilha do cargo por *R$ 197*', capi='incentivando'),
        link(),
    ]),
    ('26/11', 'Na fila do banco', [
        txt('Existe um jeito de estudar pra concurso que cabe na fila do banco.', 'Estudar *na fila do banco*?', ['na fila', 'do banco'], capi='acenando'),
        txt('Não precisa de apostila na mão, nem de duas horas livres.', 'Sem apostila. *Sem 2 horas livres*', ['sem', 'apostila'], AZUL, capi='explicando'),
        f('Errou? A explicação aparece na hora.', 'Errou? *Explicação na hora*', 'erro', capi='explicando'),
        f('É o treino de cinco minutos do Fuse Aprova: cinco questões no estilo da FAU.', 'Treino de *5 minutos*', 'trilha', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('27/11', 'O padrão da banca', [
        txt('A banca do concurso de Palmital tem um padrão. E quem percebe, chega mais preparado.', 'A banca tem *um padrão*', ['A banca', 'tem um padrão'], PETROLEO, capi='constancia'),
        txt('Não é sorte. É repetição.', 'Não é sorte. *É repetição*', ['não é', 'sorte'], AZUL, capi='explicando'),
        f('Olha como ela pergunta.', 'Olha *como ela pergunta*', 'questao', capi='estudando'),
        f('O padrão é o jeito FAU de perguntar. No Fuse Aprova, são mais de dez mil questões nesse estilo, com explicação.', 'O *jeito FAU*: +10 mil questões', 'erro', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('27/11', 'O que você esquece', [
        txt('Você esquece boa parte do que estuda em poucos dias. A não ser que faça uma coisa.', 'Você *esquece* o que estuda...', ['Você', 'esquece'], VERMELHO, capi='constancia'),
        txt('E não é estudar mais horas.', 'Não é *estudar mais horas*', ['não é', 'mais horas'], AZUL, capi='explicando'),
        txt('Nem reler o resumo.', 'Nem *reler o resumo*', ['nem', 'resumo'], AZUL, capi='explicando'),
        f('É rever o que errou no tempo certo: um, três, sete e quinze dias depois. O Fuse Aprova faz isso sozinho.', 'Rever em *1, 3, 7 e 15 dias*', 'revisao', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('28/11', 'O que mais pesa na prova', [
        txt('No dia da prova, o que mais pesa nem sempre é o conteúdo.', 'O que pesa *não é só o conteúdo*', ['dia', 'da prova'], ROXO, capi='constancia'),
        txt('Tem gente que sabe a matéria e se perde mesmo assim.', 'Sabe a matéria e *se perde*', ['sabe e', 'se perde'], VERMELHO, capi='explicando'),
        f('Quarenta questões. Quatro horas.', '*40 questões. 4 horas.*', 'simulado', capi='explicando'),
        txt('O que pesa é o ritmo. E ritmo se treina com simulado no formato oficial, quantas vezes quiser.', 'É o *ritmo*. Simulados *ilimitados*', ['ritmo', 'se treina'], ROXO, capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('28/11', 'Dois candidatos', [
        txt('Dois candidatos estudam pro concurso de Palmital. Só um estudou o que cai na prova dele.', '*2 candidatos*. Só 1 estudou certo', ['2 candidatos'], AZUL, capi='constancia'),
        txt('O outro estudou um monte de coisa que nem cai.', 'O outro estudou *o que nem cai*', ['o que', 'nem cai'], VERMELHO, capi='explicando'),
        f('São quarenta e nove cargos, e cada um tem a sua prova.', '*49 cargos*, cada um com sua prova', 'datas', capi='explicando'),
        f('A diferença: o primeiro conferiu o cargo e os requisitos antes. No Fuse Aprova, isso leva poucos minutos.', 'Ele conferiu *o cargo antes*', 'cargo', capi='celebrando'),
        oferta('E estudou pela trilha do cargo. Cento e noventa e sete reais, em até seis vezes, até cinco de dezembro.', 'Trilha do cargo por *R$ 197*', capi='incentivando'),
        link(),
    ]),
    ('29/11', 'Testar sem arriscar', [
        txt('Tem um jeito de testar o Fuse Aprova sem arriscar o seu dinheiro.', 'Testar *sem arriscar* dinheiro', ['sem', 'arriscar'], VERDE, capi='acenando'),
        f('Você entra e faz os treinos...', 'Faça *os treinos*...', 'trilha', capi='estudando'),
        f('...faz um simulado, e vê se é pra você.', '...um simulado, e *veja se é pra você*', 'simulado', capi='explicando'),
        f('São sete dias de garantia. Não gostou? Devolvemos cem por cento do valor.', '*7 dias* de garantia', 'garantia', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('29/11', 'O hábito de domingo', [
        txt('Tem um hábito de domingo que muda a semana inteira de estudo.', 'Um hábito de *domingo*', ['domingo'], PETROLEO, capi='constancia'),
        f('Segunda a sexta, um treino curto por dia.', 'Seg a sex: *1 treino por dia*', 'trilha', capi='estudando'),
        f('Todo dia, a revisão do que errou. E no sábado, um simulado.', 'Revisão todo dia. *Sábado: simulado*', 'revisao', capi='explicando'),
        f('O hábito é planejar a semana. E o Fuse Aprova já entrega esse plano pronto.', '*Planejar a semana*', 'licao', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('30/11', 'Daqui a 6 dias', [
        txt('Daqui a seis dias, uma coisa muda no Fuse Aprova.', 'Em *6 dias*, algo muda', ['6 dias'], VERMELHO, capi='constancia'),
        f('Não é o conteúdo: a trilha, as questões e os simulados continuam iguais.', 'Não é *o conteúdo*', 'trilha', capi='explicando'),
        f('E o acesso continua valendo até o dia da prova.', 'Nem *o acesso*', 'datas', capi='explicando'),
        oferta('O que muda é o preço. Até sábado, cento e noventa e sete reais, em até seis vezes sem juros.', 'Muda *o preço*: R$ 197 até *sábado*', capi='celebrando'),
        link('No dia seis, sobe pra duzentos e noventa e sete. O link tá na bio.', 'Dia 6, *R$ 297*. Link na bio'),
    ]),
    ('30/11', 'A matéria de todos', [
        txt('Uma matéria cai pra todos os quarenta e nove cargos do concurso de Palmital.', '1 matéria, *49 cargos*', ['1 matéria', '49 cargos'], AZUL, capi='constancia'),
        txt('Quem vai bem nela já sai na frente. Quem vai mal, sente em qualquer cargo.', 'Pesa em *qualquer cargo*', ['pesa em', 'todo cargo'], VERMELHO, capi='explicando'),
        f('É Português. E a sua trilha no Fuse Aprova começa por ela.', 'É *Português*', 'trilha', capi='celebrando'),
        f('Com treinos de cinco minutos no estilo da FAU, e explicação em cada questão.', 'Treinos no *estilo FAU*', 'questao', capi='estudando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('01/12', 'A armadilha de dezembro', [
        txt('Dezembro tem uma armadilha pra quem vai fazer o concurso de Palmital.', 'A *armadilha* de dezembro', ['A armadilha', 'de dezembro'], VERMELHO, capi='constancia'),
        f('A prova é em fevereiro, e parece longe.', 'A prova é em *fevereiro*', 'datas', capi='explicando'),
        txt('Aí vêm as festas, as férias, e janeiro passa voando.', 'Festas, férias... *janeiro voa*', ['festas', 'férias'], AZUL, capi='explicando'),
        f('A armadilha é deixar pra começar depois. Cinco minutos por dia, a partir de hoje, já fazem diferença.', 'É *deixar pra depois*', 'trilha', capi='celebrando'),
        oferta('E o preço de cento e noventa e sete reais vai só até sábado.', '*R$ 197* só até *sábado*', capi='incentivando'),
        link(),
    ]),
    ('01/12', 'Sem saber nada', [
        txt('Dá pra estudar pra concurso mesmo sem saber nada da matéria?', 'E se você *não sabe nada*?', ['do zero?'], AZUL, capi='constancia'),
        txt('Muita gente desiste antes de tentar.', 'Muita gente *desiste antes*', ['desiste', 'antes'], VERMELHO, capi='explicando'),
        f('Olha o que acontece quando você erra no Fuse Aprova.', 'Olha *quando você erra*', 'erro', capi='explicando'),
        f('Dá, sim. Cada questão vem com a explicação do tema, do zero. E o que errou volta pra revisão.', 'Dá, sim. *Explicação do zero*', 'revisao', capi='celebrando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('02/12', 'Faltam 4 dias', [
        txt('Faltam quatro dias pra uma coisa acabar.', 'Faltam *4 dias*...', ['4 dias'], VERMELHO, capi='constancia'),
        f('E ela é pra quem vai fazer o concurso de Palmital.', 'Pra quem vai fazer *Palmital*', 'trilha', capi='explicando'),
        f('Trilha do cargo, questões no estilo da FAU, simulado oficial.', 'Trilha, questões e *simulado*', 'simulado', capi='estudando'),
        oferta('O que acaba é o preço de cento e noventa e sete reais, em até seis vezes de trinta e dois e oitenta e três.', 'Acaba o *R$ 197* em 6x', capi='celebrando'),
        link('Sábado é o último dia. O link tá na bio.', 'Último dia: *sábado*. Link na bio'),
    ]),
    ('02/12', 'O passo que ninguém faz', [
        txt('São quatro passos do zero até a prova. E o último, quase ninguém faz.', '*4 passos*. O último, quase ninguém faz', ['4 passos'], PETROLEO, capi='constancia'),
        f('Um: descubra o seu cargo.', '*1.* Descubra *seu cargo*', 'cargo', capi='explicando'),
        f('Dois: um treino por dia.', '*2.* Um treino *por dia*', 'trilha', capi='estudando'),
        f('Três: revise o que errou.', '*3.* Revise *o que errou*', 'revisao', capi='explicando'),
        f('Quatro, o que quase ninguém faz: simulado no formato oficial, quarenta questões em quatro horas.', '*4.* Simulado *oficial*', 'simulado', capi='celebrando'),
        oferta('Tudo isso no Fuse Aprova, por cento e noventa e sete reais, até sábado.', 'Tudo por *R$ 197* até *sábado*', capi='incentivando'),
        link(),
    ]),
    ('03/12', 'A desculpa mais comum', [
        txt('A desculpa mais comum pra não estudar pra concurso tem solução em cinco minutos.', 'A *desculpa mais comum*', ['a desculpa', 'mais comum'], AZUL, capi='constancia'),
        txt('Você provavelmente já falou ela. E parece verdade.', 'Você *já falou ela*', ['parece', 'verdade'], VERMELHO, capi='explicando'),
        f('É o não tenho tempo. Um treino no Fuse Aprova leva cinco minutos.', 'Não tenho *tempo*? *5 min*', 'trilha', capi='celebrando'),
        f('Cinco questões no estilo da FAU, com explicação.', '*5 questões* no estilo FAU', 'questao', capi='estudando'),
        oferta(capi='incentivando'),
        link(),
    ]),
    ('03/12', 'O número', [
        txt('Tem um número que todo candidato do concurso de Palmital devia saber hoje.', 'Um *número* que você devia saber', ['?'], AZUL, capi='constancia'),
        txt('Não é o número de vagas. Nem a nota mínima.', 'Não é *vagas*. Nem *nota*', ['nem vagas', 'nem nota'], ROXO, capi='explicando'),
        txt('É oitenta: os dias que faltam pra prova objetiva, em vinte e um de fevereiro.', '*80 dias* até a prova', ['80 dias', 'até 21/02'], VERMELHO, capi='celebrando'),
        f('Um treino por dia são oitenta treinos.', '1 por dia = *80 treinos*', 'licao', capi='incentivando'),
        oferta('E o preço de cento e noventa e sete reais acaba no sábado.', '*R$ 197* acaba *sábado*', capi='incentivando'),
        link(),
    ]),
    ('04/12', 'Amanhã acaba', [
        txt('Amanhã, à meia-noite, uma coisa acaba no Fuse Aprova.', 'Amanhã, *meia-noite*, acaba...', ['amanhã', 'meia-noite'], VERMELHO, capi='constancia'),
        f('Não é o acesso: ele vale até o dia da prova.', 'Não é *o acesso*', 'datas', capi='explicando'),
        f('E não é a garantia de sete dias.', 'Nem *a garantia*', 'garantia', capi='explicando'),
        oferta('É o preço de cento e noventa e sete reais e o parcelamento em seis vezes sem juros. Domingo, sobe pra duzentos e noventa e sete.', 'Acaba o *R$ 197* em *6x*', rodape='Só até amanhã, 5/12. Depois, R$ 297.', capi='celebrando'),
        link(rodape='Só até amanhã, 5/12. Depois, R$ 297.'),
    ]),
    ('04/12', 'Quanto custa por dia', [
        txt('Quanto custa por dia se preparar pro concurso de Palmital?', 'Quanto custa *por dia*?', ['por dia?'], capi='acenando'),
        f('Com trilha do cargo, mais de dez mil questões e simulados.', 'Trilha, questões, *simulados*', 'simulado', capi='estudando'),
        f('Até o dia da prova, em fevereiro.', 'Até *a prova*, em fevereiro', 'datas', capi='explicando'),
        txt('Uns dois reais e cinquenta por dia. Cento e noventa e sete reais, em até seis vezes sem juros.', 'Uns *R$ 2,50 por dia*', ['R$ 2,50', 'por dia'], PETROLEO, capi='celebrando'),
        oferta('Esse preço vai só até amanhã.', 'Só até *amanhã*', rodape='Só até amanhã, 5/12. Depois, R$ 297.', capi='incentivando'),
        link(rodape='Só até amanhã, 5/12. Depois, R$ 297.'),
    ]),
    ('05/12', 'Hoje à meia-noite', [
        txt('Hoje, à meia-noite, acaba.', 'Hoje, *meia-noite*, acaba', ['hoje', 'meia-noite'], VERMELHO, capi='constancia'),
        f('Se você tava esperando a hora certa pra começar a estudar pro concurso de Palmital...', 'Esperando *a hora certa*?', 'trilha', capi='explicando'),
        f('...com a trilha do seu cargo e simulado oficial...', '...trilha e *simulado oficial*...', 'simulado', capi='estudando'),
        oferta('Acaba hoje o preço de cento e noventa e sete reais, em até seis vezes sem juros. Amanhã, duzentos e noventa e sete.', 'Acaba hoje: *R$ 197*', rodape='Só hoje, 5/12. Amanhã, R$ 297.', capi='celebrando'),
        link(rodape='Só hoje, 5/12. Amanhã, R$ 297.'),
    ]),
    ('05/12', 'Últimas horas', [
        txt('Últimas horas pra uma decisão.', 'Últimas horas pra *uma decisão*', ['últimas', 'horas'], VERMELHO, capi='constancia'),
        txt('Estudar pro concurso de Palmital sozinho, ou com um plano.', 'Sozinho, ou *com um plano*?', ['sozinho', 'ou com plano?'], AZUL, capi='explicando'),
        f('Plano com revisão dos erros...', 'Revisão dos erros...', 'revisao', capi='explicando'),
        oferta('Até a meia-noite, o Fuse Aprova sai por cento e noventa e sete reais. Depois, duzentos e noventa e sete.', 'Até *meia-noite*: R$ 197', rodape='Só até a meia-noite de hoje.', capi='celebrando'),
        link(rodape='Só até a meia-noite de hoje.'),
    ]),
]

TRILHAS = ['v21', 'v17', 'v20', 'v18', 'v19', 'v22']
VOZ = dict(voz='2CECaLAGTS5NRGxgbcxr', nomeVoz='Davi Andrei', modelo='eleven_v4',
           ajustes={'stability': 0.4, 'similarity_boost': 0.8, 'use_speaker_boost': True, 'speed': 1.08},
           pronuncia={'Fuse': 'Fúzi', 'Aprova': 'Aprôva', 'FAU': 'Fáu'})


def nome(i: int) -> str:
    return f'v{23 + i}'


def main() -> None:
    assert len(VIDEOS) == 24
    registro = []
    calendario = ['# Campanha "R$ 197 em até 6x" — calendário de postagem (25/11 a 05/12)', '',
                  'Cada vídeo está na pasta do dia, já com o nome na ordem de postagem. Sugestão de horário: o 1º às 12h e o 2º às 19h',
                  '(no dia 25/11, os quatro: 12h, 15h, 18h e 21h).', '']
    dia_atual, n_dia = None, 0
    for i, (dia, titulo, falas) in enumerate(VIDEOS):
        v = nome(i)
        for x in falas:
            assert x['tipo'] != 'texto' or x.get('linhas'), (v, x)
            assert 'salário' not in x['falado'].lower() and 'aprovad' not in x['falado'].lower(), (v, x)
        roteiro = dict(VOZ, semente=300 + i, titulo=titulo, dia=dia, falas={'mesa': [x['falado'] for x in falas]})
        (RAIZ / 'roteiros' / f'{v}.json').write_text(json.dumps(roteiro, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        pasta = RAIZ / 'src' / v
        pasta.mkdir(exist_ok=True)
        momentos = [{k: val for k, val in x.items() if k != 'falado'} for x in falas]
        (pasta / 'momentos.json').write_text(json.dumps(momentos, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (pasta / 'index.ts').write_text(
            f"// {v} · campanha até 05/12 · {dia} · \"{titulo}\" — gerado por scripts/campanha.py\n"
            "import { criarVenda, Momento } from '../venda/cena';\n"
            "import momentos from './momentos.json';\n"
            "import narracao from './narracao.json';\n\n"
            f"export const {{ linha, Video }} = criarVenda(narracao, momentos as Momento[], 'audio/{TRILHAS[i % len(TRILHAS)]}/trilha.wav');\n",
            encoding='utf-8')
        registro.append(v)
        if dia != dia_atual:
            dia_atual, n_dia = dia, 0
            calendario += ['', f'## {dia}', '']
        n_dia += 1
        legenda_post = ' '.join(x['legenda'].replace('*', '') for x in falas[:2])
        calendario.append(f'{n_dia}. **{titulo}** (`{v}`) — arquivo `{dia.replace("/", "-")}/{n_dia}-{v}.mp4`  ')
        calendario.append(f'   Texto do post: "{legenda_post}. Preparatório pro concurso da Prefeitura de Palmital. Link na bio."')
    (RAIZ / 'src' / 'venda' / 'registro.ts').write_text(
        '// Gerado por scripts/campanha.py\n'
        + ''.join(f"import * as {v} from '../{v}';\n" for v in registro)
        + '\nexport const vendas = [\n' + ''.join(f"  {{ id: '{v}', ...{v} }},\n" for v in registro) + '];\n',
        encoding='utf-8')
    saida = RAIZ / 'out' / 'campanha-ate-05-12'
    saida.mkdir(parents=True, exist_ok=True)
    calendario += ['', '---', 'Regras: sem salário, sem preço riscado e sem promessa de aprovação; o aviso de rodapé sai em todos.',
                   'Lembrete: o cartão em 6x fica no ar até 05/12 (CARTAO_ATE). O preço NÃO sobe sozinho: no dia 06/12 é preciso',
                   'trocar PRICE_CENTS para 29700 no .env da VPS, senão os vídeos terão anunciado uma alta que não aconteceu.']
    (saida / 'CALENDARIO.md').write_text('\n'.join(calendario) + '\n', encoding='utf-8')
    print('ok:', ', '.join(registro))


if __name__ == '__main__':
    main()
