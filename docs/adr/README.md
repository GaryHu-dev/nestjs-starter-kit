# Architecture Decision Records

Short records of the load-bearing decisions in this codebase — what was decided,
why, and the trade-offs accepted. New significant decisions should be added as
`NNNN-title.md`.

| ADR | Decision |
| --- | --- |
| [0001](0001-repository-abstraction.md) | Abstract repositories with a TypeORM implementation |
| [0002](0002-domain-model-vs-orm-entity.md) | Separate domain models from ORM entities |
| [0003](0003-dynamic-rbac.md) | Database-resolved (dynamic) RBAC over token-embedded roles |
| [0004](0004-token-revocation.md) | Token-version revocation for stateless JWTs |
| [0005](0005-pluggable-email.md) | Pluggable EmailSender with a logging default |
