---
date: 2025-10-05 00:00:00
layout: post
title: "Replayable Execution Optimized for Page Sharing for a Managed Runtime Environment"
subtitle: Checkpoint with GC-compacted heap → share pages across containers → speedy restoration with fewer page faults
description: Checkpoint with GC-compacted heap → share pages across containers → speedy restoration with fewer page faults
category: library
tags:
  - paper-review
  - EUROSYS
image: /assets/img/uploads/cat/13.jpg
optimized_image: /assets/img/uploads/cat/13.jpg
author: Sujin
paginate: true
---

**Venue:** EuroSys  

**Topic:** Extend checkpointing to optimize page sharing across containers for managed runtime environments, enabling speedy restoration with minimal page faults.

---
# Summary
Standard checkpointing saves a process image to disk and restores it later.
Key insight: by triggering Garbage Collection before checkpointing, the heap is compacted → objects are placed adjacent in memory → fewer pages are needed → better page sharing across container instances during restoration.
Result: speedy restoration via shared memory pages and reduced page faults.

---

# Background

## Checkpointing in managed runtimes
- Checkpointing captures memory state (including heap) as an image.
- Restoration involves reloading this image, which causes page faults as memory is demand-paged.

## The page sharing opportunity
- Multiple containers running the same function share large amounts of code and heap data.
- If container images can share physical pages, memory footprint decreases and restoration is faster.

---

# Key Idea

## GC before checkpoint → compact heap → better page sharing
1. **Trigger Garbage Collection** before taking the checkpoint.
   - GC compacts the heap: live objects are packed together, eliminating gaps.
   - Objects end up closer together in virtual address space.
2. **Fewer pages** needed to represent the heap.
3. **More page sharing** across instances — containers can share the same physical pages during restoration.
4. **Fewer page faults** on restoration — less memory needs to be re-faulted in from disk.

---

# Design

- Intercept checkpoint point in managed runtime (e.g., JVM).
- Force a full GC at checkpoint time to compact the heap.
- Store the compacted image → enables page-level deduplication across instances.
- On restoration, shared pages are mapped copy-on-write across containers.

---

# Evaluation
- Page fault count during restoration is significantly reduced after GC-compacted checkpoints.
- Memory footprint for running multiple instances of the same function is reduced via page sharing.

---

# Meeting Notes
*(to be filled)*
