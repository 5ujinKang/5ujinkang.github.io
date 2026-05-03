---
date: 2025-10-05 00:00:00
layout: post
title: "Architectural Implications of Function-as-a-Service Computing"
subtitle: FaaS containerization brings up to 20× slowdown vs. native; cold start can exceed 10× a function's execution time
description: FaaS containerization brings up to 20× slowdown vs. native; cold start can exceed 10× a function's execution time
category: library
tags:
  - paper-review
  - MICRO
  - "2019"
image: /assets/img/uploads/cat/3.jpg
optimized_image: /assets/img/uploads/cat/3.jpg
author: Sujin
paginate: true
---

**Venue:** MICRO 2019  
**Link:** [ACM DL](https://dl.acm.org/doi/abs/10.1145/3352460.3358296)

**Topic:** A comprehensive characterization of FaaS (Function-as-a-Service) workloads on OpenWhisk, identifying where time is spent, why cold starts are expensive, and what architectural bottlenecks exist.

---
# Summary
FaaS containerization brings **up to 20× slowdown** compared to native execution.
Cold-start latency can exceed **10× a short function's execution time**.
This paper introduces a tooling framework (on OpenWhisk) to instrument and measure where time is spent across the FaaS stack, and analyzes over/under-invocation behaviors that affect latency.

---

# Background

## FaaS overhead sources
- FaaS providers are unaware of functions' application-level performance metrics beyond throughput and execution time.
- Metrics like 99th-percentile latency are not guaranteed — unlike PaaS or microservices.
- This exposes developers to platform-level behavior like unpredictable cold-start times.

## Invocation states and their effects

### Over-invoked
- More functions invoked than the server can execute → invocations queue internally.
- Backlog grows → latency keeps increasing.
- An active load balancer can redirect invocations away from over-invoked servers.

### Under-invoked
- OpenWhisk pauses idle containers after a 50 ms grace period to save memory.
- If invocation rate is low, containers become idle, get paused, and must be unpaused → latency ripple effect.

### Balanced
- Invocation rate high enough to avoid pauses and low enough to stay within server capacity.
- Latency converges to the function's execution time (~55 ms in experiments).

---

# Key Finding

## Containerization overhead
- FaaS containerization: **up to 20× slowdown** vs. native execution.
- Cold start can be **over 10× a short function's execution time**.

## Contribution
- A tool/framework for inspecting latency breakdown inside the FaaS stack (built on OpenWhisk).
- Helps identify which phases (scheduling, container creation, language runtime init, function execution) dominate.

---

# Insights
- FaaS providers lack application-level visibility → can't guarantee SLO metrics.
- Over-invocation and under-invocation both cause significant latency spikes — the balanced point is narrow.
- Cold-start latency depends heavily on invocation frequency: too sparse → cold start; too dense → overload.

---

# Meeting Notes
*(to be filled)*
