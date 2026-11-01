import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShareCode } from "./ShareCode";
const meta = {
  title: "Oosthoek/Website delen",
  component: ShareCode,
  decorators: [
    (Story) => (
      <div className="contact-message" style={{ width: "min(440px,90vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShareCode>;
export default meta;
export const InVoorbereiding: StoryObj<typeof meta> = {};
export const Testvoorbeeld: StoryObj<typeof meta> = {
  render: () => (
    <>
      <p>
        <strong>
          Testvoorbeeld met gereserveerd voorbeeldadres; geen QR voor bezoekers.
        </strong>
      </p>
      <ShareCode
        website={{ url: "https://oosthoek.example.org/", verified: true }}
      />
    </>
  ),
};
