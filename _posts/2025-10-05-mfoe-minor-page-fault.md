---
date: 2025-10-05 00:00:00
layout: post
title: "Reducing Minor Page Fault Overheads through Enhanced Page Walker"
subtitle: Hardware-software co-design offloads minor page fault critical path → 33× latency improvement, 6.6% runtime improvement
description: Hardware-software co-design offloads minor page fault critical path → 33× latency improvement, 6.6% runtime improvement
category: library
tags:
  - paper-review
  - Journal
image: /assets/img/uploads/cat/10.jpg
optimized_image: /assets/img/uploads/cat/10.jpg
author: Sujin
paginate: true
---

**Venue:** ACM TACO (Journal)  
**Link:** [ACM DL](https://dl.acm.org/doi/10.1145/3547142)

**Topic:** Growing application memory footprints induce increasing minor page fault rates. Each fault takes thousands of CPU cycles. MFOE offloads the fault critical path to dedicated hardware and parallelizes pre-fault work in a background thread.

---
# Summary
Minor page faults occur when a page is in physical memory but not yet mapped in the MMU for the faulting thread.
As application memory footprints grow, minor page fault overhead can reach **29% of execution time**.
MFOE (Minor Fault Offload Engine) splits fault handling into pre-fault, critical-path, and post-fault phases:
- Pre/post-fault work is moved to a background thread.
- The critical path is executed by a per-core hardware accelerator.
Result: **33× improvement** in average critical-path latency, **51× improvement** in tail latency, **6.6% runtime improvement** on average.

---

# Background

## Minor page fault definition
- A page is loaded in physical memory but the MMU has not yet registered the mapping for the requesting thread.
- No disk I/O (no swap), but the kernel still has to find a physical frame and update page tables.
- Common case: one thread accesses a page already used by another thread in the same process.

## Growing problem
- Application virtual memory footprints are growing rapidly (servers, smartphones, databases).
- More footprint → more lazy allocation → more minor page faults.
- Each minor page fault: few thousand CPU cycles, **blocks** the faulting thread until a free physical frame is found.
- Can reach **29% of execution time** in evaluated workloads.

---

# Key Idea

## Decompose fault handling into three phases
1. **Pre-fault tasks**: can be done before the fault occurs → run ahead of time in a background thread.
2. **Critical-path tasks**: must happen during the fault → hardware-amenable → offload to MFOE.
3. **Post-fault tasks**: can be done after the fault → run in the background thread.

Pre/post-fault functions combined into a **background thread** → their latency is removed from the critical path of the faulting program.

---

# Design

## Software: parallel pre-fault page allocation
- Parallelize portions of kernel page allocation.
- A background thread runs ahead of fault time, pre-allocating physical frames.
- Multi-threaded mode considered for all applications to account for parallel fault events.

## Hardware: MFOE (Minor Fault Offload Engine)
- A **per-core hardware accelerator** for minor fault handling.
- Maintains a **pre-allocated page frame table** — frames are ready to use when a fault arrives.
- On page fault:
  1. Picks a pre-allocated frame from the table.
  2. Makes a TLB entry.
  3. Updates the page table entry.
- A background kernel thread periodically refreshes the pre-allocated frame table and updates kernel data structures.

---

# Evaluation
- Evaluated in the **gem5** architectural simulator with a modified Linux kernel running on simulated MFOE hardware.
- **Average critical-path fault handling latency**: **33× improvement**.
- **Tail critical-path latency**: **51× improvement**.
- **Application runtime**: average **6.6% improvement** across evaluated workloads.

---

# Meeting Notes
*(to be filled)*
