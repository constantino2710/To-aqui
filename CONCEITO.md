# Pulseira Local — Conceito e Pesquisa de Mercado

> Documento de referência do projeto. Consolida a pesquisa de concorrentes,
> a definição do produto e as decisões técnicas.
>
> Última atualização: 06/08/2026

---

## 1. A ideia

Um aplicativo que **gera um QR Code vinculado a um grupo familiar**. O QR pode ser
colocado em qualquer lugar — adesivo, etiqueta na roupa, pulseira de papel, escrito
na camiseta. Sem hardware, sem comprar nada.

Quando uma criança se perde (carnaval, praia, show, parque), qualquer pessoa que a
encontre escaneia o QR Code. A partir daí, **o celular de quem escaneou passa a
compartilhar a localização continuamente** com os responsáveis, que acompanham o
ponto se movendo ao vivo até chegar.

### O insight central

O mercado inteiro hoje manda **um ping** — a localização no instante do scan.
Mas a multidão se move. O achador pega a criança pela mão e anda. Em 30 segundos
aquele pin está errado e o responsável chega num lugar vazio.

**A solução é rastro ao vivo, tipo Uber**, não um alerta pontual.
Ninguém no Brasil faz isso.

---

## 2. Pesquisa de mercado

### 2.1. Brasil — o único concorrente tecnológico real

**[Toque AI](https://www.toqueai.com.br/)** — empresa brasileira. Ao escanear o QR,
dispara **chamada imediata com áudio, vídeo ao vivo e geolocalização**, conectando
quem encontrou ao responsável sem expor dados pessoais. Apps em
[iOS](https://apps.apple.com/br/app/toque-ai/id6745408539) e
[Android](https://play.google.com/store/apps/details?id=com.toqueai.mobile).
Atende crianças, pets, idosos, PCD, objetos e ainda faz "interfone virtual".
Modelo: venda de tag física + assinatura anual.

**→ É o benchmark. Testar o produto antes de escrever código.**

### 2.2. Brasil — o resto do mercado vende plástico

Verificado direto nos sites: **nenhum outro tem notificação de localização.**

| Produto | Preço | Notifica o responsável? |
|---|---|---|
| [Pulseira Salva Vidas](https://pulseirasalvavidas.com/) | R$ 99 – R$ 209 (vitalício, sem mensalidade) | ❌ Só abre página com os dados |
| [Brava Care](https://www.bravanfc.com.br/pulseiras-nfc/pulseira-de-identificacao-infantil-com-qr-code-uso-por-7-dias) | R$ 24,90 (1 dia) / R$ 49,90 (3d) / R$ 79,90 (7d) | ❌ Só acesso a contatos |
| [Vida Costeira](https://www.vidacosteira.com.br/pulseira-inteligente-qrcode-identificacao-colorido) | — | ❌ Exibe nome e telefone |
| [DogTagClan](https://dogtagclan.com.br/blog/pulseira-com-qr-code-para-que-serve-como-funciona-e-onde-comprar-com-seguranca/) | — | ❌ Exibe dados |
| [ID TEA (Loja do Autista)](https://lojadoautistaa.com.br/produtos/id-tea-kit-de-identificacao-do-autismo-completo-qr-code-app/) | — | ❌ App só para cadastrar |
| [Sentidos e Cores](https://www.sentidosecores.com.br/identificacao-e-inclusao/pulseiras-com-qr-code/) | R$ 34,90 – R$ 45,90 | ❌ |

**Destaque — Brava Care:** mira exatamente o nosso caso de uso ("praias, parques,
eventos e viagens"), mas a pulseira é **descartável, vence em até 7 dias** e não pode
ser reutilizada. Produto caro resolvendo o problema pela metade.

### 2.3. Brasil — poder público (ameaça e oportunidade)

- **[Recife](https://www.diariodepernambuco.com.br/vida-urbana/2025/11/11699470-recife-lanca-sistema-de-identificacao-infantil-com-qr-code-que-facilita-localizacao-de-criancas-perdidas.html)**
  — sistema com QR Code lançado em nov/2025, começou em Boa Viagem, expande para
  Carnaval, São João, Natal e Réveillon. **Distribuído de graça.**
- **[Rio de Janeiro](https://www.metropoles.com/brasil/carnaval-rio-tera-localizador-virtual-para-criancas-perdidas-entenda)**
  — "pulseira digital" via app 190RJ, mas usa reconhecimento facial e 150+ câmeras,
  não QR.
- **[Alerta Amber](https://revistaexilio.substack.com/p/tecnologia-brasileira-e-usada-para)**
  (Meta + Ministério da Justiça) — operando em CE, DF e MG, com expansão prevista.

Prefeitura distribuindo de graça é risco pro B2C — mas é a maior porta de entrada
para **B2G**. Recife provou que existe orçamento e vontade política.

### 2.4. Internacional (referências de fluxo)

- **[Kidslet](https://kidslet.com/how-it-works/)** — o mais parecido. Estranho escaneia,
  compartilha localização, responsável recebe por e-mail e SMS com ponto no Google Maps.
- **[Safebandd](https://safebandd.com/)** (UK, 2024) — conta grátis, sem app, sem
  assinatura. Alerta por e-mail com geolocalização, sem GPS dedicado.
- **[ScanMy.Band](https://scanmy.band/children.php)** — e-mail com mapa e horário do scan
  para o responsável e até 6 contatos.
- **[Safe Bandz](https://www.safebandz.com/)** — tem plano "só QR" (imprime em qualquer
  coisa) e push notification. O mais próximo do modelo sem hardware.
- **[GotchaQR](https://gotchaqr.com/children-braclet/)** e
  **[4LIFE.health](https://www.4life.health/en/medical-qr-code-id-bracelet-for-kids/)**
  — variantes com foco médico (alergia, autismo, diabetes).

**Padrão geral:** todos usam e-mail/SMS (lento, cai em spam) e todos mandam ping único.

---

## 3. Diferenciais

### 3.1. Diferencial principal — rastro ao vivo, não ping

O responsável abre e vê o ponto **se movendo em tempo real**, e vai andando na direção
certa até encontrar.

Vantagem sobre o Toque AI: eles fazem videochamada. Vídeo consome banda — o recurso
mais escasso num bloco de carnaval — e **exige que alguém atenda**. Nossa solução manda
só coordenada: alguns bytes a cada poucos segundos. Passa em rede congestionada, e o
responsável não precisa atender nada, só olhar o mapa.

**Mais leve e mais confiável exatamente onde importa.**

### 3.2. Zero hardware

Imprime em casa, cola num adesivo, escreve na camiseta. Custo marginal zero, contra
R$ 79–209 por pulseira dos concorrentes. Vantagem de distribuição decisiva num público
que não paga R$ 99 por uma pulseira de carnaval.

### 3.3. Grupo familiar, não contato único

Todos os responsáveis vinculados recebem o push simultaneamente e veem o **mesmo ponto
no mesmo mapa**. Quem está mais perto vai. O Toque AI faz chamada 1:1 — se aquela
pessoa não atende, acabou.

### 3.4. QR cego (privacidade dos dois lados)

- O achador **não vê** nome, foto ou dados da criança — só um botão de ajudar.
- O responsável **não vê** a identidade do achador — só o ponto no mapa.

Protege os dois lados e resolve a LGPD sem esforço extra. É também argumento de venda
direto contra todos os concorrentes, que expõem nome e telefone da criança para
qualquer um que escaneia.

### 3.5. Reforços

- **Fallback por SMS** — o QR carrega um código curto (ex: `ACHEI K7X9`). Rede de dados
  cai muito antes de SMS. É o que faz nosso produto funcionar quando o do concorrente
  não funciona, e é a feature mais barata da lista.
- **Ponto de encontro** — em vez de mandar o estranho esperar parado no meio de uma
  multidão que se desloca, o app manda os dois para o posto médico / tenda de apoio mais
  próximo e navega ambos até lá.
- **Modo evento** — o QR é ativado só durante o carnaval e fica inerte no resto do ano.

### 3.6. Fase 2 — rede colaborativa (o que se conta pro investidor)

Se o responsável percebe primeiro, ele aperta "perdi". O QR muda de estado e o app
alerta **outros usuários do mesmo evento num raio de X metros** — vira um "Waze de
criança perdida".

Isso é o diferencial estruturalmente defensável: **efeito de rede**. Quanto mais gente
usa no mesmo bloco, melhor fica. O Toque AI não copia sem refazer o produto inteiro,
porque o modelo deles é hardware pago + assinatura — e rede exige escala, escala exige
grátis, grátis exige custo marginal zero.

⚠️ **Não construir isso primeiro.** Ver seção 5.

---

## 4. Arquitetura técnica

### 4.1. Fluxo completo

**Antes:** cria perfil → vincula responsáveis da família → gera QR → coloca onde quiser.

**Na hora:** estranho aponta a câmera → abre página web (sem instalar nada) → *"Esta
criança pode estar perdida. Compartilhe sua localização para o responsável chegar até
você"* → aceita → **todos os responsáveis recebem push e veem o ponto se movendo ao vivo**.

**Encerramento:** botão de parar sempre visível; morre sozinho quando o responsável
marca "encontrei".

> O encerramento não é detalhe — é o que faz um estranho aceitar compartilhar
> localização. Ninguém aceita sem saber quando aquilo acaba.

### 4.2. O problema técnico central

Funciona no navegador via `navigator.geolocation.watchPosition()`, sem instalar nada.
**Mas tem uma armadilha que mata o produto se não for tratada no dia 1:**

> Se a pessoa bloquear a tela ou trocar de app, o navegador congela o compartilhamento.
> O estranho escaneia, coloca o celular no bolso pra segurar a criança — e o rastro morre.

**Soluções, todas obrigatórias no MVP:**

| Mecanismo | O que faz |
|---|---|
| **Wake Lock API** (`navigator.wakeLock`) | Segura a tela acesa enquanto o compartilhamento está ativo. Chrome Android e iOS 16.4+. |
| **Tela desenhada pra ficar aberta** | A página do achador tem que ser útil e ativa — mostra o responsável se aproximando no mapa, distância diminuindo, botão de ligar. Dá motivo pra pessoa não sair dali. Não pode ser um formulário. |
| **`sendBeacon` no `visibilitychange`** | No instante em que a aba vai pro background, cospe a última posição conhecida. Mesmo congelando, o responsável tem o ponto mais recente. |
| **Fallback honesto** | Se o rastro parar, mostrar *"última posição há 40s"* em vez de fingir que está ao vivo. Pin desatualizado que se anuncia é útil; um que mente é perigoso. |

### 4.3. Outros riscos técnicos

1. **Permissão de geolocalização** — exige HTTPS e o pedestre precisa *aceitar* o pop-up.
   Muita gente nega. Plano B obrigatório: botão de ligar/WhatsApp + posição aproximada
   por IP (impreciso, mas melhor que nada).
2. **Rede congestionada** — em bloco de carnaval a operadora cai, e o produto depende de
   internet nos dois lados. Daí o fallback por SMS ser prioritário.

### 4.4. Stack sugerido

- **Responsável:** app nativo — push notification confiável é o coração da ideia.
- **Achador:** web/PWA — quem escaneia não vai instalar nada. Obrigatoriamente web.
- **Backend:** Supabase (autenticação + banco + Realtime pronto). O Realtime é
  exatamente a parte chata desse projeto.

*(Decisão de stack ainda pendente de confirmação.)*

---

## 5. Estratégia e riscos

### O risco do efeito de rede

Rede sem densidade é inútil. No primeiro carnaval vamos ter ~200 usuários espalhados
por uma cidade inteira.

**Regra:** o produto tem que ser completo com **um usuário só**. O alerta para os
responsáveis funciona mesmo se formos os únicos no mundo usando o app — esse é o modo
*single player*, e é o MVP.

A camada de vizinhança (seção 3.6) só liga acima de um limiar de densidade. Ligar antes
disso vira notificação inútil que faz a pessoa desinstalar.

**Construir o single player primeiro. A rede é fase 2.**

### Modelo de negócio

- **B2C** — grátis ou muito barato. Serve para gerar densidade, não receita.
- **B2G / B2B** — onde está o dinheiro. Não vender pulseira pra prefeitura, e sim
  **cobertura do evento**: prefeituras, blocos de carnaval, parques aquáticos, escolas,
  shoppings. Entregar mapa de calor e relatório pós-evento.

### LGPD

A [LGPD exige consentimento específico e destacado de pelo menos um dos pais](https://www.serpro.gov.br/lgpd/noticias/criancas-adolescentes-lgpd-lei-geral-protecao-de-dados-pessoais)
para tratar dado de criança.

O modelo de **QR cego** (seção 3.4) já nos deixa bem posicionados: não expomos dados da
criança para ninguém, e a localização do achador é temporária, consentida e com
encerramento explícito.

---

## 6. Próximos passos

- [ ] Baixar e testar o Toque AI (benchmark obrigatório)
- [ ] Decidir stack: confirmar Supabase
- [ ] Definir escopo do MVP *single player*
- [ ] Prototipar a tela do achador (é a peça crítica — ver 4.2)
- [ ] Validar `watchPosition` + Wake Lock em Android e iOS reais
