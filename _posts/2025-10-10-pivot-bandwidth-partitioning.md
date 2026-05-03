---
date: 2025-10-10 00:00:00
layout: post
title: "Criticality-Aware Instruction-Centric Bandwidth Partitioning for Data Center Applications"
subtitle: Static partitioning can't react quickly to load changes → use fine-grained control signals and core allocation instead
description: Static partitioning can't react quickly to load changes → use fine-grained control signals and core allocation instead
category: library
tags:
  - paper-review
  - HPCA
  - "2025"
image: /assets/img/uploads/cat/20.jpg
optimized_image: /assets/img/uploads/cat/20.jpg
author: Sujin
paginate: true
---

**Venue:** HPCA 2025  
**Link:** [Paper PDF](https://zhou-diyu.github.io/files/pivot-hpca25.pdf)

**Topic:** Hardware resource partitioning for interference isolation is too slow to react to rapidly changing workloads. A better approach uses criticality-aware control signals and fast core allocation to mitigate interference at fine granularity.

---
# Summary
Tail latency is critical in data centers, but co-located tasks compete for shared resources (cores, memory bandwidth, LLC, execution units) causing interference.
Hardware partitioning is the common solution but reacts too slowly — static assignment wastes utilization, dynamic adjustment takes tens of seconds.
The key insight: **core allocation** can achieve performance isolation faster and more efficiently than resource partitioning, given the right control signals.

---

# Background

## Why tail latency matters
- End-to-end response times are determined by the slowest individual response.
- Data centers pack multiple tasks on the same machine to improve CPU utilization.
- Task competition for shared resources causes significant latency spikes.

## Types of CPU interference
1. **Hyperthreading interference** (within a physical core): serious when shared execution resources are contended.
2. **Memory bandwidth interference**: impacts all cores sharing the same physical CPU.
3. **LLC interference**: impacts all cores sharing the same physical CPU.

## Limitation of partitioning-based approaches
- **Static partitioning**: assign enough resources for peak load → poor CPU utilization.
- **Dynamic partitioning**: converging to the right configuration after a workload change takes **dozens of seconds** → misses latency spikes.
- Goal: **faster reaction times** while achieving both strict performance isolation and high CPU utilization.

---

# Key Idea

## Core allocation as the primary isolation mechanism
- Instead of partitioning resources → use **control signals and policies** to drive fast **core allocation**.
- Core allocation avoids the reaction-time limitations imposed by hardware partitioning mechanisms.

## Challenges
1. **Sensitivity**: many interference types → need control signals that accurately detect each type.
2. **Scalability**: software overhead of gathering signals and adjusting allocations must be minimal.

---

# Design

## Dedicated scheduler core
- A centralized, dedicated core collects control signals and makes resource allocation decisions.
- Distinguishes between Latency-Critical (LC) tasks and Best-Effort (BE) tasks.
- Workflow:
  1. Collect fine-grained measurements (memory bandwidth, request processing times).
  2. Detect interference (memory bandwidth, hyperthreading).
  3. Adjust core allocations.
  4. Restrict cores from BE tasks to eliminate interference impact on LC services.

## Controllers
- **Top-level core allocator**: grants more cores to tasks experiencing queueing delays.
- **Memory Bandwidth Controller**: uses available bandwidth while avoiding saturation.
- **Hyperthread Controller**: detects hyperthread interference → bans use of the sibling hyperthread until the current request completes.

## KSCHED: Fast and Scalable Scheduling
- Linux kernel module that performs scheduling across many cores simultaneously in microseconds.
- Shifts scheduling work from the scheduler core to tasks' cores.
- Leverages hardware multicast IPIs to amortize interrupt sending cost.
- Provides a fully asynchronous, non-blocking scheduler interface.

---

# Insights
- Core allocation can achieve performance isolation more effectively than resource partitioning.
- Defining the right control signals (state representation) is key to handling interference tradeoffs.

---

# Meeting Notes
*(to be filled)*
