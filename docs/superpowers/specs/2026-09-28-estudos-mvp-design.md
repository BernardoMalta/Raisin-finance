# Área de Estudos — escopo implementado

> Atualizado em 28/09/2026. A versão anterior deste documento definia um MVP enxuto para a competição (sem admin, sem QR, sem medição de 95%). O escopo foi ampliado para a especificação completa da área de Estudos; os limites que continuam valendo por falta de backend estão na última seção.

## Objetivo

Uma "escola financeira dentro da plataforma": o usuário controla o dinheiro e também tem um caminho para aprender — Organizar → Guardar → Entender → Investir → Evoluir.

## Arquivos

- `courses.js` — só dados: cursos → módulos → aulas, quizzes, trilha, biblioteca (artigos, vídeos rápidos, glossário) e o aviso educativo. Todos os vídeos do YouTube foram verificados como públicos e incorporáveis.
- `script.js` — lógica (login, navegação, estudos, XP, certificado, admin, gastos).
- `index.html` / `style.css` — telas e estilos.

## O que existe

- **Menu:** Dashboard · Gastos · Estudos · Conquistas · Admin (só para administradores). Receitas, Metas e Investimentos ainda não existem como telas.
- **Estudos:** cards de curso com capa, descrição, nº de aulas, duração, nível e progresso; "continue de onde parou"; trilha de 8 passos; atalhos da biblioteca.
- **Cursos:** *Finanças do Zero* (3 módulos, 17 aulas) e *Investimentos para Iniciantes* (4 módulos, 27 aulas), com a estrutura de módulos da especificação.
- **Aula:** página própria com vídeo, "O que você vai aprender", resumo, material complementar (PDF, link, texto, infográfico, glossário), navegação anterior/próxima e sumário lateral com status (concluída, em andamento, bloqueada).
- **Conclusão por vídeo:** a aula conclui sozinha quando **95% do vídeo foi realmente assistido**. O player registra só os trechos reproduzidos em tempo real (até 2x de velocidade); pular para o fim não conta. Aulas sem vídeo são concluídas pela leitura.
- **Bloqueio sequencial:** cada aula libera a próxima. O quiz do módulo libera quando todas as aulas do módulo terminam.
- **Quiz:** 4 perguntas por módulo, feedback imediato com explicação, resultado salvo no perfil (melhor nota, tentativas).
- **XP e níveis:** aula +10, acerto +20, módulo +50, curso +200, cada um concedido uma única vez. Níveis: Iniciante (0), Aprendiz (150), Conhecedor (450), Investidor (900), Especialista (1500).
- **Certificado:** nome, curso, carga horária, data, código de validação e QR Code que abre a página pública `#verificar/...`.
- **Biblioteca:** artigos, vídeos rápidos e glossário com busca.
- **Dashboard:** card "Seu aprendizado" com curso atual, % e próxima aula.
- **Admin:** criar/editar/excluir/reordenar cursos, módulos, aulas e perguntas; definir resposta correta; vídeo por link do YouTube ou MP4; materiais por link; métricas de alunos e progresso; exportar/importar JSON; restaurar padrão; promover outros admins.

## Limites (sem backend)

- Tudo fica no `localStorage` do navegador. O Admin edita o conteúdo **deste navegador**; para publicar para todos, exporte o JSON e substitua os dados do `courses.js`.
- O primeiro usuário a entrar num navegador vira administrador.
- Upload de arquivos não existe: vídeos e PDFs entram por link.
- Métricas de alunos contam só as contas criadas no mesmo navegador.
- O código do certificado é um hash dos dados; a página de verificação detecta edição casual, mas quem ler o código-fonte consegue gerar códigos válidos. Autenticidade real exige um servidor que assine os certificados.
- A medição de 95% impede pular o vídeo pela interface, mas não impede quem edita o `localStorage` manualmente.
- Os vídeos do YouTube precisam que o site seja servido por HTTP(S) (ex.: GitHub Pages ou `python -m http.server`); abrindo o `index.html` direto do disco o player pode recusar a reprodução.

## Verificação

Teste de ponta a ponta com Chrome headless (47 verificações): cadastro e papéis, bloqueio de aulas, reprodução real no YouTube com tentativa de pular para 97% (não concluiu), conclusão de curso, XP, certificado + QR + verificação válida e adulterada, quiz e refazer sem XP duplicado, biblioteca, admin (edição, validação, salvar, restaurar), escape de HTML (sem XSS) e layout mobile 390px sem rolagem horizontal.
