# AI Usage

## Tool

**Claude Code** (Anthropic's command-line coding assistant), running in the terminal inside this repository. It used the Claude Opus 5.5 and Sonnet 5.5 models at different points. No other AI tool was used.

## What the AI did

- **Backend:** wrote the first version of the PostgreSQL schema, the seed data (including the boundary cases), the DTOs, repository, service, controller, routes and middleware, following the folder and class pattern I specified.
- **Rule evaluation:** wrote the single SQL query that counts every condition per user, and the guards around it.
- **Tests:** wrote the unit tests (fake repository and service) and the integration tests against the seeded database.
- **Frontend:** wrote the React components, the API call, the state handling and the stylesheet.
- **Documentation:** drafted the README and `DESIGN.md`.


## What I did

- Set the requirements and the architecture: the layered folders, class-based repository and service, status codes and messages kept in `utils/`.
- Made the decisions: PostgreSQL over SQLite, Mongo or Prisma, and a mix of unit and integration tests.
- I have little frontend experience, so the frontend was kept deliberately plain: `useState`, `fetch` and ordinary CSS.
- Reviewed and edited the code, removed features that were not needed, and I am responsible for everything submitted.

## Where the AI was wrong or needed correcting

- Its first service ran one query per condition and filtered in JavaScript. I questioned the efficiency, and it was rewritten as one SQL query.


## How it was verified

- 38 automated tests pass (27 unit, 11 integration). I also broke the SQL window boundary on purpose to confirm the tests fail when they should.
- The setup in the README was run on a fresh copy of the project.
- The UI was exercised in a real browser, including Try again after the backend came back.
