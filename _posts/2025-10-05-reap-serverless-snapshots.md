---
date: 2025-10-05 00:00:00
layout: post
title: "Benchmarking, Analysis, and Optimization of Serverless Function Snapshots"
subtitle: Functions access stable working sets across invocations → prefetch from disk to cut cold-start latency by 3.7×
description: Functions access stable working sets across invocations → prefetch from disk to cut cold-start latency by 3.7×
category: library
tags:
  - paper-review
  - ASPLOS
  - "2022"
image: /assets/img/uploads/cat/12.jpg
optimized_image: /assets/img/uploads/cat/12.jpg
author: Sujin
paginate: true
---

**Venue:** ASPLOS 2022  
**Slides:** [Google Slides](https://docs.google.com/presentation/d/1d3wfehxgUbBJhlxRJfxRy3I7JtcGpTACrCyT37dZvwU/edit)

**Topic:** Snapshotting is already used to reduce cold-start latency in serverless, but snapshot-based invocations still run 95% slower than memory-resident ones due to page faults. Functions access a stable, predictable working set → prefetch it.

---
# Summary
Snapshot-based cold starts still suffer from frequent page faults as guest memory is loaded from disk one page at a time.
Key insight: the same function accesses the same stable working set of pages across different invocations.
→ REAP records the working set on first invocation and proactively prefetches it for subsequent cold starts.
Result: 97% reduction in page faults, 3.7× cold-start latency improvement.

---

# Background

## Snapshotting as a cold-start mitigation
- Cloud providers reduced cold-start latency by storing fully-booted function snapshots on disk.
- Faster than booting from scratch, but still significantly slower than memory-resident execution.

## The remaining problem: page faults
- Firecracker lazily populates guest memory → each first access to a page raises a host page fault.
- Linux `userfaultfd` was used to trace memory access patterns.
- Snapshot-started functions run **95% slower** on average than memory-resident ones.
- Root cause: bringing function state from disk into guest memory one page at a time.

---

# Key Idea

## Observation
Functions access the **same stable working set** of memory pages across different invocations of the same function.

## Action
**REAP (Record-And-Prefetch):** a lightweight software mechanism inside the vHive-CRI orchestrator.
- Records the function's working set on the first cold invocation from a snapshot.
- Proactively prefetches that working set from disk before subsequent cold invocations.

---

# Design

## vHive: the experimental framework
- Open-source serverless experimentation framework.
- Allows researchers to study the entire serverless stack.
- Augmented to act as a MicroManager (similar to AWS Lambda's orchestrator).

## REAP workflow
1. **Record phase:** On first cold invocation, trace all guest memory page faults using `userfaultfd`. Store the accessed page addresses as the function's working set record.
2. **Prefetch phase:** On subsequent cold invocations, replay the record to prefetch pages from disk into memory before execution begins.

## Why it works
- The compact, stable working set provides an excellent prefetch target.
- Eliminates the majority of page faults — particularly the slow tail of rarely-accessed pages.

---

# Evaluation
- Benchmarks: functions from FunctionBench (representative serverless suite).
- Host OS page cache flushed before each cold invocation to simulate low-invocation-frequency production conditions.

**Results:**
- REAP eliminates **97% of page faults** on average.
- Cold-start latency reduced by an average of **3.7×**.

---

# Meeting Notes
*(to be filled)*
