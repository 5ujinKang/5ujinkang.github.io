---
date: 2026-05-11 00:00:00
layout: post
title: "PrefillOnly: An Inference Engine for Prefill-only Workloads in Large Language Model Applications"
subtitle: 
description: 
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/30.jpg
optimized_image: /assets/img/uploads/cat/30.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  
**Link:** https://dl.acm.org/doi/10.1145/3731569.3764834

**Topic:** 

---
# Summary




---

# Background
## Requirements
- Prefill-only workload is emerging in LLMs.
- Prefill-only workload: the LLM generates only a single output token, rather than an arbitrarily long sequence of tokens. (ex. recommendation, credit verification, and data labeling)
## Current Problem
existing LLM engines assume arbitrary output lengths, they fail to leverage the unique properties of prefill-only workloads.






---
# Key Idea
LLM inference engine that fully embracing the properties of prefill-only workloads -> improves the inference throughput and latency.


---
# Effects
1. only needs to store the KV cache of only the last computed layer: since it generates only one token.
    -> drastically reduces the GPU memory footprint of LLM inference
    -> allows handling long inputs without using solutions that reduce throughput, such as cross-GPU KV cache parallelization. @why?
2. can precisely determine the job completion time (JCT) of each prefill-only request before it starts: because the output length is fixed, rather than arbitrary @but can we know exact output size?? or just guessing?
    -> This enables efficient JCT-aware scheduling policies such as shortest prefill first.

---
# Design

---
# Implementation

---

# Evaluation
PrefillOnly can process up to 4× larger queries per second without inflating the average and P99 latency.

---
# Related Works

---

# Contributions
the first LLM inference engine that improves the inference throughput and latency by fully embracing the properties of prefill-only workloads.

---

# Inputs
    
---

# Questions

---

# Meeting Notes


---
# Thoughts.

