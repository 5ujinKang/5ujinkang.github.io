---
date: 2026-01-15 00:00:00
layout: post
title: "Spirit: Fair Allocation of Interdependent Resources in Remote Memory Systems"
subtitle: Fair allocation when resources are interdependent — remote memory bandwidth, capacity, and compute interact
description: Fair allocation when resources are interdependent — remote memory bandwidth, capacity, and compute interact
category: library
tags:
  - paper-review
  - SOSP
  - "2025"
image: /assets/img/uploads/cat/23.jpg
optimized_image: /assets/img/uploads/cat/23.jpg
author: Sujin
paginate: true
---

**Venue:** SOSP 2025  

**Topic:** Remote memory systems disaggregate memory from compute, but fairly allocating interdependent resources (bandwidth, capacity, compute) across tenants is non-trivial. Spirit proposes a fair allocation mechanism for such systems.

---
# Summary
Remote memory systems (e.g., CXL-based disaggregated memory) expose multiple interdependent resources: memory capacity, memory bandwidth, and local compute.
Standard fair allocation (e.g., max-min fairness) fails when resources are interdependent — allocating one resource constrains what another can do for a tenant.
Spirit addresses fair allocation of interdependent resources in remote memory systems, ensuring no tenant is unfairly starved.

---

# Background

## Remote memory systems
- Memory is disaggregated from compute — tenants access memory over a high-speed fabric (e.g., CXL).
- Resources involved: memory capacity, bandwidth on the fabric, and local CPU cycles for data movement.

## Interdependence
- A tenant's effective memory bandwidth depends on capacity allocated (working set fit) and compute (data movement overhead).
- Allocating more bandwidth to one tenant may require more capacity or compute elsewhere.
- Standard max-min fairness doesn't account for these dependencies.

---

# Key Idea
- Model the interdependencies between resources explicitly.
- Define fairness in terms of the full resource bundle, not individual resource axes.
- Find an allocation that is fair across tenants given these dependencies.

---

# Design

*(Based on meeting discussion)*

- **Profile** resource demand and interdependencies per tenant.
- **Estimation** of effective utility given a resource allocation.
- **Symbiosis algorithm**: find allocations that maximize collective utility while preserving fairness guarantees.
- **Property guarantees**: prove fairness properties hold under the model.

---

# Meeting Notes
- Modifying hardware may be necessary when existing hardware suffers from fundamental limitations.
- Bringing a new problem definition can justify work even with conventional components.
- Estimation factor "slowdown" may not be directly actionable.
- Fairness → performance tradeoff: 21.6% improvement shown, but fairness guarantee may be the more academically valuable contribution.
- Hard to improve performance through resource reallocation alone → but fairness guarantees can be expanded later.
- Even limited scope + strong guarantees = valuable contribution to academia.
