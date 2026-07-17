---
layout: home

hero:
  name: "汪洋恣意"
  text: "C++ 后端开发之路"
  tagline: "重庆邮电大学软件工程硕士 · 2027 届校招候选人 · 聚焦 C++ 后端 / Linux 系统编程 / 高性能网络编程 / 网络安全流量审计"
  image: false
  actions:
    - theme: brand
      text: 阅读技术文章
      link: /posts/
    - theme: alt
      text: 关于我
      link: /about

features:
  - icon: 🚀
    title: ai_aas 流量审计引擎
    link: /posts/aas-1
    details: 杭州安恒信息数据安全产品线实习项目：VPP 线速捕获 + 共享内存零拷贝 + FrameWork 节点流水线，单节点 3 万 PPS
  - icon: ⚡
    title: CRTP 插件式报文处理框架
    link: /posts/crtp-pluggable-framework
    details: 基于 CRTP + 函数指针的编译期多态分派，消除热路径虚函数虚表开销，支撑 25+ Action × 10+ Node
  - icon: 🔥
    title: CAS 无锁队列实战
    link: /posts/lockfree-queue-benchmark
    details: MPSC + SPSC 无锁队列，alignas(64) 缓存行对齐 + acquire/release 内存序，12 线程压测 244 万 ops/s
  - icon: 🔄
    title: 配置热更新零阻塞
    link: /posts/config-hot-reload
    details: std::atomic<uint64_t> 全局版本号 + thread_local 缓存 + DCLP，Kafka 实时下发规则不阻塞报文处理
  - icon: 🌐
    title: epoll + Reactor 实战
    link: /posts/epoll-reactor-bike
    details: 共享单车智能锁后端：单 Reactor 多线程模型 + ET 模式 + 分级锁策略，1w+ 长连接 3w+ QPS
  - icon: 🛡️
    title: LLM 流量安全审计
    link: /posts/llm-traffic-audit
    details: string_view 零拷贝处理 SSE chunk 流式响应 + yyjson 解析 + JWT 弱签名检测（OpenSSL HMAC）

features2:
  - icon: 🧮
    title: LeetCode 题解
    link: /posts/leetcode-lru-cache
    details: 热题 100 中等高频题 C++ 题解：LRU 缓存、滑动窗口最大值、三数之和、零钱兑换等 20+ 道
  - icon: 📚
    title: C++ 八股文
    link: /posts/八股文-1
    details: 现代 C++ 特性、内存序、智能指针、RAII、CRTP 等面试常考知识点点拨
  - icon: 🏷️
    title: 标签分类
    link: /tags/
    details: 按标签查看文章：C++ / 网络编程 / Linux / 算法 / 项目经历
---

<HomeBlog :limit="5" />
