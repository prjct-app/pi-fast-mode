# pi-fast-mode

[![pi-fast-mode — for PI Agent](https://raw.githubusercontent.com/prjct-app/pi-local-extensions/main/pi-fast-mode/docs/cover-v2.png)](https://pi.dev)

Opt into the priority service tier for supported Codex and Grok models in Pi.

## Install

Requires Pi with the `before_provider_request` event and Node.js 22.19+:

```sh
pi install npm:@prjct.app/pi-fast-mode
```

Reload Pi after installation.

## Use

```text
/fast on
/fast off
/fast toggle
/fast status
```

`/fast` alone toggles the setting. It starts off and is saved per session. When enabled, supported requests receive `service_tier: "priority"`; unsupported models are unchanged.

The allowlist covers `openai-codex` models `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-6-astra`, plus `xai` models `grok-4.5` and `grok-4.6`. Provider availability and priority-tier access depend on your account. Priority can increase quota usage or cost; it does not guarantee a particular latency.

## Development

From the repository root: `node scripts/build-pi.mjs pi-fast-mode`.

License: [MIT](LICENSE).
