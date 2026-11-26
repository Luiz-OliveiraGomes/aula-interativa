# Possíveis implementações futuras

Este documento descreve propostas de evolução. O assistente de IA e a base RAG ainda não fazem parte da aplicação disponível neste repositório.

## 1. Organizar o acervo do professor

- Selecionar exercícios, resoluções e explicações que possam ser utilizados na plataforma.
- Identificar assunto, nível, enunciado, resolução, autoria e origem de cada material.
- Conferir fórmulas e símbolos após a importação de PDFs, fotografias ou documentos digitalizados.
- Registrar a revisão e a versão de cada resolução.

## 2. Construir a base de consulta com RAG

- Manter os documentos originais e dividir seu conteúdo em trechos com contexto suficiente.
- Criar um índice de busca que combine termos matemáticos e similaridade semântica.
- Vincular cada trecho ao exercício, à resolução e à localização no documento original.
- Recuperar os materiais relevantes antes de solicitar uma resposta ao modelo.
- Atualizar a base quando o professor acrescentar ou revisar uma resolução.

O acervo de resoluções será separado das estatísticas do contador de visitantes.

## 3. Integrar o assistente às atividades

- Oferecer um espaço para dúvidas sobre o conteúdo da página.
- Permitir dicas graduais e explicações passo a passo.
- Considerar funções e parâmetros selecionados pelo aluno quando isso ajudar na resolução.
- Indicar os materiais consultados e sinalizar quando não houver uma referência suficiente na base.
- Distinguir conteúdo revisado pelo professor de uma nova resposta produzida pelo assistente.

As credenciais de acesso ao serviço de IA permanecerão no servidor, fora do código enviado ao navegador e do repositório público.

## 4. Avaliar a qualidade e o uso

- Montar uma coleção de perguntas com respostas revisadas pelo professor.
- Conferir a recuperação dos documentos e a correção das explicações.
- Integrar ferramentas de cálculo simbólico ou numérico para verificações adequadas a cada tipo de exercício.
- Definir limites de utilização e acompanhar os custos de operação.
- Testar com um grupo pequeno antes de ampliar o acesso.

Esses recursos têm finalidade de apoio ao estudo. Nenhuma etapa pressupõe que o assistente resolverá todos os problemas sem erros.
