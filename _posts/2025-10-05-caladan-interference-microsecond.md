---
date: 2025-10-05 00:00:00
layout: post
title: "Caladan: Mitigating Interference at Microsecond Timescales"
subtitle: Dedicated scheduler core + fast core allocation reacts to interference in microseconds — no slow hardware partitioning
description: Dedicated scheduler core + fast core allocation reacts to interference in microseconds — no slow hardware partitioning
category: library
tags:
  - paper-review
  - OSDI
  - "2020"
image: /assets/img/uploads/cat/1.jpg
optimized_image: /assets/img/uploads/cat/1.jpg
author: Sujin
paginate: true
---

**Venue:** OSDI 2020  
**Link:** [USENIX OSDI '20](https://www.usenix.org/conference/osdi20/presentation/fried)

**Topic:** Hardware resource partitioning reacts too slowly (tens of seconds) to interference between latency-critical and best-effort tasks. Caladan uses a dedicated scheduler core that monitors fine-grained control signals and adjusts core allocations in microseconds.

---
# Summary
Data centers co-locate multiple tasks on one machine for utilization, but interference between tasks spikes tail latency.
Hardware partitioning (static or dynamic) is too slow — static wastes utilization, dynamic takes seconds to converge.
Caladan replaces partitioning with **core allocation driven by real-time control signals**, reacting to interference in **microseconds**.

---

# Background

## The interference problem
- End-to-end response time is determined by the slowest individual request → tail latency matters.
- Co-located tasks compete for: CPU cores, memory bandwidth, LLC, execution units.
- Interference → latency spikes.

## Types of CPU interference
1. **Hyperthreading interference** (within one physical core): execution unit contention.
2. **Memory bandwidth interference**: affects all cores on the same physical CPU.
3. **LLC interference**: affects all cores on the same physical CPU.

## Limitation of partitioning
- **Static partitioning**: allocate enough for peak load → poor CPU utilization.
- **Dynamic partitioning**: takes **dozens of seconds** to converge → misses latency spikes.

---

# Key Idea

## Core allocation as the isolation mechanism
- Instead of partitioning resources, use **control signals** to drive fast **core allocation**.
- Core allocation avoids the reaction-time constraints of hardware partitioning.

## Two challenges
1. **Sensitivity**: many interference types → need signals that accurately detect each type.
2. **Scalability**: must gather signals and adjust allocations faster than interference builds up.

---

# Design

## Dedicated scheduler core
- A centralized core dedicated to collecting control signals and making allocation decisions.
- Distinguishes **Latency-Critical (LC)** tasks from **Best-Effort (BE)** tasks.

### Scheduler workflow
1. Collect fine-grained measurements: memory bandwidth usage, request processing times.
2. Detect interference: memory bandwidth saturation, hyperthreading contention.
3. Adjust core allocations: grant more cores to LC tasks experiencing queueing delays.
4. Restrict BE tasks from CPU cores until interference is resolved.

### Controllers
- **Top-level core allocator**: grants more cores to tasks experiencing queueing delays.
- **Memory Bandwidth Controller**: uses available memory bandwidth while avoiding saturation.
- **Hyperthread Controller**: detects hyperthreading interference → bans use of sibling hyperthread until the current request finishes.

## KSCHED: Fast and Scalable Scheduling
- Linux kernel module for performing scheduling across many cores simultaneously in **microseconds**.
- Shifts scheduling work **from the scheduler core → to tasks' cores**.
- Leverages hardware **multicast IPIs** to amortize interrupt sending cost.
- Provides a **fully asynchronous, non-blocking** scheduler interface.

### KSCHED workflow
- Amortize interrupt cost via multicast IPI.
- Offload scheduling work to task cores.
- Non-blocking API: scheduler core can handle many inflight operations concurrently.

---

# Insights
- Core allocation is more effective than resource partitioning for achieving performance isolation under dynamic loads.
- Defining the right control signals is the key to detecting and distinguishing different interference types quickly.

---

# Meeting Notes
*(to be filled)*
