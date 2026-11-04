import { useCallback, useEffect, useRef } from "react";
import type {
  ApiError,
  RegistrationRequest,
  RegistrationResponse,
} from "./api";
import {
  RegistrationForm,
  type TurnstileSlotProps,
} from "./RegistrationForm";
import { useRegistrationStatus } from "./useRegistrationStatus";

type TurnstileApi = {
  render(
    element: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const turnstileSrc =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let turnstileLoading: Promise<TurnstileApi> | null = null;

// Laadt het Turnstile-script pas wanneer dit voor het eerst nodig is (alleen in de open toestand).
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileLoading) {
    turnstileLoading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = turnstileSrc;
      script.async = true;
      script.defer = true;
      script.onload = () =>
        window.turnstile
          ? resolve(window.turnstile)
          : reject(new Error("Turnstile ontbreekt"));
      script.onerror = () => reject(new Error("Turnstile laadt niet"));
      document.head.appendChild(script);
    }).catch((err) => {
      turnstileLoading = null;
      throw err;
    });
  }
  return turnstileLoading;
}

function TurnstileWidget({
  siteKey,
  resetSignal,
  onToken,
  onError,
}: TurnstileSlotProps) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  useEffect(() => {
    let cancelled = false;
    let api: TurnstileApi | null = null;
    loadTurnstile()
      .then((t) => {
        if (cancelled || !box.current) return;
        api = t;
        widget.current = t.render(box.current, {
          sitekey: siteKey,
          language: "nl",
          callback: (token) => handlers.current.onToken(token),
          "expired-callback": () => handlers.current.onToken(null),
          "error-callback": () => {
            handlers.current.onToken(null);
            handlers.current.onError(
              "De beveiligingscontrole kon niet starten. Laad de pagina opnieuw.",
            );
          },
        });
      })
      .catch(() => {
        if (!cancelled)
          handlers.current.onError(
            "De beveiligingscontrole kon niet laden. Controleer je verbinding en laad de pagina opnieuw.",
          );
      });
    return () => {
      cancelled = true;
      if (api && widget.current) api.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.turnstile && widget.current) window.turnstile.reset(widget.current);
  }, [resetSignal]);

  return <div ref={box} />;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function submitRegistration(
  request: RegistrationRequest,
): Promise<RegistrationResponse> {
  let response: Response;
  try {
    response = await fetch("/api/inschrijvingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(request),
    });
  } catch {
    throw {
      error: "ONBEKEND",
      message:
        "Verzenden lukt niet. Controleer je verbinding en probeer opnieuw.",
    } satisfies ApiError;
  }
  const body = await readJson(response);
  if (response.ok && body && typeof body === "object") {
    return body as RegistrationResponse;
  }
  if (
    body &&
    typeof body === "object" &&
    typeof (body as ApiError).error === "string" &&
    typeof (body as ApiError).message === "string"
  ) {
    throw body as ApiError;
  }
  throw {
    error: "ONBEKEND",
    message: "Er ging iets mis bij het verzenden. Probeer het later opnieuw.",
  } satisfies ApiError;
}

export function RegistrationPanel() {
  const status = useRegistrationStatus();
  const renderTurnstile = useCallback(
    (props: TurnstileSlotProps) => <TurnstileWidget {...props} />,
    [],
  );
  return (
    <RegistrationForm
      status={status}
      submit={submitRegistration}
      renderTurnstile={renderTurnstile}
    />
  );
}
