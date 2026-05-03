---
date: 2025-10-05 00:00:00
layout: post
title: "SEUSS: Skip Redundant Paths to Make Serverless Fast"
subtitle: Deploy serverless functions from unikernel snapshots to skip boot, runtime init, and import overhead — 51× throughput improvement
description: Deploy serverless functions from unikernel snapshots to skip boot, runtime init, and import overhead — 51× throughput improvement
category: library
tags:
  - paper-review
  - EUROSYS
  - "2020"
image: /assets/img/uploads/cat/15.jpg
optimized_image: /assets/img/uploads/cat/15.jpg
author: Sujin
paginate: true
---

**Venue:** EuroSys 2020  
**Link:** [ACM DL](https://dl.acm.org/doi/abs/10.1145/3342195.3392698)

**Topic:** Serverless cold starts are slow because every invocation re-executes boot, runtime initialization, and code import. SEUSS deploys functions from unikernel snapshots and applies page-level sharing to skip all redundant initialization paths.

---
# Summary
SEUSS uses unikernel snapshots to bypass the three expensive initialization phases: unikernel boot, language runtime init, and function code import/compile.
By applying page-level sharing across the entire software stack, snapshot memory footprint is much smaller than processes or containers, enabling caching of far more function instances per node.
Results: deployment time drops from 100s of ms to under 10 ms; platform throughput improves 51×; 50,000+ function instances cached vs. 3,000 with standard techniques.

---

# Background

## Sources of serverless cold-start latency
1. **Boot the unikernel** (or OS).
2. **Initialize the language runtime** (e.g., Python interpreter).
3. **Import and compile function code and dependencies**.

## Current solutions' limits
- Standard containers/microVMs still go through these initialization paths on cold start.
- Large memory footprint per instance limits how many warm instances can be cached.

---

# Key Idea

## Unikernel snapshot for fast deployment
- Pack function logic with a language interpreter and library OS into an isolated **unikernel**.
- The flat address space of a unikernel enables straightforward capture of the entire memory footprint and register state as an **in-memory snapshot image**.
- New executions are deployed directly from the snapshot → skipping boot, runtime init, and import.

## Page-level sharing to reduce memory footprint
- Apply page sharing across all snapshot stacks and Unikernel Contexts (UCs).
- Snapshot memory footprint << process/container/microVM footprint.
- More function instances can be cached per node.

## Anticipatory optimizations
- Before capturing a snapshot, **pre-warm** the internal pathways and data structures of the unikernel stack.
- The snapshot already contains a warm, ready-to-execute state.

---

# Design

## Execution model
- **B**: unikernel boots.
- **C**: Unikernel Contexts (UCs) are created.
- **S**: function-specific snapshot is captured.
- **W (Warm)** and **H (Hot)**: invocations resume from snapshot.

## Components
1. **Unikernel**: replaces Linux on the compute node. Enables straightforward snapshotting of function state.
2. **Snapshot capture**: black-box fashion — captures memory footprint and register state at an arbitrary execution point.
3. **Page sharing**: enables memory deduplication across all snapshot instances.

---

# Evaluation
- Prototype replacing Linux on the FaaS compute node.
- **Deployment time**: 100s of ms → **under 10 ms**.
- **Platform throughput**: **51× improvement** on workload of entirely new functions.
- **Cached instances**: **50,000+** vs. 3,000 with standard OS techniques.
- Enables handling large-scale bursts of function requests.

---

# Meeting Notes
*(to be filled)*
