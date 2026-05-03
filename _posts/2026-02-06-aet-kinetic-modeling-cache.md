---
date: 2026-02-06 00:00:00
layout: post
title: "Kinetic Modeling of Data Eviction in Cache"
subtitle: AET — composable, linear-time Miss Ratio Curve profiling via average eviction time sampling
description: AET — composable, linear-time Miss Ratio Curve profiling via average eviction time sampling
category: library
tags:
  - paper-review
  - ATC
  - "2016"
image: /assets/img/uploads/cat/26.jpg
optimized_image: /assets/img/uploads/cat/26.jpg
author: Sujin
paginate: true
---

**Venue:** ATC 2016  
**Link:** [USENIX ATC '16](https://www.usenix.org/conference/atc16/technical-sessions/presentation/hu)

**Topic:** Use average eviction time (AET) measured by sampling to compute Miss Ratio Curves in linear time with extremely low space overhead, enabling shared-cache MRC profiling.

---
# Summary
Prior MRC profiling methods either lacked shared-cache support or had high overhead.
AET models the average eviction time — a composable metric — allowing MRC computation in O(N) time with O(1) space via reservoir sampling.
Key benefit: MRCs for multi-programmed workloads in shared cache can be computed directly from the AET of individual programs.

---

# Background

## Why MRC matters
- Miss Ratio Curves (MRCs) characterize a program's locality — essential for cache partitioning and shared-cache optimization.
- MRC gives the miss ratio at each possible cache size.

## Prior work limitations
- **Counter Stacks** and **SHARDS**: good accuracy, low time/space overhead.
  - BUT: cannot characterize shared cache behavior by modeling individual programs.
- **StatStack**: assumes every reference has a next reuse → inaccurate for working-set-sized programs.

## Key concept: reuse distance vs. eviction time
- Reuse distance: number of distinct accesses between two consecutive accesses to the same location.
- AET replaces stack-position tracking with time: "a block moves position whenever its reuse time exceeds the arrival time."
- Miss ratio at cache size c = probability that reuse time > AET(c).

---

# Key Idea

## Average Eviction Time (AET)
- AET is **composable**: the shared-cache MRC of a multi-programmed workload can be derived from the AET of individual programs.
  - Cache sharing means all co-run programs have the same AET.
- AET runs in **linear time** O(N) using sampled Reuse Time Histograms (RTH).

## Efficiency via sampling
- Random sampling + reservoir sampling reduce space from O(M) to O(1).
- Phase sampling: for programs with unstable access patterns, divide execution into phases and average MRCs.

---

# Design

## MRC computation
- `miss_ratio(c)` = probability that reuse time > AET(c).
- Cold misses have infinite reuse time by definition.

## Implementation
1. **Reservoir sampling** — reduces RTH space complexity from O(M) to O(1).
2. **Phase sampling** — evenly divide execution, compute per-phase MRC and average. Better accuracy for programs with non-stationary locality.

---

# Evaluation
- Evaluated on CPU workloads and storage workloads.
- AET has the **lowest time and space overhead** among compared techniques (Counter Stacks, SHARDS, StatStack).
- AET in O(N); Counter Stacks in O(N log M) — significant practical speedup.
- **Composability**: AET can model shared cache, Counter Stacks and SHARDS cannot.
- Average accuracy improvement over StatStack: **35.8%**.
- Phase AET sampling is more accurate than non-phase in most benchmarks.

---

# New Knowledge
- **Locality characterization techniques**: useful keyword for Working Set Size estimation research.
- Reuse distance = number of distinct data accesses between two consecutive accesses to the same location.
- Cache sharing → all co-run programs share the same AET.
- Storage workloads are much larger than CPU workloads; their lifespan may last weeks or more.

---

# Insight
- To estimate cache usage, exact stack position is unnecessary — relative time (reuse time) is sufficient.
- Trade-off: AET makes a statistical assumption (good accuracy in O(N)), Counter Stacks makes no assumption (perfect accuracy in O(N log M)).
- ABF (bursty interval sampling) is simpler but loses accuracy outside burst intervals.

---

# Meeting Notes
*(to be filled)*
