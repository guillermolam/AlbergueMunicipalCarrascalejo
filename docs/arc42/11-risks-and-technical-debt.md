# 11. Risks and Technical Debt

## 11.1 Known risks

- Wasm runtime constraints can surprise dependencies (outbound networking, TLS stacks)
- Mixed dependency versions across Rust workspace members can prevent workspace-wide builds
- Some documentation sources under `.trae/` include non-GitHub-friendly `file:///` links and may drift from the codebase

## 11.2 Technical debt candidates

- Consolidate and stabilize Rust workspace dependency versions where possible
- Ensure frontend API routes align with the chosen Astro output mode (static vs server) to avoid build-time request-header assumptions
- Promote architecture proposals into ADRs to avoid ambiguity

See also:
- [9. Architectural Decisions](09-architectural-decisions.md)