---
date: 2025-10-05 00:00:00
layout: post
title: "Tile Size Selection Using Cache Organization and Data Layout"
subtitle: Select tile sizes that fit data working sets in cache, accounting for layout and associativity
description: Select tile sizes that fit data working sets in cache, accounting for layout and associativity
category: library
tags:
  - paper-review
  - PLDI
image: /assets/img/uploads/cat/18.jpg
optimized_image: /assets/img/uploads/cat/18.jpg
author: Sujin
paginate: true
---

**Venue:** PLDI  
**Slides:** [Google Drive](https://docs.google.com/presentation/d/19pIZ2udMLpaaPjS4OzjgsbxhOwIY90AE/edit)

**Topic:** Tile size selection for loop tiling must account for cache organization (size, associativity) and data layout to maximize cache reuse and minimize conflict misses.

---
# Summary
Loop tiling improves cache reuse for compute-intensive kernels (matrix multiply, stencils), but only when tile sizes are chosen correctly.
This paper analyzes how cache organization (capacity, associativity, cache line size) and data layout (row-major vs. column-major, padding) affect optimal tile size selection.
A tile size model is proposed that selects tile sizes to fit working sets in cache while avoiding conflict misses due to associativity constraints.

---

# Background

## Loop tiling
- Reorders loop iterations to access a small tile of data repeatedly → improves cache reuse.
- The tile size determines how much data fits in cache during a tile's computation.

## The selection problem
- Too small: reuse is limited, tile overhead dominates.
- Too large: working set exceeds cache capacity → frequent evictions.
- Associativity: certain tile sizes cause conflict misses even when total capacity is sufficient.
- Data layout: stride of access affects which cache lines are used → affects conflict patterns.

---

# Key Idea
- Model the tile working set size given cache capacity, associativity, and data layout.
- Select tile sizes that fit in cache while avoiding associativity-induced conflict misses.
- Account for the actual data access stride induced by the chosen data layout.

---

# Meeting Notes
*(to be filled)*
