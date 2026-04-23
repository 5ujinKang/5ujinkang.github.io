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

- A small number of problematic requests can have a severe impact on system overall performance.
- Handling this is hard because internal resource contention among concurrently executing requests is subtle and unpredictable.

---

## Prior Work: 
- Keep track of global signals (ex. Breakwater): Global signals such as queuing delays cannot accurately predict which requests will take over critical resources.

- Dropping non-problematic requests (ex. Protego): can temporarily preserve SLO attainment but cannot effectively resolve the underlying performance interference caused by the problematic requests.

- pBox : don't drop running request,it cannot directly mitigate resource overload caused by problematic requests already executing.

---


## Key Idea
Work in request level. 
Cancel the culprit request that causes severe resource contention.
Eliminating HOL Blocking requests → fewer request drops and more efficient resource contention resolution.

An effective overload control system should allow requests to execute first, observe their actual impact, estimate each request’s current and future resource usage, and selectively cancel those that monopolize critical resources.


## Challenges
- Is canceling even safe? What if it cancels dangerous or important request?: Use provided task cancellation. And let app developer decide which one is the cancellable requests. And it's trend to add task cancellation in application market. 



# Design
### Monitor
- the overall application resource usage : to sense contention and activate whole cancelling procedure.
- the resource consumption of each executing request. : to choose which one to cancel.
- monitors the resource impact of each admitted request and cancels those most likely to cause performance degradation.

**Tools**
- Unify demands: groups all application activities (requests and background tasks) -> cancelable tasks.
- Unify resources: resource abstraction.

**What to monitor in request level**
- contention level: 
- resource gain : how much load would be free by canceling a given request.


### Canceling
- How to cancel requests in a unified way across many different applications?, How to cancel an executing request safely?: Most app has cancellation initiator -> just hook this up to the model.


### How to integrate this model into Applications?
use API with very small amount of Code, upto 7n lines changes in application.

- Define the scope of cancellable tasks: createCancel & freeCancel

### Per-task Resource Usage Tracking
- The task manager assigns each cancellable task with a unique task ID and maintains a mapping between cancellable task to their corresponding application-level activities.

- Each application resource supports 3 operations: get, free, and wait. use this to estimate contentions.
    - getResource: records when a task acquires a resource
    - freeResource: records when a resource is released
    - slowByResource: records when a task is delayed while waiting for a resource.

- Application resources
    - (1) synchronization resources, representing resources protected by synchronization primitives
    - (2) queue resources, representing application-managed task queues
    - (3) memory resources, representing application-managed memory pools or caches.

- It uses progress parameter to estimate progress.


### Overhead?
The overhead of each API is minimal, as Atropos only records a tuple (value, rscType, eventType) along with a timestamp.




---

## Evaluation

While achieving minimal request drop, the approach significantly outperforms state-of-the-art solutions(Protego, pBox, DARC). Atropos sustains 96% of the baseline throughput and keeps the 99th tail latency within 1.16x compared to the non-overloaded case, while dropping fewer than 0.01% of requests.

---

## Limitation

*(to be filled)*

---

## Questions

1. Is canceling the request itself acceptable? If a request consumes a lot of resources, it is likely an important one — is it okay to cancel it?
2. But why didn't they mentioned Caladan? I don't know...
3. What about using unnecessary resource in re-running? intrinsically it is delaying. what if we just delaying??
4. in Scheduling, there is no such a "request canceling". This is actually HOL Blocking problem (wow i was right!) : 2)preemption (except locking -> can solve with OCC ut it doesn't have preemption), 3) ordering=priority: no overhead,move heavyweight request last order (CNA, shfllock/ordering locking papers ) - but isn't it same with canceling??

in ordering, challenge for figuring out HW/LW: 
- Static analysis
- profiling

---

generalize the problem -> find the similar situation (following the general system design pattern)

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

5. Application resources are logical abstractions defined by an application. These resources typically encapsulate underlying system resources, such as memory or synchronization primitives, to provide higher-level, application-specific functionality.

6. The buffer pool is configured to be smaller than the total system memory. Therefore, monitoring overall system memory usage alone is insufficient to detect or mitigate buffer pool contention effectively.


---

## Meeting

*(to be filled)*
