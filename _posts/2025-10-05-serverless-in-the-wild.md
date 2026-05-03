---
date: 2025-10-05 00:00:00
layout: post
title: "Serverless in the Wild: Characterizing and Optimizing the Serverless Workload at a Large Cloud Provider"
subtitle: Characterize FaaS workloads → propose per-function keep-alive and pre-warm policies to cut cold starts
description: Characterize FaaS workloads → propose per-function keep-alive and pre-warm policies to cut cold starts
category: library
tags:
  - paper-review
  - ATC
image: /assets/img/uploads/cat/14.jpg
optimized_image: /assets/img/uploads/cat/14.jpg
author: Sujin
paginate: true
---

**Venue:** ATC  

**Topic:** Characterize real-world FaaS workloads and propose a practical resource management policy that reduces cold starts while using no more resources than current fixed keep-alive policies.

---
# Summary
AWS Lambda and Azure Functions use a fixed keep-alive policy (10 and 20 minutes respectively) that ignores individual function invocation patterns, leading to cold starts and resource waste.
After characterizing production FaaS workloads, a per-function keep-alive policy is proposed that adapts to actual invocation frequency and enables pre-warming just before predicted invocations.

---

# Background

## Cold starts in FaaS
- Cloud functions run inside containers. A cold start occurs when no idle container is available for a function invocation.
- FaaS providers avoid immediate container termination to enable warm starts for the next invocation.
- Tension: avoidance of idling vs. on-demand scaling → more cold starts are unavoidable.

## Current keep-alive policies
- **AWS Lambda**: keeps containers alive for 10 minutes after last execution.
- **Azure Functions**: keeps containers alive for 20 minutes.
- Both are simple, fixed policies that disregard actual invocation frequency and patterns.
  - Poor behavior for infrequently invoked functions (wastes resources) and for bursty functions (misses pre-warm opportunities).

---

# Key Idea

## Observation from production characterization
- Functions show diverse invocation patterns — no single keep-alive duration fits all.
- Some workloads have clear, predictable invocation patterns.

## Proposed policy
1. **Per-function keep-alive**: set a different keep-alive duration per function based on its actual invocation frequency and pattern.
2. **Pre-warming**: for workloads with clear invocation patterns, the histogram predicts when to pre-warm a container just before the next invocation — turning a cold start into a warm start.

## Implementation
- Maintain a small histogram of recent inter-invocation times per function.
- From the histogram: determine optimal keep-alive duration and pre-warm timing.

---

# Evaluation
- Policy consumes **no more resources** than current fixed policies while significantly reducing cold-start frequency.
- For workloads with stable patterns, pre-warming effectively eliminates cold starts.

---

# Meeting Notes
*(to be filled)*
