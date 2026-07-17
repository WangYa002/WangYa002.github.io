---
title: ai_aas 项目介绍：企业级网络安全流量审计引擎
date: 2026-04-15
tags:
  - 项目经历
  - C++
  - 网络编程
  - Linux
description: 杭州安恒信息数据安全产品线实习项目：基于 VPP 线速捕获 + 共享内存零拷贝 + FrameWork 节点流水线架构的企业内网安全流量审计引擎
category: 项目经历
---

# ai_aas 项目介绍：企业级网络安全流量审计引擎

> 这是我在杭州安恒信息（科创板：688023）数据安全产品线实习期间参与的核心项目。本文梳理整个引擎的架构、关键模块与我负责的部分，作为后续技术深度文章的总览入口。

## 一、项目定位

**ai_aas（Advanced Analytics System）** 是数据安全产品线的**企业内网安全流量审计引擎**，负责对企业内部所有网络流量进行：

- **API 调用审计**：识别每个 API 的调用频次、参数、响应
- **行为风险检测**：撞库、暴力破解、异常访问等
- **LLM 流量审计**：大模型 API 调用的内容审计与 token 统计
- **文件传输审计**：识别敏感文件外传
- **脆弱性识别**：高危 API、未授权访问

审计结果经 Kafka 落盘到后端统计与告警系统，覆盖多维度实体（API / URL / 账号 / 文件 / 应用 / IP）的增量统计。

## 二、量级与部署

| 维度 | 数据 |
| --- | --- |
| **单节点处理能力** | 3 万条报文/秒（PPS） |
| **集群聚合吞吐** | 数十万条/秒 |
| **平均报文大小** | 2-3 KB（典型 HTTP API 请求/响应） |
| **部署矩阵** | 6 种 Linux 发行版（openEuler / Kylin / CentOS 等）× 2 种 CPU 架构（x86_64 / aarch64） |

> ⚠️ 注意：3 万 PPS 是**单节点实测**，数十万是**多机集群聚合**，这是两个不同维度的数字，面试时不能混用。

## 三、整体架构

```plain
                  ┌──────────────────────────────────────┐
                  │            网络流量入口                │
                  └──┬───────────────────────────────┬───┘
                     │                               │
            ┌────────▼─────────┐           ┌─────────▼────────┐
            │   VPP 数据面     │           │  ThirdParty Log  │
            │ (线速报文捕获)   │           │   (Kafka 入口)   │
            └────────┬─────────┘           └─────────┬────────┘
                     │                               │
                     └─────────────┬─────────────────┘
                                   │
                       ┌───────────▼───────────┐
                       │    共享内存零拷贝     │
                       │   (SHM Ring Buffer)   │
                       └───────────┬───────────┘
                                   │
                       ┌───────────▼───────────┐
                       │   FrameWork 调度层    │
                       │  (Node 流水线分发)    │
                       └───────────┬───────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
            ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐
            │ commonHttp│   │   HTTP/2    │  │  WebSocket  │
            │ 14 节点   │   │  6 节点     │  │   7 节点    │
            └─────┬─────┘   └──────┬──────┘  └──────┬──────┘
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
                       ┌───────────▼───────────┐
                       │     Kafka 出口        │
                       │  (审计/告警日志)      │
                       └───────────────────────┘
```

## 四、关键模块解读

### 4.1 VPP 数据面 — 线速报文捕获

**VPP（Vector Packet Processor）** 是 Cisco 开源的高性能用户态网络数据面，ai_aas 利用 VPP 实现：

- **批量化报文处理**：一次处理一批（typically 256 个）报文，减少 cache miss 与分支预测失败
- **用户态零拷贝**：绕过内核协议栈，直接从网卡 DPDK 收包
- **节点图（node graph）**：每个处理步骤是一个 node，VPP 调度器按拓扑顺序批量调度

### 4.2 共享内存零拷贝

VPP 捕获报文后写入**共享内存环形缓冲区（SHM Ring Buffer）**：

- **生产者**：VPP 数据面线程
- **消费者**：eng_aud 工作线程（每 CPU 一个）
- **零拷贝**：消费者直接读 SHM 中的报文指针，不复制数据

这是 **SPSC（Single Producer Single Consumer）无锁环形缓冲区** 的典型应用场景，面试时常考。

### 4.3 FrameWork 节点流水线

FrameWork 是 ai_aas 的核心调度层，把报文处理拆分为多个 **Node**，每个 Node 内部编排多个 **Action**：

```plain
[FrameWork::ProcessData]
       │
       ▼
┌────────────────────────────────────────┐
│ ① 调度区分节点（EventParseProduceNode）│
│   - EventParseAction 判定协议类型     │
│   - 设置 handleEventRouteType         │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ ② 按协议分发到对应流水线              │
│   - commonHttp: 14 节点               │
│   - HTTP/2: 6 节点（精简路径）        │
│   - WebSocket: 7 节点                 │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ ③ 每个节点内部执行多个 Action         │
│   - 同步 Action：当前线程处理         │
│   - 异步 Action：推到独立线程池       │
│     (FragilityRisk / IdsRisk / ...)   │
└────────────────────────────────────────┘
```

**commonHttp 流水线（14 节点）的简化路径**：

| 序号 | Node 名 | 职责 |
| --- | --- | --- |
| 1 | EventParseProduceNode | 协议解析 + 路由分发 |
| 2 | IdentifyArtificialNode | 人工 API/URL 划分 |
| 3 | IdentifyApiUrlRegexNode | 批量正则匹配 |
| 4 | IdentifyUrlNode | URL 划分策略 |
| 5 | IdentifyApiNode | API 划分策略 |
| 6 | HttpParseMustPassThroughNode | IP 域名 + API URL ID |
| 7 | LabelingNode | 数据标签打标 |
| 8 | KeyElementFetchNode | 账号 + IP 地区提取 |
| 9 | ApiTypeBehaviorFragilityRegexNode | API 类型 + 行为 + 脆弱性正则 |
| 10 | ApiTypeMarkNode | API 打标 |
| 11 | AppTypeMarkNode | APP 打标 |
| 12 | FragilityRiskNode ★ 异步 | 脆弱性风险检测 |
| 13 | IdsRiskNode ★ 异步 | IDS 风险检测 |
| 14 | EventTransmissionNode | 审计/文件日志落 DB |
| 15 | BehaviorRiskNode ★ 异步 | 行为风险检测 |

**异步节点机制**：标记 `IsAsyncAlarmPolicyNode()` 的节点（如 FragilityRiskNode、IdsRiskNode、BehaviorRiskNode）不阻塞当前线程，而是通过 `PushAsyncTaskToThread` 推到独立线程池，主流水线继续推进。

### 4.4 Action 模块（49+ 个）

Action 是 Node 内部最小的业务单元。ai_aas 共有 49+ 个 Action，按功能域分类：

- **HTTP 字段匹配类**：`KeywordOrRegexOrDataTageMatchAction`、`ReqMethodMatchAction`、`HttpRespCodeMatchAction`
- **文件与内容类**：`AnalysisFileAction`、`FilterNonPrintCharAction`、`DownloadOrUploadAction`
- **审计日志类**：`SendAuditLogToDbAction`、`SendFileLogToDbAction`、`SendAlarmLogToDbAction`
- **风险检测类**：`JwtSignatureDetectionAction`、`WeakPasswdMatchAction`、`DesensitizationInconsistentAction`
- **LLM 审计类**：`LargeLanguageModelAuditAction`

### 4.5 Kafka 出口

所有审计/告警日志经序列化（yyjson）后批量投递到 Kafka：

- **批量投递**：累积 N 条或等待 timeout 后触发 flush，提升吞吐
- **错误重试**：发送失败的消息进入重试队列，按指数退避重投
- **优雅停机**：`SIGTERM` 信号触发后，drain 完所有 buffer 内消息再退出

## 五、实习期间我负责的部分

在导师指导下，我负责 **eng_aud 审计引擎**若干模块的实现与性能优化：

### 5.1 CAS 原子无锁队列（MPSC + SPSC）

- `alignas(64)` 缓存行对齐消除伪共享
- `acquire/release` 内存序替代 `seq_cst` 全屏障
- 12 线程压测吞吐 **244 万 ops/s**（较 `std::mutex` 提升 2-5 倍），80 万消息零丢失零损坏
- 详见 [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)

### 5.2 模板化分段锁并发哈希表

- 10240 桶支撑 API/URL/账号/文件/应用 6 维度实体增量统计
- `condition_variable` + `std::chrono` 错峰定时调度（整点 / 10 / 20 / 30 分）
- `atomic` + `call_once` 信号触发优雅停机，退出前数据零丢失

### 5.3 全局版本号无锁配置热更新

- `std::atomic<uint64_t>` 全局版本号 + `thread_local` 版本缓存
- O(1) 快速路径检测（一次 atomic load + 比较）
- `try_lock` DCLP 双重检查锁定，覆盖 7+ 类动态配置 Topic
- 详见 [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)

### 5.4 CRTP 插件式报文处理框架

- 基于 CRTP 实现 Node/Action 插件式框架
- `static_cast<T*>` 编译期多态分发消除虚函数虚表查表开销
- `thread_local` 隔离每线程的 Action 子对象实例
- 详见 [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)

### 5.5 LLM 大模型 API 流量审计

- `std::string_view` 零拷贝处理 SSE chunk 流式响应分片
- yyjson 解析合并推理/非推理模型 token
- 集成 JWT 弱签名检测（OpenSSL HMAC + Base64URL 解码 + 弱口令字典）
- 详见 [LLM 流量安全审计：SSE chunk + JWT 弱签名检测](/posts/llm-traffic-audit)

### 5.6 团队钉钉问答机器人 + QoderWake 数字员工

- 落地团队钉钉问答机器人，接入 QoderWake 数字员工功能
- 降低日常技术问答与知识检索的沟通成本
- 参与团队 code review 与技术方案讨论

## 六、技术栈

| 分类 | 技术 |
| --- | --- |
| **语言** | C++17 |
| **构建** | CMake |
| **数据面** | VPP（Vector Packet Processor） |
| **消息中间件** | Kafka（librdkafka 客户端） |
| **正则引擎** | Hyperscan |
| **JSON 解析** | yyjson |
| **加密** | OpenSSL（HMAC / JWT） |
| **内存池** | Boost Pool |
| **日志** | log4cplus |
| **测试** | GoogleTest |
| **部署环境** | Linux（openEuler / Kylin / CentOS 等） |

## 七、延伸阅读

- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)
- [C++17 配置热更新：atomic 版本号 + thread_local + DCLP](/posts/config-hot-reload)
- [epoll + Reactor：共享单车智能锁后端实践](/posts/epoll-reactor-bike)
- [LLM 流量安全审计：SSE chunk + JWT 弱签名检测](/posts/llm-traffic-audit)

---

> 后续文章会逐个深入我负责的模块，每篇都包含完整代码 + 压测数据 + 面试追问应答。
