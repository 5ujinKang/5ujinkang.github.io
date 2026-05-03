---
date: 2025-10-05 00:00:00
layout: post
title: "Coordinated and Efficient Huge Page Management with Ingens"
subtitle: Treat memory contiguity as a first-class resource; track utilization and access frequency for principled huge page management
description: Treat memory contiguity as a first-class resource; track utilization and access frequency for principled huge page management
category: library
tags:
  - paper-review
  - OSDI
  - "2016"
image: /assets/img/uploads/cat/8.jpg
optimized_image: /assets/img/uploads/cat/8.jpg
author: Sujin
paginate: true
---

**Venue:** OSDI 2016  
**Slides:** [USENIX Slides](https://www.usenix.org/sites/default/files/conference/protected-files/osdi16_slides_kwon.pdf)

**Topic:** Current OS huge page support is built on 4KB-centric assumptions and spot fixes. Ingens redesigns huge page management on two principles: contiguity as an explicit resource, and tracking spatial/temporal access patterns.

---
# Summary
Modern processors offer dual-level TLBs with thousands of huge page entries, but OSes still manage memory assuming 4KB pages.
Current huge page support in Linux causes fairness and performance pathologies: fragmentation, memory bloat, increased page fault latency, and non-swappability.
Ingens manages **contiguity as a first-class resource** and tracks **utilization and access frequency** to eliminate these pathologies.

---

# Background

## Why huge pages?
- TLB misses account for up to **50% of execution time** for memory-intensive workloads.
- Huge pages (2MB) replace many 4KB TLB entries with one → fewer TLB misses.
- Linux address translation traverses up to 5-level page tables; with huge pages, translation stops at level 4 → cheaper TLB miss handling.

## Problems with current huge page support

1. **Increased page fault latency**
   - Allocating a 2MB huge page requires finding 2MB of contiguous physical memory.
   - Fragmentation forces expensive memory compaction.
   - Kernel must zero-out the entire 2MB page before giving it to a process → more time than zeroing a 4KB page.

2. **Memory bloating**
   - Linux allocates a huge page on every base page fault.
   - Processes receive much more memory than they actually use → increased memory footprint.

3. **Fragmentation (internal and external)**
   - Internal: portions of a huge page go unused.
   - External: free physical memory fragmented into small chunks → can't form 2MB contiguous regions.

4. **Not swappable/migratable**
   - The kernel doesn't support swapping huge pages directly.
   - Huge pages must be demoted to base pages before swapping → performance degradation.

---

# Key Idea

## Two principles

1. **Memory contiguity is an explicit resource** to be allocated across processes — not a by-product.
2. **Good information about spatial and temporal access patterns** is essential — allows the OS to predict when contiguity will be profitably used.

---

# Design

## Ingens framework
- Manages contiguity as a first-class resource: tracks available contiguous regions and allocates them explicitly.
- Tracks **utilization** (is the huge page region actually accessed?) and **access frequency** (how often?).
- Based on these signals, Ingens decides when to promote base pages to huge pages and when to demote huge pages back.
- Eliminates fairness pathologies by making contiguity allocation transparent and coordinated across processes.

---

# Evaluation
- Eliminates a number of fairness and performance pathologies in memory-intensive applications with dynamic memory behavior.
- Provides better performance, memory savings, and fairness compared to Linux's transparent huge page support.

---

# Meeting Notes
*(Note: 2016 paper — some details may be outdated given subsequent OS and hardware developments.)*
