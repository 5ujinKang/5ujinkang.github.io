---
date: 2026-01-18 00:00:00
layout: post
title: "Key-Value Store in C"
subtitle: From single-threaded hash map to a 3-stage networked pipeline KVS
description: From single-threaded hash map to a 3-stage networked pipeline KVS
image: /assets/img/uploads/proj/kvs.png
optimized_image: /assets/img/uploads/proj/kvs.png
category: project
tags:
author: Sujin
paginate: true
---

**GitHub:** [5ujinKang/Key-Value-Store](https://github.com/5ujinKang/Key-Value-Store)

A Key-Value Store implemented from scratch in C, built in four progressive stages — from a basic single-threaded hash map up to a fully networked 3-stage pipeline server.

---

# Overview

The project explores how a KVS can be made increasingly concurrent and scalable:

1. **Basic KVS** — single-threaded hash map with per-bucket locks
2. **Multithreaded KVS** — concurrent access with per-bucket mutex locking
3. **Pipeline KVS** — 2-stage thread pipeline separating dispatch from execution
4. **Networked Pipeline KVS** — 3-stage TCP server with a client

---

# Stage 1: Basic Hash Map KVS

A hash table of 1024 buckets, each protected by a `pthread_mutex_t`. Entries are stored as linked lists within each bucket (chaining for collision resolution).

- `kv_set(key, value)` — insert or update
- `kv_get(key, out)` — lookup
- `kvstore_destroy(&store)` — full cleanup, nullifies the pointer after free

Per-bucket locking is used from the start, even in the single-threaded version, to set up a clean foundation for concurrent use.

---

# Stage 2: Multithreaded KVS

Multiple threads concurrently call `kv_set` and `kv_get`. Since each bucket has its own mutex, threads only contend when they hash to the same bucket — giving fine-grained, high-throughput concurrency.

- 4 worker threads, each performing 5 GET/SET operations
- Keys are partitioned per thread; random GETs cross thread boundaries to test concurrent read correctness

---

# Stage 3: 2-Stage Pipeline KVS

Operations are no longer executed directly by the calling thread. Instead, a **pipeline** decouples request dispatch from execution:

```
[Producer threads] → Queue → [Worker threads]
      Stage 1                     Stage 2
```

- **Stage 1 (producers)**: receive operations, log them, forward to a bounded queue
- **Stage 2 (workers)**: dequeue and execute actual `kv_set` / `kv_get`
- Queue uses `pthread_cond_t` for blocking push/pop — no busy-waiting
- `OP_EXIT` sentinel propagates shutdown through the pipeline

---

# Stage 4: Networked 3-Stage Pipeline KVS

A TCP server with a matching client, built on the pipeline design:

```
[Network receive]  →  Queue 1  →  [KV execution]  →  Queue 2  →  [Send response]
     Stage 1                         Stage 2                          Stage 3
     1 thread/client              3 threads                        3 threads
```

- **Stage 1**: one thread per client connection reads lines from the socket and enqueues `Request` structs
- **Stage 2**: 3 worker threads dequeue requests, parse `SET key value` / `GET key` commands, execute on the KVS, enqueue `Response` structs
- **Stage 3**: 3 threads dequeue responses and send results back over the client socket

The client sends a sequence of SET and GET commands over TCP and prints the server's responses.

---

# Key Design Points

- **Per-bucket locking**: minimizes contention — only threads hashing to the same bucket compete
- **Bounded queue with condition variables**: producers block when the queue is full; consumers block when empty — clean backpressure without spinning
- **Pipeline staging**: cleanly separates I/O, computation, and response — each stage can be independently scaled
- **Pointer-nullifying destroy**: `kvstore_destroy(&store)` sets the pointer to `NULL` after freeing, preventing use-after-free bugs
