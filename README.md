# NestJS Starter Kit

**Production-ready NestJS starter template** for SaaS products, business applications and internal platforms.

Designed for teams that value **maintainability**, **operational simplicity** and **long-term sustainability**.

---

# Overview

This project provides a practical foundation for backend services built with NestJS.

The template includes:

- Authentication
- Authorization
- Validation
- Logging
- Queue Processing
- API Documentation
- Docker Deployment
- CI/CD

**Objective:** Reduce project setup overhead while maintaining a clear and sustainable architecture.

---

# Architectural Principles

- **Prefer simplicity over unnecessary abstraction**
- **Optimise for maintainability rather than novelty**
- **Keep operational overhead low**
- **Favour convention over configuration**
- **Introduce complexity only when justified by business requirements**

---

# Architecture Philosophy

## Modular Monolith First

Most business applications do not require microservices.

Benefits:

- **Simpler deployments**
- **Lower operational overhead**
- **Faster development cycles**
- **Easier debugging**
- **Reduced infrastructure complexity**

The template intentionally adopts a modular monolith architecture while providing a migration path towards distributed systems when required.

---

# Technology Stack

## Core

- **NestJS 11**
- **TypeScript 5**
- **Node.js 22+**
- **pnpm**

## Data Layer

- **PostgreSQL**
- **TypeORM**
- Database Migrations
- Database Seeders

## Authentication & Authorization

- **JWT Authentication**
- Refresh Tokens
- Passport
- bcrypt
- **RBAC (Role-Based Access Control)**

## Validation

- class-validator
- class-transformer

## Documentation

- Swagger / OpenAPI

## Logging

- **Pino**
- **Request Correlation IDs**
- Structured Logging

## Queue Processing

- **Redis**
- **BullMQ**

## Security

- Helmet
- CORS

## Deployment

- Docker
- Docker Compose

## Continuous Integration

- GitHub Actions

---

# Key Architecture Decisions

| Decision | Choice | Rationale |
|-----------|----------|------------|
| Application Architecture | Modular Monolith | Lower operational overhead |
| Database | PostgreSQL | Mature ecosystem and strong transactional guarantees |
| ORM | TypeORM | Familiar enterprise development patterns |
| Queue Processing | BullMQ | Lightweight and practical |
| Authentication | JWT | Stateless authentication |
| Logging | Pino | High-performance structured logging |
| Containerisation | Docker | Consistent deployment environments |

---

# Features

## Authentication

- Register
- Login
- Logout
- Refresh Tokens
- User Profile

## Authorization

- RBAC
- Route Guards
- Role-Based Access

## API Standards

- **DTO Validation**
- **API Versioning**
- **Pagination**
- **Standard Response Format**
- **Global Exception Handling**
- **Error Code System**

## Observability

- Request Logging
- Error Logging
- Request Correlation IDs
- Health Checks
- **Graceful Shutdown**

## Background Processing

- Queue Workers
- Scheduled Jobs
- Async Processing

## Developer Experience

- **Environment Validation**
- **Configuration Module**
- **Setup Script**

---

# Standard API Response

## Success

```json
{
  "success": true,
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

---

# Project Structure

```text
src
├── common
├── config
├── database
├── logger
├── modules
├── workers
└── main.ts
```

---

# Getting Started

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm start:dev
```

---

# What Is Not Included

The following technologies are intentionally excluded from v1:

- Microservices
- Kafka
- RabbitMQ
- Kubernetes
- GraphQL
- MongoDB

---

# Release Strategy

| Version | Focus |
|----------|----------|
| v1.x | Foundation |
| v2.x | Business Modules |
| v3.x | Observability |
| Future | Distributed Systems |

---

# Roadmap

## v1 Foundation

- Authentication
- Authorization
- Validation
- Logging
- Queue Processing
- Docker
- CI/CD

## v2 Business Modules

- Email Module
- File Upload Module
- Audit Log Module
- Rate Limiting
- Redis Cache

## v3 Observability

- OpenTelemetry
- Sentry Integration
- Metrics Collection
- Distributed Tracing

---

# Contributing

Contributions, suggestions and discussions are welcome.

Please open an issue before submitting significant architectural or feature changes.

---

# Maintainer Notes

Changes are evaluated against:

- **Developer Experience**
- **Operational Simplicity**
- **Long-Term Maintainability**

---

# License

MIT
