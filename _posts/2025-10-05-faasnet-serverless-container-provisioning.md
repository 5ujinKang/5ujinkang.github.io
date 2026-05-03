---
date: 2025-10-05 00:00:00
layout: post
title: "FaaSNet: Scalable and Fast Provisioning of Custom Serverless Container Runtimes at Alibaba Cloud Function Compute"
subtitle: Decentralize container provisioning across host VMs in function-tree structures to eliminate cold-start bottleneck
description: Decentralize container provisioning across host VMs in function-tree structures to eliminate cold-start bottleneck
category: library
tags:
  - paper-review
  - ATC
  - "2021"
image: /assets/img/uploads/cat/4.jpg
optimized_image: /assets/img/uploads/cat/4.jpg
author: Sujin
paginate: true
---

**Venue:** ATC 2021  

**Topic:** Large container image pulls dominate FaaS cold-start costs. Existing P2P approaches require dedicated root servers that don't fit FaaS infrastructure. FaaSNet decentralizes provisioning across VMs organized in function-based tree structures.

---
# Summary
Pulling large container images from a backing store causes significant cold-start latency (up to several minutes under contention).
Existing P2P solutions require powerful, centralized root servers — incompatible with FaaS's dynamic pool of resource-constrained VMs.
FaaSNet: a lightweight, adaptive middleware that decentralizes provisioning across VMs in function trees (FTs), with a tree-balancing algorithm to handle dynamic VM membership.

---

# Background

## Cold start and container image pull
- Container image pull cost **dominates** most functions' cold-start overhead.
- Large images amplify the problem significantly.

## Existing approaches and their limits
- **Kraken, DADI, Dragonfly**: P2P approaches for accelerating container provisioning at scale.
  - Require one or more **dedicated, powerful root servers** for data seeding, metadata management, and coordination.
  - Direct application to FaaS is problematic:
    1. Increases total cost of ownership (TCO) and introduces a performance bottleneck.
    2. FaaS uses a dynamic pool of resource-constrained VMs — VMs join and leave at any time. Existing P2P solutions lack the required adaptivity.

---

# Key Idea

## Function Tree (FT)
- A logical, tree-based network overlay consisting of host VMs.
- Container provisioning is **decentralized** across all VMs in the tree in a scalable manner.

## Tree balancing algorithm
- Dynamically adapts FT topology to accommodate VM joining and leaving.
- Ensures high adaptivity without a centralized root server.

---

# Design

## FaaSNet architecture
1. **Function Tree (FT)**: organizes host VMs into a tree overlay per function type.
   - Each node can receive and forward container images to its children.
   - No single point of failure or bottleneck.
2. **Tree balancing**: on VM join/leave, the algorithm restructures the FT to maintain balance and provisioning efficiency.
3. **Lightweight middleware**: integrates with existing FaaS infrastructure without requiring extra dedicated hardware.

---

# Evaluation
- Deployed and evaluated at Alibaba Cloud Function Compute.
- Significantly reduces cold-start latency for large container images compared to pulling from a centralized backing store.
- Scales efficiently as the number of concurrent function invocations grows.

---

# Meeting Notes
*(to be filled)*
