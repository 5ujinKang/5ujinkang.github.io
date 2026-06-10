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

---

# Phase 3: Subsystem Interaction Scenarios

The following three scenarios trace real kernel execution paths derived from direct source analysis of Linux 7.1-rc2. Every function name, file path, and line number was verified against the actual source tree at `/home/user/linux`.

<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'neutral', flowchart: { curve: 'basis' } });</script>

---

## Scenario 1: Process Scheduling

### Overview

The Linux scheduler decides which task runs on a CPU and when to switch away from it. This section traces the full path from a hardware timer tick to the moment a new task starts executing.

**Step 1 — The timer fires.** A hardware clock interrupts the CPU every ~4 ms (250 times per second). Each interrupt calls `sched_tick()`, which asks: has the current task been running long enough?

**Step 2 — Tracking fairness with virtual runtime.** Each task accumulates a counter called `vruntime` — the total CPU time it has consumed, normalized by its priority weight. Higher-priority tasks accumulate `vruntime` more slowly, so they stay runnable longer. When `vruntime` exceeds the task's assigned deadline, the scheduler marks it for replacement by setting a flag called `TIF_NEED_RESCHED` on the CPU.

**Step 3 — The flag is a signal, not an immediate switch.** The kernel cannot safely swap tasks mid-instruction. Instead, `TIF_NEED_RESCHED` is checked at two safe moments: when the task voluntarily goes to sleep (waiting for I/O, a lock, etc.), or when control returns to userspace after an interrupt or syscall completes. At either point, `schedule()` is invoked.

**Step 4 — Picking the next task.** `__schedule()` walks a priority-ordered list of scheduling classes — stop → deadline → real-time → fair (CFS) → idle — and asks each class for its best runnable task. Within the CFS class, `pick_next_task_fair()` selects the task with the smallest `vruntime` from a red-black tree, meaning the task that has received the least CPU time relative to its peers.

**Step 5 — The context switch.** `context_switch()` performs two operations to hand the CPU to the new task: first, it loads the new task's memory map (`switch_mm_irqs_off()` — updates the CPU's page table pointer CR3, so the CPU can access the new task's memory); second, it saves all CPU registers for the old task and restores them for the new task (`__switch_to()` — includes stack pointer, floating-point state, and segment registers). After this, the CPU is executing the new task's code as if it had never stopped.

---

### Key Functions

| Function | File | Line | Role |
|---|---|---|---|
| `update_process_times()` | `kernel/time/timer.c` | 2468 | Timer IRQ bottom: accounts CPU time, calls `sched_tick()` |
| `sched_tick()` | `kernel/sched/core.c` | 5636 | Per-tick scheduler accounting; calls `sched_class→task_tick()` |
| `task_tick_fair()` | `kernel/sched/fair.c` | 13657 | CFS tick handler; calls `entity_tick()` for each sched entity in group hierarchy |
| `update_curr()` | `kernel/sched/fair.c` | 1378 | Computes elapsed time, increments `vruntime += calc_delta_fair(Δt, se)` |
| `resched_curr()` | `kernel/sched/core.c` | 1212 | Sets `TIF_NEED_RESCHED` on target CPU, triggering future preemption |
| `resched_curr_lazy()` | `kernel/sched/core.c` | 1238 | Lazy variant: sets `TIF_NEED_RESCHED_LAZY` if lazy preemption is active |
| `schedule()` | `kernel/sched/core.c` | 7273 | Public entry: flushes block plug, calls `__schedule_loop()` |
| `__schedule()` | `kernel/sched/core.c` | 7017 | Core scheduler: disables IRQs, acquires rq lock, dequeues sleeping prev, calls `pick_next_task()` |
| `__pick_next_task()` | `kernel/sched/core.c` | 5999 | Walks `for_each_active_class()` vtable in priority order until a task is found |
| `pick_next_task_fair()` | `kernel/sched/fair.c` | 9204 | CFS picker: calls `pick_task_fair()` → leftmost node of CFS red-black tree |
| `_pick_next_task_rt()` | `kernel/sched/rt.c` | 1694 | RT picker: takes highest-prio task from the RT run-list |
| `context_switch()` | `kernel/sched/core.c` | 5329 | Switches MM (`switch_mm_irqs_off`), then calls `switch_to()` macro |
| `__switch_to()` | `arch/x86/kernel/process_64.c` | 610 | x86-64 arch switch: saves/restores FPU, TLS, FS/GS segments, swaps RSP via `CALL`/`RET` |
| `finish_task_switch()` | `kernel/sched/core.c` | 5202 | Releases rq lock, drops reference to prev task, fires `sched_in` perf notifiers |
| `try_to_wake_up()` | `kernel/sched/core.c` | 4152 | Wakeup path: validates state, calls `ttwu_queue()` → `activate_task()` → `enqueue_task_fair()` |
| `activate_task()` | `kernel/sched/core.c` | 2200 | Inserts task into runqueue via `sched_class→enqueue_task()` |
| `ttwu_queue()` | `kernel/sched/core.c` | 3968 | Queues wakeup IPI if target CPU is remote; local: directly enqueues |
| `sched_balance_rq()` | `kernel/sched/fair.c` | 12071 | Periodic load balancer: migrates tasks between CPUs |
| `sched_balance_find_src_rq()` | `kernel/sched/fair.c` | 11753 | Finds the busiest runqueue as migration source |
| `detach_tasks()` | `kernel/sched/fair.c` | 9874 | Removes tasks from source rq for cross-CPU migration |
| `attach_tasks()` | `kernel/sched/fair.c` | 10013 | Enqueues migrated tasks onto destination rq |
| `sched_balance_newidle()` | `kernel/sched/fair.c` | 5032 | Idle-CPU load balance: pulls tasks when a CPU goes idle |

---

### Complete Call Chain

**Tick-driven preemption path:**

1. Hardware timer fires → CPU exception → `update_process_times()` (`timer.c:2468`) — accounts user/kernel time via `account_process_tick()`, then calls `sched_tick()`.
2. `sched_tick()` (`core.c:5636`) — acquires `rq` lock, updates `rq_clock`, calls `donor->sched_class->task_tick(rq, donor, 0)`.
3. `task_tick_fair()` (`fair.c:13657`) — iterates the `sched_entity` group hierarchy, calling `entity_tick(cfs_rq, se, queued)` at each level.
4. `entity_tick()` → `update_curr()` (`fair.c:1378`) — `delta_exec = update_se(rq, curr)`; then `curr->vruntime += calc_delta_fair(delta_exec, curr)`; calls `update_deadline()`.
5. If deadline exceeded: `resched_curr_lazy(rq)` (`core.c:1238`) — sets `TIF_NEED_RESCHED` / `TIF_NEED_RESCHED_LAZY` flag on the running CPU.
6. On return from interrupt (or at next `cond_resched()`): `schedule()` (`core.c:7273`) or `preempt_schedule()` (`core.c:7386`) is invoked.
7. `schedule()` → `__schedule_loop()` → `__schedule(SM_NONE)` (`core.c:7017`) — disables IRQs, acquires `rq->lock` via `rq_lock()`.
8. If prev is blocking: `try_to_block_task()` — sets prev state, calls `deactivate_task()` to remove from rq.
9. `pick_next_task(rq, donor, &rf)` (`core.c:7105`) → `__pick_next_task()` (`core.c:5999`).
10. `__pick_next_task()` fast path: if all tasks are CFS, directly calls `pick_next_task_fair(rq, prev, rf)`. Otherwise `for_each_active_class(class)` walks stop → dl → rt → fair → idle, calling `class->pick_next_task()` or `class->pick_task()`.
11. `pick_next_task_fair()` (`fair.c:9204`) → `pick_task_fair(rq, rf)` — selects `se` from `cfs_rq->tasks_timeline` (rb_root_cached, leftmost = min vruntime). For cgroup fair-group scheduling, walks the entity tree via `set_next_entity()` and `put_prev_entity()`.
12. `context_switch(rq, prev, next, &rf)` (`core.c:5329`):
    - `prepare_task_switch(rq, prev, next)` — fires preemption notifiers.
    - `arch_start_context_switch(prev)`.
    - If switching to a user task: `switch_mm_irqs_off(prev->active_mm, next->mm, next)` — loads new CR3, flushes TLB if ASID differs; `lru_gen_use_mm(next->mm)`.
    - `prepare_lock_switch(rq, next, &rf)` — releases rq lock (lock is transferred to next task).
    - `switch_to(prev, next, prev)` macro → `__switch_to(prev_p, next_p)` (`process_64.c:610`): saves/restores FPU state (`switch_fpu()`), saves FS/GS segment registers (`save_fsgs()`), loads next's TLS (`load_TLS(next, cpu)`), switches I/O bitmap, swaps kernel stack pointer.
13. CPU now executes the next task's kernel stack. `finish_task_switch(prev)` (`core.c:5202`) is called on the new task's behalf — releases `rq->lock`, drops `prev->active_mm` if needed, calls `perf_event_task_sched_in()`, fires `sched_in` notifiers.

**Wake-up path (e.g., I/O completion wakes a sleeping task):**

1. `try_to_wake_up(p, state, wake_flags)` (`core.c:4152`) — acquires `p->pi_lock`, checks `p->__state` matches `state`.
2. `ttwu_queue(p, cpu, wake_flags)` (`core.c:3968`) — if remote CPU: queues via `__smp_call_single_queue()` (IPI). If local: directly calls `ttwu_do_activate()`.
3. `activate_task(rq, p, flags)` (`core.c:2200`) — calls `sched_class->enqueue_task()`, e.g. `enqueue_task_fair()` (`fair.c:7168`) — inserts `se` into `cfs_rq->tasks_timeline` RB-tree at the computed vruntime position.
4. `wakeup_preempt(rq, p, flags)` — checks if newly woken task should preempt current; if so, calls `resched_curr()`.

**Cross-CPU load balancing:**

- `sched_balance_newidle()` (`fair.c:5032`) is called from `pick_next_task_fair()` when no local task is available — pulls tasks from the busiest runqueue.
- Periodic `sched_balance_rq()` (`fair.c:12071`) runs via `sched_balance_trigger()` called from `sched_tick()`.
- → `sched_balance_find_src_rq()` (`fair.c:11753`) — iterates sched domains to find the busiest group and queue.
- → `detach_tasks()` (`fair.c:9874`) — removes tasks from source rq.
- → `attach_tasks()` (`fair.c:10013`) — enqueues them on the destination rq.

---

### Key Data Structures

**`struct sched_entity`** (`include/linux/sched.h:575`)  
The per-task CFS accounting unit embedded in `task_struct.se`.

| Field | Type | Role |
|---|---|---|
| `vruntime` | `u64` | Accumulated virtual runtime (ns × weight-normalized) |
| `deadline` | `u64` | Absolute deadline for current slice (EEVDF scheduler) |
| `run_node` | `struct rb_node` | Node in the per-`cfs_rq` red-black tree |
| `exec_start` | `u64` | Timestamp of last scheduling-in (used to compute Δt) |
| `sum_exec_runtime` | `u64` | Total physical CPU time consumed |
| `on_rq` | `unsigned char` | 1 if currently enqueued on a runqueue |
| `load.weight` | `unsigned long` | Proportional weight derived from `nice` value |

**`struct rq`** (`kernel/sched/sched.h:1131`)  
Per-CPU runqueue; one per logical CPU.

| Field | Type | Role |
|---|---|---|
| `nr_running` | `unsigned int` | Total runnable tasks on this CPU |
| `curr` / `donor` | `struct task_struct *` | Currently executing / scheduling-context task |
| `cfs` | `struct cfs_rq` | Embedded CFS runqueue (holds RB-tree) |
| `rt` | `struct rt_rq` | Real-time runqueue |
| `dl` | `struct dl_rq` | Deadline runqueue |
| `__lock` | `raw_spinlock_t` | Runqueue lock |

**`struct task_struct`** — scheduling-relevant fields (`include/linux/sched.h:820`):  
`sched_class` (pointer to vtable), `se` (CFS entity), `rt` (RT entity), `policy` (SCHED_NORMAL/FIFO/RR/DEADLINE), `prio` / `static_prio` / `normal_prio`, `on_rq`, `on_cpu`, `cpus_ptr` (allowed CPU mask).

**`sched_class` vtable** for `fair_sched_class` (`fair.c:14177`):

```c
DEFINE_SCHED_CLASS(fair) = {
    .enqueue_task   = enqueue_task_fair,
    .dequeue_task   = dequeue_task_fair,
    .pick_task      = pick_task_fair,
    .pick_next_task = pick_next_task_fair,
    .put_prev_task  = put_prev_task_fair,
    .set_next_task  = set_next_task_fair,
    .task_tick      = task_tick_fair,
    .select_task_rq = select_task_rq_fair,
    .wakeup_preempt = wakeup_preempt_fair,
};
```

Priority order: `stop_sched_class` (stop_task.c:99) > `dl_sched_class` (deadline.c:3421) > `rt_sched_class` (rt.c:2595) > `fair_sched_class` (fair.c:14177) > `idle_sched_class` (idle.c:569).

---

### Process Scheduling Flow Graph

<div class="mermaid">
flowchart TD
    A["⏱ Hardware Timer IRQ<br/>(250 Hz / 4ms period)"]
    A --> B["update_process_times()<br/>kernel/time/timer.c:2468"]
    B --> C["sched_tick()<br/>kernel/sched/core.c:5636<br/>Holds rq lock; updates clock & hw_pressure"]
    C --> D["sched_class→task_tick(rq, curr, 0)<br/>Dispatches to active scheduling class"]
    D --> E["task_tick_fair()<br/>kernel/sched/fair.c:13657<br/>Iterates sched_entity group hierarchy"]
    E --> F["update_curr()<br/>fair.c:1378<br/>delta_exec = now − exec_start<br/>vruntime += calc_delta_fair(delta_exec, se)"]
    F --> G{update_deadline:<br/>deadline exceeded?}
    G -->|No| H["Task continues running"]
    G -->|Yes| I["resched_curr_lazy()<br/>core.c:1238<br/>Sets TIF_NEED_RESCHED flag"]
    I --> J["schedule() entry<br/>core.c:7273<br/>or preempt_schedule() core.c:7386"]
    J --> K["__schedule(SM_NONE)<br/>core.c:7017<br/>Disables IRQs · acquires rq lock<br/>Deactivates blocking prev task"]
    K --> L["pick_next_task()<br/>→ __pick_next_task()<br/>core.c:5999"]
    L --> M["for_each_active_class priority walk"]
    M --> M1["stop_sched_class<br/>stop_task.c:99"]
    M --> M2["dl_sched_class<br/>deadline.c:3421"]
    M --> M3["rt_sched_class → _pick_next_task_rt()<br/>rt.c:1694"]
    M --> M4["fair_sched_class"]
    M4 --> N["pick_next_task_fair()<br/>fair.c:9204<br/>→ pick_task_fair()<br/>→ leftmost rb_node (min vruntime)"]
    N --> O["context_switch()<br/>core.c:5329"]
    O --> O1["switch_mm_irqs_off()<br/>Load CR3, flush TLB if ASID differs"]
    O1 --> O2["switch_to() macro<br/>→ __switch_to()<br/>arch/x86/kernel/process_64.c:610<br/>FPU · TLS · FS/GS · kernel RSP"]
    O2 --> P["finish_task_switch()<br/>core.c:5202<br/>Release rq lock · drop prev ref<br/>Fire sched_in perf notifiers"]
    P --> Q["✅ Next task resumes execution"]
    H -.->|"next timer tick"| A

    subgraph WAKEUP["Wake-up Path"]
        W1["try_to_wake_up()<br/>core.c:4152"] --> W2["ttwu_queue()<br/>core.c:3968<br/>IPI if remote CPU"]
        W2 --> W3["activate_task()<br/>core.c:2200<br/>→ enqueue_task_fair()<br/>Insert se into CFS RB-tree"]
        W3 --> W4["wakeup_preempt()<br/>→ resched_curr() if higher prio"]
    end
    W4 -.->|"TIF_NEED_RESCHED set"| J
</div>

---

## Scenario 2: Memory Management

### Overview

Memory management covers how the kernel gives programs the memory they ask for, and how it takes memory back when the system runs low. This section traces three paths that work together continuously.

**Path A — Page fault: giving a program its memory on demand.** When a program accesses a memory address that has no physical RAM assigned to it yet, the CPU raises a hardware exception called a page fault. The kernel's fault handler walks the program's page table to find out why the page is missing, then decides what to do: for a brand-new anonymous page (e.g. a freshly written variable), it allocates a physical page and maps it in; for a copy-on-write page (e.g. after `fork()`), it copies the parent's page before allowing the write; for a page that was swapped out to disk, it reads it back from the swap device. The program never sees any of this — from its perspective the memory access simply succeeds.

**Path B — Buddy allocator + SLUB: the kernel's internal memory supply.** Every time the kernel itself needs memory — for data structures, driver buffers, page tables — it calls `kmalloc()`. The SLUB slab allocator sits on top and maintains per-CPU caches of fixed-size objects so that common allocations are lock-free and nearly instant. When a cache is empty, SLUB asks the buddy allocator for a fresh page. The buddy allocator manages all free physical pages grouped by size (powers of two), splitting and merging blocks to satisfy requests. If free memory falls below a threshold, the slow path wakes `kswapd` before retrying.

**Path C — kswapd: reclaiming memory in the background.** The kernel tracks all physical pages on LRU (Least Recently Used) lists — pages that have not been accessed recently drift toward the "inactive" end. A kernel thread called `kswapd` runs whenever free memory drops below a watermark. It scans the inactive list, and for each page it finds: if the page is clean (no unsaved changes), it is simply freed; if the page is dirty (modified but not yet written to disk), it is written back to its backing file or swap device first, then freed. This keeps a pool of free pages available so that page faults can be satisfied quickly without stalling.

---

### Key Functions

| Function | File | Line | Role |
|---|---|---|---|
| `exc_page_fault()` | `arch/x86/mm/fault.c` | 1483 | IDT raw entry for `#PF` exception; calls `handle_page_fault()` |
| `handle_page_fault()` | `arch/x86/mm/fault.c` | 1462 | Routes to `do_kern_addr_fault()` or `do_user_addr_fault()` |
| `do_user_addr_fault()` | `arch/x86/mm/fault.c` | 1207 | Validates fault context, finds VMA via `lock_mm_and_find_vma()`, calls `handle_mm_fault()` |
| `handle_mm_fault()` | `mm/memory.c` | 6683 | MM entry: dispatches to `hugetlb_fault()` or `__handle_mm_fault()` |
| `__handle_mm_fault()` | `mm/memory.c` | 6449 | Walks page table levels (pgd→p4d→pud→pmd), allocating missing table pages; calls `handle_pte_fault()` |
| `handle_pte_fault()` | `mm/memory.c` | 6367 | Decodes PTE state and dispatches: missing, swap, NUMA, or write-protect |
| `do_pte_missing()` | `mm/memory.c` | 4545 | Dispatches anonymous vs. file-backed missing page |
| `do_anonymous_page()` | `mm/memory.c` | 5321 | Anonymous fault: maps zero-page for reads; for writes: `alloc_anon_folio()` + `set_pte_at()` |
| `do_wp_page()` | `mm/memory.c` | 4228 | Write-protect fault: determines if COW is needed, calls `do_cow_fault()` |
| `do_cow_fault()` | `mm/memory.c` | 5905 | Copy-on-Write: `folio_prealloc()` → `__do_fault()` → `copy_mc_user_highpage()` → `finish_fault()` |
| `do_swap_page()` | `mm/memory.c` | 4779 | Swap-in: reads page from swap device, installs PTE |
| `__alloc_frozen_pages_noprof()` | `mm/page_alloc.c` | 5190 | Core physical allocator: fast path via `get_page_from_freelist()`, slow path via `__alloc_pages_slowpath()` |
| `__alloc_pages_noprof()` | `mm/page_alloc.c` | 5255 | Public buddy allocator entry; wraps `__alloc_frozen_pages_noprof()`, marks page refcounted |
| `get_page_from_freelist()` | `mm/page_alloc.c` | 3792 | Scans zonelist for a zone with free pages above watermark |
| `rmqueue_buddy()` | `mm/page_alloc.c` | 3203 | Dequeues a page from the buddy free list; splits higher-order blocks if needed |
| `__alloc_pages_slowpath()` | `mm/page_alloc.c` | 4687 | Slow path: retries with lower watermark, wakes kswapd, tries direct reclaim, invokes OOM killer |
| `wakeup_kswapd()` | `mm/vmscan.c` | 7519 | Wakes the per-node `kswapd` thread when zone falls below `WMARK_LOW` |
| `kswapd()` | `mm/vmscan.c` | 7438 | Per-NUMA-node kthread: sleeps until woken, calls `balance_pgdat()` |
| `balance_pgdat()` | `mm/vmscan.c` | 7108 | Drives reclaim loop for a pgdat at decreasing priority until watermarks are restored |
| `shrink_node()` | `mm/vmscan.c` | 6190 | Per-node reclaim; calls `shrink_node_memcgs()` for each memory cgroup |
| `shrink_lruvec()` | `mm/vmscan.c` | 5920 | Per-lruvec LRU scan: computes scan counts, calls `shrink_list()` for each evictable LRU |
| `shrink_inactive_list()` | `mm/vmscan.c` | 1951 | Isolates pages from inactive LRU, calls `shrink_page_list()` to reclaim them |
| `shrink_active_list()` | `mm/vmscan.c` | 2068 | Demotes active pages to inactive LRU |
| `pageout()` | `mm/vmscan.c` | 653 | Writes dirty pages back to their backing store via `mapping->a_ops->writepage()` |
| `__kmalloc_noprof()` | `mm/slub.c` | 5305 | SLUB entry for `kmalloc()`; calls `__do_kmalloc_node()` |
| `___slab_alloc()` | `mm/slub.c` | 4405 | SLUB slow path: tries `get_from_partial()`, then `new_slab()` → `alloc_pages()` |

---

### Complete Call Chain

**A. Page Fault Path (anonymous demand paging):**

1. CPU raises `#PF` (interrupt vector 14) → `exc_page_fault()` (`fault.c:1483`) — reads `CR2` for faulting address, calls `irqentry_enter()`, then `handle_page_fault()`.
2. `handle_page_fault()` (`fault.c:1462`) — checks if kernel or user address; calls `do_user_addr_fault()` for userspace faults.
3. `do_user_addr_fault()` (`fault.c:1207`) — enables IRQs (`local_irq_enable()`), calls `lock_mm_and_find_vma()` to locate the `vm_area_struct` covering the faulting address, validates permissions via `access_error()`.
4. `handle_mm_fault(vma, address, flags, regs)` (`memory.c:6683`) — activates memcg OOM tracking, dispatches to `hugetlb_fault()` for huge pages or `__handle_mm_fault()` for normal pages.
5. `__handle_mm_fault()` (`memory.c:6449`) — allocates page table pages at each level: `pgd_offset()` → `p4d_alloc()` → `pud_alloc()` → `pmd_alloc()`. Checks for THP at PUD/PMD level. Falls through to `handle_pte_fault()`.
6. `handle_pte_fault()` (`memory.c:6367`) — maps the PTE for inspection. Dispatches:
   - PTE absent → `do_pte_missing()` (`memory.c:4545`) → for anonymous `!VM_SHARED` VMA: `do_anonymous_page()`.
   - PTE present but write-protected → `do_wp_page()` (`memory.c:4228`).
   - PTE encoded as swap entry → `do_swap_page()`.
7. `do_anonymous_page()` (`memory.c:5321`):
   - Read fault: maps the shared zero page (`pte_mkspecial(pfn_pte(zero_pfn, prot))`), installs via `set_pte_at()`.
   - Write fault: `alloc_anon_folio(vmf)` → buddy allocator → zeroed page, `set_pte_at()` installs writable PTE, `update_mmu_cache()`.

**B. Copy-on-Write (write to shared/read-only page):**

1. `do_wp_page()` (`memory.c:4228`) — detects write to a read-only PTE.
2. `do_cow_fault()` (`memory.c:5905`):
   - `folio_prealloc()` — allocates a new page via buddy allocator.
   - `__do_fault()` — calls `vma->vm_ops->fault()` to populate the original page.
   - `copy_mc_user_highpage(cow_page, original_page, addr, vma)` — machine-check-aware page copy.
   - `finish_fault()` — installs the new private writable PTE.

**C. Buddy Allocator Path (kernel `kmalloc`):**

1. `kmalloc(size, GFP_KERNEL)` → `__kmalloc_noprof()` (`slub.c:5305`) → `__do_kmalloc_node()`.
2. SLUB fast path: checks per-CPU freelist of matching `kmem_cache`. If non-empty, returns object with a single pointer dereference (lock-free).
3. SLUB slow path: `___slab_alloc()` (`slub.c:4405`):
   - `get_from_partial(s, node, &pc)` — tries the per-node partial slab list.
   - `new_slab(s, gfpflags, node)` — allocates a fresh slab page from buddy: calls `alloc_pages()`.
4. `alloc_pages()` → `__alloc_pages_noprof()` (`page_alloc.c:5255`) → `__alloc_frozen_pages_noprof()` (`page_alloc.c:5190`).
5. Fast path: `get_page_from_freelist(gfp, order, ALLOC_WMARK_LOW, &ac)` (`page_alloc.c:3792`) — iterates the zone list, checks `zone_watermark_fast()`, calls `rmqueue_buddy()` (`page_alloc.c:3203`) which dequeues from `zone->free_area[order]` and splits higher-order blocks via `expand()`.
6. Slow path (`__alloc_pages_slowpath()`, `page_alloc.c:4687`):
   - Wakes kswapd: `wakeup_kswapd(zone, gfp_mask, reclaim_order, highest_zoneidx)`.
   - Retries `get_page_from_freelist()` with `ALLOC_WMARK_MIN`.
   - Direct reclaim: `try_to_free_pages()`.
   - OOM: `out_of_memory(&oc)` (`page_alloc.c:4116`) → `oom_kill_process()` as last resort.

**D. kswapd Reclaim Path:**

1. `wakeup_kswapd()` (`vmscan.c:7519`) — wakes the per-NUMA-node `kswapd` kthread.
2. `kswapd()` (`vmscan.c:7438`) — main loop: calls `kswapd_try_to_sleep()` to block until watermarks drop, then invokes `balance_pgdat()`.
3. `balance_pgdat(pgdat, order, highest_zoneidx)` (`vmscan.c:7108`) — outer reclaim loop: decrements `sc.priority` from `DEF_PRIORITY` (12) toward 0, calling `shrink_node()` each iteration until the zone's watermarks are restored.
4. `shrink_node()` (`vmscan.c:6190`) → `shrink_node_memcgs()` (`vmscan.c:6111`) — iterates memory cgroups, calls `shrink_lruvec()` for each.
5. `shrink_lruvec(lruvec, sc)` (`vmscan.c:5920`) — computes per-LRU scan counts via `get_scan_count()`, then loops calling `shrink_list(lru, nr_to_scan, lruvec, sc)` for each of the four LRU lists (inactive_anon, active_anon, inactive_file, active_file).
6. `shrink_inactive_list()` (`vmscan.c:1951`):
   - `isolate_lru_folios()` — removes up to `SWAP_CLUSTER_MAX` (32) pages from LRU into a local list.
   - `shrink_page_list()` — for each isolated page: tries to unmap (`try_to_unmap()`), reclaim, or write back.
   - `pageout()` (`vmscan.c:653`) — for dirty file pages: calls `mapping->a_ops->writepage()` to submit I/O.
7. `shrink_active_list()` (`vmscan.c:2068`) — rotates unreferenced active pages to the inactive list for future reclaim.

---

### Key Data Structures

**`struct page` / `struct folio`** (`include/linux/mm_types.h:79`)  
The fundamental unit of physical memory. A `folio` is a power-of-two-aligned compound page. Key fields: `flags` (PG_uptodate, PG_dirty, PG_locked, PG_lru, etc.), `_mapcount`, `_refcount`, `mapping`, `index` (page offset in address space).

**`struct zone`** (`include/linux/mmzone.h:967`)  
Memory zone (ZONE_DMA, ZONE_DMA32, ZONE_NORMAL). Key fields: `free_area[MAX_ORDER+1]` (buddy free lists by order), `watermark[NR_WMARK]` (min/low/high thresholds), `lruvec` (embedded LRU vectors), `nr_free_pages`.

**`struct lruvec`** (`include/linux/mmzone.h:757`)  
Per-zone (or per-memcg) LRU state. Fields: `lists[NR_LRU_LISTS]` (four doubly-linked LRU lists: inactive_anon, active_anon, inactive_file, active_file), `lru_lock`, `anon_cost`, `file_cost` (reclaim balance hints), `lrugen` (for MGLRU multi-generational LRU).

**`struct kmem_cache`** (`include/linux/slub_def.h:198`)  
SLUB slab cache descriptor. Key fields: `cpu_slab` (per-CPU `kmem_cache_cpu` with freelist pointer), `node[MAX_NUMNODES]` (per-node partial lists), `size` (object size), `flags`, `name`, `object_size`, `oo` (order+objects packed).

**`struct vm_area_struct`**  
VMA descriptor for a contiguous region of a process's address space. Key fields: `vm_start`, `vm_end`, `vm_flags` (VM_READ/WRITE/EXEC/SHARED/GROWSDOWN), `vm_ops` (file-backed: `fault`, `map_pages`), `vm_file`, `vm_pgoff`.

---

### Memory Management Flow Graph

<div class="mermaid">
flowchart TD
    subgraph PF["A — PAGE FAULT HANDLING"]
        direction TB
        PF1["CPU #PF Exception (vector 14)<br/>CR2 = faulting virtual address"]
        PF1 --> PF2["exc_page_fault()<br/>arch/x86/mm/fault.c:1483"]
        PF2 --> PF3["handle_page_fault()<br/>fault.c:1462"]
        PF3 --> PF4["do_user_addr_fault()<br/>fault.c:1207<br/>lock_mm_and_find_vma() · access_error()"]
        PF4 --> PF5["handle_mm_fault()<br/>mm/memory.c:6683"]
        PF5 --> PF6["__handle_mm_fault()<br/>memory.c:6449<br/>pgd → p4d → pud → pmd walk<br/>pmd_alloc() if missing"]
        PF6 --> PF7["handle_pte_fault()<br/>memory.c:6367"]
        PF7 --> PF8{PTE state?}
        PF8 -->|"absent"| PF8b["do_pte_missing()<br/>memory.c:4545<br/>Dispatch anon vs. file-backed"]
        PF8b -->|"anon (!VM_SHARED)"| PF9["do_anonymous_page()<br/>memory.c:5321<br/>read: zero-page PTE<br/>write: alloc_anon_folio() + set_pte_at()"]
        PF8 -->|"write on RO"| PF10["do_wp_page()<br/>memory.c:4228<br/>Detect write to read-only PTE"]
        PF10 -->|"COW needed"| PF10b["do_cow_fault()<br/>memory.c:5905<br/>folio_prealloc() · __do_fault()<br/>copy_mc_user_highpage() · finish_fault()"]
        PF8 -->|"swap entry"| PF11["do_swap_page()<br/>memory.c:4779<br/>read from swap device · install PTE"]
    end

    subgraph BA["B — BUDDY ALLOCATOR (kmalloc path)"]
        direction TB
        BA1["kmalloc(size, GFP_KERNEL)"]
        BA1 --> BA2["__kmalloc_noprof()<br/>mm/slub.c:5305"]
        BA2 --> BA3{per-CPU freelist\nhit?}
        BA3 -->|"yes (fast)"| BA4["Return object<br/>lock-free pointer deref"]
        BA3 -->|"no (slow)"| BA5["___slab_alloc()<br/>slub.c:4405"]
        BA5 --> BA6{partial slab\navailable?}
        BA6 -->|yes| BA7["get_from_partial()<br/>reuse slab page"]
        BA6 -->|no| BA8["new_slab() → alloc_pages()"]
        BA8 --> BA9["__alloc_frozen_pages_noprof()<br/>page_alloc.c:5190"]
        BA9 --> BA10["get_page_from_freelist()<br/>page_alloc.c:3792<br/>zone watermark check"]
        BA10 --> BA11{page\navailable?}
        BA11 -->|yes| BA12["rmqueue_buddy()<br/>page_alloc.c:3203<br/>Dequeue · split block"]
        BA11 -->|no| BA13["__alloc_pages_slowpath()<br/>page_alloc.c:4687<br/>wakeup_kswapd() · direct reclaim<br/>out_of_memory() as last resort"]
    end

    subgraph KS["C — KSWAPD RECLAIM"]
        direction TB
        KS1["wakeup_kswapd()<br/>mm/vmscan.c:7519<br/>Zone fell below WMARK_LOW"]
        KS1 --> KS2["kswapd() kthread<br/>vmscan.c:7438<br/>Per NUMA node"]
        KS2 --> KS3["balance_pgdat()<br/>vmscan.c:7108<br/>Priority loop DEF_PRIORITY→0"]
        KS3 --> KS4["shrink_node()<br/>vmscan.c:6190"]
        KS4 --> KS5["shrink_lruvec()<br/>vmscan.c:5920<br/>get_scan_count() · shrink_list()"]
        KS5 --> KS6["shrink_inactive_list()<br/>vmscan.c:1951<br/>isolate_lru_folios() + shrink_page_list()"]
        KS6 --> KS7{dirty page?}
        KS7 -->|yes| KS8["pageout()<br/>vmscan.c:653<br/>→ a_ops→writepage() → block layer I/O"]
        KS7 -->|clean| KS9["free_page()<br/>return to buddy free_area[]"]
        KS5 --> KS10["shrink_active_list()<br/>vmscan.c:2068<br/>Demote active → inactive LRU"]
    end

    BA13 -.->|"wakes"| KS1
    PF9 -.->|"alloc_anon_folio → alloc_pages"| BA9
    PF10b -.->|"folio_prealloc → alloc_pages"| BA9
</div>

---

## Scenario 3: Device Driver Operations

### Overview

Device drivers are the kernel's translators — they turn generic kernel requests ("read 4 KB from this device") into hardware-specific commands ("write these bytes to this register"). This section traces three flows that show how a driver is connected to the kernel in the first place, and how data moves through it.

**Flow A — Registration and probe: introducing a driver to its device.** When a driver module is loaded, it registers itself with the kernel and announces which devices it can handle (identified by vendor and device ID). The kernel then walks every device on the relevant bus — for example, every card on the PCI bus — and asks: does this driver recognize this device? When there is a match, the kernel calls the driver's `probe()` function, which maps the device's hardware registers into kernel memory, allocates DMA buffers, and registers interrupt handlers. After `probe()` returns, the driver is live and the device is ready to use. The same matching also runs in reverse: if a driver is already loaded when a new device is plugged in (e.g. USB hotplug), the kernel calls `probe()` immediately on detection.

**Flow B — Character device I/O: a direct line from userspace to the driver.** Character devices (terminals, sensors, custom hardware) expose themselves as files under `/dev/`. When a driver registers a character device, it stores a table of function pointers (`file_operations`) keyed by its major:minor device number. When a program calls `open("/dev/mydev")`, the VFS layer looks up that table by device number and swaps it into the file descriptor. Every subsequent `read()`, `write()`, or `ioctl()` on that file descriptor goes directly to the corresponding function in the driver's table — no queuing or scheduling in between.

**Flow C — Block device I/O: from a filesystem write to hardware and back.** Block devices (NVMe, SATA, virtual disks) use a different path because their I/O must be queued, merged, and reordered for efficiency. A filesystem hands the kernel a `bio` — a description of the data to read or write — via `submit_bio()`. The multi-queue block layer (blk-mq) tries to merge it with nearby pending requests, then places it in a per-CPU hardware queue and calls the driver's `queue_rq()` to send it to the device. The driver writes a command descriptor to the device's hardware ring and returns immediately — the CPU does not wait. When the device finishes, it raises a hardware interrupt. The interrupt handler (top half) runs with interrupts disabled and does the minimum: it acknowledges the interrupt and records the result. Any heavier follow-up work is deferred to a bottom half, which runs either as a tasklet (still in interrupt context, but with interrupts re-enabled) or as a threaded IRQ handler (a full kernel thread that can sleep). The bottom half calls `blk_mq_end_request()` to mark the request complete and wake up whatever process was waiting for the data.

---

### Key Functions

| Function | File | Line | Role |
|---|---|---|---|
| `device_register()` | `drivers/base/core.c` | 3785 | Public device registration: initializes device, calls `device_add()` |
| `device_add()` | `drivers/base/core.c` | 3573 | Adds device to sysfs, links to parent, calls `bus_probe_device()` |
| `bus_probe_device()` | `drivers/base/bus.c` | 605 | Calls `device_initial_probe()` to find a matching driver |
| `driver_attach()` | `drivers/base/dd.c` | 1310 | Called on driver registration: iterates all bus devices via `bus_for_each_dev()` |
| `bus_for_each_dev()` | `drivers/base/bus.c` | 369 | Iterates all devices on a bus, calling `__driver_attach()` for each |
| `__driver_probe_device()` | `drivers/base/dd.c` | 830 | Guards probe: checks device is live, not already bound; calls `really_probe()` |
| `driver_probe_device()` | `drivers/base/dd.c` | 895 | Outer probe wrapper: tracks deferred probe count |
| `really_probe()` | `drivers/base/dd.c` | 655 | Executes probe: `device_set_driver()` → `pinctrl_bind_pins()` → `driver_sysfs_add()` → `call_driver_probe()` |
| `call_driver_probe()` | `drivers/base/dd.c` | 624 | Calls `dev->bus->probe(dev)` or `drv->probe(dev)` |
| `pci_device_probe()` | `drivers/pci/pci-driver.c` | 466 | PCI bus probe: assigns IRQ, calls `__pci_device_probe()` → `drv->probe(pci_dev, id)` |
| `__pci_register_driver()` | `drivers/pci/pci-driver.c` | 1464 | Initializes `pci_driver.driver`, sets `bus = &pci_bus_type`, calls `driver_register()` |
| `register_chrdev_region()` | `fs/char_dev.c` | 197 | Reserves a range of major:minor numbers |
| `alloc_chrdev_region()` | `fs/char_dev.c` | 233 | Dynamically allocates major:minor numbers |
| `cdev_init()` | `fs/char_dev.c` | 655 | Initializes `struct cdev` with driver's `file_operations` pointer |
| `cdev_add()` | `fs/char_dev.c` | 476 | Registers `cdev` into `cdev_map` (kobject map keyed by major:minor) |
| `chrdev_open()` | `fs/char_dev.c` | 370 | VFS open dispatch for char devices: `kobj_lookup()` → `replace_fops()` → `f_op->open()` |
| `submit_bio()` | `block/blk-core.c` | 916 | Public block I/O entry: accounts I/O stats, calls `submit_bio_noacct()` |
| `blk_mq_submit_bio()` | `block/blk-mq.c` | 3141 | Multi-queue bio handler: merge attempt, request allocation, plug or direct dispatch |
| `blk_mq_run_hw_queue()` | `block/blk-mq.c` | 2352 | Runs a hardware queue: schedules `blk_mq_dispatch_rq_list()` |
| `blk_mq_dispatch_rq_list()` | `block/blk-mq.c` | 2116 | Dequeues requests, calls `q->mq_ops->queue_rq(hctx, &bd)` to submit to driver |
| `blk_mq_complete_request()` | `block/blk-mq.c` | 1353 | Called by driver on DMA completion: `mq_ops->complete(rq)` |
| `blk_mq_end_request()` | `block/blk-mq.c` | 1176 | Updates request, calls `__blk_mq_end_request()` → `bio_endio()` |
| `handle_fasteoi_irq()` | `kernel/irq/chip.c` | 737 | Generic IRQ flow handler for APIC-style edge/level interrupts |
| `handle_irq_event()` | `kernel/irq/handle.c` | 255 | Clears pending state, calls `handle_irq_event_percpu()` |
| `__handle_irq_event_percpu()` | `kernel/irq/handle.c` | 185 | Iterates `irqaction` list, calls `action->handler(irq, dev_id)` for each registered handler |
| `request_threaded_irq()` | `kernel/irq/manage.c` | 2115 | Registers an IRQ handler; creates `irq_thread` kthread for threaded bottom halves |
| `irq_thread()` | `kernel/irq/manage.c` | 1244 | Kthread executing threaded IRQ handler (`action->thread_fn`) |
| `raise_softirq()` | `kernel/softirq.c` | 790 | Marks a softirq vector pending and wakes `ksoftirqd` if not in interrupt context |
| `__do_softirq()` | `kernel/softirq.c` | 654 | Runs pending softirq vectors; calls `tasklet_action()` for `TASKLET_SOFTIRQ` |
| `tasklet_action()` | `kernel/softirq.c` | 963 | Executes tasklet callbacks scheduled by driver top halves |

---

### Complete Call Chain

**A. Driver Registration and Device Probe:**

1. Driver module `init()` calls `pci_register_driver(&my_drv)` → `__pci_register_driver()` (`pci-driver.c:1464`):
   - Sets `drv->driver.bus = &pci_bus_type`.
   - Calls `driver_register(&drv->driver)` → `bus_add_driver()` → `driver_attach()` (`dd.c:1310`).
2. `driver_attach()` → `bus_for_each_dev(drv->bus, NULL, drv, __driver_attach)` (`bus.c:369`) — iterates all devices currently on the PCI bus.
3. For each device, `__driver_attach()` (`dd.c:1235`) calls `driver_match_device()` (bus's `match` function checks `pci_match_device()` against `pci_device_id` table). On match: `driver_probe_device()` → `__driver_probe_device()` (`dd.c:830`).
4. `really_probe(dev, drv)` (`dd.c:655`):
   - `device_set_driver(dev, drv)` — sets `dev->driver`.
   - `pinctrl_bind_pins(dev)` — configures pin multiplexing.
   - `dev->bus->dma_configure(dev)` — sets up DMA masks.
   - `driver_sysfs_add(dev)` — creates `/sys/bus/.../drivers/my_drv/` symlinks.
   - `call_driver_probe(dev, drv)` (`dd.c:624`).
5. `call_driver_probe()` → for PCI: `dev->bus->probe(dev)` = `pci_device_probe()` (`pci-driver.c:466`):
   - `pci_assign_irq(pci_dev)` — assigns IRQ via ACPI/MSI.
   - `__pci_device_probe()` → `local_pci_probe()` → `drv->probe(pci_dev, id)` — **driver's probe function** executes: maps BARs, allocates DMA buffers, calls `request_irq()`/`request_threaded_irq()`.

**Device registration path (when new hardware is detected):**

1. Bus scan detects device → `device_register()` (`core.c:3785`) → `device_add()` (`core.c:3573`).
2. `device_add()`: `kobject_add()` (sysfs), `bus_add_device()` → `bus_probe_device()` (`bus.c:605`).
3. `bus_probe_device()` → `device_initial_probe()` → walks all registered drivers on the bus, calling `__driver_probe_device()` for each until one succeeds.

**B. Character Device Operations:**

1. Driver initialization:
   - `alloc_chrdev_region(&dev, 0, count, "mydev")` (`char_dev.c:233`) — kernel assigns major number.
   - `cdev_init(&cdev, &my_fops)` (`char_dev.c:655`) — stores `file_operations` pointer.
   - `cdev_add(&cdev, dev, count)` (`char_dev.c:476`) — registers into `cdev_map` (a `kobj_map` hash table keyed by `dev_t = major:minor`).
2. Userspace `open("/dev/mydev", O_RDWR)`:
   - VFS: `do_filp_open()` → `path_openat()` → `vfs_open()` → `inode->i_fop->open()`.
   - For char devices: `inode->i_fop = &def_chr_fops`; `def_chr_fops.open = chrdev_open`.
   - `chrdev_open()` (`char_dev.c:370`):
     - `kobj_lookup(cdev_map, inode->i_rdev, &idx)` — finds `cdev` by major:minor.
     - `fops = fops_get(p->ops)` — gets driver's `file_operations`.
     - `replace_fops(filp, fops)` — replaces file's `f_op` with driver's ops.
     - `filp->f_op->open(inode, filp)` — calls **driver's `open()`** callback.
3. Subsequent `read(fd, buf, n)` / `write()` / `ioctl()` → `vfs_read()` → `filp->f_op->read()` / `filp->f_op->write()` / `filp->f_op->unlocked_ioctl()` — directly invoke driver callbacks.

**C. Block Device I/O — Submission to Completion:**

1. Filesystem or direct I/O calls `submit_bio(bio)` (`blk-core.c:916`) — accounts `PGPGIN`/`PGPGOUT` stats, sets I/O priority via `bio_set_ioprio()`, calls `submit_bio_noacct(bio)`.
2. `submit_bio_noacct()` → `blk_mq_submit_bio(bio)` (`blk-mq.c:3141`):
   - Merge attempt: `blk_mq_attempt_bio_merge()` — tries to merge with an existing request.
   - If no merge: `blk_mq_get_new_requests()` — allocates a `struct request` from the hardware tag set.
   - `blk_mq_bio_to_request(rq, bio, nr_segs)` — populates request from bio.
   - `blk_crypto_rq_get_keyslot(rq)` — inline encryption key assignment.
   - If plug active: `blk_add_rq_to_plug(plug, rq)` — batches requests; dispatched later on `blk_finish_plug()`.
   - If no plug: either `blk_mq_try_issue_directly()` (sync fast path) or `blk_mq_insert_request(rq, 0)` + `blk_mq_run_hw_queue(hctx, true)` (via I/O scheduler).
3. `blk_mq_run_hw_queue(hctx, async)` (`blk-mq.c:2352`) — schedules or directly calls `blk_mq_dispatch_rq_list()`.
4. `blk_mq_dispatch_rq_list(hctx, list, get_budget)` (`blk-mq.c:2116`):
   - `blk_mq_prep_dispatch_rq()` — acquires budget from driver.
   - `q->mq_ops->queue_rq(hctx, &bd)` — **calls driver's `queue_rq()` callback**. Driver DMA-maps the buffer (`dma_map_sg()`), writes the command descriptor to the hardware ring/doorbell register.
5. **Hardware DMA completes** → NIC/storage controller raises IRQ.
6. `handle_fasteoi_irq(desc)` (`chip.c:737`) → `handle_irq_event(desc)` (`handle.c:255`) → `__handle_irq_event_percpu(desc)` (`handle.c:185`) → calls `action->handler(irq, dev_id)` — **driver top half**.
7. Driver top half (ISR): reads completion status from hardware, acknowledges IRQ, optionally calls `blk_mq_complete_request(rq)` directly.
8. `blk_mq_complete_request(rq)` (`blk-mq.c:1353`) → `blk_mq_complete_request_remote(rq)` (IPI if needed) or `q->mq_ops->complete(rq)` on the correct CPU.
9. → `blk_mq_end_request(rq, error)` (`blk-mq.c:1176`) → `blk_update_request()` → `__blk_mq_end_request()` → `blk_mq_free_request()` (releases tag), then `bio_endio(bio)` → `bio->bi_end_io(bio)` — wakes up the waiting process or signals page writeback completion.

**Interrupt top/bottom half split:**

- Top half (`request_irq` handler): runs with IRQs disabled; does minimum work (ACK hardware, save status).
- For non-trivial processing: driver schedules a **tasklet**: `tasklet_schedule(&drv->tasklet)` → `raise_softirq(TASKLET_SOFTIRQ)` (`softirq.c:790`).
- `__do_softirq()` (`softirq.c:654`) runs on return from hardirq or from `ksoftirqd` kthread → `tasklet_action()` (`softirq.c:963`) → executes registered tasklet function.
- For sleeping bottom halves: driver uses `request_threaded_irq()` (`manage.c:2115`) — kernel creates `irq_thread()` (`manage.c:1244`) kthread that runs the `thread_fn` in process context.

---

### Key Data Structures

**`struct device`** (`include/linux/device.h`)  
Universal device handle. Key fields: `bus` (bus_type pointer), `driver` (bound driver), `parent`, `kobj` (sysfs kobject), `dma_ops`, `p` (private driver core data).

**`struct device_driver`**  
Driver descriptor. Key fields: `name`, `bus`, `probe`, `remove`, `shutdown`, `pm` (power management ops), `mod_name`.

**`struct pci_driver`** / **`struct pci_dev`**  
PCI-specific wrappers around `device_driver` / `device`. `pci_driver.id_table` (`pci_device_id[]`) contains the device/vendor IDs used for matching. `pci_dev` holds `vendor`, `device`, `subsystem_vendor`, `irq`, `resource[]` (BAR mappings).

**`struct cdev`** (`include/linux/cdev.h`)  
Character device descriptor. Fields: `kobj`, `owner`, `ops` (pointer to `file_operations`), `list`, `dev` (major:minor), `count` (number of minor numbers owned).

**`struct bio`** (`include/linux/bio.h`)  
Block I/O unit. Fields: `bi_bdev`, `bi_opf` (REQ_OP_READ/WRITE + flags), `bi_iter` (sector/size cursor), `bi_io_vec[]` / `bi_vcnt` (scatter-gather list of `bio_vec`), `bi_end_io` (completion callback), `bi_private`.

**`struct request`** (`include/linux/blkdev.h`)  
Block layer request (one or more merged bios). Fields: `q` (queue), `mq_hctx` (hardware context), `bio`/`biotail`, `__sector`, `__data_len`, `tag`, `state` (MQ_RQ_IDLE/IN_FLIGHT/COMPLETE), `rq_flags`.

**`struct irq_desc`** / **`struct irqaction`** (`include/linux/irqdesc.h`)  
IRQ descriptor and handler chain. `irqaction` fields: `handler` (top-half function pointer), `thread_fn` (bottom-half for threaded IRQ), `dev_id`, `irq`, `flags` (IRQF_SHARED, IRQF_TRIGGER_*), `next` (shared IRQ chain).

---

### Device Driver Operations Flow Graph

<div class="mermaid">
flowchart TD
    subgraph REG["A — DRIVER/DEVICE REGISTRATION & PROBE"]
        direction TB
        DR1["pci_register_driver(&my_drv)<br/>→ __pci_register_driver()<br/>pci-driver.c:1464"]
        DR1 --> DR2["driver_register() → bus_add_driver()<br/>→ driver_attach()<br/>dd.c:1310"]
        DR2 --> DR3["bus_for_each_dev()<br/>bus.c:369<br/>Iterate all PCI devices"]
        DR3 --> DR4["bus match function<br/>pci_match_device() vs id_table"]
        DR4 -->|match| DR5["__driver_probe_device()<br/>dd.c:830"]
        DR5 --> DR6["really_probe()<br/>dd.c:655<br/>device_set_driver() · pinctrl_bind_pins()<br/>driver_sysfs_add()"]
        DR6 --> DR7["call_driver_probe()<br/>dd.c:624"]
        DR7 --> DR8["pci_device_probe()<br/>pci-driver.c:466<br/>pci_assign_irq() · IRQ vectors"]
        DR8 --> DR9["drv→probe(pci_dev, id)<br/>Driver maps BARs · alloc DMA bufs<br/>request_threaded_irq()"]
    end

    subgraph CHR["B — CHARACTER DEVICE I/O"]
        direction TB
        CH1["Driver init:<br/>alloc_chrdev_region() char_dev.c:233<br/>cdev_init() char_dev.c:655<br/>cdev_add() char_dev.c:476 → cdev_map"]
        CH1 --> CH2["User: open('/dev/mydev')"]
        CH2 --> CH3["VFS: vfs_open() → def_chr_fops.open<br/>= chrdev_open()<br/>char_dev.c:370"]
        CH3 --> CH4["kobj_lookup(cdev_map, major:minor)<br/>→ find struct cdev"]
        CH4 --> CH5["replace_fops(filp, cdev→ops)<br/>filp→f_op = driver's file_operations"]
        CH5 --> CH6["f_op→open(inode, filp)<br/>Driver open() callback"]
        CH6 --> CH7["read()/write()/ioctl()<br/>→ f_op→read / write / unlocked_ioctl<br/>Direct driver dispatch"]
    end

    subgraph BLK["C — BLOCK DEVICE I/O (submit to completion)"]
        direction TB
        BL1["submit_bio(bio)<br/>block/blk-core.c:916<br/>I/O accounting · bio_set_ioprio()"]
        BL1 --> BL2["blk_mq_submit_bio(bio)<br/>blk-mq.c:3141<br/>Merge? → blk_mq_attempt_bio_merge()"]
        BL2 --> BL3["blk_mq_get_new_requests()<br/>Allocate struct request from tag set<br/>blk_mq_bio_to_request()"]
        BL3 --> BL4{plug active?}
        BL4 -->|yes| BL5["blk_add_rq_to_plug(plug, rq)<br/>Batch — dispatched on blk_finish_plug()"]
        BL5 -.->|"blk_finish_plug()"| BL6
        BL4 -->|no| BL6["blk_mq_run_hw_queue()<br/>blk-mq.c:2352"]
        BL6 --> BL7["blk_mq_dispatch_rq_list()<br/>blk-mq.c:2116"]
        BL7 --> BL8["q→mq_ops→queue_rq(hctx, &bd)<br/>Driver: DMA-map · write HW descriptor ring"]
        BL8 --> BL9["⚡ Hardware DMA completes → IRQ"]
        BL9 --> BL10["handle_fasteoi_irq()<br/>kernel/irq/chip.c:737"]
        BL10 --> BL10b["handle_irq_event()<br/>kernel/irq/handle.c:255"]
        BL10b --> BL11["__handle_irq_event_percpu()<br/>handle.c:185<br/>action→handler(irq, dev_id)<br/>Driver ISR top half: ACK hardware"]
        BL11 --> BL12{threaded IRQ?}
        BL12 -->|yes| BL13["irq_thread() kthread<br/>manage.c:1244<br/>thread_fn() in process context"]
        BL12 -->|no, tasklet| BL14["raise_softirq(TASKLET_SOFTIRQ)<br/>softirq.c:790<br/>→ __do_softirq() → tasklet_action()<br/>softirq.c:963"]
        BL13 --> BL15["blk_mq_complete_request(rq)<br/>blk-mq.c:1353"]
        BL14 --> BL15
        BL15 --> BL16["blk_mq_end_request()<br/>blk-mq.c:1176<br/>blk_update_request() · free tag"]
        BL16 --> BL17["bio_endio(bio)<br/>bi_end_io() callback<br/>Wake waiting process / signal writeback"]
    end
</div>

