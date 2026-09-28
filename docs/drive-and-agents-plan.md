# Drive, spaces, and sandboxed agents

Formal plan from the 15 Sep 2026 architecture discussion. Twenty workspace
(tenant) is **not** a Drive space. This document uses **workspace** for the
tenant and **space** for a named file library inside it.

## 1. Goals

1. A user uploads a file to personal storage in the UI, asks about it in AI
   chat, the agent modifies it, the stored file is updated in place, and the
   user can share that personal file with a coworker.
2. Admins grant business-file access through **existing Roles**. Users only
   see spaces (and files in them) their role allows. The agent uses the
   **same** check: if the user’s role cannot see a path, neither can their
   agent.

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Tenancy | One Twenty instance. Vanity subdomains later if needed. Not a server per org. |
| Inference | OpenRouter via instance env `OPENROUTER_API_KEY`. No Hermes processes. No second OpenAI SDK client. Extend Twenty’s existing agent loop (`streamText` / `runAgent`). |
| Identity | Interactive chat runs **as the logged-in user**. Cron (later) runs as a named agent or API key with its own role. |
| Files | New Drive on existing local blob storage (`FileStorageService`). Not CRM attachments. |
| Permissions | Roles only. No Group / department entity. Combined roles for people in two departments. Person-level share for exceptions and personal files. |
| Permission grain (business) | **Spaces**, not every folder. Nested paths inherit the space grant. |
| Permission levels | `READ` and `READ_WRITE` (edit includes overwrite, mkdir, delete). |
| Sandbox | Docker on the droplet, one container per chat thread (`{workspaceId}:{threadId}`). Not E2B. Not Twenty `LOCAL` in production. |
| Agent file I/O | Workshop = sandbox (`open()`, PyMuPDF, pandas). Cabinet = Drive. Bridge = `drive.pull` / `drive.publish`, not curl. |
| Generators | When publishing a built artefact, also publish the generating script beside it so the next edit is “change the `.py` and re-run”. |

## 3. Out of scope for this slice

- Dedicated Twenty instance per customer
- NFS / FUSE-mounting Drive into the sandbox
- Groups as a second membership model
- Per-folder ACL on business trees
- Hermes learning loop, messaging gateway, vectors
- Composio MCP (design constraint only: one tool registry, tools carry `userWorkspaceId`)
- Agent cron (BullMQ in-process later)
- DB-backed long-term memory and agent-authored skills (Drive can hold skill markdown later)

## 4. Precedent in Twenty (investigation)

There is **no** file-library / shared-drive / space entity.

| Existing concept | What it is | Why it is not Drive |
|---|---|---|
| `Role` + object/field/tool permissions | One role per user/agent/API key | App capabilities, not a file tree. **Reuse as the grant principal.** |
| `recordShare` (`EVERYONE`, `WORKSPACE_MEMBER`, `ROLE` × `READ` / `READ_WRITE` / `FULL`) | Per-CRM-record ACL | Attachments inherit the parent record. No standalone library. **Reuse the principal + access-level vocabulary.** |
| `FileEntity` + `FileFolder` enum | Workspace-prefixed blobs | Internal prefixes (`files-field`, `agent-chat`, …). No user paths, no filename column, no ACL. **Reuse as the byte store.** |
| CRM `attachment` | Files hung on person/company/task/note | Inherited readability, not a Drive. Do not extend this into a library. |
| Navigation menu `FOLDER` | Named group of sidebar links | Not a filesystem; no role grants on folders. |
| Message folders | IMAP/Gmail labels | Unrelated. |
| `Application` storage prefix | `{workspaceId}/{applicationId}/{fileFolder}/…` | Isolation for apps, not org departments. |

**Closest product analog:** Google Shared Drives — a named container, membership (here: roles), files inside inherit.

**Easier than a Space entity?** Putting ACL only on top-level folders (`/org/finance`) without a Space row is almost the same model, but the role UI becomes a folder picker and nothing stops later grants on nested folders. A Space row is the permission root **by construction**, can be seeded by name, and can be renamed without renaming the path. That is the smaller admin surface.

Do **not** implement Drive as a workspace (CRM) object. Path + space grants do not map onto `canReadObjectRecords` / inherited readability.

## 5. Spaces model

A **space** is a named pointer at a path prefix in the org’s blob tree, plus grants.

```
Personal space (one per user, auto-created)
  /personal/…

Organisation spaces (seeded + admin-created)
  /spaces/finance/…
  /spaces/marketing/…
  /spaces/general/…     # optional company-wide default
```

- Nested folders and files **inherit** the space grant. No ACL UI on nested business folders.
- Personal space: owner has `READ_WRITE`. Not granted via roles.
- Sharing a **personal file** with a coworker is an item-level share (goal 1). It does not expose the rest of their personal space.
- Business sharing is **role → space**, configured on `/settings/members/roles/{roleId}`.
- Agents resolve paths through the same `DriveAccessService` as the UI, using the invoking user’s role (and item shares).

### Seed on workspace create

Create organisation spaces `Finance` and `Marketing` (and `General` if we want a default everyone-read bucket). Creating a space creates the directory. Admins assign roles afterwards; seeded spaces start with **no** role grants except whatever we put on the workspace default role (recommend: `General` → default member role `READ`; `Finance` / `Marketing` → Admin `READ_WRITE` only).

Create a personal space when a `UserWorkspace` is created.

### Access levels

| Level | UI / API | Agent |
|---|---|---|
| none | Space hidden | `pull` / `list` / `publish` fail with not found / forbidden (do not leak existence of hidden spaces) |
| `READ` | List, preview, download | `drive.pull` |
| `READ_WRITE` | Upload, mkdir, rename, overwrite, delete | `drive.pull` and `drive.publish` |

`FULL` (manage grants) stays on `PermissionFlagType.ROLES` in Settings, not on the file tree, for v1.

Global flags `UPLOAD_FILE` / `DOWNLOAD_FILE` / `CODE_INTERPRETER_TOOL` still mean “may use the feature at all”. Space grants mean “which trees”.

## 6. Data model (core schema)

Keep metadata next to `FileEntity` (core), not in the per-workspace CRM schema.

**`drive_space`**

- `id`, `workspaceId`
- `kind`: `PERSONAL` \| `ORGANISATION`
- `name`, `slug`, `icon`
- `pathPrefix` (stable, e.g. `personal/{userWorkspaceId}` or `spaces/finance`)
- `ownerUserWorkspaceId` (personal only)

**`drive_item`**

- `id`, `workspaceId`, `spaceId`
- `parentId` (null at space root)
- `name`, `kind`: `FILE` \| `FOLDER`
- `fileId` (FK to `FileEntity` for files)
- `mimeType`, `size`
- `createdByUserWorkspaceId`, `updatedByUserWorkspaceId`
- Unique `(spaceId, parentId, name)` among non-deleted rows

**`drive_space_grant`**

- `spaceId`, `workspaceId`
- `principalType`: `ROLE` \| `WORKSPACE_MEMBER`
- `principalId`, `accessLevel`: `READ` \| `READ_WRITE`
- Unique `(spaceId, principalType, principalId)`
- Organisation spaces: `ROLE` principals only in the admin UI (member grants allowed internally if we need them later)
- Personal spaces: no role grants

**`drive_item_share`** (personal files / folders only)

- `itemId`, `workspaceId`
- `userWorkspaceId` (recipient)
- `accessLevel`: `READ` \| `READ_WRITE`
- Unique `(itemId, userWorkspaceId)`

Bytes stay in `FileStorageService` under a new `FileFolder.Drive` prefix:

`{workspaceId}/{applicationUniversalIdentifier}/drive/{pathPrefix}/…`

Path convention is **not** the ACL. Every read/write goes through `DriveAccessService`.

## 7. Drive API

One service used by GraphQL, REST download, AI tools, and the sandbox helper.

Virtual paths (what humans and models see):

- `/personal/…`
- `/spaces/{slug}/…`

Suggested operations:

| Operation | Authz |
|---|---|
| `list(path)` | `READ` on space (or item share) |
| `stat(path)` | same |
| `read` / download | `READ` |
| `mkdir`, `write` / upload, `move`, `rename`, `delete` | `READ_WRITE` |
| `shareItem` / `unshareItem` | owner of personal item |
| `listSpaces` | spaces the principal can see + personal + “shared with me” |

Download stays token-signed like today’s `/file/:folder/:id`, but the token is only issued after a Drive ACL check. Do not rely on the current `DOWNLOAD_FILE` UI-only gap.

Sandbox helpers (Python, injected like `twenty`):

```python
drive.pull("/spaces/finance/q1.csv", "/home/user/q1.csv")
drive.publish("/home/user/output/invoice.pdf", "/spaces/finance/invoices/acme.pdf")
drive.publish("/home/user/generate_invoice.py", "/spaces/finance/invoices/_generators/acme.py")
```

`pull` requires `READ`. `publish` requires `READ_WRITE` on the destination space. The helper uses a short-lived token with **enough TTL for the job** (today’s MCP helper JWT is 5 minutes — too short; mint a Drive-scoped token for the sandbox session).

Do not teach the model raw HTTP.

## 8. UI

- New app page (e.g. `/files` or `/drive`) to browse, upload, preview, rename, delete.
- Sidebar: **Personal**, organisation spaces the user can see, **Shared with me**.
- Organisation space contents: normal folder tree; no per-folder share UI.
- Personal: share dialog → pick a coworker → `READ` or `READ_WRITE`.
- Settings → Roles → Permissions: a **Spaces** section. Matrix of organisation spaces × none / read / edit. This is the admin job: assign roles to spaces, not to paths.
- Optional later: create/rename organisation spaces from Settings (Admin). v1 can seed + SQL/admin mutation.

Use existing document preview where it already exists (`DocumentViewer`).

## 9. Agent loop and Docker sandbox

Keep Twenty chat / `runAgent`. Add Drive tools for **small** text (list, read markdown, share). Binary create/edit and large parses go through `code_interpreter`.

**Docker driver** (new `CODE_INTERPRETER_TYPE=DOCKER`):

- Reuse LOCAL’s persistent kernel protocol inside a container.
- Image: Python + pandas + PyMuPDF + existing `sandbox-scripts/`.
- Session id `{workspaceId}:{threadId}` — Alice and Bob never share a container; Alice’s two chats are two containers.
- Mount Docker socket on the **worker only**. Never into the sandbox.
- Network: sandbox may reach the Twenty API (compose DNS). Must not reach Postgres/Redis. Do not pass `process.env` in.
- Caps: memory, CPU, pids, disk, max concurrent sessions. Idle sweep `docker rm` (existing session-cleanup cron).
- Keep `LOCAL` for laptop only; production forbids it as today.

Inject both `twenty` (MCP/CRM) and `drive` (pull/publish). Harvest `/home/user/output` can remain as a chat convenience; **durable** files must `publish` into a space.

Skill text (short): do not ingest large files; build binaries in the sandbox; revise generated files by editing the sibling generator.

## 10. OpenRouter

Add `OPENROUTER_API_KEY` to `config-variables.ts`. Register an OpenAI-compatible provider with `baseUrl` `https://openrouter.ai/api/v1` and that key. Do not put the key in `AI_PROVIDERS` JSON in git.

Register the models we actually want (OpenRouter model ids) in the instance catalogue / workspace tiers. All workspaces on the instance share this provider (Twenty’s model config is instance-wide).

Cap spend in the OpenRouter dashboard.

## 11. Permission resolution (single function)

For path `P` as principal `userWorkspace` with `roleId`:

1. Resolve space from prefix (`/personal` → that user’s personal space; `/spaces/slug` → org space).
2. If personal and owner → `READ_WRITE`.
3. Else if `drive_item_share` on the item (or ancestor folder in personal) → that level.
4. Else if organisation space → `drive_space_grant` for `roleId`.
5. Else deny.

UI list = spaces where resolved level ≠ none, plus shared-with-me items.

Agent tools and `drive.*` call this function. No parallel “agent may read Finance” flag.

## 12. Goal traces

**Goal 1 — personal file in chat**

1. User uploads on `/files` → `drive_item` in personal space, blob via existing storage.
2. Chat: model `list`/`read` or `code_interpreter` + `drive.pull`.
3. Modify: sandbox edit or Drive write; `drive.publish` to the **same path** (overwrite) or Drive `write`.
4. Share: item share with coworker → appears in their Shared with me; their agent may `pull` that path only.

**Goal 2 — business files follow roles**

1. Admin sets Finance = `READ_WRITE` on the Accountant role, Marketing = `READ` on the same role (or splits into two roles).
2. Files page shows those spaces only.
3. Agent `drive.pull('/spaces/finance/…')` succeeds; `drive.pull('/spaces/directors/…')` fails with the same error the UI would get.

## 13. Delivery order

1. **OpenRouter** — env + provider + one smoke-test chat completion.
2. **Drive core** — spaces, items, grants, shares, `FileFolder.Drive`, `DriveAccessService`, GraphQL/REST.
3. **Workspace hooks** — seed org spaces; personal space on member join.
4. **Files page** — personal + visible org spaces; upload/preview/delete.
5. **Role Spaces section** — none / read / edit per org space.
6. **Personal share** — share dialog + Shared with me.
7. **Docker interpreter** — driver, image, worker socket, caps, session sweep.
8. **`drive.pull` / `drive.publish`** — inject helper; longer-lived Drive token.
9. **Chat wiring** — Drive tools + skill; overwrite-in-place for goal 1.

Do not start UI before the access service exists. Do not start Docker before publish has a real destination.

## 14. Default product choices (change if needed)

- Seeded org spaces: Finance, Marketing, General.
- Default member role: `READ` on General only.
- Admin role: `READ_WRITE` on all org spaces.
- Delete is part of `READ_WRITE`.
- Hidden spaces: identical not-found for UI and agent (no existence leak).
- No per-folder business ACL, ever, in this slice — if a nested tree needs different access, it is a **new space** (or a new role), not a grant on a subfolder.
