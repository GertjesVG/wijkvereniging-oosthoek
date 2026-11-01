import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hero } from "./Home";
const meta = {
  title: "Oosthoek/Responsive hero",
  component: Hero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Hero>;
export default meta;
export const Vensterformaat: StoryObj<typeof meta> = {};
