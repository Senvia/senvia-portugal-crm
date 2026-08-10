# Automations — flow engine

Customer-facing automation builder: node graphs that send WhatsApp/email, wait,
branch on conditions, and — the conversational part — **wait for the contact's
reply and branch on what they wrote**.

## Two systems, on purpose

| | Legacy | Flows |
|---|---|---|
| Definition | `email_templates.automation_*` (one template = one automation) | `automation_flows.graph` |
| Steps | exactly one (send an email) | any number |
| Channels | email only | email + WhatsApp |
| State | none | `automation_runs` |
| History | none | `automation_run_steps` |
| Executor | `process-automation` | `automation-engine` |

Both run side by side. The DB trigger dispatches every CRM event to **both**, so
nothing an org already relies on stops working. The 10 pre-existing automations
were converted to flows by `20260807120000_migrate_legacy_automations.sql`, but
land in `draft` — visible and editable, enrolling nobody — so the same email can
never go out twice. Switching an org over means activating the flow and turning
off `automation_enabled` on the matching template.

## Tables

- **`automation_flows`** — the design. `graph` is `{nodes:[{id,type,config,position}], edges:[{id,source,target,branch}]}`.
  `status` is `draft` (inert) / `active` / `paused` (keeps running paths, enrols nobody).
- **`automation_runs`** — one contact travelling through one flow. `status`:
  `running`, `waiting` (time wait), `awaiting_reply` (parked for the contact's
  answer), `completed`, `failed`, `cancelled`.
- **`automation_run_steps`** — what happened at each node, including the branch
  taken and why. This is the answer to "why did this client get this message?".

### Guarantees enforced by the schema, not just the code

- `uniq_active_run_per_subject` — a contact cannot have two live runs in the
  same flow, so a trigger firing twice does not duplicate a sequence.
- `uniq_step_per_run_node` — a node executes at most once per run, so a
  redelivery cannot re-send a message.
- `automation_phone_key()` — last 9 digits. Both sides of the inbound match use
  it, so `+351 912 345 678`, `00351912345678` and `912345678` are the same
  contact.

## Engine

`supabase/functions/automation-engine`, three actions:

| Action | Called by | Does |
|---|---|---|
| `enroll` | `notify_automation_trigger` (DB trigger) | Finds active flows for `(org, trigger_type)`, creates a run, walks the graph until it parks. |
| `tick` | cron `automation-engine-tick`, every minute | Wakes runs whose `wake_at` passed. For `awaiting_reply` that means the reply never came → takes the `timeout` branch. |
| `reply` | `chatwoot-webhook` on every inbound message | Resumes the run parked on this phone number and branches by keyword; if none is parked, tries to **start** a `whatsapp_keyword` flow. |

Both `tick` and `reply` claim a run with a conditional `UPDATE … WHERE status = …`
before touching it, so two concurrent runs of the cron cannot double-execute a
path. (`process-automation-queue`, the legacy drain, does *not* do this.)

### Node types

`wait`, `wait_reply`, `send_whatsapp`, `send_email`, `condition`, `move_stage`,
`assign_user`, `add_to_list`, `webhook`, `end`.

`wait_reply` is the conversational node: `config.rules` is a list of
`{id, keywords[], label}`, each one an outgoing branch, plus a `timeout` branch
and an optional `fallback` for a reply that matched nothing.

### Safety rails

- **Quiet hours** (`automation_flows.quiet_hours`, Europe/Lisbon) — a send that
  lands inside the window is postponed to the end of it, not dropped.
- **`max_steps_per_run`** — a cycle in the graph fails the run instead of
  looping forever.
- Every failure is `console.error` and a `failed` step row, never a silent
  return. This module exists partly because two earlier incidents in this
  codebase (the Stripe webhook, and automations 401ing) were invisible.

## Auth

Postgres cannot read `SUPABASE_SERVICE_ROLE_KEY`, so DB triggers authenticate
with a shared secret that lives **only in Supabase Vault**
(`automation_internal_secret`), compared by `verify_automation_secret()` which
returns a boolean and never the secret. Edge functions calling the engine use
the service-role bearer instead. Both are accepted; anything else is 401.

To call the engine by hand from the SQL Editor:

```sql
SELECT net.http_post(
  url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/automation-engine',
  body := '{"action":"tick"}'::jsonb,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-automation-secret', public.automation_internal_secret()
  )
);
```
