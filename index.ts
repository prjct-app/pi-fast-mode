import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ON_OFF, brand, completer, setMode } from "@prjct.app/pi-tui-kit";

const ENTRY_TYPE = "pi-fast-mode";
const LEGACY_ENTRY_TYPE = "openai-codex-fast-mode";
const DEFAULT_ENABLED = false;

const FAST_MODELS_BY_PROVIDER = new Map<string, ReadonlySet<string>>([
  [
    "openai-codex",
    new Set([
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-6-astra",
    ]),
  ],
  ["xai", new Set(["grok-4.5", "grok-4.6"])],
]);

interface FastModeState {
  enabled: boolean;
}

function isRequestPayload(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFastModel(model: ExtensionContext["model"]): boolean {
  if (!model) return false;
  return FAST_MODELS_BY_PROVIDER.get(model.provider)?.has(model.id) === true;
}

function isFastModeEntry(customType: string | undefined): boolean {
  return customType === ENTRY_TYPE || customType === LEGACY_ENTRY_TYPE;
}

function readPersistedState(ctx: ExtensionContext): boolean {
  return ctx.sessionManager
    .getBranch()
    .reduce((enabled, entry) => {
      if (entry.type !== "custom" || !isFastModeEntry(entry.customType)) return enabled;
      const data = entry.data as Partial<FastModeState> | undefined;
      return typeof data?.enabled === "boolean" ? data.enabled : enabled;
    }, DEFAULT_ENABLED);
}

/** Add a session-level Fast/Standard toggle for supported Codex and Grok models. */
export default function fastPriorityMode(pi: ExtensionAPI) {
  const state = { enabled: DEFAULT_ENABLED };

  function updateStatus(ctx: ExtensionContext): void {
    // Shown on the shared mode line (pi-ui) only while it actually applies.
    setMode(ctx, "fast", state.enabled && isFastModel(ctx.model) ? "fast" : undefined);
  }

  function setEnabled(next: boolean, ctx: ExtensionContext): void {
    state.enabled = next;
    pi.appendEntry(ENTRY_TYPE, { enabled: state.enabled } satisfies FastModeState);
    updateStatus(ctx);
  }

  pi.on("session_start", (_event, ctx) => {
    state.enabled = readPersistedState(ctx);
    updateStatus(ctx);
  });

  pi.on("model_select", (_event, ctx) => {
    updateStatus(ctx);
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (!state.enabled || !isFastModel(ctx.model)) return;
    if (!isRequestPayload(event.payload) || event.payload.model !== ctx.model?.id) return;

    return {
      ...event.payload,
      service_tier: "priority",
    };
  });

  pi.registerCommand("fast", {
    description: brand("fast priority tier: on | off | status"),
    getArgumentCompletions: completer([
      ...ON_OFF("fast priority"),
      { value: "status", description: "is it on, and does the current model support it" },
    ]),
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase();

      if (action === "status") {
        const support = isFastModel(ctx.model) ? "supported by the current model" : "not supported by the current model";
        ctx.ui.notify(`Fast mode is ${state.enabled ? "on" : "off"}; ${support}.`, "info");
        return;
      }

      if (action && action !== "on" && action !== "off" && action !== "toggle") {
        ctx.ui.notify("Usage: /fast [on|off|toggle|status]", "warning");
        return;
      }

      const next = action === "on" ? true : action === "off" ? false : !state.enabled;
      setEnabled(next, ctx);
      ctx.ui.notify(
        next
          ? "Fast mode enabled (priority tier; may increase quota usage or cost)."
          : "Fast mode disabled (standard tier).",
        "info",
      );
    },
  });
}
