---
date: 2026-05-22 00:00:00
layout: post
title: "A large scale analysis of hundreds of in-memory cache clusters at Twitter"
subtitle: 5 important facts about in-memory caching 
description: 5 important facts about in-memory caching 
category: library
tags:
  - paper-review
  - OSDI
  - "2020"
  - survey
image: /assets/img/uploads/cat/32.jpg
optimized_image: /assets/img/uploads/cat/32.jpg
author: Sujin
paginate: true
---

**Venue:** OSDI 2020  

**Topic:** 
153 in-memory cache clusters at Twitter and discovered five important facts about in-memory caching.

---
# Summary
1. although read-heavy workloads account for more than half of the resource usages, write-heavy workloads are also common. 
2. in-memory caching clients often use short TTLs, which limits the effective working set size. Thus, removing expired objects needs to be prioritized before evictions. 
3. read-heavy in-memory caching workloads follow Zipfian popularity distribution with a large skew.
4. the object size distributions of most workloads are not static. Instead, it changes over time with both diurnal patterns and sudden changes.
5. for a significant number of workloads, FIFO has similar or lower miss ratio performance as LRU for in-memory caching workloads.




---

# Goal
understanding of current in-memory caching workloads

# Method
analyzing workload traces from 153 Twemcache clusters at Twitter
- Twemcache: a fork of Memcached, is a key-value cache providing high throughput and low latency, slab-based memory management.

# What to see
perform a comprehensive analysis to characterize cache workloads based on 
: traffic pattern, time-to-live (TTL), popularity distribution, and size distribution.

---
#

---
# Discovery
## 1.Write-heavy workloads are common.
In-memory caching does not always serve read-heavy workloads, write-heavy (defined as write ratio > 30%) workloads are very common, occurring in more than 35% of the 153 cache clusters we studied.

## 2. Time-to-Live must be considered in in-memory caching @what is TTL?
TTL limits the effective (unexpired) working set size. @ how?
Efficiently removing expired objects from cache needs to be prioritized over cache eviction.

## 3. Follow approximate Zipfian popularity distribution
read-heavy in-memory caching workloads follow Zipfian popularity distribution with a large skew.
The workloads that show the most deviations tend to be write-heavy workloads.

## 4. Object size distribution is not static over time
Some  workloads show both diurnal patterns and experience sudden, short-lived changes.
-> pose challenges for slab-based caching systems such as Memcached. @why

## 5. With the large number of workloads, FIFO can work well than LRU
Under reasonable cache sizes, FIFO often shows similarperformance as LRU.
LRU often exhibits advantages only when the cache size is severely limited.

---

# Evaluation
perform a comprehensive analysis to characterize cache workloads based on traffic pattern, time-to-live (TTL), popularity distribution, and size distribution.


---

# Inputs
## Cacue Use Cases
Caching for storage / Caching for Computation / Transient data with no backing store

## What cause request rate spike
1. hot keys
2. the number of objects accessed in the same time interval: client retry requests, external traffic surges, scan-like accesses, and periodic tasks.

## What cause cache irregularities
1. request rate spikes
2. user behavior changes
3. application revision & test

## Many services choose not to fetch relevant data on demand
but instead opportunistically pre-compute them for a much larger set of users.
-> Therefore, the write ratio is often higher (>80%), and object access (read+write) frequency is often lower.

## in-memory cach

---

# Questions




---
# Thoughts.
