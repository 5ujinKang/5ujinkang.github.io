---
date: 2026-04-22 00:00:00
layout: post
title: Mitigating Application Resource Overload with Targeted Task Cancellation
subtitle: Eliminate Head-Of-Line Blocking request to solve resource overload problem.
description: Eliminate Head-Of-Line Blocking request to solve resource overload problem.
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/1.jpg
optimized_image: /assets/img/uploads/cat/1.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  
**Link:** [ACM DL](https://dl.acm.org/doi/10.1145/3731569.3764835)  
**Topic:** Eliminate Head-Of-Line (HOL) Blocking requests to solve the resource overload problem.

---

## Background

- Resources are limited → software ends up encountering resource overload.
- During resource overload, software should sustain a high **Service Level Objective (SLO)** while minimizing request loss.

---

## Prior Work: Existing Overload Mitigation Strategies

1. **Admission Control** — throttle incoming requests or reduce load.
2. **Performance Isolation**

---

## Problem

- One approach is canceling resource-hungry (culprit) requests.
- This is hard because internal resource contention among concurrently executing requests is subtle and unpredictable.
- Global signals such as queuing delays cannot accurately predict which requests will take over critical resources.

---

## Key Idea

> Cancel the culprit request that causes severe resource contention.

### Monitoring
- How to identify which request is the culprit?
- How to monitor at the individual request level, not the workload level?
- How to unify request monitoring across various workloads?

### Canceling
- How to cancel requests in a unified way across many different applications?

---

## Estimated Effects

- Eliminating HOL Blocking requests → fewer request drops and more efficient resource contention resolution.

---

## Challenges

*(to be filled)*

---

## Design

*(to be filled)*

---

## Implementation

*(to be filled)*

---

## Evaluation

While achieving minimal request drop, the approach significantly outperforms state-of-the-art solutions.

---

## Limitation

*(to be filled)*

---

## Questions

1. Is canceling the request itself acceptable? If a request consumes a lot of resources, it is likely an important one — is it okay to cancel it?

---

## What I Learned

**1. Resource Overload Causes**
- **Livelock** — the system is busy processing incoming requests and cannot make progress completing pending ones.
- **Contention on application-level resources** — e.g., table locks or buffer pools in a database.

**2. Existing Overload Mitigation Strategies**
- Admission Control: throttle incoming requests or reduce load.
- Performance Isolation

---

## Meeting

*(to be filled)*
