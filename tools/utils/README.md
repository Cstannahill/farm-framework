# Tools: Utility helpers

Reusable scripts employed by the test suite.  These provide helpers for
running the CLI and controlling Docker containers during integration
tests.

## Structure

- **cli-runner.ts** – spawns the FARM CLI within tests and captures
  output.
- **docker-test-utils.ts** – helper functions for interacting with
  Docker (currently a stub).
- **container-cleanup.ts** – placeholder for Docker cleanup logic.
- **index.ts** – barrel file re-exporting the utilities.
