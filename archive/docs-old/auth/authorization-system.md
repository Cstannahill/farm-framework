# FARM Authentication & Authorization

The FARM framework ships with a modular authentication layer designed for both browser
and programmatic clients.  Authentication is handled by the API service while the CLI
provides helper commands for local testing.

## Token Strategy

Access and refresh tokens are issued as JSON Web Tokens.  Access tokens expire after
15 minutes by default while refresh tokens last for seven days.  Tokens include the
user identifier, granted roles and permissions and a `type` field to distinguish
between `access` and `refresh` tokens.  A simple rotation strategy is implemented so
new refresh tokens are returned every time an access token is refreshed.

## Role Based Access Control

Roles aggregate permission strings.  The starter roles are `user`, `premium_user` and
`admin`.  Permissions and roles are stored on each user record so middleware and the
React hooks can safely check access levels with `hasRole` or `hasPermission` helpers.

## Database Models

Authentication data is stored in either MongoDB or PostgreSQL using Beanie and
SQLModel respectively.  Core models include `User`, `Session`, `Role`, `Permission`
and `AuditLog`.  Each model mirrors the interfaces declared in
`packages/types/src/auth.ts` to ensure type safety across the stack.

## API Endpoints

The API exposes several routes under `/api/auth`:

- `POST /api/auth/login` — exchange credentials for tokens
- `POST /api/auth/token` — refresh an access token
- `GET  /api/auth/session` — return the current authenticated user
- `POST /api/auth/logout` — revoke the active refresh token

Middleware parses bearer tokens and populates `request.state.user` for route
handlers.

## CLI Integration

The `farm` command now includes an `auth` namespace.

```
farm auth scaffold      # scaffold models
farm auth roles         # list known roles
farm auth tokens <tok>  # inspect a token
farm auth dev:login <email> --role <role>  # generate a dev token
```

These helpers are intended for local development and quick diagnostics.

## React Helpers

The UI layer exposes an `AuthProvider` context along with `useAuth` and
`ProtectedRoute` components.  They consume the API endpoints to keep the client
session in sync and guard pages based on roles or permissions.

