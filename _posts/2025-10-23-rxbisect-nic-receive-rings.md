---
date: 2025-10-23 00:00:00
layout: post
title: "Disentangling the Dual Role of NIC Receive Rings"
subtitle: Split Rx ring into allocation (Ax) and reception (Bx) rings → reduce I/O working set, improve throughput up to 37%
description: Split Rx ring into allocation (Ax) and reception (Bx) rings → reduce I/O working set, improve throughput up to 37%
category: library
tags:
  - paper-review
  - OSDI
  - "2025"
image: /assets/img/uploads/cat/21.jpg
optimized_image: /assets/img/uploads/cat/21.jpg
author: Sujin
paginate: true
---

**Venue:** OSDI 2025  
**Link:** [USENIX OSDI '25](https://www.usenix.org/conference/osdi25/presentation/pismenny)

**Topic:** NIC Rx rings serve two functions: buffer allocation and packet reception. Their combined I/O working set often exceeds LLC capacity, degrading throughput. rxBisect separates these roles into two rings to reduce the working set without sacrificing burst absorption.

---
# Summary
Modern NICs use per-core Rx rings sized to absorb bursts. As ring size or core count grows, the aggregate I/O working set (N×R buffers) exceeds the LLC, causing cache evictions and memory bandwidth pressure.
**rxBisect** splits each Rx ring into an **allocation ring (Ax)** for empty buffers and a **bisected reception ring (Bx)** for packet notifications. The NIC can consume a buffer from any Ax ring to deliver a packet to any Bx ring — enabling lockless cross-core buffer sharing.
Result: up to **37% throughput improvement**, **11× latency reduction**, and robust performance under load imbalance.

---

# Background

## How Rx rings work
- Circular arrays: software fills the tail with empty buffer pointers; NIC writes packets at the head.
- Completion rings (CR) notify software of arrivals.
- Rx ring sizes must be large enough to absorb packet bursts.

## The I/O working set problem
- Per-core rings (privRing): large ring size → large working set → exceeds LLC (DDIO only allocates 2 LLC ways) → main-memory access → throughput collapse and latency spike.
- Reducing ring size: prevents burst absorption → packet loss.
- Shared rings (shRing): reduce working set, but require locking for buffer reposting and suffer under load imbalance.

---

# Key Idea

## rxBisect: separate allocation from reception
- **Ax ring**: small, holds empty buffers for allocation.
- **Bx ring**: large, receives packet notifications.
- NIC can take buffers from **any** Ax ring to deliver packets to **any** Bx ring → cross-core buffer sharing without software locks.
- Ax rings can be small (small working set); Bx rings can be large (burst absorption). Working set scales with Ax, not Bx.

---

# Design

**Design principles:**
1. Separate buffer allocation from packet reception using independent Ax and Bx rings.
2. NIC offloads synchronization → lockless cross-core buffer sharing.
3. Small Ax rings keep I/O working set within LLC; large Bx rings absorb bursts.

**Challenges addressed:**
- Reduce total allocated buffers without sacrificing burst absorption.
- Avoid synchronization overhead.
- Remain robust under load imbalance (overloaded cores don't block others' buffer access).

**Implementation:**
- Evaluated via a DPDK-based software NIC emulator (dedicated emulator core dispatches between physical Rx rings and virtual Ax/Bx rings).
- Hardware implementation would require NIC ASIC changes.

---

# Evaluation
- Benchmarks: NAT, load balancing (network functions), MICA key-value store.

**Key results:**
- **Balanced load**: rxBisect achieves line-rate throughput using 1/8 of buffers needed by privRing.
- **MICA benchmark**: up to **37% throughput improvement** over emulated privRing; **18%** over non-emulated privRing.
- **Ring size**: rxBisect achieves max throughput with only **256 Ax entries**; privRing needs 4× more. Larger Bx rings don't degrade throughput.
- **Load imbalance**: rxBisect maintains line-rate while shRing drops by up to **60%**. Outperforms dynamic shRing by **16–20%** on CAIDA trace.

---

# Limitations
- Requires NIC ASIC changes; current evaluation uses software emulation (up to 12% lower throughput, 94% higher latency vs. non-emulated runs).
- Cross-core buffer sharing can stress memory allocators (though overhead stays below 0.2% of cycles).
- I/O working set can grow if overloaded cores consume more buffers.

---

# Meeting Notes
*(to be filled)*
