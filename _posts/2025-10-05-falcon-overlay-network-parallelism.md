---
date: 2025-10-05 00:00:00
layout: post
title: "Parallelizing Packet Processing in Container Overlay Networks"
subtitle: Serialized softirqs on a single core bottleneck overlay networks → pipeline them across multiple cores with Falcon
description: Serialized softirqs on a single core bottleneck overlay networks → pipeline them across multiple cores with Falcon
category: library
tags:
  - paper-review
  - EUROSYS
image: /assets/img/uploads/cat/5.jpg
optimized_image: /assets/img/uploads/cat/5.jpg
author: Sujin
paginate: true
---

**Venue:** EuroSys  

**Topic:** Container overlay networks cause significant throughput and latency degradation compared to physical networks. The main bottleneck is serialization of softirqs on a single core. Falcon pipelines softirqs across multiple cores to remove this bottleneck.

---
# Summary
Overlay networks are widely adopted in production container environments but cause significant performance degradation (throughput and latency) compared to physical networks.
Root cause: a large number of software interrupts (softirqs) associated with different network devices of a single flow are serialized on a single core.
Falcon prevents this serialization via **softirq pipelining, splitting, and dynamic balancing** — enabling fine-grained, low-cost flow parallelization on multicore machines.

---

# Background

## Overlay networks and performance
- Container overlay networks (e.g., VXLAN-based) encapsulate packets and process them through additional virtual network devices.
- Each virtual device generates softirqs that must be processed.
- In single-flow scenarios, all these softirqs get serialized on one core → CPU bottleneck.

## The bottleneck
- Large number of softirqs per flow, all processed on a single core.
- Core becomes a serialization point → limits throughput and increases latency.

---

# Key Idea

## Falcon: softirq pipelining
Distribute softirq processing for a single flow across **multiple cores** to prevent any one core from being overwhelmed.

Three core designs:
1. **Softirq pipelining**: chain softirq processing stages across cores.
2. **Softirq splitting**: divide softirq work within a stage across cores.
3. **Dynamic balancing**: adapt the distribution based on load.

---

# Design

- Falcon operates at the granularity of individual flows.
- Fine-grained parallelization: low overhead, no need to modify applications.
- Multicore machines: softirqs associated with different network devices of the same flow are dispatched to different cores.

---

# Evaluation
- Significant throughput and latency improvements over baseline in-kernel networking for container overlay networks.
- Approaches physical network performance by eliminating the serialization bottleneck.

---

# Meeting Notes
*(to be filled)*
