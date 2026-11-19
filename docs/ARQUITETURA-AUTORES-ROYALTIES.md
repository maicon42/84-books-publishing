# Arquitetura técnica — Autores, contratos e royalties
## 84 Books Publishing

**Versão:** 1.0  
**Política:** 90/10 sobre vendas líquidas; 70/30 sobre receita líquida de anúncios recompensados atribuída a livros gratuitos.

## 1. Estado desta entrega

Esta etapa prepara o modelo de dados, segurança e armazenamento no Supabase. Não liga ainda um fornecedor de pagamentos nem uma rede de anúncios. Não existe cobrança real, venda concluída ou recompensa válida até a integração de um fornecedor e a respetiva confirmação no servidor.

## 2. Fluxo editorial

1. O utilizador autenticado cria um rascunho em `author_submissions`.
2. O manuscrito e a capa ficam em buckets privados, em pastas cujo primeiro segmento é o UUID do autor.
3. O autor declara que detém os direitos e aceita a versão identificada do contrato. A aceitação fica em `author_contract_acceptances`, com cópia dos termos aceites e data/hora.
4. O autor submete. O estado passa a `submitted`.
5. A equipa editorial consulta a fila, analisa direitos e ficheiros, e altera o estado para `under_review`, `changes_requested`, `approved` ou `rejected`.
6. Após aprovação, um administrador cria a ficha em `books`, liga `author_user_id` e publica apenas depois de a verificação de direitos estar concluída.
7. O autor consulta as próprias submissões, livros, extratos e pagamentos. Não pode aprovar a própria obra nem alterar os seus valores financeiros.

## 3. Tabelas criadas

| Tabela | Finalidade | Escrita permitida |
|---|---|---|
| `author_submissions` | Dados editoriais e estado da submissão | Autor cria/edita rascunho ou correção; admin gere |
| `author_contract_acceptances` | Prova da versão e termos aceites | Autor apenas insere a própria aceitação; sem edição |
| `rewarded_access_events` | Eventos de desbloqueio de leitura/download | Apenas backend verificador/admin |
| `book_sales` | Transações e cálculo líquido por venda | Apenas backend/admin |
| `author_royalty_statements` | Extratos agregados por obra e período | Apenas backend/admin |
| `author_payouts` | Histórico de pagamentos aos autores | Apenas backend/admin |

A tabela `books` recebe `author_user_id` e percentagens de partilha. Um trigger fixa automaticamente 90/10 para livros pagos, 70/30 para gratuitos e 0/100 para fichas “em preparação”.

## 4. Segurança

- RLS ativado em todas as tabelas novas.
- O autor só consulta as suas próprias submissões, aceitação contratual, eventos, vendas, extratos e pagamentos.
- A equipa usa o papel administrativo já existente, validado por `public.is_84books_admin()`.
- As tabelas financeiras não permitem escrita pelo navegador de um autor ou comprador.
- Os manuscritos e capas submetidos ficam em buckets privados; cada autor só pode enviar e consultar ficheiros na pasta do seu próprio UUID.
- A equipa administrativa pode analisar os ficheiros.
- Não colocar `service_role`, chaves secretas, credenciais de pagamento ou tokens de fornecedores no JavaScript público.
- A aceitação contratual é registada com versão e snapshot dos termos; não é uma assinatura qualificada por si só. A validade do mecanismo eletrónico deve ser revista juridicamente.

## 5. Cálculo de receitas

### Vendas pagas

`receita_liquida = valor_bruto - taxa_pagamento - imposto_transacao - reembolso_estorno`

`autor = receita_liquida × 0,90`

`plataforma = receita_liquida × 0,10`

A tabela `book_sales` conserva os montantes de cada transação. O servidor deve calcular e validar os valores a partir de notificações autenticadas do prestador de pagamento, com identificador de transação único e idempotência.

### Anúncios recompensados de livros gratuitos

`receita_liquida_anuncios = receita_confirmada_fornecedor - ajustes - estornos - impostos_aplicaveis`

`autor = receita_liquida_anuncios_atribuida × 0,70`

`plataforma = receita_liquida_anuncios_atribuida × 0,30`

O fornecedor pode não fornecer receita por livro. Nesse caso, a regra de atribuição proporcional deve ser publicada e aplicada de forma consistente, baseada em eventos válidos e confirmados, sem duplicações.

## 6. Acesso por anúncio recompensado

1. O navegador solicita ao backend um desbloqueio para um livro e uma ação (`read` ou `download`).
2. O backend cria uma tentativa pendente e comunica com o fornecedor.
3. O fornecedor confirma a recompensa por callback/verificação server-side.
4. O backend valida assinatura, identificador único, utilizador, livro, ação, prazo e ausência de reutilização.
5. Só então o evento passa a `verified` e o backend gera um URL assinado de curta duração ou concede acesso no leitor.
6. O evento é marcado como `consumed` quando utilizado.

**Não implementar cronómetro local como recompensa.** O leitor PDF atual permanece restrito ao administrador até esta integração estar operacional.

## 7. Pagamentos e extratos

O servidor recebe notificações autenticadas do prestador de pagamento, confirma a transação e grava `book_sales`. Os extratos são agregados em `author_royalty_statements`. A equipa regista transferências em `author_payouts`. O autor tem apenas leitura das próprias linhas.

Não armazenar palavras-passe, PIN, OTP, CVV ou números completos de cartão. Guardar apenas referências do fornecedor e identificadores mínimos necessários para reconciliação.

## 8. Próximas integrações necessárias

- Escolher fornecedor de pagamentos que opere em Angola e suporte notificações verificáveis.
- Escolher rede/fornecedor de anúncios recompensados compatível com o site e com o território.
- Implementar Edge Functions para criar tentativas, validar callbacks e emitir URLs assinados.
- Implementar painel do autor e fila administrativa na interface.
- Definir periodicidade, mínimo de pagamento, moeda e método de liquidação no contrato.
- Fazer testes com contas de autor, leitor e administrador antes de ativar vendas ou recompensas.

## 9. Limites e validação

A estrutura SQL é a base de segurança e contabilidade, não substitui integração de fornecedores, revisão fiscal ou revisão jurídica. A política e o contrato são minutas até validação profissional.