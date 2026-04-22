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
# Summary
Resource overload control approach
- selectively identifies problematic requests that monopolize critical resources and cancel that.
- leverages built-in task cancellation support available in modern software

---
# Background

## Facts
- Resources are limited → software ends up encountering resource overload.
- During resource overload, software should sustain a high **Service Level Objective (SLO)** while minimizing request loss.


## Existing Overload Mitigation Strategies

1. **Admission Control** : throttle incoming requests or reduce load.
    - assume the overload is caused by total demand. -> Lack of insight into request level behavior
    - drop many requests -> damage application usablilty.
    
2. **Performance Isolation**: allocates resource quotas to each requests.
    - static resource partitions cannot adapt to highly variable workloads. @ : Need development. why?

So no choice but dig in with 1's limitation. Request level behavior is needed. 



---

## Prior Work: 

---


## Key Idea
Work in request level. 
Cancel the culprit request that causes severe resource contention.
Eliminating HOL Blocking requests → fewer request drops and more efficient resource contention resolution.


## Problem

- This is hard because internal resource contention among concurrently executing requests is subtle and unpredictable.
- Global signals such as queuing delays cannot accurately predict which requests will take over critical resources.




# Design
### Monitor
- the overall application resource usage
- the resource consumption of each executing request.
@ - How to monitor at the individual request level, not the workload level?

**Tools**
- Unify demands: groups all application activities (requests and background tasks) -> cancelable tasks.
- Unify resources: resource abstraction.

**What to monitor**
- contention level
- resource gain : how much load would be free by canceling a given request.

### Sense the culprit


### Canceling
- How to cancel requests in a unified way across many different applications?, How to cancel an executing request safely?: Most app has cancellation initiator -> just hook this up to the model.

---


## Challenges



---

## Design

*(to be filled)*

---

## Implementation

*(to be filled)*

---

## Evaluation

While achieving minimal request drop, the approach significantly outperforms state-of-the-art solutions(Protego, pBox, DARC). Atropos sustains 96% of the baseline throughput and keeps the 99th tail latency within 1.16x compared to the non-overloaded case, while dropping fewer than 0.01% of requests.

---

## Limitation

*(to be filled)*

---

## Questions

1. Is canceling the request itself acceptable? If a request consumes a lot of resources, it is likely an important one — is it okay to cancel it?

---

## What I Learned & Study materials

1. Resource Overload Causes
    - Livelock: the system is busy processing incoming requests and cannot make progress completing pending ones.
    - Contention on application-level resources :e.g., table locks or buffer pools in a database.

2. Existing Overload Mitigation Strategies
    - Admission Control: throttle incoming requests or reduce load.
        - Priorworks
            - Inho Cho, Ahmed Saeed, Joshua Fried, Seo Jin Park, Mohammad Alizadeh, and Adam Belay. 2020. Overload Control for μs-scale RPCs with Breakwater. In 14th USENIX Symposium on Operating Systems  Design and Implementation (OSDI 20). USENIX Association, 299–314.  https://www.usenix.org/conference/osdi20/presentation/cho
            - Matt Welsh and David Culler. 2003. Adaptive overload control for  busy internet servers. In Proceedings of the 4th Conference on USENIX  Symposium on Internet Technologies and Systems - Volume 4 (Seattle,  WA) (USITS’03). USENIX Association, USA, 4.
         - Hao Zhou, Ming Chen, Qian Lin, Yong Wang, Xiaobin She, Sifan Liu,  Rui Gu, Beng Chin Ooi, and Junfeng Yang. 2018. Overload Control for Scaling WeChat Microservices. In Proceedings of the ACM Symposium on Cloud Computing (Carlsbad, CA, USA) (SoCC ’18). Association for Computing Machinery, New York, NY, USA, 149–161. doi:10.1145/ 3267809.3267823

    - Performance Isolation: allocates resource quotas to each requests.
        - Priorworks
            - Yigong Hu, Gongqi Huang, and Peng Huang. 2023. Pushing Performance Isolation Boundaries into Application with pBox. In Proceedings  of the 29th Symposium on Operating Systems Principles (Koblenz, Germany) (SOSP ’23). Association for Computing Machinery, New York, NY, USA, 247–263. doi:10.1145/3600006.3613159
            - Henri Maxime Demoulin, Joshua Fried, Isaac Pedisich, Marios Kogias,  Boon Thau Loo, Linh Thi Xuan Phan, and Irene Zhang. 2021. When Idling is Ideal: Optimizing Tail-Latency for Heavy-Tailed Datacenter Workloads with Perséphone. In Proceedings of the ACM SIGOPS 28th  Symposium on Operating Systems Principles (Virtual Event, Germany)  (SOSP ’21). Association for Computing Machinery, New York, NY, USA, 621–637. doi:10.1145/3477132.3483571

3. Related work of this paper
    - Protego: a state-of-the-art overload control mechanism
      Inho Cho, Ahmed Saeed, Seo Jin Park, Mohammad Alizadeh, and Adam  Belay. 2023. Protego: Overload Control for Applications with Unpredictable Lock Contention. In 20th USENIX Symposium on Networked  Systems Design and Implementation (NSDI 23). USENIX Association,  Boston, MA, 725–738. https://www.usenix.org/conference/nsdi23/ presentation/cho-inho
    - pBox: a request-level performance isolation framework
      Yigong Hu, Gongqi Huang, and Peng Huang. 2023. Pushing Performance Isolation Boundaries into Application with pBox. In Proceedings  of the 29th Symposium on Operating Systems Principles (Koblenz, Germany) (SOSP ’23). Association for Computing Machinery, New York, NY, USA, 247–263. doi:10.1145/3600006.3613159
    - DARC: a request-aware scheduling framework.
      Henri Maxime Demoulin, Joshua Fried, Isaac Pedisich, Marios Kogias,  Boon Thau Loo, Linh Thi Xuan Phan, and Irene Zhang. 2021. When Idling is Ideal: Optimizing Tail-Latency for Heavy-Tailed Datacenter Workloads with Perséphone. In Proceedings of the ACM SIGOPS 28th  Symposium on Operating Systems Principles (Virtual Event, Germany)  (SOSP ’21). Association for Computing Machinery, New York, NY, USA, 621–637. doi:10.1145/3477132.3483571


4. This work's artifact : https://github.com/OrderLab/Atropos .

5. But why didn't they mentioned Caladan? I don't know...
---

## Meeting

*(to be filled)*
