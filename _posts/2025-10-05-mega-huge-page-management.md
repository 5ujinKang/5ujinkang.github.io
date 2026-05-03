---
date: 2025-10-05 00:00:00
layout: post
title: "MEGA: Overcoming Traditional Problems with OS Huge Page Management"
subtitle: Analyze and address the fundamental problems with Linux huge page management — fragmentation, bloat, fault latency, non-swappability
description: Analyze and address the fundamental problems with Linux huge page management — fragmentation, bloat, fault latency, non-swappability
category: library
tags:
  - paper-review
  - SYSTOR
  - "2019"
image: /assets/img/uploads/cat/9.jpg
optimized_image: /assets/img/uploads/cat/9.jpg
author: Sujin
paginate: true
---

**Venue:** SYSTOR 2019  
**Link:** [ACM DL](https://dl.acm.org/doi/10.1145/3319647.3325839)

**Topic:** Huge pages (2MB) reduce TLB miss overhead significantly, but the Linux kernel's huge page support introduces fragmentation, memory bloat, high fault latency, and inability to swap. MEGA analyzes these problems and proposes refinements.

---
# Summary
TLB misses account for up to **50% of execution time** in memory-intensive workloads.
Huge pages (2MB vs. 4KB) reduce TLB pressure — fewer entries needed, cheaper miss handling (stops at 4th-level page table in Linux's 5-level walk).
But current Linux huge page management introduces new problems.
MEGA demonstrates these benefits and drawbacks, and argues that modern OSes must refine their huge page mechanisms.

---

# Background

## Benefits of huge pages
- **TLB HIT rate improvement**: one huge page TLB entry covers what 512 base-page entries would.
- **Cheaper TLB miss**: address translation stops at the 4th level of the 5-level page table walk → less work per miss.
- Significant performance improvement for large working set workloads.

## Problems with huge pages in Linux

### 1. Increased page fault latency
- Allocating 2MB requires finding 2MB of **contiguous physical memory**.
- Fragmented physical memory must be compacted first → expensive.
- Kernel must **zero-out** the entire 2MB page before handing it to a process → 512× more zeroing than a 4KB page.

### 2. Memory bloating
- Linux allocates a **huge page on every base page fault** — even if only a small portion will be used.
- Process receives 2MB when it may only need a few KB → increased memory footprint.

### 3. Fragmentation
- **Internal fragmentation**: unused portions within an allocated huge page.
- **External fragmentation**: free memory scattered in small chunks → can't form 2MB contiguous regions → promotion fails.

### 4. Not swappable or migratable
- Linux doesn't support swapping huge pages directly.
- Must demote huge page → base pages → then swap → performance degradation + TLB invalidation.

---

# Key Idea

## MEGA's approach
- Analyze and demonstrate each pathology quantitatively.
- Propose OS-level refinements to huge page management that:
  1. Avoid memory bloating by promoting only when the region is likely to be fully used.
  2. Reduce fault latency by pre-zeroing and pre-allocating contiguous regions.
  3. Handle fragmentation by tracking physical memory contiguity explicitly.
  4. Support demotion and swapping more efficiently.

---

# Evaluation
- Shows that transparent huge page support in Linux leads to unacceptable performance overheads, wasted memory capacity, and unfair performance variability for certain workloads.
- Refinements in MEGA address each pathology with measurable improvement.

---

# Meeting Notes
*(to be filled)*
