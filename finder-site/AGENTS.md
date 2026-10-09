# Site público — To Aqui

Página aberta por quem escaneia o QR Code. React + Vite + Supabase.

## Design system (regra permanente)

O padrão visual completo está em [`../DESIGN.md`](../DESIGN.md), válido para o
site e o app. **Siga-o sempre; só troque com pedido explícito do usuário.**
Resumo para este site:

- **Identidade Emerald (verde)**, tema claro e escuro acompanhando o sistema.
- **Componentes:** **shadcn/ui** (Radix + Tailwind CSS), em `src/components/ui/`.
  Para adicionar um componente, copie o padrão shadcn e estilize com as classes
  Tailwind e os tokens semânticos.
- **Cores:** nunca escreva um hex novo direto num componente. Use classes
  Tailwind com tokens (`bg-primary`, `text-foreground`, `border-border`). O
  contrato de tokens fica em `src/styles.css` e precisa ser igual ao de
  `../app/global.css`.
- O helper `cn` fica em `src/lib/utils.ts`.
