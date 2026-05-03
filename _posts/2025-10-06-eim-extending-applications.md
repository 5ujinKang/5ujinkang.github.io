---
date: 2025-10-06 00:00:00
layout: post
title: "Extending Applications Safely and Efficiently"
subtitle: EIM model abstracts extension resources for fine-grained safety/interconnectedness tradeoffs; bpftime enforces it efficiently
description: EIM model abstracts extension resources for fine-grained safety/interconnectedness tradeoffs; bpftime enforces it efficiently
category: library
tags:
  - paper-review
  - OSDI
  - "2025"
image: /assets/img/uploads/cat/19.jpg
optimized_image: /assets/img/uploads/cat/19.jpg
author: Sujin
paginate: true
---

**Venue:** OSDI 2025  

**Topic:** Application extensions (eBPF, plugins) must balance interconnectedness vs. safety vs. isolation vs. efficiency — no existing framework achieves all four simultaneously. EIM provides a resource-based abstraction; bpftime enforces it with lightweight mechanisms.

---
# Summary
Software extensions improve performance, add features, and enhance security — but current tools are neither safe, isolated, nor efficient enough.
The core tension: **fine-grained interconnectedness** (extensions need to read/modify application state) vs. **safety** (extensions must not corrupt the host).
**EIM (Extension Interface Model)** represents extension features as abstract **resources** to handle this tradeoff.
**bpftime** is a userspace extension runtime that enforces EIM specifications using eBPF-style verification and ERIM-style intraprocess hardware isolation.

---

# Background

## Three key requirements for extension frameworks
1. **Fine-grained safety/interconnectedness tradeoffs**: no single definition of safety fits all use cases.
2. **Extension isolation**: host applications must not modify extension state.
3. **Efficiency**: extensions must run at near-native speed.

## Prior work limitations
| Approach | Safety/Interconnectedness | Isolation | Efficiency |
|---|---|---|---|
| Native execution | ✗ (no tradeoff) | ✗ | ✓ |
| SFI-based tools | ✗ (can't handle tradeoff) | Partial | ✗ (runtime validation) |
| Subprocess isolation | Partial (needs host code changes) | ✓ | ✗ (context-switch overhead) |
| eBPF uprobes | ✗ | Partial | ✗ (kernel trap per extension entry) |

---

# Key Idea

## EIM: Extension Interface Model
- Represents each extension feature needed for interconnectedness — or restricted for safety — as a single abstraction called a **resource**.
- Supports fine-grained interconnectedness/safety tradeoffs per extension.
- Works as an API-like specification that bpftime enforces.

## bpftime: extension runtime
- Enforces EIM specifications using lightweight techniques:
  - **Safety**: eBPF-style verification → **0 runtime overhead**.
  - **Isolation**: ERIM-style intraprocess hardware-supported isolation → minimal overhead.
- Introduces **concealed extension entries** via binary rewriting → eliminates runtime overhead for idle extension entry points.
- Fully compatible with existing eBPF → can extend both kernel and user-space applications.

---

# Design

## EIM
- Models each extension requirement as a resource with configurable access permissions.
- Provides a principled way to balance interconnectedness and safety without requiring host code changes.

## bpftime
1. **Safety via eBPF verification**: static analysis at load time → no per-extension-call overhead at runtime.
2. **Isolation via ERIM**: intraprocess memory domain isolation → extensions can't corrupt host state.
3. **Efficiency via concealed entries**: binary rewriting hides extension entry points when not needed → eliminates unused entry overhead.

---

# Questions
- How does EIM handle dynamic, runtime-determined access patterns that static verification can't anticipate?
- Concealing extension entries requires watching idle status — does this bookkeeping overhead scale at high entry counts?

---

# Meeting Notes
*(to be filled)*
