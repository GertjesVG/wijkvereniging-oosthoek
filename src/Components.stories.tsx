import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  FeatureCard,
  ButtonLink,
  StatusNote,
  DateTag,
  Rules,
  PageHeading,
} from "./components";
const meta = {
  title: "Oosthoek/Actiekaarten",
  component: FeatureCard,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: "min(430px,90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeatureCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Cadeauactie: Story = {
  args: {
    title: "Cadeauactie",
    description: "Kleur je tekening en ontdek de cadeauactie.",
    href: "#/cadeauactie",
    kind: "gift",
  },
};
export const Route: Story = {
  args: {
    title: "Route & live tracking",
    description: "De route en livekaart voor de dag zelf.",
    href: "#/route",
    kind: "route",
  },
};
export const Praktisch: Story = {
  args: {
    title: "Praktische info",
    description: "Alles voor een onvergetelijke dag.",
    href: "#/praktisch",
    kind: "info",
  },
};
export const Knoppen = {
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      <ButtonLink href="#/cadeauactie">Cadeauactie</ButtonLink>
      <ButtonLink href="#/route" variant="outline">
        Bekijk de route
      </ButtonLink>
      <div style={{ background: "#0c293d", padding: 20, borderRadius: 12 }}>
        <ButtonLink href="#/route" variant="gold">
          Volg de Sint
        </ButtonLink>
      </div>
      <button className="button button-primary" disabled>
        Inschrijven nog niet beschikbaar
      </button>
    </div>
  ),
};
export const Statussen = {
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      <StatusNote>Inschrijving nog niet beschikbaar.</StatusNote>
      <StatusNote tone="blue">Livepositie nog niet beschikbaar.</StatusNote>
    </div>
  ),
};
export const Datumkaart = {
  render: () => (
    <div style={{ position: "relative", height: 290, width: 260 }}>
      <DateTag />
    </div>
  ),
};
export const Wedstrijdregels = { render: () => <Rules /> };
export const Paginakop = {
  render: () => (
    <PageHeading eyebrow="EEN MAGISCHE DAG" title="Sinterklaas in Oosthoek.">
      Samen maken we er een magische dag van.
    </PageHeading>
  ),
};
