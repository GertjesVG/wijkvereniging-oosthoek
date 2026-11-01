import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { PublicEventStatus, RegistrationRequest, RegistrationResponse } from "./api";
import {
  RegistrationForm,
  type TurnstileSlotProps,
} from "./RegistrationForm";

// Stand-in voor Turnstile: geeft meteen een proeftoken, zonder netwerk.
function FakeTurnstile({ resetSignal, onToken }: TurnstileSlotProps) {
  useEffect(() => {
    onToken("storybook-proeftoken");
  }, [resetSignal, onToken]);
  return (
    <p className="turnstile-note">
      Beveiligingscontrole (voorbeeld in Storybook, zonder Cloudflare).
    </p>
  );
}

const fakeSubmit = (request: RegistrationRequest) =>
  new Promise<RegistrationResponse>((resolve) =>
    setTimeout(
      () =>
        resolve({
          reference: "SINT26-0042",
          parentName: request.parent.name,
          email: request.parent.email,
          address: request.address,
          participants: request.participants,
        }),
      500,
    ),
  );

const status = (patch: Partial<PublicEventStatus>): PublicEventStatus => ({
  id: "sinterklaas-2026",
  status: "open",
  available: 37,
  turnstileSiteKey: "1x00000000000000000000AA",
  ...patch,
});

const meta = {
  title: "Oosthoek/Inschrijfformulier",
  component: RegistrationForm,
  parameters: { layout: "centered" },
  args: {
    status: null,
    submit: fakeSubmit,
    renderTurnstile: (props: TurnstileSlotProps) => <FakeTurnstile {...props} />,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(520px,92vw)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RegistrationForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Dicht: Story = { args: { status: null } };
export const Open: Story = { args: { status: status({}) } };
export const Volzet: Story = {
  args: { status: status({ status: "full", available: 0 }) },
};
