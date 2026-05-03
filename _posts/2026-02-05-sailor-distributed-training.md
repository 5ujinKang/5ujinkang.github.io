---
date: 2026-02-05 00:00:00
layout: post
title: "Sailor: Automating Distributed Training over Dynamic, Heterogeneous, and Geo-distributed Clusters"
subtitle: Co-optimize resource allocation and parallelization plan for heterogeneous GPU training with accurate simulation
description: Co-optimize resource allocation and parallelization plan for heterogeneous GPU training with accurate simulation
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/25.jpg
optimized_image: /assets/img/uploads/cat/25.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  
**Link:** [ACM DL](https://dl.acm.org/doi/epdf/10.1145/3731569.3764839)

**Topic:** Heterogeneous and geo-distributed GPU clusters offer more resources per job but introduce challenges: vast configuration spaces, inaccurate simulators, and frameworks that don't support heterogeneous parallelization plans. Sailor addresses all three.

---
# Summary
Using heterogeneous GPU types and geo-distributed resources gives model developers access to more GPUs per job — improving training throughput.
But current systems can't efficiently use heterogeneous resources because they:
1. Don't co-optimize resource allocation with the job's parallelization plan.
2. Rely on inaccurate simulators for throughput/memory estimation.
3. Use training frameworks (e.g., Megatron-LM) that don't support heterogeneous parallelization plans.

Sailor introduces a **profiler, configuration planner, simulator, and extended distributed training framework** that jointly solve all three problems.

---

# Background

## Heterogeneous and geo-distributed resources
- Different GPU types (A100, V100, etc.) and different inter-node bandwidths across zones.
- More GPUs per job → higher throughput, but requires carefully planned parallelization.

## Existing system limitations
1. **No co-optimization**: current systems optimize resource allocation and parallelization plan independently → suboptimal configurations.
2. **Inaccurate simulators**: existing memory footprint and iteration time estimates miss critical factors.
3. **Inflexible frameworks**: Megatron-LM and similar systems are slow to reconfigure and don't support different microbatch sizes per GPU — necessary for heterogeneous plans.

---

# Key Idea

## Co-optimize resource allocation + parallelization plan
- Creates a large search space → address with:
  1. **Heuristic pruning**: prune based on memory footprint, GPU capacity, and scalability constraints.
  2. **Dynamic programming**: reuse performance estimates for subproblems to avoid redundant computation.

## Accurate simulation
- Collect more signals for estimation.
- Use a principled formula to model iteration time and memory footprint for any configuration.

## Heterogeneous framework
- Extends Megatron-LM to support heterogeneous parallelization plans, different microbatch sizes per GPU, fast reconfiguration, fault tolerance, and elasticity.

---

# Design

1. **Profiler**: collects job information, compute node specs, and network bandwidth.
2. **Configuration planner**: navigates the search space, recommends configurations optimizing a user-defined objective (max throughput or min cost) under constraints (budget, min throughput).
3. **Simulator**: accurately models iteration time and memory footprint for any given configuration.
4. **Distributed training framework**: adds support for heterogeneous configs, fault tolerance, and elasticity to Megatron-LM.

---

# Evaluation
- Evaluated on heterogeneous and geo-distributed clusters.
- Outperforms baselines in throughput and cost efficiency.

---

# Limitations
- Heterogeneity may prevent use of high-performance collective communication libraries.
- Geo-distributed networks are prone to unpredictable jitter and packet loss.
- Parallelization strategies are optimized for homogeneous settings → may need new strategies for heterogeneous-optimized collectives.

---

# Insights
- Leverages ML training domain properties for smart search space pruning:
  - Predictable workloads → accurate simulation.
  - Domain knowledge (memory footprint constraints) → prune the search space.
  - Throughput-only objective → simplifies optimization.
- Solid evaluation with many baselines and a well-structured motivation section.

---

# Meeting Notes
- Existing hardware limitations are fundamental → sometimes need to modify hardware assumptions.
- Even with the same hardware, finding the right use case creates new value.
- Taking app feedback ≠ application modification.
- Fairness as a goal: showed 21.6% improvement — not necessarily high enough to be the primary contribution.
- Difficult to improve performance through resource reallocation alone in general data centers, but certain domains may benefit.
