<div align="center">

# Raisin Finance

**Controle do dinheiro e escola financeira no mesmo lugar.**

Registre seus gastos, acompanhe o orçamento e aprenda de verdade, com aulas em vídeo,
questionários, trilha guiada e certificado, do primeiro orçamento aos primeiros investimentos.

[**Abrir o site →**](https://bernardomalta.github.io/Raisin-finance/)

![HTML](https://img.shields.io/badge/HTML5-0B2545?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-0B2545?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-0B2545?logo=javascript&logoColor=F7DF1E)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-1F9D75)
![Responsivo](https://img.shields.io/badge/mobile-responsivo-1F9D75)

<img src="docs/screenshots/desktop-estudos.png" alt="Tela de Estudos com cursos, progresso e botão de continuar de onde parou" width="860">

</div>

---

## O que dá para fazer

**Organizar → Guardar → Entender → Investir → Evoluir**

| | |
|---|---|
| **Dashboard** | Gasto do mês, meta de economia, cursos concluídos e um card que leva direto para a próxima aula. |
| **Gastos** | Lançamento por categoria, limite mensal e barras de orçamento que mudam de cor quando o gasto aperta. |
| **Estudos** | 2 cursos, 7 módulos e 44 aulas em vídeo, cada uma com objetivos, resumo e material complementar. |
| **Trilha** | 8 passos em sequência para quem não sabe por onde começar: da organização financeira à diversificação. |
| **Questionários** | 4 perguntas ao fim de cada módulo, com correção na hora e explicação da resposta. |
| **Conquistas** | XP, 5 níveis (Iniciante → Especialista), certificados e histórico dos questionários. |
| **Biblioteca** | Artigos curtos, vídeos de 2 a 10 minutos e glossário com busca. |
| **Admin** | Cria e edita cursos, módulos, aulas e perguntas sem mexer no código, e acompanha o progresso dos alunos. |

### Cursos

- **Finanças do Zero** (17 aulas): renda e despesas, orçamento 50/30/20, controle de gastos, hábito de guardar, metas, reserva de emergência, risco, liquidez, inflação e juros compostos.
- **Investimentos para Iniciantes** (27 aulas): mercado financeiro, perfil de risco, poupança, CDB, Tesouro Direto, LCI/LCA, CDI, Selic, IPCA, ações, ETFs, FIIs, dividendos, diversificação e aportes.

Todo o conteúdo é educativo: a plataforma deixa claro que rentabilidade não é garantida e que cada investimento tem riscos diferentes.

## Como funciona o progresso

- **Aula concluída só com o vídeo realmente assistido.** A aula fecha sozinha em 95%, e a plataforma conta apenas o tempo reproduzido de verdade (até 2x de velocidade). Arrastar a barra até o fim não conta.
- **Aulas liberadas em ordem.** Cada aula libera a seguinte, e o questionário do módulo libera quando todas as aulas terminam.
- **Continue de onde parou.** O vídeo retoma no ponto em que você saiu, e o Dashboard mostra a próxima aula.
- **XP sem farm.** Cada ação rende XP uma única vez:

  | Ação | XP |
  |---|---|
  | Assistir uma aula | +10 |
  | Acertar uma pergunta | +20 |
  | Concluir um módulo | +50 |
  | Concluir um curso | +200 |

- **Certificado** com nome, curso, carga horária, data, código de validação e **QR Code** que abre uma página pública de verificação.

## Telas

<table>
<tr>
<td width="50%"><img src="docs/screenshots/desktop-aula.png" alt="Aula com vídeo, progresso assistido e sumário do curso"><br><sub><b>Aula</b>: vídeo, % assistido e sumário com aulas concluídas, em andamento e bloqueadas.</sub></td>
<td width="50%"><img src="docs/screenshots/desktop-conquistas.png" alt="Conquistas com nível, XP e progresso geral"><br><sub><b>Conquistas</b>: nível, XP até o próximo nível e progresso geral.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/desktop-certificado.png" alt="Certificado de conclusão com QR Code"><br><sub><b>Certificado</b>: código de validação e QR Code de verificação.</sub></td>
<td><img src="docs/screenshots/desktop-admin.png" alt="Painel administrativo de cursos e aulas"><br><sub><b>Admin</b>: cursos, módulos, aulas e questionários editáveis.</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/desktop-dashboard.png" alt="Dashboard com resumo financeiro e card de aprendizado"><br><sub><b>Dashboard</b>: finanças e estudos no mesmo painel.</sub></td>
<td>
<img src="docs/screenshots/mobile-estudos.png" alt="Estudos no celular" width="32%">
<img src="docs/screenshots/mobile-aula.png" alt="Aula no celular" width="32%">
<img src="docs/screenshots/mobile-quiz.png" alt="Questionário no celular" width="32%">
<br><sub><b>No celular</b>: navegação inferior, testado de 320 px a 1440 px.</sub>
</td>
</tr>
</table>

## Rodando localmente

Não há build nem dependências. Só é preciso servir a pasta por HTTP, porque o player do YouTube não funciona abrindo o arquivo direto do disco:

```bash
git clone https://github.com/BernardoMalta/Raisin-finance.git
cd Raisin-finance
python -m http.server 8000
# abra http://localhost:8000
```

> **Primeiro acesso:** a primeira conta criada no navegador vira administradora e ganha acesso à aba **Admin**.

## Estrutura

```
index.html     telas (login, dashboard, gastos, estudos, aula, quiz, biblioteca, conquistas, admin)
style.css      estilos, mobile-first
script.js      lógica: contas, navegação, progresso das aulas, XP, certificado, admin, gastos
courses.js     conteúdo: cursos, módulos, aulas, quizzes, trilha, artigos, vídeos e glossário
docs/          documento de escopo e screenshots
```

O conteúdo fica separado da lógica. Para adicionar ou alterar cursos, use a aba **Admin** ou edite o `courses.js`. O Admin também exporta e importa o conteúdo em JSON.

## Limitações conhecidas

O projeto é um site estático, sem servidor. Isso significa que:

- Contas, progresso e gastos ficam no `localStorage` de cada navegador.
- As edições feitas no Admin valem só para aquele navegador. Para publicar para todos, exporte o JSON e substitua os dados do `courses.js`.
- Vídeos e PDFs entram por link, porque não há upload de arquivos.
- O código do certificado detecta alterações casuais, mas só um servidor que assine os certificados garante autenticidade de verdade.

Esses são os próximos passos naturais com um backend.

## Créditos

Desenvolvido por **Vinicius** e **Bernardo Malta**. As aulas usam vídeos públicos de canais brasileiros de educação financeira no YouTube, com os créditos exibidos no próprio player.
