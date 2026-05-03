---
date: 2026-01-28 00:00:00
layout: post
title: "Robust LLM Training Infrastructure at ByteDance"
subtitle: Automated failure diagnosis and recovery for large-scale LLM training — minimize unproductive time across 16K+ GPUs
description: Automated failure diagnosis and recovery for large-scale LLM training — minimize unproductive time across 16K+ GPUs
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/24.jpg
optimized_image: /assets/img/uploads/cat/24.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  

**Topic:** Large-scale LLM training is inherently unstable — failures are frequent and hard to detect. Diagnosis and recovery currently take hours to days. This paper presents an automated framework that minimizes unproductive training time.

---
# Summary
Training large language models at 16K+ GPU scale is routinely interrupted by failures.
Current practice: timeout-based detection, manual diagnosis, and full-job rescheduling — resulting in hours to days of wasted GPU time.
Three types of failures make this hard: implicit failures (hard to detect), ultra-large scale (not enough spares for naive recovery), and continuously evolving user code (interacts with failure patterns).

Key insight: **prioritize rapid isolation over precise root cause localization** — finding the exact faulty machine is slow; quickly excluding suspected machines and resuming is faster.

---

# Background

## Why large-scale LLM training is unstable
1. **Implicit failures**: silent corruption, hangs — hard to detect without active monitoring.
2. **Ultra-large scale**: 16K+ GPUs → not enough spare machines to simply replace any failed component.
3. **Months-long training runs**: user code evolves continuously → failures interact with code updates.

## Current failure handling
- Timeouts and process termination to identify faulty machines → significant waste of GPU cycles.
- Fail-stop → diagnose → reassume: entire procedure takes hours to days.

---

# Key Idea

## Three principles

### 1. Rapid isolation, not precise localization
- Precise failure pinpointing leaves vast GPU fleets idle during diagnosis.
- Instead: **lightweight real-time detection** + **hierarchical stop-time diagnostics**.
  - Quickly single out suspect machines with minimal overhead.
  - Data-driven clustering of runtime stack traces to isolate suspected machines.
  - Over-evict suspects rather than chasing exact root causes.

### 2. Control variability during recovery
- Automated fault tolerance framework with machine fault detection.
- **Code rollback** for rapid verification — new code changes are merged with deterministic failures via a **lazy update** approach.
- Exploits the inevitability and high frequency of failures as natural rollback trigger points.

### 3. Controlled and rapid recovery
- **Pre-provisioned warm standbys**: execute self-checks before being assigned → avoid full job rescheduling.
- **Checkpointing module**: fast backup and restart from recent checkpoint.

---

# Design

## Architecture
- **Control Plane**:
  - **Robust Controller**: orchestrates the automated failure mitigation framework.
  - **Runtime Analyzer**: addresses job hangs and performance degradations.
- **Data Plane**: resides within each training pod — monitors health and execution state.

---

# Interesting Points
- Optimization techniques and parallelization strategies derived from small-scale testing are often suboptimal at large scale.
- Lazy update approach turns inevitable failures into a useful mechanism: merge code updates at failure/restart boundaries.

---

# Assessment
**Strengths:**
- Handles 16K+ GPU scale with fault tolerance and redundancy.
- Step-by-step error detection procedure with empirical validation.
- Detailed technical implementation.

**Weaknesses:**
- Abstract is light on contributions.
- Limited novelty compared to prior work on distributed fault tolerance.

---

# Meeting Notes
*(to be filled)*
