---
date: 2026-01-07 00:00:00
layout: post
title: "Oasis: Pooling PCIe Devices Over CXL to Boost Utilization"
subtitle: Use CXL shared memory as a message channel to pool PCIe devices (NICs, SSDs) across hosts in a CXL pod
description: Use CXL shared memory as a message channel to pool PCIe devices (NICs, SSDs) across hosts in a CXL pod
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/22.jpg
optimized_image: /assets/img/uploads/cat/22.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  
**Link:** [ACM DL](https://dl.acm.org/doi/10.1145/3731569.3764812)

**Topic:** PCIe devices (NICs, SSDs) are underutilized in cloud platforms because they are allocated conservatively for peak demand. Oasis enables pooling PCIe devices across hosts in a CXL pod using CXL shared memory as the communication channel.

---
# Summary
PCIe devices are frequently underutilized because cloud platforms allocate them conservatively to satisfy each host's peak demand.
PCIe device pools let multiple hosts share devices, but existing solutions (PCIe switches, RDMA-based disaggregation) are expensive, inflexible, or can't handle all device types.
**Oasis** uses **CXL memory pools** as shared memory across hosts in a CXL pod — enabling PCIe device pooling at near-zero extra cost by reusing existing CXL pod designs.

---

# Background

## PCIe underutilization
- NICs and SSDs are sized for peak load → idle most of the time.
- Device pooling allows sharing across hosts → better utilization.

## Existing solutions and limitations
- **PCIe switches**: expensive and inflexible (each switch type supports limited device types).
- **Disaggregating over RDMA**: can't separate NIC-type devices (RDMA uses the NIC being pooled).

---

# Key Idea

## CXL memory pool as shared message channel
- CXL memory pools already provide shared memory accessible by all hosts in a CXL pod.
- Oasis reuses this shared memory as:
  1. **I/O buffers**: PCIe devices access I/O buffers via DMA, bypassing CPU caches → allocate in CXL shared memory → any host can access.
  2. **Message channels**: enable frontend driver ↔ backend driver communication across hosts.

## Challenges
- CXL memory is **not cache-coherent across hosts** → need efficient cache invalidation and prefetching.
  1. Overhead from cache line invalidations and memory fences → must be minimized.
  2. Message channel needs efficient prefetch: invalidate a cache line once all messages are consumed → prefetching always brings in new messages, removing premature prefetching.

---

# Design

## Datapath
- **Frontend driver** (on the requesting host) ↔ **Backend driver** (on the host with the PCIe device), communicating via CXL shared memory.
- I/O buffers and signaling message channels allocated in shared CXL memory → accessible by any host in the pod directly.
- Receiver invalidates a cache line once all messages are consumed → enables clean prefetch behavior.

## Control plane
- **Pod-wide allocator**: maps devices to hosts, handles load balancing and failure mitigation.

## Implementation
- **Oasis Engine**: Frontend Driver + Backend Driver pair.
- **Control Plane**: pod-wide allocator.

---

# Evaluation
- **NIC utilization**: improved by **2×**.
- **NIC failover**: handled with only **38 ms interruption**.

---

# Limitations
1. **CXL failures**: CXL link/cable faults are the most common failure type → need resilient CXL pod designs.
2. **CXL bandwidth saturation**: if CXL bandwidth is exhausted, may need traffic rebalancing (e.g., Intel RDT).

---

# Meeting Notes
- Work targets cloud environments (not general data centers) — DDIO and zero-copy techniques are relevant constraints.
- Completeness: design is complete, extensively referenced prior work.
