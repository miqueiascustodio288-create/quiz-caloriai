# 🥗 Quiz CaloriasFit — App de Calorias & Alimentação

Um quiz interativo de alta conversão para oferta de **Aplicativo de Calorias, Acompanhamento de Refeições por Foto, Macronutrientes e Hábitos Alimentares**.

O projeto conta com animações fluidas, efeitos sonoros táteis sintetizados (Web Audio API), micro-interações ("cliques" dinâmicos com ripple e feedback visual/sonoro), e a estrutura completa de 24 etapas com VSL e página de oferta final desbloqueável.

---

## 🚀 Como Executar

### Opção 1 — Direto no Navegador (Sem Instalação)
Basta dar um duplo clique no arquivo `index.html` ou abri-lo com qualquer navegador (Google Chrome, Microsoft Edge, Safari, Firefox). O aplicativo é 100% autossuficiente e funciona imediatamente.

### Opção 2 — Via Servidor Local Node.js
Se preferir rodar em um servidor local:
```bash
npm start
```
Ou:
```bash
node server.js
```
Acesse em: [http://localhost:3000](http://localhost:3000)

---

## 📋 Estrutura das 24 Etapas Implementadas (App de Calorias)

1. **Abertura e Faixa Etária**: Promessa principal ("Descubra uma forma mais simples de acompanhar suas calorias e sua alimentação"), faixa etária, microcopy e estimativa de tempo (~49s).
2. **Autoavaliação Corporal**: Percepção corporal neutra e respeitosa com silhuetas vetoriais elegantes.
3. **Dificuldades e Sensibilidades Alimentares**: Múltipla escolha (retenção/inchaço, intolerâncias, fome emocional, horários desregulados, etc.) com exclusividade mútua para "Não tenho restrições" e aviso ético.
4. **Dificuldade na Rotina Alimentar**: Intensidade emocional com emojis e cards táteis (porções, calorias e organização).
5. **Meta Principal**: Escolha do objetivo (perda de peso com déficit suave, controle de porções, proteínas para tônus, rotina organizada).
6. **Ponte de Prova Social**: Milhares de usuárias que organizaram a alimentação tirando fotos dos pratos no app sem passar fome.
7. **Meta Corporal & Bem-Estar**: Foco em leveza, tônus e paz com a comida.
8. **Autopercepção do Metabolismo**: Percepção neutra (dificuldade para queimar calorias, normal ou oscilante).
9. **Acompanhamento da Rotina & Consistência**: Dificuldade com métodos antigos de pesar comida vs. praticidade no celular.
10. **Percepção Corporal & Foco de Resultados**: Foco do app (barriga/cintura, retenção geral, firmeza muscular ou disposição).
11. **Mudanças na Alimentação e Peso**: Percepção de mudanças ao longo dos últimos anos.
12. **Análise Simulada 1**: Anel de progresso animado (0 a 100%) com checklist dinâmico em tempo real de cálculo calórico.
13. **Diagnóstico / Resultado Personalizado**: Identificação empática do desafio de consistência e apresentação das 3 diretrizes do app (leitor por foto, equilíbrio de macros, déficit suave).
14. **Objetivos Adicionais**: Múltipla seleção (leitor de fotos com IA, proteínas, controle de água, lista de compras).
15. **Impedimentos para Acompanhar Refeições**: Múltipla seleção de objeções reais (falta de tempo para pesar, não saber calorias, comer fora).
16. **Rotina Diária de Refeições**: Corrida fora, flexível em casa, ou horários tranquilos.
17. **Prática Atual de Exercícios**: SIM ou NÃO (abre opções de frequência se SIM para sincronizar o gasto calórico diário).
18. **Segunda Tela de Análise / Conteúdo Editorial**: Comparativo visual entre dietas restritivas de passar fome vs. acompanhamento visual simples por foto.
19. **Resultado e Adequação da Solução**: 98% de compatibilidade com o App de Calorias, confetes e 3 pilares da solução.
20. **Confirmação de Interesse**: Microcompromisso de simplicidade para acompanhar calorias e refeições.
21. **Consequência da Inação**: Pergunta empática sobre a frustração de continuar sem saber o que consome.
22. **Compromisso de Poucos Minutos**: Disposição para dedicar menos de 2 minutos por dia para tirar fotos dos pratos.
23. **Análise Final e Montagem do Protocolo**: Barra de progresso final (15% a 100%), resumo personalizado das metas da usuária e depoimentos dinâmicos.
24. **Vídeo VSL & Oferta Irresistível do App de Calorias**:
    - Player de vídeo vertical simulado com barra de progresso, botão play/pause e som.
    - Botão de atalho para a oferta.
    - Card de resumo com cálculo calórico individualizado (ex: 1.450 - 1.550 kcal/dia e 2.200 ml de água).
    - Grid de benefícios do aplicativo (scanner de pratos por foto, banco de alimentos brasileiros, controle de macros e hidratação).
    - 3 Bônus Gratuitos de lançamento (Pratos Saciantes, Tabela de Substituições, 50 Receitas com Proteína).
    - Preço especial com desconto: 12x de R$ 9,74 ou R$ 97 à vista.
    - Cronômetro regressivo de vagas (14:59).
    - Garantia incondicional de 7 dias (100% de devolução).
    - Acordeão interativo de Dúvidas Frequentes (FAQ) específico do App de Calorias.
    - Selos de segurança e rodapé de conformidade (LGPD, Termos e Aviso Nutricional).

---

## 🎨 Recursos Visuais & Experiência do Usuário ("Cliques Muito Legais")

- **Efeitos Sonoros Nativos (Web Audio API)**:
  - Sintetizador sem dependência de áudios externos.
  - Sons agradáveis de "pop" tátil ao clicar, "chime" de confirmação e "fanfarra" de vitória na oferta.
  - Botão de alternância de som no topo (Som Ativo / Mudo) com estado salvo.
- **Efeito Ripple & Haptic**: Efeito de onda e leve compressão tátil ao tocar nos cards.
- **Confetes Celebratórios**: Disparados via `canvas-confetti` na ponte social, na compatibilidade e na oferta final.
- **Barra de Progresso Dinâmica**: Acompanhamento percentual com indicador de tempo aproximado e etapa atual.
- **Botão Voltar com Memória**: Permite navegar entre etapas anteriores sem perder as seleções já feitas.
- **Salvamento Automático**: Progresso salvo no `localStorage` do navegador.
- **Acessibilidade Completa**: Suporte a teclado (Enter e Espaço para selecionar cards), alto contraste e fontes limpas em tamanho generoso.
- **Rastreador de Analytics**: Dispara eventos no `window.dataLayer` (`quiz_start`, `step_view`, `option_selected`, `vsl_play`, `cta_click`) com modal de inspeção integrado no rodapé.

---

## 🛠️ Personalização Rápida

- **Link de Checkout**: No arquivo `app.js`, localize `btn-final-cta` e configure a URL do seu gateway (Hotmart, Kiwify, Eduzz, Braip, Stripe, etc.):
  ```javascript
  const ctaBtn = document.getElementById('btn-final-cta');
  ctaBtn.href = 'https://seu-link-de-checkout.com';
  ```
- **Vídeo VSL Real**: Para embutir um vídeo real do Panda Video, Vimeo, YouTube ou Wistia, basta substituir o container `#video-wrapper` em `app.js` pelo código iframe do seu provedor de vídeo.
