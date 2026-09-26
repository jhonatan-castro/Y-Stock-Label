# Sistema de Etiquetas de Estoque Yamaha

Aplicação web local para cadastrar chegadas e imprimir etiquetas completas de identificação (folhas A4 com grade de 3 colunas × 6 linhas = 18 etiquetas de 55 × 30 mm por folha).

## Como usar

Abra o arquivo `index.html` no Edge, Chrome ou Firefox. Não é necessário instalar Python, servidor ou banco de dados.

Os dados ficam salvos localmente neste navegador (`localStorage`). Use **Exportar para Excel** para salvar cópias de segurança.

---

## Tabela de Inserção de Chegadas (Impressão em Lote na Mesma Folha)

Para que seja possível cadastrar **todas as informações de múltiplos itens** (Código, Endereço, Unidade, Data de Chegada e Quantidade de etiquetas) e imprimi-los juntos na mesma folha:

### 1. Inserção Linha por Linha na Tabela
- A seção **Nova chegada** possui agora uma tabela dedicada onde cada linha recebe todos os dados completos da etiqueta:
  - **Código do item**
  - **Endereço**
  - **Unidade** (padrão: `UN`)
  - **Data de chegada** (padrão: data de hoje)
  - **Qtd etiquetas** (padrão: `1`)
- Pressione **Enter** no campo de endereço para criar e ir automaticamente para a próxima linha.
- Ou clique em **`+ Adicionar linha`**.
- Pressione **Ctrl + Enter** em qualquer linha para salvar e imprimir imediatamente.

### 2. Colar diretamente do Excel
- Você pode copiar linhas e colunas de uma planilha do Excel e:
  - Colar diretamente em qualquer célula da tabela com `Ctrl + V`.
  - Ou clicar no botão **`📋 Colar do Excel`**, colar o texto e clicar em **Inserir na tabela**.
  - O sistema preenche automaticamente Código, Endereço, Unidade, Data e Quantidade de cada item!

### 3. Informações completas na Etiqueta Impressa
Cada etiqueta gerada contém:
- **CÓDIGO DO ITEM** em destaque
- **LOGO YAMAHA** oficial
- **ENDEREÇO** do item
- **UNIDADE** (ex: UN)
- **DATA DE CHEGADA** formatada (DD/MM/YYYY)
- Moldura e linhas divisórias nas medidas padrão (55 × 30 mm).

### 4. Impressão múltipla a partir do Histórico
- Na tabela de **Histórico de chegadas**, marque os itens desejados pelas caixas de seleção (checkbox) e clique em **Imprimir selecionados na mesma página**.
