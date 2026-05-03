---
date: 2025-12-26 00:00:00
layout: post
title: "Contributing to llama.cpp: CANN SSM_CONV Operator on Ascend NPU"
subtitle: Implemented 1D depthwise convolution for State Space Models on Huawei's Ascend NPU via CANN
description: Implemented 1D depthwise convolution for State Space Models on Huawei's Ascend NPU via CANN
image: /assets/img/uploads/proj/ggml.png
optimized_image: /assets/img/uploads/proj/ggml.png
category: project
tags:
  - Featured
  - C++
  - LLM
  - NPU
  - open-source
author: Sujin
paginate: true
---

**GitHub:** [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp)  
**Merged PR:** [#17737](https://github.com/ggml-org/llama.cpp/pull/17737)

I worked on a project for the **AI Computing Systems** course. Over the coursework, I managed to contribute this work to **llama.cpp** — a large and highly influential open-source repository.

---

# About llama.cpp

[llama.cpp](https://github.com/ggml-org/llama.cpp) is designed to enable LLM inference with minimal setup and state-of-the-art performance on a wide range of hardware — both locally and in the cloud. It is one of the most impactful repositories in the open-source AI ecosystem, with **107k stars** and **17.5k forks** on GitHub.

---

# What I Did

I implemented the **CANN SSM_CONV** (State Space Model Convolution) operator on the **Ascend NPU**, developed by Huawei.

**CANN (Compute Architecture for Neural Networks)** is Huawei's software stack for running AI workloads on its Ascend NPUs. Extending CANN support in llama.cpp means Ascend NPU users can now run SSM-based models (such as Mamba) with hardware acceleration.

I wrote the entire operator implementation. My colleague, also a PKU master's student, handled the documentation. The code was reviewed and **merged into the main repository**.

It is a great honor to contribute to such a powerful and widely-used open-source project — and I am especially glad to extend the usability of CANN in the broader LLM inference ecosystem.

---

# Technical Details

The operator is implemented in `ggml/src/ggml-cann/aclnn_ops.cpp` as `ggml_cann_ssm_conv`.

## What SSM_CONV does

SSM_CONV applies a **1D depthwise convolution** over the convolution state buffer `conv_x`, using the learned weights `conv1d.weight`. This is the convolution step in State Space Models like Mamba — it mixes the recent context window before the SSM recurrence.

Shapes:
- `src0` (conv_x): `{d_conv - 1 + n_t, d_inner, n_seqs}` — the sliding context buffer
- `src1` (weight): `{d_conv, d_inner}` — depthwise conv kernel
- `dst`: `{d_inner, n_t, n_seqs}` — output tokens

## Key implementation challenges

**Tensor layout remapping.** ggml stores tensors in row-major order with its own striding conventions, but ACL (Ascend Computing Language) expects tensors in `NCL` format (batch × channels × length). The three tensors each required a different remapping:

- **Input** (`acl_x`): reinterpret `{ncs, nr, n_s}` as NCL `{n_s, nr, ncs}` — straightforward dimension reversal.
- **Weights** (`acl_w`): the `{d_conv, d_inner}` kernel must be presented to the depthwise conv as `{d_inner, 1, d_conv}` (out_channels, in_channels/group, kernel_size). This required constructing a view with custom strides over the original data without copying.
- **Output** (`acl_y`): `dst` is stored as `{d_inner, n_t, n_seqs}` (CLN order), but ACL needs NCL `{n_seqs, d_inner, n_t}`. Achieved by swapping the stride for L and C dimensions in the `acl_y` descriptor.

**Depthwise convolution parameters.** The convolution is depthwise (`groups = d_inner`), stride 1, no padding (valid convolution) — matching `ggml_compute_forward_ssm_conv_f32` exactly.

```cpp
void ggml_cann_ssm_conv(ggml_backend_cann_context & ctx, ggml_tensor * dst) { // with 1D depthwise convolution
    ggml_tensor * src0 = dst->src[0];  // conv_x
    ggml_tensor * src1 = dst->src[1];  // conv1d.weight

    // This op is currently defined only for F32 in ggml_cpu
    GGML_ASSERT(src0->type == GGML_TYPE_F32);
    GGML_ASSERT(src1->type == GGML_TYPE_F32);
    GGML_ASSERT(dst->type  == GGML_TYPE_F32);

    // Shapes follow ggml_compute_forward_ssm_conv_f32
    const int64_t nc  = src1->ne[0];    // d_conv
    const int64_t ncs = src0->ne[0];    // d_conv - 1 + n_t
    const int64_t nr  = src0->ne[1];    // d_inner
    const int64_t n_s = src0->ne[2];    // n_seqs

    const int64_t n_t = dst->ne[1];     // tokens per sequence

    GGML_ASSERT(dst->ne[0] == nr);          // dst: {d_inner, n_t, n_s}
    GGML_ASSERT(src1->ne[1] == nr);         // weight: {d_conv, d_inner}
    GGML_ASSERT(ncs == nc - 1 + n_t);       // conv_x: {d_conv - 1 + n_t, d_inner, n_s}
    GGML_ASSERT(src0->nb[0] == sizeof(float));
    GGML_ASSERT(src1->nb[0] == sizeof(float));

    // --- Build CANN tensors ---

    // 1) Input: conv_x as NCL
    //
    // src0->ne = { ncs, nr, n_s, 1 }  // {L_in, C, N}
    // Passing ACL_FORMAT_NCL here means:
    //   reversed dims -> [N, C, L_in] = [n_s, nr, ncs]
    aclTensor * acl_x = ggml_cann_create_tensor(
        src0,
        src0->ne,
        src0->nb,
        3,
        ACL_FORMAT_NCL
    ); // {n_seq, d_inner, d_conv -1 + n_t}

    // 2) Weights: depthwise conv kernel, view src1 as {K, 1, C}
    //
    // src1 original:   ne = { nc, nr, 1, 1 }  // [K, C, 1, 1]
    // we want a view:  ne_w = { nc, 1, nr }   // [K, 1, C]
    // so that reversed dims -> [C, 1, K] which matches
    //   [out_channels, in_channels/groups, kernel_size]
    int64_t w_ne[GGML_MAX_DIMS] = { 0 };
    size_t  w_nb[GGML_MAX_DIMS] = { 0 };

    w_ne[0] = nc;              // K
    w_ne[1] = 1;               // 1 input channel per group
    w_ne[2] = nr;              // C groups
    w_ne[3] = 1;

    // Layout: src1 data is [K, C] with
    //   offset(k, c) = k*nb0 + c*nb1
    // We want offset_w(k, 0, c) = k*nb0 + c*nb1,
    // so we can reuse nb0 and nb1, and set nb2 = nb1.
    w_nb[0] = src1->nb[0];     // sizeof(float)
    w_nb[1] = src1->nb[1];     // nc * sizeof(float)
    w_nb[2] = src1->nb[1];     // same stride for each (fake) "channel"
    w_nb[3] = src1->nb[3];

    aclTensor * acl_w = ggml_cann_create_tensor(
        src1->data,
        ggml_cann_type_mapping(src1->type),
        ggml_type_size(src1->type),
        w_ne,// {nc, 1, nr, 1}
        w_nb,
        3,
        ACL_FORMAT_NCL // {nr=C, 1, nc=K} = {d_inner, 1, d_conv}
    );

    
    // 3) Output: dst is { d_inner, n_t, n_s } (CLN)
    //
    // We need an NCL view of the same buffer:
    //   desired NCL logical shape: { L_out = n_t, C = nr, N = n_s }
    //
    // Original CLN layout:
    //   dst->ne = { nr, n_t, n_s }
    //   dst->nb[0] = sizeof(float)
    //   dst->nb[1] = nr * sizeof(float)
    //   dst->nb[2] = nr * n_t * sizeof(float)
    //
    // We want offset_new(L, C, N) = offset_orig(C, L, N).
    // Choose:
    //   nb_y[0] = nr * sizeof(float);           // step in L
    //   nb_y[1] = sizeof(float);                // step in C
    //   nb_y[2] = nr * n_t * sizeof(float);     // step in N
    int64_t y_ne[GGML_MAX_DIMS] = { 0 };
    size_t  y_nb[GGML_MAX_DIMS] = { 0 };

    y_ne[0] = n_t;        // L_out
    y_ne[1] = nr;         // C
    y_ne[2] = n_s;        // N
    y_ne[3] = 1;

    y_nb[0] = dst->ne[0] * sizeof(float);        // nr * sizeof(float)
    y_nb[1] = sizeof(float);
    y_nb[2] = dst->ne[0] * dst->ne[1] * sizeof(float); // nr * n_t * sizeof(float)
    y_nb[3] = dst->nb[3];

    aclTensor * acl_y = ggml_cann_create_tensor(
        dst->data,
        ggml_cann_type_mapping(dst->type),
        ggml_type_size(dst->type),
        y_ne,
        y_nb, // {n_t,d_inner,n_seq, 1}
        3, // {n_t,d_inner,n_seq}
        ACL_FORMAT_NCL
    ); // acl_y = {n_seq, d_inner,n_t}

    /** Now we have
    * acl_x = {n_seq, d_inner, d_conv -1 + n_t}
      acl_w = {d_inner, 1, d_conv}
      acl_y = {n_seq, d_inner,n_t}
      1D conv output size: L_out​ =L_in​ − W + 1​
    */

    // --- Conv1d parameters: depthwise, stride 1, no padding ("valid") ---
    int64_t strideVal[1]   = { 1 };
    int64_t paddingVal[1]  = { 0 };
    int64_t dilationVal[1] = { 1 };

    aclIntArray * stride   = aclCreateIntArray(strideVal, 1);
    aclIntArray * padding  = aclCreateIntArray(paddingVal, 1);
    aclIntArray * dilation = aclCreateIntArray(dilationVal, 1);

    const bool    transposed   = false;
    const int64_t groups       = nr;        // depthwise: one group per inner dim (d_inner group in total)
    int8_t        cubeMathType = 0;

#ifdef ASCEND_310P
    cubeMathType = 1;
#endif

    GGML_CANN_CALL_ACLNN_OP(
        ctx,
        Convolution,
        acl_x,          // input:  N, C, L_in = ncs
        acl_w,          // weight: [C, 1, K] with groups=nr
        nullptr,        // bias
        stride,
        padding,
        dilation,
        transposed,
        padding,        // output padding (unused for non-transposed)
        groups,
        acl_y,
        cubeMathType
    );

    // --- cleanup ---
    ACL_CHECK(aclDestroyTensor(acl_x));
    ACL_CHECK(aclDestroyTensor(acl_w));
    ACL_CHECK(aclDestroyTensor(acl_y));
    ACL_CHECK(aclDestroyIntArray(stride));
    ACL_CHECK(aclDestroyIntArray(padding));
    ACL_CHECK(aclDestroyIntArray(dilation));
}
```

---

# Result

The implementation passes all correctness checks against the reference CPU kernel and is now live in the llama.cpp main branch, enabling Mamba and other SSM-based models to run with hardware acceleration on Ascend NPUs.
