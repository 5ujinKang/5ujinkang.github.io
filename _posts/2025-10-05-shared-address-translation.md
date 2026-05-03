---
date: 2025-10-05 00:00:00
layout: post
title: "Shared Address Translation Revisited"
subtitle: Share page tables across processes for shared libraries → reduce TLB overhead and page faults on Android
description: Share page tables across processes for shared libraries → reduce TLB overhead and page faults on Android
category: library
tags:
  - paper-review
  - EUROSYS
  - "2016"
image: /assets/img/uploads/cat/16.jpg
optimized_image: /assets/img/uploads/cat/16.jpg
author: Sujin
paginate: true
---

**Venue:** EuroSys 2016  
**Link:** [ACM DL](https://dl.acm.org/doi/abs/10.1145/2901318.2901327)

**Topic:** Modern OSes share physical memory for code/data via copy-on-write, but maintain separate page table copies per process even when identical. SEUSS shows that sharing address translation structures (page tables and TLB entries) for shared libraries improves performance.

---
# Summary
Physical memory is shared across processes for shared libraries, but each process maintains its own copy of the virtual address translation structures.
This duplication causes inefficiencies in address translation and interference in the memory hierarchy.
By sharing page table pages (PTPs) for shared libraries, the number of page faults and PTPs allocated are reduced, improving performance for fork, application launch, and IPC on Android.

---

# Background

## The duplication problem
- OS shares physical memory for shared libraries via copy-on-write.
- BUT: **separate page tables** are maintained per process, even if they are identical.
- Result: unnecessary memory usage + address translation overhead + interference in TLB/cache.

## Why this matters on Android
- Android apps share many system libraries.
- Frequent fork (for process creation) and app launches are critical paths.
- IPC performance depends on fast context switching.

---

# Key Idea

## Share page table pages (PTPs) for shared libraries
- When multiple processes map the same shared library pages, use a single PTP instead of one per process.
- A PTE populated for one process is immediately visible to all sharers → avoids redundant soft page faults.

---

# Design

## Sharing mechanism

**On page fault (read access) for a shared PTP:**
- Check if `NEED_COPY` bit is set on the level-1 PTE.
- **Case 1 (not set)**: write-protect all PTEs in the PTP → mark as shared → increment sharer count → populate child's level-1 PTE with pointer to shared PTP.
- **Case 2 (set)**: PTP is already shared and write-protected → only populate child's level-1 PTE and increment sharer count.

**On write access:**
- Copy-on-write applies as usual — a private copy of the PTP is made for the writing process.

## Key property
- A PTE populated in the shared PTP (on first read fault by any process) is visible to all sharers immediately → subsequent read faults on the same page are eliminated for all sharing processes.

---

# Evaluation
- **Fork cost**: reduced to **less than half** of stock kernel — PTP construction overhead eliminated.
- **Page faults for file-based mappings**: reduced by **38%**.
- **PTPs allocated**: reduced by **35%**.
- **App launch**: 10% improvement due to page fault elimination and better cache/TLB performance.
- **IPC**: faster due to better cache performance on context switching.

---

# Meeting Notes
*(to be filled)*
