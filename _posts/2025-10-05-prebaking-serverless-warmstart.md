---
date: 2025-10-05 00:00:00
layout: post
title: "Prebaking Functions to Warm the Serverless Cold Start"
subtitle: The timing of the snapshot determines cold-start latency — prebake at the right execution point
description: The timing of the snapshot determines cold-start latency — prebake at the right execution point
category: library
tags:
  - paper-review
  - Middleware
image: /assets/img/uploads/cat/11.jpg
optimized_image: /assets/img/uploads/cat/11.jpg
author: Sujin
paginate: true
---

**Venue:** Middleware  
**Slides:** [Google Drive](https://docs.google.com/presentation/d/1qpjXZYAajY9ZpU7NSH1dGl75p5_gw5CL8xmaYbhQw-c/edit)

**Topic:** Snapshots reduce cold-start overhead, but the timing of the snapshot matters. Prebaking captures the snapshot at a carefully chosen execution point to maximize warm-start benefits.

---
# Summary
Snapshot-based approaches to serverless cold-start reduction already exist (e.g., Firecracker, SEUSS).
A key insight often overlooked: **where in the execution you take the snapshot** significantly affects the resulting cold-start latency.
Prebaking explores how to choose the right snapshot point — after initialization but before function-specific computation — to maximize the benefit of snapshot-based warm starts.

---

# Background

## Snapshotting for cold-start reduction
- Taking an image of a fully-initialized function environment on disk enables faster subsequent cold starts.
- The snapshot skips the initialization phases that were already executed at snapshot time.

## The snapshot timing problem
- Snapshot too early: still contains initialization overhead that must be replayed on restore.
- Snapshot too late: captures function-specific state that may not generalize across invocations.
- The right snapshot point: **after all initialization, before function-specific execution begins**.

---

# Key Idea

## Prebaking
- Identify the optimal point in function lifecycle to capture the snapshot.
- "Prebake" the environment: run initialization, then snapshot the warmed state.
- Subsequent cold starts restore from this prebaked snapshot → skip all initialization.

---

# Meeting Notes
*(to be filled)*
