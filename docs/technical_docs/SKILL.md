# Project Skill Notes

## Working Rule

Any bug, pipeline issue, workflow improvement, or incidental fix discovered while doing other work must be added to `docs/technical_docs/CHANGELOG.md`.

## Expectations

- Prefer generic fixes over topic-specific hacks when the same bug can affect future topics.
- If a local topic file still needs cleanup after a generic fix, document both the generic fix and the local cleanup in the change log.
- When a blocker is discovered in guided mode, improve the underlying system where practical instead of only clearing the current workspace.
- Keep the change log current during the work, not only at the end.
- Treat orchestrator integration as part of the definition of done for architecture work: if a new reusable subsystem affects the pipeline, wire it into the orchestrator or document exactly why it is intentionally not orchestrated yet.
- Before calling architecture work complete, update `config/orchestrator_contract.json` if needed and run `npm run audit:orchestrator`.
