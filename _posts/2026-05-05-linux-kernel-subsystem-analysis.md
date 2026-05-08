---
date: 2026-05-05 00:00:00
layout: post
title: "Linux Kernel 7.1-rc2: Structural Analysis of Subsystems"
subtitle: Mapping 63,000+ source files across 16 subsystems — scheduler, memory, filesystems, networking, and beyond
description: Mapping 63,000+ source files across 16 subsystems — scheduler, memory, filesystems, networking, and beyond
category: project
tags:
  - linux
  - kernel
  - systems
image: /assets/img/uploads/kernel-subsystems.png
optimized_image: /assets/img/uploads/kernel-subsystems.png
author: Sujin
paginate: true
---

**Kernel version:** Linux 7.1-rc2  
**Method:** Structural analysis of the source tree — directory layout, file/line counts, cross-subsystem header dependencies.

**Tree totals:** 63,353 source files (36,679 `.c`, 26,674 `.h`)

---

# Overview

The Linux kernel source tree is organized as a set of cooperating subsystems. Each lives in its own top-level directory and owns a well-defined responsibility. They interact through stable internal APIs, primarily header files under `include/linux/`, rather than direct coupling.

Below is a classification of all major subsystems derived directly from the 7.1-rc2 source tree.

---

# Size by Subsystem

| Subsystem | Directory | `.c` files | Lines of C |
|---|---|---|---|
| Device Drivers | `drivers/` | 22,107 | ~17,896,000 |
| Architecture | `arch/` | 4,248 | ~1,548,000 |
| Filesystems | `fs/` | 1,482 | ~1,456,000 |
| Sound | `sound/` | 1,872 | ~1,406,000 |
| Networking | `net/` | 1,475 | ~1,233,000 |
| Memory Management | `mm/` | 164 | ~210,000 |
| Kernel Core + Scheduler | `kernel/` | 491 | ~515,000 |
| Security | `security/` | 167 | ~112,000 |
| Block Layer | `block/` | 75 | ~67,000 |
| Cryptographic API | `crypto/` | 151 | ~67,000 |
| io_uring | `io_uring/` | 43 | ~24,000 |
| Virtualization | `virt/` | 11 | ~11,000 |
| IPC | `ipc/` | 11 | ~9,600 |

---

# Why the Extremes Are Extreme

## Top 3 — why so large

**Device Drivers (~17.9M lines)** — The kernel must support every piece of hardware ever shipped. GPUs alone account for ~2.5M lines because each vendor (Intel, AMD, Nvidia) ships a programmable compute chip that is essentially its own computer — each needs its own compiler backend, firmware loader, and memory manager. Network drivers cover thousands of distinct NICs across ethernet, Wi-Fi, and virtual. The fundamental problem is a **one-driver-per-device model**: hardware differences cannot be abstracted away, so the code scales linearly with hardware diversity across decades of production.

**Architecture (~1.55M lines)** — Each ISA requires a full vertical slice: page tables, trap/exception handlers, context switch assembly, SMP bringup, FPU/SIMD save-restore, CPU feature detection, and platform boot code. x86 alone is enormous because it carries 40 years of backward compatibility — real mode, SMM, APIC variants, hundreds of CPU errata workarounds. 22 architectures × (large per-arch slice) = large total.

**Filesystems (~1.46M lines)** — Each of 86 filesystems has its own on-disk format, journal recovery logic, and cache coherency protocol. Network filesystems (NFS, SMB, Ceph) embed full network protocol stacks. Each is essentially a specialized database engine with its own consistency guarantees. Size scales with filesystem count.

## Bottom 3 — why so small

**IPC (~9,600 lines)** — SysV message queues, semaphores, and shared memory are old, frozen, narrow-scoped interfaces. No hardware, no protocol complexity, no vendor variants. The API has been stable since the 1980s Unix era. Implementation is: a few data structures + locking + a handful of syscalls. Nothing new accumulates here.

**Virtualization / `virt/` (~11,000 lines)** — This number is misleading. `virt/` is intentionally a thin glue layer — just the architecture-independent KVM core (vCPU abstraction, memory slots, irqchip interface). The bulk of KVM lives elsewhere: `arch/x86/kvm/` holds all the VMX/SVM logic, nested virtualization, and shadow paging; virtio lives in `drivers/virtio/`; vhost lives in `drivers/vhost/`. The directory boundary understates KVM's real footprint by roughly 10×.

**io_uring (~24,000 lines)** — io_uring is a clean, modern interface layer, not an implementation. Introduced in 5.1 (2019), it was designed from scratch as a shared ring buffer (submission queue + completion queue). It delegates all actual work to existing subsystems — file I/O goes through VFS, networking goes through `net/`, etc. It adds no new I/O semantics, only a new dispatch mechanism. Being new also means zero legacy cruft has accumulated yet.

---

# Subsystem Workflow Graph

The diagram below shows primary data/control flows (solid arrows) and cross-cutting hook relationships (dashed arrows) across all seven layers of the kernel.

<style>
  .graph-img { width: 100%; height: auto; border: 1px solid #e0e0e0; border-radius: 4px; }
</style>

<img class="graph-img" src="/assets/img/uploads/kernel-subsystems.png" alt="Linux kernel subsystem workflow graph showing data/control flows across seven layers: POSIX interface, execution environment, memory management, subsystem services, virtualization, device drivers, and architecture." />

**Reading the graph:**  
Solid arrows show primary data or control flow. Dashed arrows (`-.->`) show cross-cutting hook relationships — BPF programs attach into subsystems without the subsystem knowing, and LSM hooks intercept operations at the VFS/net/process boundary.

---

# Cross-Subsystem Interaction

The subsystems are not isolated. Key coupling points:

- **`include/linux/sched.h`** is included by 98 files in `kernel/` and 49 files in `net/` — `struct task_struct` is the universal process handle.
- **`include/linux/mm.h`** is included by 69 files in `kernel/` and 619 files in `drivers/` — memory allocation is universal.
- **`include/linux/fs.h`** is included by 48 files in `kernel/` — the VFS inode/file model touches nearly everything.
- **LSM hooks** crosscut all subsystems without any subsystem importing another.
- **BPF** appears in `kernel/bpf/`, `net/bpf/`, `security/bpf/`, `io_uring/bpf_filter.c`, `kernel/sched/ext.c` — it is a horizontal layer, not a single subsystem.

---

# Subsystem Details

## 1. Process & Execution Management — `kernel/`

The kernel core manages process lifecycle, system calls, and cross-cutting concerns.

- **Process lifecycle** — `fork.c`, `exit.c`: `clone()`/`fork()`/`execve()`
- **Signal handling** — `signal.c` (5,053 lines): POSIX signals
- **Workqueues** — `workqueue.c` (8,439 lines): async kernel thread pool; largest single file in `kernel/`
- **Audit** — `audit.c`, `auditsc.c`, `auditfilter.c`: syscall auditing
- **Credentials** — `cred.c`, `user_namespace.c`: UID/GID, user namespaces
- **BPF engine** — `bpf/` (~30 files): eBPF verifier, maps, program types
- **cgroups** — `cgroup/`: resource grouping (cpu, memory, pids, rdma, dmem)
- **Tracing** — `trace/`, `kprobes.c`: live kernel instrumentation

## 2. Scheduler — `kernel/sched/`

Self-contained subdirectory, ~60,000 lines. Four scheduling classes in priority order:

| Class | File | Lines | Policy |
|---|---|---|---|
| Stop | `stop_task.c` | — | Highest priority; used for CPU hotplug |
| Deadline | `deadline.c` | 3,872 | SCHED_DEADLINE (EDF) |
| RT | `rt.c` | 2,939 | SCHED_FIFO / SCHED_RR |
| Fair (CFS) | `fair.c` | 14,282 | Default; largest scheduler file |
| Ext (BPF) | `ext.c` | 9,821 | sched_ext — BPF-programmable (new in 6.11) |
| Idle | `idle.c` | — | Lowest priority |

`sched_ext` inserts between RT and Fair and allows user-written BPF programs to implement custom scheduling policies entirely from userspace — a major architectural shift.

## 3. Memory Management — `mm/`

164 `.c` files, ~210,000 lines. Key components:

- **Buddy allocator** — `page_alloc.c` (7,800 ln): zone-based physical page allocator
- **SLUB** — `slub.c` (9,936 ln): kernel object cache; the largest file in `mm/`
- **Page fault handler** — `memory.c` (7,587 ln): demand paging, COW, anonymous mappings
- **Page reclaim** — `vmscan.c` (8,068 ln): kswapd, LRU-based eviction
- **HugeTLB / THP** — `hugetlb.c` (7,324 ln), `huge_memory.c` (5,093 ln)
- **Memory cgroups** — `memcontrol.c` (5,958 ln): per-cgroup accounting and limits
- **KSM** — `ksm.c` (4,021 ln): Kernel Samepage Merging (deduplication)
- **DAMON** — `damon/` (12 files): Data Access MONitor for proactive memory management
- **Safety tools** — `kasan/`, `kfence/`: dynamic memory error detection

## 4. Virtual File System & Filesystems — `fs/`

1,482 `.c` files, ~1,456,000 lines. The VFS core (`dcache.c`, `inode.c`, `namei.c`, `super.c`) provides a unified abstraction over 86 filesystem implementations:

| Category | Filesystems |
|---|---|
| General-purpose | ext4, xfs, btrfs, f2fs, jfs, ext2 |
| Network/distributed | nfs, nfsd, ceph, smb, afs, 9p |
| Flash/embedded | jffs2, ubifs, erofs, squashfs, cramfs |
| Windows-compat | fat, exfat, ntfs, ntfs3, hfs, hfsplus |
| Pseudo/virtual | proc, sysfs, debugfs, tracefs, configfs |
| Special-purpose | overlayfs, fuse, hugetlbfs, devpts |
| Cluster | gfs2, ocfs2 (with DLM) |
| Integrity | ecryptfs, verity (dm-verity), fscrypt |

## 5. Networking — `net/`

1,475 `.c` files, ~1,233,000 lines. Layered protocol stack:

- **Socket layer** — `net/core/`, `socket.c`: BSD socket API, `sk_buff` lifecycle
- **IPv4 / IPv6** — `net/ipv4/`, `net/ipv6/`: TCP, UDP, ICMP, routing
- **Netfilter** — `net/netfilter/`: `nftables`/`iptables` packet filtering framework
- **Wireless** — `net/wireless/`, `net/mac80211/`: cfg80211 + 802.11 MAC
- **XDP/BPF** — `net/bpf/`, `net/xdp/`: eXpress Data Path for line-rate packet processing
- **Traffic control** — `net/sched/`: `tc` qdisc/classifier framework
- **MPTCP** — `net/mptcp/`: Multipath TCP
- **Kernel TLS** — `net/tls/`: in-kernel TLS record layer
- **OpenvSwitch** — `net/openvswitch/`: in-kernel OVS datapath
- **Protocols** — tipc, sctp, rxrpc, can, l2tp, mctp, mpls, smc

## 6. Device Drivers — `drivers/`

22,107 `.c` files, ~17.9M lines — the largest subsystem by a wide margin.

| Category | Lines | Notes |
|---|---|---|
| Graphics / GPU | ~2,530,000 | DRM framework; i915, amdgpu, nouveau, virtio-gpu |
| Network drivers | ~4,268,000 | Ethernet, Wi-Fi, virtual NICs, DSA |
| SCSI / storage | ~848,000 | libfc, lpfc, megaraid, qla2xxx |
| Media | ~1,327,000 | V4L2, DVB, camera sensors |
| USB | ~525,000 | XHCI/EHCI host controllers, device classes |
| Input | ~211,000 | evdev, keyboard, mouse, touchscreen |
| HID | ~139,000 | USB/Bluetooth HID, hid-bpf |
| PCI | ~163,000 | PCIe core, AER, hotplug |
| NVMe | ~55,000 | NVMe PCIe and fabrics |

## 7. Architecture — `arch/`

22 architectures, 4,248 `.c` files, ~1.55M lines. Each provides: page table management, trap/exception handlers, context switch, boot code, and `include/asm/` abstractions.

| Architecture | Notes |
|---|---|
| x86 / x86_64 | Primary desktop/server; most complex arch port |
| arm64 | Dominant in mobile and cloud servers |
| riscv | Fast-growing open ISA |
| powerpc | IBM servers and embedded |
| s390 | IBM Z mainframes |
| loongarch | Chinese open ISA (added in 5.19) |

## 8. Security — `security/`

167 `.c` files, ~112,000 lines. The LSM hook framework (`lsm_init.c`, `security.c`) inserts call sites throughout the kernel; individual modules register handlers selectively.

| Module | Mechanism |
|---|---|
| SELinux | Type enforcement MAC |
| AppArmor | Path-based MAC |
| Smack | Simplified labels |
| Landlock | Unprivileged sandboxing |
| IPE | Integrity Policy Enforcement |
| IMA/EVM | File measurement and appraisal |
| Keys | Kernel keyring subsystem |

## 9. Block Layer — `block/`

75 `.c` files, ~67,000 lines. Sits between filesystems and storage drivers.

- Multi-queue I/O dispatch (`blk-mq.c`): maps I/O requests to hardware queues
- I/O schedulers: BFQ (`bfq-iosched.c`), Deadline (`mq-deadline.c`), Kyber (`kyber-iosched.c`)
- Block cgroups: per-cgroup I/O accounting and throttling
- Inline encryption (`blk-crypto.c`) and zoned storage (`blk-zoned.c`)

## 10. Cryptographic API — `crypto/`

151 `.c` files, ~67,000 lines. Algorithm-agnostic framework: symmetric ciphers (AES, ChaCha20), hashes (SHA-{1,2,3}, BLAKE2b, SM3), MACs, AEAD, asymmetric keys (RSA, ECDSA), RNG, and ML-DSA (FIPS 204 post-quantum signature).

## 11. Sound — `sound/`

1,872 `.c` files, ~1,406,000 lines. Comparable in size to `fs/` and `net/`.

- **ALSA core** — PCM, control, mixer abstractions
- **HD Audio** — `hda/`: codec driver framework for Intel/AMD HDA
- **ASoC** — `soc/`: embedded audio (CPU DAI + CODEC + machine driver model)
- **USB Audio** — UAC class driver
- **OSS** — legacy compatibility layer

## 12. io_uring — `io_uring/`

43 `.c` files, ~24,000 lines. Asynchronous I/O via shared ring buffers (submission queue + completion queue). Implements file I/O (`rw.c`), networking (`net.c`), splice, futex, epoll, zero-copy receive (`zcrx.c`), and BPF-based request filtering.

## 13. Virtualization — `virt/`

- **KVM core** (`virt/kvm/`): vCPU management, memory slots, irqchip abstraction
- **KVM x86** (`arch/x86/kvm/`): VMX (Intel) and SVM (AMD) hardware virtualization
- **vhost** (`drivers/vhost/`): userspace virtio backend acceleration in-kernel
- **virtio** (`drivers/virtio/`): para-virtual device transport (PCI, MMIO, CCW)

## 14. IPC — `ipc/`

11 `.c` files, ~9,600 lines. Classic SysV and POSIX IPC primitives: message queues (`msg.c`), semaphores (`sem.c`), shared memory (`shm.c`), POSIX mqueues (`mqueue.c`).

## 15. Rust Subsystem — `rust/`

New in 6.1, growing actively in 7.x. Provides safe Rust bindings to kernel primitives: allocators, block layer, device model, debugfs, cpufreq, configfs, cpumask, clk, credentials. Enables writing drivers and kernel modules in safe Rust.

---

# Three Primary I/O Paths

The workflow graph above traces three dominant paths through the kernel:

**File I/O path**
> User → `read()`/`write()` → VFS (dentry/inode lookup) → page cache (mm) → `submit_bio()` → Block layer (I/O scheduler) → storage driver → hardware

**Network path**
> User → `send()`/`recv()` → socket layer → TCP/IP stack → `sk_buff` (mm) → netdev queue → network driver → NIC

**Process execution path**
> User → `execve()` / `fork()` → kernel/process mgmt → scheduler (CFS/RT/sched_ext) → demand paging (mm) → page tables (arch) → TLB

All three paths are subject to **cgroup** resource accounting at each stage (CPU, memory, block I/O), and **LSM hooks** intercept at each syscall entry point.

