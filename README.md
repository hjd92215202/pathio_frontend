# Pathio Frontend

Frontend for Pathio knowledge-map workspace, built with React + TypeScript + Vite.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## API Base URL

The app uses:

- `http://127.0.0.1:3000/api`

See `src/api.ts`.

## Plan Limit UX Contract

The frontend keeps the current UI and design language. It relies on backend `402 Payment Required` to show upgrade flow:

- A global Axios interceptor opens `UpgradeModal` on any `402`.
- Upgrade CTA now calls `POST /api/billing/checkout-session` (no UI redesign).
- No extra frontend quota checks are required for roadmap/node creation.

Current free-plan policy expected from backend:

- Up to 3 roadmaps per workspace.
- Up to 50 total nodes per workspace (across all roadmaps).
- Up to 2 workspace members.

## Event Tracking Contract

Frontend sends allowlisted events through `POST /api/events`:

- `upgrade_modal_opened`
- `checkout_started`
- `shared_link_copied`

See `trackEvent` in `src/api.ts`.

## Share Note Refs Contract

The frontend treats `GET /api/share/:token/notes/:nodeId` as the main share-note API.

Recommended response:

```json
{
  "content": "# Example note",
  "references": [
    {
      "id": "ref_123",
      "node_id": "node_456",
      "title": "Example attachment",
      "url": "https://example.com"
    }
  ]
}
```

Rules:

- `references` should always exist (use `[]` when empty).
- Do not return `null` for `references`.
- Reference fields should be `id`, `node_id`, `title`, `url`.
