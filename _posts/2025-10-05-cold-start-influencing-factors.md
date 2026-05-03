---
date: 2025-10-05 00:00:00
layout: post
title: "Cold Start Influencing Factors in Function as a Service"
subtitle: Programming language, package size, and memory/CPU settings significantly affect FaaS cold-start latency
description: Programming language, package size, and memory/CPU settings significantly affect FaaS cold-start latency
category: library
tags:
  - paper-review
  - UCC
image: /assets/img/uploads/cat/2.jpg
optimized_image: /assets/img/uploads/cat/2.jpg
author: Sujin
paginate: true
---

**Venue:** UCC  
**Slides:** [Google Slides](https://docs.google.com/presentation/d/1AGKK0Hax0hDF3EUPpMPeYdThUCDn-2i4M09xkgj1vtU/edit)

**Topic:** Systematically benchmark cold-start latency in FaaS (AWS Lambda, Azure Functions) across programming language, deployment package size, and memory/CPU settings to identify which factors matter and by how much.

---
# Summary
Cold start in FaaS occurs when no idle container is available for a function invocation — a new container must be started, adding latency.
This paper benchmarks cold starts across multiple influencing factors on AWS Lambda and Azure Functions, using Java (compiled) and JavaScript (interpreted) as representative languages.
Key findings: programming language runtime, package size, and memory/CPU allocation all significantly affect cold-start overhead.

---

# Background

## FaaS and cold starts
- **FaaS (Function-as-a-Service)**: developers deploy functions; the cloud manages the infrastructure. Offers ~99.95% cost reduction vs. PaaS by avoiding idling.
- **Cold start**: a new container must be provisioned when no idle instance is available.
  - Contrast with **warm start**: an existing container handles the request directly.
- FaaS avoids idling (scale-to-zero) → more cold starts.
- Pinging containers to keep them warm violates the **scale-to-zero principle**.

## Why benchmarking is needed
- Cold-start behavior is poorly understood across platforms and configurations.
- No systematic study of which factors dominate cold-start latency.

---

# Hypotheses Tested

1. **Programming language**: compiled languages (Java) will have more cold-start overhead than interpreted (JavaScript) due to environment startup (e.g., JVM initialization).
2. **Deployment package size**: larger packages increase cold-start latency.
3. **Memory/CPU setting**: more resources → faster container load → lower cold-start overhead.
4. *(Not fully tested)* Number of dependencies, concurrency level, prior executions, container shutdown time.

---

# Experimental Setup

## Platforms and languages
- **Languages**: Java and JavaScript (representative of compiled vs. interpreted; both widely used, both supported on AWS Lambda and Azure Functions).
- **Platforms**: AWS Lambda, Azure Functions.
  - Azure auto-scales memory/CPU → memory/CPU hypothesis tested on AWS only.

## Algorithm
- Recursive Fibonacci (compute-bound, not memory-bound, predictable time complexity O(2^n) / space O(n)).
- Each function invoked **550 times** → 275 cold/warm start pairs.
- API gateway fronts the function; local client timestamps requests to measure end-to-end latency including cold-start overhead.

## Measurement
1. Client records local start timestamp.
2. Sends REST call to platform's API gateway.
3. Platform starts/reuses container, executes function, logs platform-side timestamps.
4. Client records end timestamp.
5. Cold vs. warm start overhead = difference between cold and warm execution times.

---

# Evaluation

- Cold-start overhead varies significantly across languages, package sizes, and memory settings.
- Java (JVM startup) shows higher cold-start overhead than JavaScript.
- Larger deployment packages increase cold-start latency.
- Higher memory/CPU allocation reduces cold-start overhead on AWS Lambda.

---

# Key Terms
- **Scale to zero**: idle functions consume no CPU or memory — prevents pinging-based warm tricks.
- **Compute-bound**: execution time determined by CPU speed, not memory.
- **Deployment package**: zip archive containing function code and dependencies.

---

# Meeting Notes
*(to be filled)*
