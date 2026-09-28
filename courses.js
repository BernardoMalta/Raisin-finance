/* ==========================================================================
   RAISIN FINANCE — courses.js
   Conteúdo padrão da área de Estudos: cursos → módulos → aulas, quizzes,
   biblioteca (artigos, vídeos rápidos, glossário) e a trilha recomendada.

   Este arquivo é só DADOS. O script.js lê window.RAISIN_CONTENT; se o
   administrador salvar alterações pelo painel Admin, a versão salva no
   navegador tem prioridade sobre esta. Para "publicar" o que foi editado
   no Admin para todos, use Admin → Exportar JSON e cole o resultado aqui
   (ou, no futuro, sirva esse JSON a partir de um backend).

   Formato de uma aula:
     { id, title, minutes, videoId (YouTube) | videoUrl (MP4),
       learn: [..], summary: 'parágrafos separados por \n\n',
       materials: [{ type: 'link'|'pdf'|'texto'|'infografico'|'glossario',
                     title, url?, text?, term? }] }
   ========================================================================== */

(function () {
  'use strict';

  // IDs de vídeo do YouTube por aula. Aula sem vídeo mostra um aviso e pode
  // ser concluída pela leitura do resumo.
  // Todos verificados como públicos e incorporáveis (oEmbed 200) em 28/09/2026.
  const VIDEOS = {
    'fz-renda': 'DraeCNnyYMY',
    'fz-despesas': 'OvQgEfqAgXc',
    'fz-fixos-variaveis': 'eHGyUL02hdU',
    'fz-orcamento': 'oLMxWL2w5PY',
    'fz-controle': 'in0XbfQEm2A',
    'fz-por-que-guardar': '_n2MsLHObVQ',
    'fz-habito': 'qcLi9aCf_KA',
    'fz-metas': 'CPeQs7CAaZQ',
    'fz-reserva': 'HTfQxGnp8zs',
    'fz-impulso': 'IzZl7SLqM6Y',
    'fz-o-que-e-investir': 'JtDrb2BPBf4',
    'fz-por-que-investir': 'NMTmXh4855c',
    'fz-risco-retorno': 'jLCGpX92dBI',
    'fz-liquidez': 'ixATLj01q9c',
    'fz-prazo': 'Hk16-ES5u74',
    'fz-inflacao': 'DBL0275mZvo',
    'fz-juros-compostos': 'SpyWH9U15Ek',
    'inv-o-que-sao': 'Q6x0xnI0uCg',
    'inv-mercado': 'llzOggL1xUI',
    'inv-poupar-investir': 'yrdGGfmDR0I',
    'inv-perfil': 'D0n0FhY1RVk',
    'inv-objetivos': 'IpShzJMztN8',
    'inv-poupanca': 'h6VAv3vJS2M',
    'inv-cdb': 'zkcpFhsgOaY',
    'inv-tesouro': 'y2sBkIX72-g',
    'inv-lci': 'pW6IHuR5Ugw',
    'inv-lca': '3Z9m_b5NJUs',
    'inv-cdi': 'P592XSCOmRQ',
    'inv-selic': 'tr_ARL5SV8o',
    'inv-ipca': 'JVcDZOlIMBk',
    'inv-liquidez-rf': 'FMmgjTAoKX0',
    'inv-vencimento': '8XP8HqFvQhI',
    'inv-acoes': '8K_eJ_8vqHM',
    'inv-etfs': 'iEIBMnrpnWk',
    'inv-fiis': 'qFDwa74ergw',
    'inv-dividendos': 'ypz4zO0sWZ4',
    'inv-valorizacao': 'sEADPS0-eio',
    'inv-volatilidade': 'HiqrvjMaOI8',
    'inv-riscos': 'tdOpU2ug1ik',
    'inv-diversificacao': 'MvQCrfqMC5c',
    'inv-horizonte': 'Wlce8FDlHho',
    'inv-objetivos-estrategia': 'YotbdyHEmaw',
    'inv-risco-retorno-estrategia': '6I20q_ngyaY',
    'inv-aportes': 'k_reJ5LKFVw'
  };

  const DISCLAIMER = 'Conteúdo educativo, não é recomendação de investimento. Rentabilidade passada não garante rentabilidade futura e todo investimento tem algum tipo de risco.';

  function lesson(id, title, minutes, learn, summary, materials) {
    return { id, title, minutes, videoId: VIDEOS[id] || null, learn, summary, materials: materials || [] };
  }

  const COURSES = [
    /* ------------------------------------------------------------------ *
     * CURSO 1 — FINANÇAS DO ZERO
     * ------------------------------------------------------------------ */
    {
      id: 'financas-do-zero',
      title: 'Finanças do Zero',
      icon: 'coins',
      color: '#1F9D75',
      level: 'Iniciante',
      cover: '',
      desc: 'Aprenda a organizar seu dinheiro e criar uma vida financeira mais saudável.',
      modules: [
        {
          id: 'fz-m1',
          title: 'Entendendo seu dinheiro',
          lessons: [
            lesson('fz-renda', 'O que é renda', 6,
              ['O que conta como renda', 'Diferença entre renda bruta e líquida', 'Renda fixa x renda variável no seu bolso', 'Por que o planejamento parte da renda líquida'],
              'Renda é todo dinheiro que entra para você: salário, pagamentos por serviços, bolsas, aluguéis recebidos, rendimentos de investimentos.\n\nO número que importa para o planejamento é a renda líquida, o que realmente cai na conta depois de descontos como INSS e Imposto de Renda. Quem tem renda que varia mês a mês (autônomos, comissionados) deve planejar pela média dos meses mais fracos, não dos melhores.',
              [{ type: 'glossario', title: 'Renda líquida', term: 'Renda líquida' }]),
            lesson('fz-despesas', 'O que são despesas', 5,
              ['O que entra como despesa', 'Despesas visíveis e "invisíveis"', 'Por que pequenos gastos pesam no fim do mês'],
              'Despesa é todo dinheiro que sai: contas, compras, assinaturas, parcelas, tarifas bancárias, juros de cartão.\n\nAs despesas mais perigosas são as invisíveis: assinaturas esquecidas, delivery frequente, pequenas compras por aplicativo. Sozinhas parecem pouco; somadas no mês, muitas vezes explicam por que o dinheiro "some".'),
            lesson('fz-fixos-variaveis', 'Gastos fixos e variáveis', 6,
              ['Diferença entre gasto fixo e variável', 'Gastos essenciais e não essenciais', 'Onde é mais fácil cortar'],
              'Gastos fixos se repetem todo mês com valor parecido: aluguel, internet, mensalidade da faculdade, plano de celular. Gastos variáveis mudam conforme o seu comportamento: mercado, lazer, transporte por aplicativo, roupas.\n\nUma segunda divisão ajuda a decidir cortes: essencial (você precisa para viver e trabalhar) ou não essencial. Cortar fixos exige renegociar ou trocar de contrato, mas o efeito dura todos os meses. Cortar variáveis é imediato, mas depende de disciplina contínua.'),
            lesson('fz-orcamento', 'Como montar um orçamento', 9,
              ['Os passos para montar um orçamento mensal', 'O método 50/30/20', 'Como adaptar o método à sua realidade'],
              'Orçamento é um plano de para onde o dinheiro vai antes de ele chegar. O passo a passo: anote a renda líquida, liste os gastos fixos, estime os variáveis pela média dos últimos meses e defina quanto vai guardar.\n\nUm ponto de partida popular é o 50/30/20: até 50% para necessidades, até 30% para desejos e pelo menos 20% para objetivos financeiros (reserva, investimentos, quitar dívidas). Não é regra rígida: se o aluguel consome mais da metade da renda, ajuste as proporções. O importante é que o valor guardado seja decidido no começo do mês, não o que "sobrar".',
              [{ type: 'texto', title: 'Modelo rápido 50/30/20', text: 'Renda líquida de R$ 3.000 → até R$ 1.500 em necessidades, até R$ 900 em desejos e pelo menos R$ 600 para objetivos.' }]),
            lesson('fz-controle', 'Como controlar os gastos', 7,
              ['Formas de registrar gastos', 'Categorias que fazem sentido', 'A revisão semanal de 10 minutos'],
              'Controlar gastos é comparar o planejado com o realizado. Vale planilha, aplicativo ou a própria aba Gastos desta plataforma: o melhor método é o que você consegue manter.\n\nUse poucas categorias (moradia, alimentação, transporte, lazer, educação, saúde, outros) e registre no mesmo dia. Uma vez por semana, olhe os números por 10 minutos: se uma categoria passou do limite, ajuste o resto do mês agora, e não só quando a fatura chegar.'),
          ],
          quiz: {
            questions: [
              { q: 'Para planejar o orçamento, qual renda você deve usar como base?', options: ['A renda bruta, antes dos descontos', 'A renda líquida, o que realmente entra na conta', 'A maior renda que você já teve', 'A renda que você espera ter no futuro'], correct: 1, explain: 'Os descontos (INSS, IR etc.) não chegam ao seu bolso, então o plano precisa partir da renda líquida.' },
              { q: 'Qual destes é um exemplo típico de gasto variável?', options: ['Aluguel', 'Mensalidade da faculdade', 'Compras de mercado', 'Plano de internet'], correct: 2, explain: 'O valor do mercado muda conforme seus hábitos a cada mês; os outros se repetem com valor parecido.' },
              { q: 'No método 50/30/20, os 20% são destinados a:', options: ['Lazer e desejos', 'Moradia e contas', 'Objetivos financeiros, como reserva e investimentos', 'Impostos'], correct: 2, explain: 'Os 20% vão para o futuro: reserva de emergência, investimentos e quitar dívidas.' },
              { q: 'Qual prática ajuda mais a manter o controle dos gastos ao longo do mês?', options: ['Olhar só a fatura do cartão quando ela chega', 'Revisar os gastos rapidamente toda semana', 'Guardar o que sobrar no fim do mês', 'Evitar olhar o extrato para não se estressar'], correct: 1, explain: 'A revisão semanal permite corrigir a rota ainda dentro do mês.' }
            ]
          }
        },
        {
          id: 'fz-m2',
          title: 'Como guardar dinheiro',
          lessons: [
            lesson('fz-por-que-guardar', 'Por que guardar dinheiro', 5,
              ['Segurança contra imprevistos', 'Liberdade de escolha', 'Guardar para não se endividar'],
              'Guardar dinheiro compra tranquilidade: um imprevisto (conserto, problema de saúde, perda de renda) deixa de virar dívida no cartão ou cheque especial, que estão entre os juros mais altos do mercado.\n\nTambém compra liberdade: trocar de emprego, fazer um curso, mudar de cidade ficam possíveis quando existe um colchão financeiro.'),
            lesson('fz-habito', 'Como criar o hábito de economizar', 6,
              ['Pague-se primeiro', 'Automatizar a transferência', 'Começar pequeno e aumentar'],
              'O hábito vem antes do valor. A estratégia mais eficaz é "pagar-se primeiro": no dia em que a renda cai, transfira um valor fixo para uma conta ou investimento separado, de preferência de forma automática.\n\nComece com um valor que não doa (5% da renda, por exemplo) e aumente um pouco a cada aumento de renda. Um valor pequeno guardado todo mês vale mais do que um valor grande que você não sustenta.'),
            lesson('fz-metas', 'Metas financeiras', 6,
              ['Metas SMART aplicadas a dinheiro', 'Curto, médio e longo prazo', 'Quebrar a meta em valor mensal'],
              'Uma boa meta financeira é específica, mensurável, alcançável, relevante e com prazo (SMART). "Juntar dinheiro" é vago; "juntar R$ 6.000 para uma viagem em 12 meses" é uma meta.\n\nDivida o valor pelo número de meses para saber quanto guardar por mês (aqui, R$ 500). Separe as metas por prazo: curto (até 1 ano), médio (1 a 5 anos) e longo (mais de 5 anos). O prazo ajuda a escolher onde guardar cada uma.'),
            lesson('fz-reserva', 'Reserva de emergência', 8,
              ['Quanto guardar', 'Onde deixar a reserva', 'Quando usar e como repor'],
              'A reserva de emergência é o primeiro objetivo de quem começa: um valor para imprevistos, equivalente a 3 a 6 meses dos seus gastos essenciais. Quem tem renda instável (autônomos, freelancers) costuma mirar em 6 a 12 meses.\n\nA reserva precisa de segurança e liquidez, não de rentabilidade alta: opções comuns são Tesouro Selic ou CDB de liquidez diária de banco sólido, rendendo perto de 100% do CDI. Use só para emergências reais e, depois de usar, reponha antes de voltar a investir em outros objetivos.',
              [{ type: 'glossario', title: 'Liquidez', term: 'Liquidez' }, { type: 'glossario', title: 'Tesouro Selic', term: 'Tesouro Selic' }]),
            lesson('fz-impulso', 'Como evitar gastos por impulso', 6,
              ['Gatilhos de compra', 'A regra das 48 horas', 'Ambiente que facilita dizer não'],
              'Compras por impulso costumam vir de gatilhos: promoção com prazo, cansaço, tédio, redes sociais. O antídoto é colocar atrito entre a vontade e o pagamento.\n\nTécnicas simples: esperar 48 horas antes de qualquer compra não planejada, remover cartões salvos dos aplicativos, desativar notificações de lojas e perguntar "quantas horas de trabalho isso custa?". Se ainda fizer sentido depois da espera, compre sem culpa: é uma decisão, não um impulso.'),
          ],
          quiz: {
            questions: [
              { q: 'O que significa "pagar-se primeiro"?', options: ['Comprar algo para você antes de pagar as contas', 'Separar o valor a guardar logo que a renda entra', 'Pagar as dívidas mais caras primeiro', 'Guardar o que sobrar no fim do mês'], correct: 1, explain: 'Guardar no início do mês transforma a economia em compromisso, e não em sobra.' },
              { q: 'Qual o tamanho recomendado para uma reserva de emergência de quem tem salário estável?', options: ['1 semana de gastos', '3 a 6 meses de gastos essenciais', '5 anos de gastos', 'O valor de um salário bruto'], correct: 1, explain: 'De 3 a 6 meses de gastos essenciais é a faixa usual; renda instável pede mais.' },
              { q: 'Qual característica é mais importante para a reserva de emergência?', options: ['Maior rentabilidade possível', 'Liquidez e segurança', 'Isenção de imposto', 'Prazo longo de vencimento'], correct: 1, explain: 'A reserva precisa estar disponível rápido e sem risco de perda relevante.' },
              { q: '"Juntar R$ 6.000 para uma viagem em 12 meses" é uma boa meta porque:', options: ['É um valor alto', 'É específica, mensurável e tem prazo', 'Envolve lazer', 'Não precisa de planejamento mensal'], correct: 1, explain: 'Valor e prazo definidos permitem calcular quanto guardar por mês.' }
            ]
          }
        },
        {
          id: 'fz-m3',
          title: 'Primeiros passos nos investimentos',
          lessons: [
            lesson('fz-o-que-e-investir', 'O que é investir', 6,
              ['A diferença entre guardar e investir', 'Para onde vai o seu dinheiro', 'Investir não é apostar'],
              'Investir é colocar o dinheiro para trabalhar: você empresta ou aplica recursos (para um banco, o governo ou uma empresa) e, em troca, espera receber mais no futuro.\n\nDiferente de uma aposta, um investimento tem uma lógica econômica por trás: juros pagos por quem pegou o dinheiro emprestado, lucro de empresas, aluguéis de imóveis. Isso não elimina o risco, mas permite entendê-lo antes de decidir.'),
            lesson('fz-por-que-investir', 'Por que as pessoas investem', 5,
              ['Proteger o poder de compra', 'Realizar objetivos', 'Construir patrimônio e renda'],
              'Dinheiro parado perde valor para a inflação. Por isso, a primeira razão para investir é proteger o poder de compra.\n\nAlém disso, as pessoas investem para realizar objetivos (comprar um imóvel, estudar fora, trocar de carro) e para construir patrimônio que, no longo prazo, pode gerar renda sem depender só do trabalho.'),
            lesson('fz-risco-retorno', 'Risco e retorno', 7,
              ['O que é risco em investimentos', 'Por que mais retorno exige mais risco', 'Tipos de risco: crédito, mercado e liquidez'],
              'Risco é a possibilidade de o resultado ser diferente do esperado, inclusive de perder dinheiro. Em geral, investimentos que prometem retorno maior carregam risco maior: ninguém paga mais sem motivo.\n\nOs principais tipos: risco de crédito (quem recebeu o dinheiro não pagar), risco de mercado (o preço do ativo cair) e risco de liquidez (não conseguir vender quando precisar). Desconfie de qualquer promessa de retorno alto e garantido: é a marca registrada de golpes e pirâmides.',
              [{ type: 'glossario', title: 'Risco de crédito', term: 'Risco de crédito' }]),
            lesson('fz-liquidez', 'Liquidez', 5,
              ['O que é liquidez', 'Liquidez diária x no vencimento', 'Por que liquidez importa para cada objetivo'],
              'Liquidez é a facilidade de transformar um investimento em dinheiro disponível, sem perder valor. Um CDB com liquidez diária pode ser resgatado a qualquer dia; um CDB com liquidez no vencimento só devolve o dinheiro na data combinada.\n\nMenos liquidez costuma vir acompanhada de uma taxa um pouco maior, como compensação. Por isso, combine a liquidez com o objetivo: reserva de emergência precisa de liquidez diária; um objetivo de 5 anos pode abrir mão dela.',
              [{ type: 'glossario', title: 'Liquidez', term: 'Liquidez' }]),
            lesson('fz-prazo', 'Prazo', 5,
              ['Curto, médio e longo prazo', 'Como o prazo influencia a escolha', 'Prazo e Imposto de Renda'],
              'O prazo é quanto tempo o dinheiro pode ficar investido. Ele muda tudo: quem precisa do dinheiro em 6 meses não deveria ficar exposto a oscilações fortes, e quem investe para 20 anos pode tolerar mais variação no caminho.\n\nNa renda fixa tributada, o prazo também afeta o imposto: a tabela regressiva do IR cobra de 22,5% (até 180 dias) até 15% (acima de 2 anos) sobre o rendimento.'),
            lesson('fz-inflacao', 'Inflação', 6,
              ['O que é inflação', 'Como o IPCA mede a inflação', 'Rendimento real x nominal'],
              'Inflação é o aumento geral de preços ao longo do tempo: com o mesmo dinheiro, você compra menos. No Brasil, o índice oficial é o IPCA, calculado pelo IBGE.\n\nPor isso, o que importa é o rendimento real, que é o ganho acima da inflação. Um investimento que rendeu 8% num ano com inflação de 5% teve ganho real de aproximadamente 3%. Se rendeu menos que a inflação, o seu poder de compra diminuiu.',
              [{ type: 'glossario', title: 'IPCA', term: 'IPCA' }]),
            lesson('fz-juros-compostos', 'Juros compostos', 8,
              ['Juros simples x compostos', 'A fórmula dos juros compostos', 'Por que o tempo é o maior aliado'],
              'Nos juros compostos, os rendimentos de cada período passam a render também, os famosos "juros sobre juros". A fórmula é M = C × (1 + i)^n, em que C é o capital, i a taxa por período e n o número de períodos.\n\nExemplo: R$ 1.000 a 1% ao mês viram cerca de R$ 1.127 em 1 ano, R$ 1.817 em 5 anos e R$ 3.300 em 10 anos. O efeito é pequeno no começo e forte no longo prazo, por isso começar cedo pesa mais que começar com muito. O mesmo mecanismo trabalha contra você nas dívidas de cartão e cheque especial.',
              [{ type: 'infografico', title: 'Crescimento de R$ 1.000 a 1% a.m.', text: '1 ano: ~R$ 1.127 · 5 anos: ~R$ 1.817 · 10 anos: ~R$ 3.300 · 20 anos: ~R$ 10.893' }]),
          ],
          quiz: {
            questions: [
              { q: 'O que é rendimento real?', options: ['O rendimento antes do imposto', 'O ganho acima da inflação', 'O rendimento de investimentos em imóveis', 'O rendimento garantido pelo banco'], correct: 1, explain: 'Rendimento real desconta a inflação; é o que mede se o seu poder de compra cresceu.' },
              { q: 'Um investimento com liquidez diária permite:', options: ['Resgatar o dinheiro em qualquer dia útil', 'Receber rendimento todo dia garantido acima da inflação', 'Resgatar só no vencimento', 'Aplicar apenas uma vez por dia'], correct: 0, explain: 'Liquidez diária significa poder transformar o investimento em dinheiro a qualquer dia útil.' },
              { q: 'Uma aplicação promete 5% ao mês, garantidos e sem risco. O mais prudente é:', options: ['Aplicar tudo, pois é garantido', 'Desconfiar: retorno alto e garantido é sinal de golpe', 'Aplicar só metade', 'Pedir empréstimo para aplicar mais'], correct: 1, explain: 'Retorno alto sempre vem com risco alto. Promessa de ganho alto e garantido é típica de pirâmides e golpes.' },
              { q: 'Por que começar a investir cedo faz tanta diferença?', options: ['Porque os juros compostos ganham força com o tempo', 'Porque bancos pagam mais para jovens', 'Porque o imposto é menor para quem tem menos idade', 'Não faz diferença, o que importa é o valor'], correct: 0, explain: 'Com juros compostos, o tempo multiplica o efeito dos rendimentos sobre rendimentos.' }
            ]
          }
        }
      ]
    },

    /* ------------------------------------------------------------------ *
     * CURSO 2 — INVESTIMENTOS PARA INICIANTES
     * ------------------------------------------------------------------ */
    {
      id: 'investimentos-iniciantes',
      title: 'Investimentos para Iniciantes',
      icon: 'trendingUp',
      color: '#13335E',
      level: 'Iniciante',
      cover: '',
      desc: 'Do primeiro conceito à sua estratégia: renda fixa, renda variável e como montar uma carteira com consciência dos riscos.',
      modules: [
        {
          id: 'inv-m1',
          title: 'Introdução',
          lessons: [
            lesson('inv-o-que-sao', 'O que são investimentos', 6,
              ['Investimento como troca: dinheiro hoje por mais dinheiro depois', 'Renda fixa e renda variável', 'Quem está do outro lado do investimento'],
              'Todo investimento é uma troca: você abre mão de usar o dinheiro hoje em troca da expectativa de ter mais no futuro. Do outro lado há sempre alguém: o governo (títulos públicos), bancos (CDB, LCI, LCA) ou empresas (ações, debêntures).\n\nAs duas grandes famílias são a renda fixa, em que as regras de remuneração são conhecidas na aplicação, e a renda variável, em que o retorno depende do desempenho do ativo e pode ser negativo.'),
            lesson('inv-mercado', 'Como funciona o mercado financeiro', 8,
              ['Quem são os participantes', 'O papel da B3, da CVM e do Banco Central', 'Corretoras e bancos como intermediários'],
              'O mercado financeiro conecta quem tem dinheiro sobrando com quem precisa dele. Você acessa esse mercado por meio de bancos e corretoras, que são os intermediários.\n\nAlgumas instituições-chave: a B3, a bolsa brasileira, onde são negociados ações, FIIs e ETFs e onde ficam registrados muitos investimentos; a CVM, que regula e fiscaliza o mercado de capitais; e o Banco Central, que regula o sistema bancário e executa a política de juros. Antes de investir, confirme se a instituição é autorizada por eles.'),
            lesson('inv-poupar-investir', 'Diferença entre poupar e investir', 5,
              ['Poupar é gastar menos do que ganha', 'Investir é fazer o dinheiro poupado render', 'Um depende do outro'],
              'Poupar é o ato de gastar menos do que se ganha e separar a diferença. Investir é o passo seguinte: aplicar o que foi poupado para que ele renda e, no mínimo, não perca para a inflação.\n\nSem poupar, não há o que investir. Sem investir, o dinheiro poupado perde poder de compra com o tempo. As duas coisas andam juntas.'),
            lesson('inv-perfil', 'Perfil de risco', 7,
              ['Conservador, moderado e arrojado', 'O questionário de suitability', 'Perfil muda com a vida'],
              'O perfil de risco descreve quanto de oscilação e de perda você aceita em busca de retorno. Os perfis mais comuns são conservador, moderado e arrojado.\n\nBancos e corretoras são obrigados a aplicar um questionário (a análise de suitability) antes de recomendar produtos. Responda com sinceridade: o objetivo é evitar que você esteja em algo que vai te fazer vender no pior momento. O perfil muda com a idade, a renda e os objetivos, então vale refazer de tempos em tempos.'),
            lesson('inv-objetivos', 'Objetivos financeiros', 5,
              ['Investir com um porquê', 'Relacionar objetivo, prazo e risco', 'Separar o dinheiro por objetivo'],
              'Investir sem objetivo leva a decisões ruins: resgatar por impulso, trocar de aplicação a cada notícia. Com objetivos claros (reserva, viagem, entrada de um imóvel, aposentadoria), fica mais fácil escolher.\n\nPara cada objetivo, defina valor e prazo. Objetivos de curto prazo pedem segurança e liquidez; objetivos de longo prazo permitem mais risco em troca de mais retorno potencial.'),
          ],
          quiz: {
            questions: [
              { q: 'Qual é a principal diferença entre poupar e investir?', options: ['Não há diferença', 'Poupar é guardar parte da renda; investir é aplicar esse dinheiro para render', 'Poupar é só na poupança; investir é só na bolsa', 'Investir é sempre mais arriscado que poupar'], correct: 1, explain: 'Poupar gera o recurso; investir faz esse recurso trabalhar.' },
              { q: 'Qual instituição regula e fiscaliza o mercado de capitais no Brasil?', options: ['IBGE', 'CVM', 'Receita Federal', 'Copom'], correct: 1, explain: 'A CVM (Comissão de Valores Mobiliários) regula e fiscaliza o mercado de capitais.' },
              { q: 'Para que serve a análise de suitability?', options: ['Garantir rentabilidade mínima', 'Verificar se os produtos são adequados ao seu perfil', 'Calcular o Imposto de Renda', 'Escolher a melhor ação da bolsa'], correct: 1, explain: 'Ela identifica seu perfil para que a instituição ofereça produtos adequados.' },
              { q: 'Na renda fixa, diferente da renda variável:', options: ['Não existe risco algum', 'As regras de remuneração são conhecidas no momento da aplicação', 'O retorno é sempre maior', 'Não há cobrança de imposto'], correct: 1, explain: 'Na renda fixa você sabe a regra de remuneração desde o início; isso não significa risco zero.' }
            ]
          }
        },
        {
          id: 'inv-m2',
          title: 'Renda fixa',
          lessons: [
            lesson('inv-poupanca', 'Poupança', 6,
              ['Como a poupança rende', 'Vantagens: simplicidade e isenção de IR', 'Por que costuma perder para outras opções'],
              'A poupança rende 0,5% ao mês + TR quando a Selic está acima de 8,5% ao ano; quando a Selic está em 8,5% ou menos, rende 70% da Selic + TR. O rendimento é creditado no "aniversário" mensal do depósito.\n\nÉ isenta de IR para pessoa física e coberta pelo FGC, mas costuma render menos que alternativas igualmente seguras, como o Tesouro Selic ou CDBs a 100% do CDI, mesmo depois do imposto.',
              [{ type: 'glossario', title: 'TR', term: 'TR' }, { type: 'glossario', title: 'FGC', term: 'FGC' }]),
            lesson('inv-cdb', 'O que é CDB?', 8,
              ['O que é um CDB', 'Como funciona', 'O que significa CDI', 'Como funciona a liquidez', 'Quais são os principais riscos'],
              'O CDB (Certificado de Depósito Bancário) é um título emitido por um banco: você empresta dinheiro para a instituição e recebe juros em troca. Ele pode ser pós-fixado (ex.: 100% do CDI), prefixado (ex.: 12% ao ano) ou híbrido (ex.: IPCA + 6%).\n\nO CDI é a taxa de referência da maioria dos CDBs pós-fixados e anda muito perto da Selic. A liquidez pode ser diária ou só no vencimento. Há IR pela tabela regressiva (22,5% a 15%) e IOF em resgates antes de 30 dias.\n\nO principal risco é o de crédito, ou seja, o banco quebrar. O FGC garante até R$ 250 mil por CPF por instituição (respeitando um teto global). Taxas muito acima da média geralmente indicam um banco de maior risco.',
              [{ type: 'glossario', title: 'CDI', term: 'CDI' }, { type: 'glossario', title: 'FGC', term: 'FGC' }, { type: 'link', title: 'FGC: o que é garantido', url: 'https://www.fgc.org.br/' }]),
            lesson('inv-tesouro', 'Tesouro Direto', 9,
              ['O que são títulos públicos', 'Tesouro Selic, Prefixado e IPCA+', 'Custos, imposto e venda antecipada'],
              'No Tesouro Direto você empresta dinheiro para o governo federal, com aplicações a partir de valores baixos. Os principais títulos: Tesouro Selic (acompanha a Selic, oscila pouco, bom para reserva), Tesouro Prefixado (taxa fixa definida na compra) e Tesouro IPCA+ (inflação + taxa fixa, protege o poder de compra no longo prazo).\n\nO Tesouro recompra os títulos diariamente, mas antes do vencimento a venda é feita a preço de mercado: em Prefixado e IPCA+, isso pode significar ganho ou perda. Há IR regressivo e taxa de custódia da B3.',
              [{ type: 'link', title: 'Site oficial do Tesouro Direto', url: 'https://www.tesourodireto.com.br/' }, { type: 'glossario', title: 'Marcação a mercado', term: 'Marcação a mercado' }]),
            lesson('inv-lci', 'LCI', 5,
              ['O que é LCI', 'Isenção de IR para pessoa física', 'Carência e cobertura do FGC'],
              'A LCI (Letra de Crédito Imobiliário) é um título emitido por bancos para financiar o setor imobiliário. Para pessoa física, o rendimento é isento de Imposto de Renda pela regra atual, e ela tem cobertura do FGC nos mesmos limites do CDB.\n\nEm troca, costuma ter carência: um prazo mínimo antes do qual não é possível resgatar. Para comparar com um CDB, considere a isenção: uma LCI a 90% do CDI pode render líquido mais do que um CDB a 105% do CDI, dependendo do prazo.'),
            lesson('inv-lca', 'LCA', 5,
              ['O que é LCA', 'Semelhanças e diferenças em relação à LCI', 'Como comparar com um CDB'],
              'A LCA (Letra de Crédito do Agronegócio) funciona como a LCI, mas os recursos financiam o agronegócio. Também é isenta de IR para pessoa física pela regra atual, tem cobertura do FGC e costuma ter carência.\n\nPara comparar com investimentos tributados, calcule a taxa equivalente: taxa da LCA ÷ (1 − alíquota de IR). Regras de tributação e de prazo mínimo podem mudar, então confira sempre a regra vigente antes de aplicar.'),
            lesson('inv-cdi', 'CDI', 5,
              ['O que é o CDI', 'Por que ele anda junto com a Selic', 'O que significa "100% do CDI"'],
              'O CDI (Certificado de Depósito Interbancário) é a taxa média dos empréstimos de curtíssimo prazo entre bancos. Na prática, fica muito próxima da Selic, poucos centésimos abaixo.\n\nQuando um investimento paga "100% do CDI", ele acompanha essa taxa; "110% do CDI" rende 10% a mais que ela. É a principal referência para comparar investimentos pós-fixados de renda fixa.',
              [{ type: 'glossario', title: 'CDI', term: 'CDI' }]),
            lesson('inv-selic', 'Selic', 6,
              ['O que é a taxa Selic', 'Quem define e como', 'Como a Selic afeta seus investimentos e dívidas'],
              'A Selic é a taxa básica de juros da economia. A meta é definida pelo Copom, do Banco Central, em reuniões periódicas (8 por ano), para manter a inflação dentro da meta.\n\nQuando a Selic sobe, crédito fica mais caro e investimentos pós-fixados rendem mais; quando cai, o contrário, e a renda variável costuma ficar relativamente mais atrativa. Ela serve de base para a remuneração do Tesouro Selic e influencia o CDI.'),
            lesson('inv-ipca', 'IPCA', 5,
              ['O que o IPCA mede', 'Títulos atrelados ao IPCA', 'Proteção do poder de compra'],
              'O IPCA é o índice oficial de inflação do Brasil, medido pelo IBGE a partir de uma cesta de preços de consumo das famílias. A política de juros do Banco Central busca manter o IPCA perto da meta definida pelo Conselho Monetário Nacional.\n\nInvestimentos "IPCA + X%" pagam a inflação do período mais uma taxa fixa, garantindo ganho real se levados até o vencimento. São muito usados para objetivos de longo prazo, como aposentadoria.'),
            lesson('inv-liquidez-rf', 'Liquidez na renda fixa', 5,
              ['Liquidez diária, com carência e no vencimento', 'O custo de sair antes', 'Como escolher'],
              'Na renda fixa há três situações comuns: liquidez diária (resgata quando quiser), carência (só a partir de uma data) e liquidez no vencimento (só no fim do prazo).\n\nAlguns títulos podem ser vendidos antes, no mercado secundário, mas o preço depende das condições do momento e pode gerar perda. A regra prática: o dinheiro que pode ser necessário a qualquer momento fica em liquidez diária; o restante pode buscar taxas melhores em prazos maiores.'),
            lesson('inv-vencimento', 'Vencimento', 6,
              ['O que é a data de vencimento', 'Marcação a mercado', 'Casar vencimento com objetivo'],
              'O vencimento é a data em que o emissor devolve o dinheiro com a rentabilidade combinada. Se você levar o título até lá, recebe exatamente o que foi contratado (salvo calote do emissor).\n\nAntes do vencimento, títulos prefixados e atrelados à inflação têm o preço recalculado todos os dias conforme as taxas do mercado (marcação a mercado). Se os juros sobem, o preço cai, e vice-versa. Escolher um vencimento próximo da data do seu objetivo evita ter que vender na hora errada.',
              [{ type: 'glossario', title: 'Marcação a mercado', term: 'Marcação a mercado' }]),
          ],
          quiz: {
            questions: [
              { q: 'Qual o principal risco de um CDB?', options: ['Risco de o banco emissor não pagar (crédito)', 'Risco de a bolsa cair', 'Risco cambial', 'Não há risco algum'], correct: 0, explain: 'O CDB é uma dívida do banco; o risco central é de crédito, mitigado pelo FGC até o limite.' },
              { q: 'O que significa um CDB que paga "110% do CDI"?', options: ['Rende 110% ao ano', 'Rende 10% a mais do que a taxa CDI do período', 'Rende 10% ao mês', 'Rende a inflação mais 10%'], correct: 1, explain: 'O percentual é aplicado sobre o CDI: 110% do CDI = CDI × 1,10.' },
              { q: 'Por que um Tesouro IPCA+ vendido antes do vencimento pode dar prejuízo?', options: ['Porque há multa por resgate antecipado', 'Por causa da marcação a mercado: se os juros sobem, o preço cai', 'Porque perde a correção pela inflação', 'Não pode dar prejuízo'], correct: 1, explain: 'Antes do vencimento, o preço segue as taxas de mercado e pode ficar abaixo do valor aplicado.' },
              { q: 'Uma característica comum de LCI e LCA para pessoa física é:', options: ['Liquidez diária sempre', 'Isenção de Imposto de Renda pela regra atual', 'Garantia do Tesouro Nacional', 'Rentabilidade atrelada ao dólar'], correct: 1, explain: 'LCI e LCA são isentas de IR para pessoa física (confira sempre a regra vigente) e costumam ter carência.' }
            ]
          }
        },
        {
          id: 'inv-m3',
          title: 'Renda variável',
          lessons: [
            lesson('inv-acoes', 'Ações', 8,
              ['O que é uma ação', 'Como se ganha com ações', 'Como comprar pela corretora'],
              'Uma ação é uma pequena parte de uma empresa. Ao comprar, você se torna sócio e passa a participar dos resultados, bons ou ruins.\n\nO ganho vem de duas fontes: valorização (vender por mais do que pagou) e proventos (dividendos e juros sobre capital próprio). As ações são negociadas na B3 por meio de uma corretora, em lotes ou no mercado fracionário. O preço oscila todos os dias e pode ficar abaixo do que você pagou por longos períodos.'),
            lesson('inv-etfs', 'ETFs', 6,
              ['O que é um ETF', 'Diversificação em uma única compra', 'Custos e tributação'],
              'O ETF é um fundo negociado em bolsa que busca replicar um índice. Um ETF que segue o Ibovespa, por exemplo, dá exposição às principais ações brasileiras em uma única compra.\n\nVantagens: diversificação instantânea, custo geralmente baixo (taxa de administração) e simplicidade. Na tributação, o ganho com ETFs de ações é tributado em 15% e não tem a isenção de vendas até R$ 20 mil por mês que vale para ações.'),
            lesson('inv-fiis', 'FIIs — Fundos imobiliários', 7,
              ['O que é um fundo imobiliário', 'Fundos de tijolo e de papel', 'Rendimentos mensais e riscos'],
              'Um FII reúne o dinheiro de vários investidores para aplicar no mercado imobiliário: imóveis (shoppings, galpões, lajes corporativas) ou títulos ligados ao setor, como CRIs. As cotas são negociadas na B3.\n\nOs FIIs costumam distribuir rendimentos mensais, que hoje são isentos de IR para pessoa física sob certas condições; o lucro na venda das cotas é tributado. Riscos: vacância, inadimplência de inquilinos, oscilação do preço da cota e mudanças de regra.'),
            lesson('inv-dividendos', 'Dividendos', 6,
              ['O que são dividendos', 'Dividend yield', 'Dividendos não são "dinheiro extra"'],
              'Dividendos são a parte do lucro que a empresa distribui aos acionistas. O dividend yield compara os dividendos pagos com o preço da ação (ex.: R$ 2 por ano numa ação de R$ 40 = 5%).\n\nNo dia em que o direito ao dividendo é definido, o preço da ação tende a cair aproximadamente o valor distribuído: o dividendo não é dinheiro "extra", é parte do valor da empresa indo para o seu bolso. Yield alto isolado pode ser armadilha, então olhe a saúde da empresa. As regras de tributação de dividendos passaram por mudanças recentes; confira a vigente.'),
            lesson('inv-valorizacao', 'Valorização', 5,
              ['Ganho de capital', 'O que move o preço de uma ação', 'Preço x valor'],
              'Valorização é o aumento do preço de um ativo. Com ações, o ganho de capital acontece quando você vende por mais do que pagou.\n\nNo longo prazo, o preço tende a acompanhar os lucros e as perspectivas da empresa; no curto prazo, é influenciado por juros, notícias e humor do mercado. Preço é o que você paga, valor é o que a empresa entrega. Nas vendas de ações, há isenção de IR para vendas de até R$ 20 mil por mês (operações comuns); acima disso, o lucro é tributado em 15%.'),
            lesson('inv-volatilidade', 'Volatilidade', 5,
              ['O que é volatilidade', 'Volatilidade não é perda', 'Como lidar emocionalmente'],
              'Volatilidade mede a intensidade das oscilações de preço. Ativos muito voláteis sobem e descem forte em pouco tempo.\n\nOscilar não é o mesmo que perder: a perda só se concretiza se você vender em baixa. O maior risco para o iniciante costuma ser o comportamento: vender no pânico e comprar na euforia. Por isso, só coloque em renda variável o dinheiro que pode ficar investido por anos.'),
            lesson('inv-riscos', 'Riscos', 6,
              ['Risco de mercado e risco da empresa', 'Concentração', 'Golpes e promessas de ganho fácil'],
              'Na renda variável, os principais riscos são o de mercado (tudo cai junto em uma crise), o específico da empresa (má gestão, perda de mercado, fraude) e o de liquidez em ativos pouco negociados.\n\nConcentrar tudo em poucas ações aumenta o risco específico. E cuidado com "dicas quentes", grupos que prometem ganhos rápidos e sinais de day trade: segundo estudos sobre o comportamento de pessoas físicas, a imensa maioria dos que insistem no day trade perde dinheiro.'),
          ],
          quiz: {
            questions: [
              { q: 'Ao comprar uma ação, você se torna:', options: ['Credor da empresa', 'Sócio da empresa', 'Funcionário da empresa', 'Cliente preferencial'], correct: 1, explain: 'A ação representa uma fração do capital da empresa, então você vira sócio.' },
              { q: 'Qual é a principal vantagem de um ETF para o iniciante?', options: ['Rentabilidade garantida', 'Diversificação em uma única compra', 'Isenção total de imposto', 'Não oscila'], correct: 1, explain: 'O ETF replica um índice com várias ações, diversificando em uma só compra.' },
              { q: 'Uma ação oscilou 20% para baixo no mês. Isso significa que:', options: ['O investidor perdeu 20% definitivamente', 'Só há perda realizada se ele vender nesse preço', 'A empresa faliu', 'A corretora deve devolver a diferença'], correct: 1, explain: 'Oscilação é perda potencial; ela só se realiza na venda.' },
              { q: 'O que acontece com o preço da ação quando o direito ao dividendo é definido?', options: ['Sobe o valor do dividendo', 'Tende a cair aproximadamente o valor do dividendo', 'Não muda', 'Dobra'], correct: 1, explain: 'O dividendo sai do caixa da empresa, e o preço se ajusta de forma aproximada.' }
            ]
          }
        },
        {
          id: 'inv-m4',
          title: 'Montando uma estratégia',
          lessons: [
            lesson('inv-diversificacao', 'Diversificação', 7,
              ['Por que não colocar todos os ovos na mesma cesta', 'Diversificar entre classes, emissores e prazos', 'Diversificação excessiva'],
              'Diversificar é distribuir o dinheiro entre ativos que não se comportam da mesma forma, para que um problema isolado não comprometa tudo.\n\nVale diversificar entre classes (renda fixa, ações, FIIs), entre emissores (bancos e empresas diferentes, respeitando o limite do FGC) e entre prazos. Ter 40 ativos que você não entende não é diversificação: é bagunça. Poucos ativos bem escolhidos e diferentes entre si já ajudam muito.'),
            lesson('inv-horizonte', 'Horizonte de investimento', 5,
              ['O que é horizonte', 'Horizonte e tolerância à oscilação', 'Reduzir o risco perto da data do objetivo'],
              'Horizonte é o tempo até você precisar do dinheiro. Quanto maior o horizonte, mais tempo a carteira tem para se recuperar de quedas, e mais faz sentido ter renda variável.\n\nConforme a data do objetivo se aproxima, é prudente migrar gradualmente para ativos mais estáveis, para não depender da sorte do mercado no ano em que precisar do dinheiro.'),
            lesson('inv-objetivos-estrategia', 'Objetivos', 5,
              ['Uma carteira por objetivo', 'Exemplo prático de alocação', 'Revisar objetivos periodicamente'],
              'Uma forma simples de montar a estratégia é separar o dinheiro por objetivo, cada um com sua própria alocação: reserva de emergência em liquidez diária; objetivo de 3 anos em renda fixa com vencimento próximo; aposentadoria com parte em IPCA+ longo e parte em renda variável.\n\nRevise os objetivos pelo menos uma vez por ano, ou quando algo importante mudar na sua vida.'),
            lesson('inv-risco-retorno-estrategia', 'Relação entre risco e retorno', 6,
              ['A fronteira entre risco e retorno na carteira', 'Rebalanceamento', 'Retorno esperado não é retorno garantido'],
              'Na carteira, risco e retorno andam juntos: mais renda variável aumenta o retorno esperado no longo prazo e também as oscilações no caminho. A proporção certa depende do seu perfil e do seu horizonte.\n\nDefinida a proporção (ex.: 70% renda fixa, 30% renda variável), o rebalanceamento periódico traz a carteira de volta ao alvo. Isso obriga a vender o que subiu muito e comprar o que ficou para trás. Lembre-se: retorno esperado é uma estimativa, nunca uma promessa.'),
            lesson('inv-aportes', 'Aportes periódicos', 5,
              ['O poder da constância', 'Preço médio', 'Aumentar os aportes com o tempo'],
              'Aportes periódicos (investir um valor todo mês) costumam pesar mais no resultado dos primeiros anos do que a rentabilidade em si. Com o tempo, os juros compostos ganham protagonismo.\n\nNa renda variável, aportar regularmente dilui o preço médio: você compra mais cotas quando está barato e menos quando está caro, sem tentar adivinhar o mercado. Automatize o aporte e aumente o valor a cada aumento de renda.'),
          ],
          quiz: {
            questions: [
              { q: 'Diversificar uma carteira significa:', options: ['Ter o maior número possível de ativos', 'Distribuir entre ativos que se comportam de formas diferentes', 'Investir só em renda fixa', 'Trocar de investimento todo mês'], correct: 1, explain: 'Diversificação é combinar ativos diferentes para que um problema isolado não comprometa tudo.' },
              { q: 'Para um objetivo daqui a 1 ano, o mais adequado costuma ser:', options: ['Ações de empresas pequenas', 'Renda fixa com baixa oscilação e prazo compatível', 'Criptomoedas', 'Day trade'], correct: 1, explain: 'Prazo curto pede estabilidade: a renda variável pode estar em queda justo quando você precisar.' },
              { q: 'O que é rebalancear a carteira?', options: ['Vender tudo quando o mercado cai', 'Trazer a carteira de volta à proporção-alvo definida', 'Trocar de corretora', 'Resgatar os rendimentos'], correct: 1, explain: 'Rebalancear é ajustar as proporções de volta ao alvo, vendendo o que passou do alvo e comprando o que ficou abaixo.' },
              { q: 'Qual o principal benefício de fazer aportes todo mês?', options: ['Garante lucro', 'Constância e diluição do preço médio sem tentar adivinhar o mercado', 'Elimina o imposto', 'Evita qualquer oscilação'], correct: 1, explain: 'A constância aumenta o patrimônio e dilui o preço médio de compra.' }
            ]
          }
        }
      ]
    }
  ];

  /* ------------------------------------------------------------------ *
   * TRILHA RECOMENDADA
   * ------------------------------------------------------------------ */
  const TRAIL = [
    { title: 'Organização financeira', lessons: ['fz-renda', 'fz-despesas', 'fz-fixos-variaveis', 'fz-orcamento'] },
    { title: 'Controle de gastos', lessons: ['fz-controle', 'fz-impulso'] },
    { title: 'Metas financeiras', lessons: ['fz-por-que-guardar', 'fz-habito', 'fz-metas'] },
    { title: 'Reserva de emergência', lessons: ['fz-reserva'] },
    { title: 'Fundamentos dos investimentos', lessons: ['fz-o-que-e-investir', 'fz-por-que-investir', 'fz-risco-retorno', 'fz-liquidez', 'fz-prazo', 'fz-inflacao', 'fz-juros-compostos', 'inv-o-que-sao', 'inv-mercado', 'inv-poupar-investir', 'inv-perfil', 'inv-objetivos'] },
    { title: 'Renda fixa', lessons: ['inv-poupanca', 'inv-cdb', 'inv-tesouro', 'inv-lci', 'inv-lca', 'inv-cdi', 'inv-selic', 'inv-ipca', 'inv-liquidez-rf', 'inv-vencimento'] },
    { title: 'Renda variável', lessons: ['inv-acoes', 'inv-etfs', 'inv-fiis', 'inv-dividendos', 'inv-valorizacao', 'inv-volatilidade', 'inv-riscos'] },
    { title: 'Diversificação', lessons: ['inv-diversificacao', 'inv-horizonte', 'inv-objetivos-estrategia', 'inv-risco-retorno-estrategia', 'inv-aportes'] }
  ];

  /* ------------------------------------------------------------------ *
   * BIBLIOTECA
   * ------------------------------------------------------------------ */
  const ARTICLES = [
    {
      id: 'art-cdi',
      title: 'Como funciona o CDI?',
      minutes: 3,
      body: 'Todo dia, os bancos fecham o expediente com saldo positivo ou negativo. Quem ficou no negativo pega dinheiro emprestado, por um dia, com quem sobrou. A taxa média desses empréstimos é o CDI.\n\nComo esses empréstimos são quase sem risco e de prazo curtíssimo, o CDI fica colado na Selic, a taxa básica de juros. Por isso ele virou a régua da renda fixa: quando alguém diz que um CDB paga "100% do CDI", está dizendo que ele rende o mesmo que essa taxa.\n\nNa prática: se o CDI está em 10% ao ano, um CDB de 100% do CDI rende cerca de 10% ao ano antes do imposto; um de 120% do CDI rende cerca de 12%. Para comparar com investimentos isentos (LCI, LCA), desconte o Imposto de Renda do tributado primeiro.'
    },
    {
      id: 'art-selic',
      title: 'O que é Selic?',
      minutes: 3,
      body: 'A Selic é a taxa básica de juros da economia brasileira. A meta é decidida pelo Copom, comitê do Banco Central que se reúne oito vezes por ano.\n\nEla é a principal ferramenta contra a inflação: juros mais altos encarecem o crédito, desestimulam o consumo e seguram os preços; juros mais baixos fazem o contrário.\n\nPara quem investe, a Selic mexe em tudo: define o rendimento do Tesouro Selic, puxa o CDI (e, com ele, CDBs, LCIs e LCAs pós-fixados) e até a regra da poupança, que muda quando a Selic fica abaixo ou acima de 8,5% ao ano.'
    },
    {
      id: 'art-juros-compostos',
      title: 'O que são juros compostos?',
      minutes: 4,
      body: 'Nos juros simples, os juros são calculados sempre sobre o valor inicial. Nos compostos, cada rendimento é somado ao saldo e passa a render também: juros sobre juros.\n\nA fórmula é M = C × (1 + i)^n. Com R$ 1.000 a 1% ao mês: em juros simples, após 10 anos você teria R$ 2.200; em juros compostos, cerca de R$ 3.300.\n\nDuas lições saem daí. Primeira: tempo é o ingrediente mais poderoso, e começar cedo, mesmo com pouco, faz muita diferença. Segunda: o mesmo mecanismo faz as dívidas de cartão de crédito e cheque especial crescerem muito rápido, e quitá-las costuma ser o melhor "investimento" disponível.'
    },
    {
      id: 'art-reserva',
      title: 'Como montar uma reserva de emergência?',
      minutes: 4,
      body: '1. Calcule seus gastos essenciais mensais: moradia, alimentação, transporte, saúde, contas básicas.\n\n2. Multiplique pelo número de meses de proteção: 3 a 6 meses para quem tem renda estável, 6 a 12 para autônomos ou renda variável.\n\n3. Escolha onde guardar: algo seguro e com liquidez diária, como Tesouro Selic ou CDB de liquidez diária a pelo menos 100% do CDI em instituição sólida. Evite deixar na conta corrente (não rende) e evite renda variável (pode estar em queda justo quando você precisar).\n\n4. Defina um valor mensal e automatize. A reserva vem antes de outros investimentos.\n\n5. Use só para emergências de verdade e, depois de usar, reponha antes de retomar os outros objetivos.'
    },
    {
      id: 'art-golpes',
      title: 'Como reconhecer golpes financeiros',
      minutes: 3,
      body: 'Alguns sinais aparecem em quase todo golpe: promessa de retorno alto e garantido, pressão para decidir rápido, pedido para recrutar outras pessoas, pagamento por PIX para pessoa física e empresas sem autorização da CVM ou do Banco Central.\n\nAntes de investir, pesquise a instituição nos sites da CVM e do Banco Central e desconfie de perfis em redes sociais que exibem lucros fáceis. Se parece bom demais para ser verdade, provavelmente é golpe.'
    }
  ];

  const QUICK_VIDEOS = [
    { id: 'qv-cdi', title: 'O que é Selic e CDI?', topic: 'CDI', videoId: 'R0AQyTIvcvI', channel: 'Me Poupe!' },
    { id: 'qv-selic', title: 'O que é a taxa Selic e como ela funciona', topic: 'Selic', videoId: 'WBNkhIaY7gc', channel: 'Nexo Jornal' },
    { id: 'qv-juros', title: 'Juros compostos do zero', topic: 'Juros compostos', videoId: 'yabjWCfSOrE', channel: 'Toda Matéria' },
    { id: 'qv-reserva', title: 'Onde deixar a reserva de emergência', topic: 'Reserva de emergência', videoId: 'tGxauPEkGcs', channel: 'Sofia Abreu' },
    { id: 'qv-tesouro', title: 'Tesouro Direto em minutos', topic: 'Tesouro Direto', videoId: 'PGiShbP_yT8', channel: 'Bastter.com' },
    { id: 'qv-ir', title: 'Como declarar investimentos no IR', topic: 'Imposto de Renda', videoId: '2z3ihBCZCwo', channel: 'Prof. Elisson de Andrade' }
  ];

  const GLOSSARY = [
    { term: 'Ação', def: 'Menor fração do capital de uma empresa. Quem compra ações se torna sócio e participa dos resultados, positivos ou negativos.' },
    { term: 'Aporte', def: 'Cada valor novo que você coloca em um investimento.' },
    { term: 'B3', def: 'A bolsa de valores do Brasil, onde são negociados ações, FIIs, ETFs e outros ativos, e onde ficam registrados muitos investimentos.' },
    { term: 'Carência', def: 'Prazo mínimo durante o qual não é possível resgatar um investimento.' },
    { term: 'CDB', def: 'Certificado de Depósito Bancário. Título de renda fixa emitido por bancos: você empresta dinheiro ao banco e recebe juros. Coberto pelo FGC até o limite.' },
    { term: 'CDI', def: 'Certificado de Depósito Interbancário. Taxa média dos empréstimos de um dia entre bancos; fica muito próxima da Selic e é a principal referência da renda fixa pós-fixada.' },
    { term: 'Come-cotas', def: 'Cobrança semestral antecipada de Imposto de Renda em alguns fundos de investimento, feita em maio e novembro.' },
    { term: 'Copom', def: 'Comitê de Política Monetária do Banco Central, que define a meta da taxa Selic.' },
    { term: 'Corretora', def: 'Instituição autorizada que intermedeia a compra e venda de investimentos, como ações, títulos e fundos.' },
    { term: 'CVM', def: 'Comissão de Valores Mobiliários. Órgão que regula e fiscaliza o mercado de capitais no Brasil.' },
    { term: 'Diversificação', def: 'Distribuir o dinheiro entre ativos com comportamentos diferentes para reduzir o impacto de um problema isolado.' },
    { term: 'Dividend yield', def: 'Relação entre os dividendos pagos em 12 meses e o preço da ação.' },
    { term: 'Dividendos', def: 'Parte do lucro de uma empresa distribuída aos acionistas.' },
    { term: 'ETF', def: 'Fundo negociado em bolsa que busca replicar um índice, como o Ibovespa. Permite diversificar com uma única compra.' },
    { term: 'FGC', def: 'Fundo Garantidor de Créditos. Garante até R$ 250 mil por CPF por instituição (com teto global) em produtos como poupança, CDB, LCI e LCA, caso o banco quebre.' },
    { term: 'FII', def: 'Fundo de Investimento Imobiliário. Reúne recursos de vários investidores para aplicar em imóveis ou títulos do setor; as cotas são negociadas na B3.' },
    { term: 'Ibovespa', def: 'Principal índice da bolsa brasileira, formado pelas ações mais negociadas da B3.' },
    { term: 'Inflação', def: 'Aumento generalizado dos preços ao longo do tempo, que reduz o poder de compra do dinheiro.' },
    { term: 'IOF', def: 'Imposto sobre Operações Financeiras. Em renda fixa, incide sobre o rendimento de resgates feitos antes de 30 dias, de forma regressiva.' },
    { term: 'IPCA', def: 'Índice Nacional de Preços ao Consumidor Amplo, medido pelo IBGE. É o índice oficial de inflação do Brasil.' },
    { term: 'LCA', def: 'Letra de Crédito do Agronegócio. Título emitido por bancos para financiar o agronegócio; isento de IR para pessoa física pela regra atual e coberto pelo FGC.' },
    { term: 'LCI', def: 'Letra de Crédito Imobiliário. Título emitido por bancos para financiar o setor imobiliário; isento de IR para pessoa física pela regra atual e coberto pelo FGC.' },
    { term: 'Liquidez', def: 'Facilidade e rapidez com que um investimento pode ser transformado em dinheiro sem perda de valor.' },
    { term: 'Marcação a mercado', def: 'Atualização diária do preço de um título conforme as taxas de juros do mercado. Faz o valor de títulos prefixados e IPCA+ oscilar antes do vencimento.' },
    { term: 'Perfil de investidor', def: 'Classificação (conservador, moderado, arrojado) que indica quanto risco a pessoa aceita correr. Definida pelo questionário de suitability.' },
    { term: 'Pós-fixado', def: 'Investimento cuja rentabilidade acompanha um indicador, como o CDI ou a Selic, e só é conhecida ao final.' },
    { term: 'Prefixado', def: 'Investimento com taxa definida no momento da aplicação (ex.: 12% ao ano).' },
    { term: 'Renda líquida', def: 'O que efetivamente entra na conta depois dos descontos obrigatórios, como INSS e Imposto de Renda.' },
    { term: 'Rentabilidade real', def: 'Rentabilidade descontada a inflação. Mostra se o poder de compra realmente aumentou.' },
    { term: 'Reserva de emergência', def: 'Dinheiro guardado para imprevistos, geralmente de 3 a 6 meses de gastos essenciais, em aplicação segura e de liquidez diária.' },
    { term: 'Risco de crédito', def: 'Risco de quem recebeu o dinheiro (banco, empresa ou governo) não pagar o combinado.' },
    { term: 'Selic', def: 'Taxa básica de juros da economia brasileira, definida pelo Copom. Serve de referência para as demais taxas.' },
    { term: 'Suitability', def: 'Análise obrigatória que verifica se um investimento é adequado ao perfil, aos objetivos e à situação financeira do cliente.' },
    { term: 'Tesouro Direto', def: 'Programa do Tesouro Nacional para pessoas físicas comprarem títulos públicos federais pela internet.' },
    { term: 'Tesouro IPCA+', def: 'Título público que paga a inflação (IPCA) mais uma taxa fixa. Indicado para objetivos de longo prazo.' },
    { term: 'Tesouro Selic', def: 'Título público pós-fixado que acompanha a Selic. Oscila pouco e é muito usado para a reserva de emergência.' },
    { term: 'TR', def: 'Taxa Referencial. Índice que compõe o rendimento da poupança; costuma ser muito baixo.' },
    { term: 'Vencimento', def: 'Data em que o emissor devolve o valor investido com a rentabilidade combinada.' },
    { term: 'Volatilidade', def: 'Intensidade das oscilações de preço de um ativo. Mais volatilidade significa variações maiores para cima e para baixo.' }
  ];

  window.RAISIN_CONTENT = {
    version: 1,
    disclaimer: DISCLAIMER,
    courses: COURSES,
    trail: TRAIL,
    library: { articles: ARTICLES, videos: QUICK_VIDEOS, glossary: GLOSSARY }
  };
})();
