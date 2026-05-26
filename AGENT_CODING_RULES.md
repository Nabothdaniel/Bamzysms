# Agent Coding Rules — Next.js + Vanilla PHP REST API

> Paste this at the start of any conversation or into your agent's system prompt.
> Last updated: 2026

---

## Stack
- **Frontend**: Next.js (App Router) with TypeScript
- **Backend**: Vanilla PHP served as RESTful API endpoints
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React hooks + context (no Redux unless explicitly asked)

---

## General Rules (Apply Everywhere)

- Write code as if a senior engineer will review it tomorrow
- Never leave placeholder comments like `// TODO: implement later` — implement it now or say you can't
- No dead code, commented-out blocks, or unused variables
- Every function does ONE thing — if you need "and" to describe it, split it
- Name things for what they ARE, not what they DO (`userProfile` not `getTheUserData`)
- Avoid magic numbers and magic strings — use constants
- Always handle errors explicitly — never swallow them silently
- No `console.log` left in production code — use proper error boundaries or logging

---

## Next.js Rules

### File & Folder Structure
```
/app
  /api          ← only if using Next.js API routes (prefer PHP backend)
  /(routes)     ← grouped by feature, not by type
  /components   ← shared components only
  /lib          ← helpers, API clients, utilities
  /hooks        ← custom React hooks
  /types        ← all TypeScript interfaces and types
  /constants    ← app-wide constants
```

### Components
- One component per file
- Functional components only — no class components
- Props must always be typed with a TypeScript interface
- Destructure props at the top of the component
- Keep components under 150 lines — extract if longer
- No inline styles — use Tailwind classes or CSS Modules

```tsx
// ✅ Good
interface UserCardProps {
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

export default function UserCard({ name, email, role }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-semibold">{name}</p>
      <p className="text-sm text-gray-500">{email}</p>
    </div>
  );
}

// ❌ Bad
export default function UserCard(props: any) {
  return <div style={{padding: "16px"}}>{props.name}</div>;
}
```

### Data Fetching
- Use `async/await` — never raw `.then()` chains
- All PHP API calls go through a central `lib/api.ts` client — never raw `fetch` scattered in components
- Always type the response shape
- Always handle loading, error, and empty states — never assume success

```ts
// lib/api.ts — Central API client
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
```

### TypeScript
- `strict: true` in tsconfig — no exceptions
- No `any` — use `unknown` and narrow it, or define a proper type
- All API response shapes must have a corresponding interface in `/types`
- Use `type` for unions/primitives, `interface` for object shapes

---

## PHP REST API Rules

### File & Folder Structure
```
/api
  /v1
    /users
      index.php     ← GET /users, POST /users
      [id].php      ← GET /users/:id, PUT /users/:id, DELETE /users/:id
    /auth
      login.php
      logout.php
  /core
    Router.php
    Response.php
    Auth.php
    DB.php
  /middleware
    cors.php
    auth_guard.php
  .htaccess
```

### Every PHP Endpoint Must
1. Set CORS headers at the top (via middleware)
2. Check the HTTP method explicitly
3. Validate and sanitize ALL input — never trust `$_GET`, `$_POST`, `$_SERVER` directly
4. Return consistent JSON responses using a `Response` helper
5. Return correct HTTP status codes — not just 200 for everything

```php
<?php
// ✅ Good endpoint — /api/v1/users/index.php

require_once '../../core/Response.php';
require_once '../../core/DB.php';
require_once '../../middleware/cors.php';
require_once '../../middleware/auth_guard.php';

$method = $_SERVER['REQUEST_METHOD'];

match ($method) {
    'GET'  => handleGet(),
    'POST' => handlePost(),
    default => Response::json(['error' => 'Method not allowed'], 405),
};

function handleGet(): void {
    $users = DB::query("SELECT id, name, email, role FROM users");
    Response::json(['data' => $users]);
}

function handlePost(): void {
    $body = json_decode(file_get_contents('php://input'), true);

    $name  = trim($body['name']  ?? '');
    $email = filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL);

    if (!$name || !$email) {
        Response::json(['error' => 'Invalid input'], 422);
        return;
    }

    $id = DB::insert("INSERT INTO users (name, email) VALUES (?, ?)", [$name, $email]);
    Response::json(['data' => ['id' => $id]], 201);
}
```

### Response Helper (core/Response.php)
```php
<?php
class Response {
    public static function json(array $data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
```

### Database
- Use PDO with prepared statements — NO raw string interpolation in queries
- Never put DB credentials in endpoint files — use a `.env` file loaded once in `DB.php`
- Always use transactions for multi-step writes

```php
// ❌ Never do this
$result = mysqli_query($conn, "SELECT * FROM users WHERE id = $_GET[id]");

// ✅ Always do this
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);
```

### Auth
- Validate JWT or session token in `auth_guard.php` middleware
- Never expose passwords, tokens, or internal IDs in responses
- Rate-limit sensitive endpoints (login, register)

---

## API Contract (Frontend ↔ PHP)

All responses follow this shape:

```json
// Success
{ "data": { ... }, "meta": { ... } }

// Error
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }

// Paginated list
{ "data": [ ... ], "meta": { "total": 100, "page": 1, "per_page": 20 } }
```

HTTP status codes:
| Code | When |
|------|------|
| 200  | Successful GET, PUT |
| 201  | Successful POST (created) |
| 204  | Successful DELETE (no body) |
| 400  | Bad request / malformed input |
| 401  | Not authenticated |
| 403  | Authenticated but not authorized |
| 404  | Resource not found |
| 422  | Validation failed |
| 500  | Server error |

---

## Code Organization & Anti-Bloat Rules

This is the most important section. The #1 cause of bloat is components that do too much.
Before writing any component, ask: "Is this UI, state, or logic?" Then put each in its own place.

### The Three-Layer Rule

Every feature must be split across exactly three layers — never collapsed into one file:

```
UI Layer        → /app or /components   ← only JSX + Tailwind classes
State Layer     → /hooks                ← only useState, useEffect, useContext
Logic Layer     → /lib                  ← only pure functions, API calls, transforms
```

```tsx
// ❌ BAD — everything crammed into one component (classic bloat)
export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/v1/users")
      .then(r => r.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(sorted);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {loading ? <p>Loading...</p> : users.map(u => <p key={u.id}>{u.name}</p>)}
    </div>
  );
}

// ✅ GOOD — three clean layers

// lib/users.ts — pure logic, no React
export function sortByName(users: User[]) {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}

// hooks/useUsers.ts — state only, no JSX
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: User[] }>("/v1/users")
      .then(res => setUsers(sortByName(res.data)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { users, loading, error };
}

// components/UserList.tsx — JSX only, no logic
export default function UserList() {
  const { users, loading, error } = useUsers();
  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;
  return <ul>{users.map(u => <UserCard key={u.id} {...u} />)}</ul>;
}
```

### App Router Folder Structure (strict)

```
/app
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /layout.tsx           ← shared dashboard shell
    /page.tsx             ← dashboard home
    /users/
      page.tsx            ← route = /users
      /[id]/page.tsx      ← route = /users/:id
  /components
    /ui/                  ← shadcn primitives ONLY (never modify these)
    /common/              ← shared across features (Avatar, EmptyState, etc.)
    /features/            ← feature-specific, grouped by domain
      /users/
        UserCard.tsx
        UserList.tsx
        UserForm.tsx
/hooks
  useUsers.ts
  useAuth.ts
/lib
  api.ts
  users.ts               ← user-related transforms and helpers
  auth.ts
/types
  user.ts
  api.ts
/constants
  routes.ts
  roles.ts
```

### shadcn/ui Rules

- **Never modify files inside `/components/ui/`** — those are shadcn primitives; treat them as a library
- Compose shadcn primitives into feature components inside `/components/features/`
- Never re-implement something shadcn already provides (Dialog, Toast, Dropdown, etc.) — use it
- Don't add shadcn components you don't need yet — install on demand, not upfront

```tsx
// ❌ Bad — reinventing shadcn
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="bg-white rounded-lg p-6 shadow-xl">
    ...custom modal...
  </div>
</div>

// ✅ Good — use what's already there
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>...</DialogHeader>
  </DialogContent>
</Dialog>
```

### Component Size Limits

| Type | Max lines | If longer → |
|------|-----------|-------------|
| Page (`page.tsx`) | 60 lines | Extract sections into feature components |
| Feature component | 100 lines | Split into smaller components |
| UI primitive | 50 lines | Should just be composition of shadcn |
| Hook | 60 lines | Split into multiple focused hooks |
| `lib/` function file | 80 lines | Split by domain |

### When the Agent Touches an Existing File

Before editing any component file, it must:
1. Check if the file exceeds the size limit above
2. If yes — refactor first, then add the feature
3. Never add more code to a bloated file — that makes it worse
4. Extract the largest logical block into its own file, then proceed

### Signs of Bloat the Agent Must Fix, Not Ignore

- A component file with more than one `useEffect` → split into separate hooks
- A component importing from more than 5 places → it's doing too much
- A `lib/` file named `utils.ts` or `helpers.ts` → rename to what it actually does (`formatters.ts`, `validators.ts`)
- Any `useEffect` with more than 10 lines of logic → extract to a hook
- A hook that returns more than 5 values → split into domain-specific hooks
- Props passed more than 2 levels deep → use context or move state up

### Import Order (enforced)

```ts
// 1. React and Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { z } from "zod";

// 3. shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 4. Internal feature components
import { UserCard } from "@/components/features/users/UserCard";

// 5. Hooks, lib, types, constants
import { useUsers } from "@/hooks/useUsers";
import { api } from "@/lib/api";
import type { User } from "@/types/user";
```

---

## What the Agent Should NEVER Do

- Never use `any` in TypeScript
- Never put business logic inside a React component — extract to a hook or `lib/`
- Never put data fetching directly in a component — it belongs in a hook
- Never write raw SQL in an endpoint file — use the DB helper
- Never return a 200 with `{ "success": false }` — use proper status codes
- Never store sensitive data in `localStorage` — use `httpOnly` cookies
- Never skip input validation on the PHP side even if the frontend validates
- Never generate code without error handling
- Never mix concerns — keep routing, business logic, and data access separate
- Never create a `utils.ts` or `helpers.ts` — name files by what they actually do
- Never add a new `useEffect` to a component that already has one — extract to a hook
- Never modify files inside `/components/ui/` — those are shadcn primitives
- Never install a shadcn component and then rewrite it from scratch
- Never add code to a file that already exceeds the size limit — refactor first

---

## When Adding a New Feature, Always

1. Define the TypeScript types first (`/types`)
2. Add the PHP endpoint with validation + correct status codes
3. Add the API method to `lib/api.ts`
4. Build the component last, consuming the typed API method
5. Handle all three UI states: loading / error / success

---

*Reference this file at the start of every session. Copy-paste the relevant section when asking for specific code.*
