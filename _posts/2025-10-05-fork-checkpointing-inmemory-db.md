---
date: 2025-10-05 00:00:00
layout: post
title: "Memory Efficient Fork-based Checkpointing Mechanism for In-Memory Database Systems"
subtitle: Fork-based checkpointing with efficient copy-on-write management to minimize memory overhead for in-memory databases
description: Fork-based checkpointing with efficient copy-on-write management to minimize memory overhead for in-memory databases
category: library
tags:
  - paper-review
  - SAC
image: /assets/img/uploads/cat/7.jpg
optimized_image: /assets/img/uploads/cat/7.jpg
author: Sujin
paginate: true
---

**Venue:** SAC  
**Slides:** [Google Drive](https://drive.google.com/file/d/1Mc2X1UcXmeWJAmXMYMb4qAzHW9XpMvyZ/view)

**Topic:** Fork-based checkpointing for in-memory databases relies on copy-on-write, but heavy write workloads during checkpointing can cause significant memory bloat. This paper proposes mechanisms to reduce that overhead.

---
# Summary
In-memory databases use fork-based checkpointing: `fork()` creates a child process that writes the checkpoint while the parent continues processing transactions via copy-on-write (CoW).
Problem: under high write throughput, many pages get copied → memory usage balloons, potentially exhausting system memory.
This paper proposes mechanisms to make fork-based checkpointing memory-efficient for in-memory database systems.

---

# Background

## Fork-based checkpointing
- Parent forks a child; child sees a consistent snapshot via CoW.
- Parent continues writes → each written page is CoW-copied → memory grows.
- Under heavy write workloads: memory usage can double or more during checkpointing.

## Why this is a problem for in-memory databases
- In-memory databases already use most available RAM for the dataset.
- Checkpointing memory bloat can exhaust system memory → OOM → crash or swap.

---

# Key Idea
- Reduce the number of pages that must be CoW-copied during checkpointing.
- Track and manage CoW overhead explicitly.
- Possible approaches: batching, coordinating writes with the checkpointing epoch, or deferring copies.

---

# Meeting Notes
*(to be filled)*
