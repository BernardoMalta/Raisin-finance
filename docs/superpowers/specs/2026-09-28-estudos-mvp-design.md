# MVP — Área de Estudos

## Objetivo

Transformar a Raisin Finance em uma demonstração de plataforma de educação financeira: o aluno encontra cursos, acompanha uma trilha progressiva, realiza aulas e quizzes, ganha XP e emite certificados.

## Escopo da competição

O projeto permanece uma aplicação estática em HTML, CSS e JavaScript. Não haverá autenticação, banco de dados, upload de conteúdo ou painel administrativo neste MVP. Os dados de demonstração e o progresso individual serão gravados no `localStorage` do navegador.

## Navegação e telas

- O menu principal exibirá **Estudos** no lugar da atual aba Aprender.
- A página Estudos terá uma trilha recomendada, resumo de XP e cards de cursos com capa, nível, quantidade/duração de aulas e progresso.
- Cada curso terá módulos e aulas ordenadas. A primeira aula disponível será destacada como a próxima aula; aulas seguintes ficam bloqueadas até a anterior ser concluída.
- A tela da aula reunirá vídeo incorporado, objetivos de aprendizagem, resumo, material complementar e a ação de concluir aula. Na demonstração, a conclusão poderá ser habilitada após a interação com o vídeo; não será implementada medição confiável de 95% de reprodução, pois os vídeos são hospedados pelo YouTube e o MVP não tem uma integração de player.
- Ao terminar um módulo, um quiz curto libera XP. A resposta e a pontuação são persistidas.
- Ao concluir todas as aulas de um curso, o certificado existente será enriquecido com carga horária e um código de validação visual.
- O Dashboard exibirá o curso atual, porcentagem e botão para retomar na próxima aula.

## Conteúdo de demonstração

Dois cursos serão exibidos:

1. **Finanças do Zero** — organização financeira, orçamento, hábitos de economia, reserva e princípios de investimento.
2. **Investimentos para Iniciantes** — perfil de risco, renda fixa, renda variável e estratégia de aportes/diversificação.

O conteúdo usará linguagem simples, exemplos práticos e um aviso educativo: rentabilidade não é garantida e investimentos têm riscos.

## Estado e dados

`AppState` passará a guardar cursos, módulos, aulas, progresso, aula atual, quizzes respondidos, XP e certificados. `load()` e `save()` usarão `localStorage`, com dados iniciais apenas na primeira visita e mecanismo seguro para dados inválidos.

## Pontuação

- Concluir aula: +10 XP.
- Acertar quiz: +20 XP.
- Concluir módulo: +50 XP.
- Concluir curso: +200 XP.

O nível será apresentado como uma progressão visual simples, sem ranking ou recursos sociais.

## Limites explícitos

- Sem aconselhamento financeiro individual.
- Sem promessa de retorno ou recomendação de ativos.
- Sem login, analytics, upload, QR Code real ou verificação pública de certificado.
- O "vídeo assistido" é demonstrativo e não pode impedir burlas em um front-end sem servidor.

## Verificação

- Exercitar navegação entre Dashboard, Estudos, curso e aula.
- Verificar desbloqueio sequencial, quiz, XP, certificado e persistência após atualizar a página.
- Checar layout em viewport mobile e desktop e executar validação sintática do JavaScript.
