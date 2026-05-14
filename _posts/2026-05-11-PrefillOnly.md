---
date: 2026-05-11 00:00:00
layout: post
title: "PrefillOnly: An Inference Engine for Prefill-only Workloads in Large Language Model Applications"
subtitle: We only need to store 1 layer. Let's not do unnecessary things and UTILIZE this condition.
description: We only need to store 1 layer. Let's not do unnecessary things and UTILIZE this condition.
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
  - remove-unnecessary
image: /assets/img/uploads/cat/30.jpg
optimized_image: /assets/img/uploads/cat/30.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  
**Link:** doi[https://dl.acm.org/doi/10.1145/3731569.3764834]

**Topic:** 
LLM inference Engines 

---
# Summary
PrefillOnly scenario in LLM is major.
Let's tailor system only for Prefill-only workload.
Remove all unnecessary layer stores in KV cache (both for next tokens, and non-attention layers)

# Strategy: Remove unnecessary behavior. Change in condition always change the requirements.
Analyze the situation, Divide the components, and remove unnecessary part.
Find the exact memory usage bottleneck= the root cause, and solve it out.

---
# Background
## Prefill-Only situation becomes major in LLMs.
- Discriminative tasks is emerging in LLMs. (ex. recommendation, credit verification, and data labeling).
- Generating document embeddings.
- Disaggregation of prefill <-> decode often used.

## Prefill-only requests' characteristics: can save only last computed layer in KV cache
1. Smaller active GPU memory footprint: no decoding -> no repeated use in KV caches -> no need to store the KV caches for all layers.
2. Enable to use JCT-aware scheduling policies: the output length = 1(fixed) -> LLM engine knows the amount of work for each request


## Problem
existing LLM engines considers Decode stage. even it doesn't, save all layers in KV cache.
- Much GPU memory footprint: must store the KV caches for all tokens 
- Can't use JCT for scheduling: arbitrary output lengths.

---
# Key Idea
LLM inference engine tailored prefill-only workloads -> improves the inference throughput and latency.

0. store the KV cache of only the last computed layer -> hybrid prefilling
1. Enable to use JCT for scheduling: only 1 output -> can estimate JCT


---
# Challenges & solution
## 0. Naively storing only one layer doesn't reduce the memory footprint directly.
- temporary tensors(activation memory) allocated during LLM inference still consume large amounts of GPU memory. -> Chunked prefilling solve this.
- Chunked prefilling reduces the size of temporary tensors: but forces the KV caches for all layers to remain in GPU memory(work as a checkpoints)

How to overcome this chunked prefiling's drawback?

### What is the cause of Memory usage?
There are 2 layers. non-attention layers & attention layers.
most GPU memory usage in LLM inference comes from non-attention layers.
-> worth to seperate and handle non-attention layers closely to reduce the GPU memory footprint.

### Hybrid prefilling : distinguish non-attention layers vs. attention layers
Divide & Conquer: only chunk non-attention layers & don't chunk attention layers.
    
completes prefilling in a single forward pass: 
- non-attention: no reuse input later -> no need to cache -> good to chunk
    - we only need to save attention layers to KV Cache -> amount to save to KV cache decrease.
- attention: don't chunk, maximizes the performance of attention kernels.


## 1. It's hard to estimate JCT: it also depends on cache hit/miss

### KV cache constantly change.
-> Continuously re-estimates the prefill time of all waiting requests before each scheduling step.
-> increase the prefix cache hit rate.
### additional scheduling algorithm modification
to improve fairness & prevent starvation


---
# Workflow
## Profile Run
0. user provides the maximum input length (MIL). 
1. PrefillOnly estimates the GPU memory requirement: forwarding a synthetic request of maximum length through the LLM model & measuring peak GPU memory usage during this process. 
2. The remaining GPU memory is then reserved for prefix KV caches.

## During Runtime
1. PrefillOnly launches an HTTP server compatible with the OpenAI API protocol, through which users send prefill-only requests. 
2. When a new request arrives, PrefillOnly tokenizes it and sends it to the scheduler process via ZeroMQ-based RPC. 
3. The scheduler then schedules requests at the granularity of a step. 
4. During each step, PrefillOnly 
    1. iterates through the waiting queue
    2. selects the request with the minimum estimated prefill time, 
    3. pops it from the queue, and sends it to the executor processes. 
    4. The executors then perform the prefill-only inference 
    5. return the probability distribution of the first output token back to the user.

# Design
1. Hybrid prefilling: 
2. Suffix KV cache discarding/offloading
3. Shortest prefill first with continuous prefill time estimation
---

# Implementation
- implement PrefillOnly on top of an enterprise-grade LLM inference engine (vLLM).
- generalizes to different LLMs (via torch.compile) and different hardware

---

# Evaluation
PrefillOnly can process up to 4× larger queries per second without inflating the average and P99 latency.
evaluate under 4 hardware setups, 3 LLM models, and 2 traces.


---

# Contributions
the first LLM inference engine that improves the inference throughput & latency by fully embracing the properties of prefill-only workloads.

# Novelty
## Observed prefill-only workload(generate only 1 token) is major
tailored the system with the characteristic that we only need to save 1 layer in KV cache.
and leverage this condition -> save only final computed layer, use JCT

## Devided prefill stage into non-attention layer / attention layer
find a bottleneck(non-attention) for memory usage, and optimized(discard KV cache for non-attention layer).

---
# Related Works
## LLM inference engines
fully stores the all layers to KV cache/ even there is no decode in prefill-only requests.

### empower granularity: from request -> token, enable fine-grained control
- scheduling/ Orca: continuous batching that schedules LLM inference in token granularity
- GPU memory management/ vLLM: token granularity-> minimizing GPU memory fragmentation
leads to larger batch sizes and thus larger decoding throughput.

### Detangle prefill <-> decode across GPUs/ Distserve
improves the goodput under TTFT and TPOT SLO constraints.

## LLM caching system
PrefillOnly doesn't change the KV caches -> more compatible
- KV cache compression/CacheGen : size reducing
- KV cache blending/ CacheBlend: to reuse non-prefix KV cache.

## Traditional deep learning systems
also eliminate unnecessary tensors generated during inference & leverage JCT-aware scheduling to improve performance.
But
- GPU memory footprint: come from non-linear layers like convolution layers 
- JCT: is roughly a constant

PrefillOnly embraces LLM-specific properties:
- GPU memory footprint: mainly comes from linear layers
- JCT: prefix-caching-sensitive

---

# Inputs
## LLM vs. Deep learning
: Artificial Intelligence
    └── Machine Learning
        └── Deep Learning
            └── Transformer Models
                └── Large Language Models 

- Traditional deep learning models: trained for a specific task
- LLMs : trained as general-purpose foundation models.  trained on massive, highly diverse input data and therefore learn more general representations.

## 2 main stages in LLM inference
- prefill
    - all input tokens are processed in parallel. 
    - generates the first output token 
    - store intermediate results of computed keys and values -> KVCache.
- decode
    - uses this KVCache to autoregressively generate new tokens
    - compute -> adds new keys & values to the KVCache

## Attention vs. non-attention
- Attention: You look at other words to understand meaning 
- Non-attention: You think about each word internally to refine it

## Router has better visibility usually when it comes to network related issue.
router can make routing decision globally, where the inference engine only has partial visibility of requests and prefix cache status.
better use it when we need broader visibility.

## Saving Cache space means better latency

## Saving memory footprints means better throughput
Memory is a hard limit on concurrency
A GPU/CPU has a fixed amount of RAM. If each job (request, batch, process) consumes less memory, more jobs fit at the same time. Throughput = work done per unit time, so more parallel work = higher throughput.

## when the amount of work is fixed uniformly, requests with longer cache hits generally have shorter completion time.

---

# Meeting Notes
## Approach : if we want to introduce a new layer
1. Add static analysis / human annotations
2. Modify HW

## How to evaluate the solution
1. Solve the problem
2. Adhere to principles
3. Exploit properties of LLM

## dividing phases
only works when target is big enough
- millisecond scale: optimize each phase would work.
- microsecond scale: overhead would be crazy
- prefill-decode disaggregation (seperation)
- prefill: non-attention and attention layer.

if the condition is long enough, can we optimize and seperate phase of Garbage Collection?
Phase is exist : [https://blog.ycrash.io/different-phases-of-garbage-collection-events]


## Writing a paper
argue completely within space limits

---
# Thoughts.

