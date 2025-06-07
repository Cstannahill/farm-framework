# @farm/api-client

Axios based wrapper used by the generated clients and hooks.  The
`ApiClient` class exposes convenience helpers for HTTP methods,
streaming and file upload while supporting custom request and response
interceptors.

## Structure

- **src/base-client.ts** – implementation of `ApiClient`.  Handles
  retry logic, error formatting and exposes helpers such as
  `uploadFile` and `streamPost`.
