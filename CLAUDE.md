# CLAUDE.md

## Investigating a feature

When investigating a feature:
- Use **Codebase Memory** to discover unknown entry points and explore the architecture/feature in general.
- Use **Grep** to trace identifiers, constants, or already-known strings along the dependency chain.
- Load only the implementations involved in the chain.
- Avoid reading unrelated projects, tests, migrations, generated files and node_modules unless required.
