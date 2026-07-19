---
title: Redis 核心八股
date: 2026-07-19
tags:
  - Redis
  - 后端
  - 缓存
  - 分布式锁
  - 八股文
description: Redis 数据类型/底层结构/跳表/持久化/过期淘汰/事务/主从/哨兵/Cluster/缓存三问/分布式锁/6.0 多线程模型 — 后端面试核心
category: 后端开发
---

# Redis 核心八股

> Redis 是后端面试的"硬通货"。本文按面试官出题顺序串一遍：从数据类型与底层结构、跳表为什么不用红黑树，到持久化、过期淘汰、事务、主从哨兵集群、缓存三问、分布式锁、6.0 多线程模型，最后给出高频问答与易错点速查表。

---

## 一、整体架构与单线程模型

### 1.1 Redis 是什么

Redis（**Re**mote **Di**ctionary **S**erver）—— 基于内存的 KV 数据库，C 语言实现，单机 QPS 10w+，常用于缓存、分布式锁、消息队列、排行榜、计数器。

### 1.2 单线程模型（Redis 6.0 之前）

```text
┌─────────────────────────────────────────────────┐
│                Redis 进程（单线程）              │
│                                                  │
│   ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│   │ IO 多路  │→│ 命令解析 │→│ 命令执行   │   │
│   │ 复用     │  │ (epoll)  │  │ (单线程)   │   │
│   └──────────┘  └──────────┘  └────────────┘   │
│                                      ↓          │
│                               ┌────────────┐   │
│                               │ 内存数据库 │   │
│                               └────────────┘   │
└─────────────────────────────────────────────────┘
```

**为什么单线程还这么快？**

1. **完全基于内存**：内存读写纳秒级，磁盘是毫秒级，差 5 个数量级。
2. **IO 多路复用**：epoll 单线程处理数万并发连接，非阻塞。
3. **单线程避免锁竞争与上下文切换**：核心路径无锁，无 cache line bouncing。
4. **数据结构简单高效**：SDS、skiplist、dict 都是工程优化过的实现。

### 1.3 Redis 6.0 多线程模型

```text
                ┌──────────────────┐
                │  主线程（执行）  │
                └──────────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
  ┌──────────┐       ┌──────────┐       ┌──────────┐
  │ IO 线程1 │  ...  │ IO 线程N │       │ IO 线程M │   ← 仅负责读写 socket
  └──────────┘       └──────────┘       └──────────┘
```

**关键点**：
- 命令**执行**仍然单线程，保证线程安全、无锁。
- **网络读写**（read/parse/write）可以多线程并行。
- 适合 **网络 IO 成为瓶颈**的场景（大量短连接、大 value）。
- 默认关闭，需配置 `io-threads 4` 开启。

---

## 二、数据类型与编码

### 2.1 五大基础类型

| 类型 | 典型场景 | 底层编码（Redis 7） |
| --- | --- | --- |
| **String** | 缓存/计数器/分布式锁 | int / embstr / raw（SDS） |
| **List** | 消息队列/最新列表 | **listpack**（小） / quicklist（大） |
| **Hash** | 对象存储 | **listpack**（小） / hashtable |
| **Set** | 标签/共同好友 | intset / **listpack** / hashtable |
| **ZSet** | 排行榜/延迟队列 | **listpack**（小） / skiplist + dict |

> Redis 7.0 用 **listpack** 替换了 ziplist（解决了连锁更新问题，详见 §3.3）。

### 2.2 三大扩展类型

| 类型 | 场景 | 底层 |
| --- | --- | --- |
| **Stream** | 消息队列（5.0+） | radix tree |
| **Bitmap** | 签到/布隆过滤器 | String（位操作） |
| **HyperLogLog** | UV 去重统计（误差 0.81%） | String（12KB 固定大小） |
| **Geo** | 附近的人/店铺 | ZSet（GeoHash 编码） |

### 2.3 编码切换阈值

```bash
# Hash 示例
hash-max-listpack-entries 128     # 元素数超过 128 → 切 hashtable
hash-max-listpack-value 64        # 单个 value 超过 64B → 切 hashtable
```

**为什么要切换？**
- 小数据用 listpack（紧凑、CPU cache 友好、无指针开销）。
- 大数据用 hashtable/skiplist（O(1)/O(logN) 查找，listpack 退化为 O(N)）。

---

## 三、底层核心数据结构

### 3.1 SDS（Simple Dynamic String）

```c
struct sdshdr {
    int len;       // 已使用长度
    int alloc;     // 分配总长度
    char flags;    // 类型（sdshdr5/8/16/32/64）
    char buf[];    // 实际数据
};
```

**为什么不用 C 字符串？**

| 对比项 | C 字符串 | SDS |
| --- | --- | --- |
| 获取长度 | O(N) | **O(1)**（直接读 len） |
| 缓冲区溢出 | 容易溢出 | **自动扩容** |
| 修改性能 | 每次都要 realloc | **预分配 + 惰性释放** |
| 二进制安全 | 不支持 `\0` | **支持**（不依赖 `\0` 判长度） |

**空间预分配策略**：
- 修改后 len < 1MB → 分配 `2 × len`（加倍预留）
- 修改后 len ≥ 1MB → 多分配 1MB

### 3.2 跳表（SkipList）

```text
Level 4:  HEAD ──────────────────────────────→ 30 ──→ NIL
Level 3:  HEAD ──────→ 10 ─────────────────→ 30 ──→ NIL
Level 2:  HEAD ──→ 5 ─→ 10 ──────→ 20 ───→ 30 ──→ NIL
Level 1:  HEAD ──→ 5 ─→ 10 ─→ 12 ─→ 20 ─→ 25 → 30 ──→ NIL   ← 完整链表
```

**核心思路**：在有序链表上加多级索引，用空间换时间。

**查找过程**（找 25）：
1. 从最高层开始，沿着 `HEAD → 30` 不行（30 > 25），下一层。
2. Level 3：`HEAD → 10`，10 < 25，前进；`10 → 30`，30 > 25，下一层。
3. Level 2：`10 → 20`，20 < 25，前进；`20 → 30`，30 > 25，下一层。
4. Level 1：`20 → 25`，命中！

**复杂度**：
- 查找/插入/删除：**O(log N)** 平均，O(N) 最坏。
- 空间：O(N)（每个节点平均 1.33 个指针）。

**为什么 Redis 用跳表不用红黑树？**

| 维度 | 跳表 | 红黑树 |
| --- | --- | --- |
| 实现复杂度 | **简单**（300 行） | 复杂（旋转、染色） |
| 范围查询 | **O(logN + M)**，沿着底层链表扫 | O(logN + M·logN) |
| 并发友好度 | 局部加锁即可 | 旋转影响多个节点 |
| 内存 | 多一些（多级指针） | 紧凑 |
| 调试 | 直观，可打印 | 难以可视化 |

> 跳表的"范围查询"优势正好契合 ZSet 的 `ZRANGEBYSCORE` 场景。

### 3.3 listpack（替代 ziplist）

**ziplist 的问题 —— 连锁更新**：

ziplist 每个 entry 都存了前一个 entry 的长度。如果前一个 entry 长度 < 254B 用 1 字节存，否则 5 字节。当某个 entry 从 253B 扩到 254B 时，下一个 entry 的 prevlen 字段需要从 1B 扩到 5B，导致该 entry 自身变长，进而触发再下一个 entry 也要扩容……最坏 **O(N²)**。

**listpack 的改进**：
- 每个 entry 只存自己的长度，不再记前一个 entry 的长度。
- 彻底消除连锁更新。

**适用场景**：Hash/Set/ZSet 元素少时的紧凑存储。

### 3.4 quicklist（List 的底层）

```text
quicklist = 双向链表，每个节点是一个 listpack

Node1 ⇄ Node2 ⇄ Node3 ⇄ ...
 │       │       │
 ↓       ↓       ↓
[listpack] [listpack] [listpack]
[a,b,c]   [d,e,f]   [g,h,i]
```

**优点**：
- 兼顾链表的插入效率和 listpack 的内存紧凑。
- 中间节点过大时可单独压缩（LZF），节省内存。

### 3.5 dict（Hash 的底层）

Redis 的字典使用 **双 hashtable** 实现 **渐进式 rehash**：

```c
struct dict {
    dictht ht[2];      // 两个 hash 表
    long rehashidx;    // -1 表示没在 rehash
};
```

**rehash 触发**：
- 负载因子 ≥ 1 且没 BGSAVE/BGREWRITEAOF → 扩容。
- 负载因子 ≥ 5 → 强制扩容。
- 元素少于桶数的 10% → 缩容。

**渐进式 rehash**：
- 不会一次性 rehash 几百万 key（阻塞主线程）。
- 每次**增删改查**时迁移 `ht[0]` 中 `rehashidx` 位置的桶到 `ht[1]`。
- 期间所有读写都先查 `ht[0]`，再查 `ht[1]`；新增直接写 `ht[1]`。

---

## 四、持久化机制

### 4.1 RDB（Redis Database）

**原理**：fork 子进程，把内存数据**二进制快照**写入磁盘。

```bash
save 900 1      # 900s 内至少 1 个 key 变化 → 触发 BGSAVE
save 300 10
save 60  10000

dbfilename dump.rdb
dir /var/lib/redis
```

**优点**：
- 文件紧凑（二进制），加载快（适合做灾难恢复、主从全量同步）。
- fork 子进程不影响主线程（利用 **COW** Copy-On-Write）。

**缺点**：
- 两次 RDB 之间宕机会丢数据。
- fork 大内存实例时（如 30GB）耗时几百毫秒，可能造成主线程卡顿。

### 4.2 AOF（Append Only File）

**原理**：把每条**写命令**追加到日志文件。

```bash
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # ⭐ 推荐配置
#   always     —— 每条命令都 fsync，最安全但性能差
#   everysec   —— 每秒 fsync 一次（宕机最多丢 1s）
#   no         —— 由操作系统决定，性能最好但不可控
```

**AOF 重写（Rewrite）**：

AOF 文件会越来越大（`INCR counter` 跑 1000 次就有 1000 行）。重写时 fork 子进程，把当前内存状态逆推为最简命令集。

```text
重写前：
SET k 1
SET k 2
SET k 3
... (1000 行)
SET k 1000

重写后：
SET k 1000
```

### 4.3 混合持久化（Redis 4.0+）

```bash
aof-use-rdb-preamble yes   # 默认开启
```

**AOF 重写时**：
- 前半部分写 **RDB 格式**（快）
- 后半部分（重写期间的增量命令）写 **AOF 格式**

加载时：先加载 RDB 部分（快），再 replay AOF 部分（少量命令）。**兼顾启动速度与数据安全**。

### 4.4 三种方案对比

| 方案 | 数据安全 | 启动速度 | 文件大小 | 适用场景 |
| --- | --- | --- | --- | --- |
| RDB | 可能丢分钟级数据 | **快** | 小 | 灾备、缓存场景 |
| AOF (everysec) | 最多丢 1 秒 | 慢 | 大 | 数据库场景 |
| **混合（推荐）** | 最多丢 1 秒 | **较快** | 中 | **生产默认** |

---

## 五、过期策略与内存淘汰

### 5.1 过期策略

Redis 用 **惰性删除 + 定期删除** 组合：

**惰性删除**：
- 访问 key 时检查是否过期，过期就删。
- 优点：CPU 友好（不主动扫描）。
- 缺点：**冷数据永远占内存**，造成内存泄漏。

**定期删除**：
- 默认每秒 10 次（`hz 10`），每次随机抽 20 个设置了过期时间的 key 检查。
- 如果删除比例 > 25%，立即再抽 20 个继续。
- 优点：兜底冷数据。
- 缺点：抽样检查，不彻底。

**内存超限时的兜底**：如果上面两种没删干净，且内存达到 `maxmemory`，触发**淘汰策略**。

### 5.2 八大淘汰策略

```bash
maxmemory 4gb
maxmemory-policy allkeys-lru
```

| 策略 | 范围 | 算法 | 场景 |
| --- | --- | --- | --- |
| `noeviction` | 不淘汰 | —— | 写直接报错，**默认** |
| `allkeys-lru` | 所有 key | **近似 LRU** | **缓存最常用** |
| `allkeys-lfu` | 所有 key | **LFU**（4.0+） | 缓存，防"老赖在缓存" |
| `allkeys-random` | 所有 key | 随机 | 无热点场景 |
| `volatile-lru` | 设了过期的 key | LRU | 混合部署（缓存+DB） |
| `volatile-lfu` | 设了过期的 key | LFU | 同上 |
| `volatile-random` | 设了过期的 key | 随机 | 同上 |
| `volatile-ttl` | 设了过期的 key | TTL 短的先淘汰 | 同上 |

### 5.3 近似 LRU 算法

Redis 不维护全局链表（额外内存开销 + 锁竞争），而是给每个 key 加 24bit 时间戳，淘汰时随机抽 N 个（默认 5），删最久未用的。

```bash
maxmemory-samples 10   # 抽样数，越大越接近真实 LRU
```

**LRU vs LFU**：
- **LRU**（Least Recently Used）：最近最少使用 → 老问题：偶发访问会"刷"老数据。
- **LFU**（Least Frequently Used）：访问频率最低的先淘汰 → 更稳定，但刚加入的 key 频率低，容易被误杀（Redis 用**对数计数器 + 衰减**缓解）。

---

## 六、事务与 Lua

### 6.1 MULTI / EXEC / WATCH

```bash
# WATCH 实现乐观锁：监视 key，事务执行前若被改，整个事务 abort
WATCH counter
MULTI
INCR counter
INCR counter
EXEC
# 返回 [2, 3] 或 (nil) 表示被打断
```

**Redis 事务的本质**：
- **没有原子性**！命令在 EXEC 时**依次执行**，中间某条失败（运行时错误，如对 String 调 LPUSH）后续仍然执行。
- **没有回滚**！不支持 ROLLBACK，作者认为错误都是开发 bug。
- **有隔离性**：单线程模型天然保证。
- **持久性**：取决于持久化策略。

> Redis 事务 ≠ MySQL 事务，更像是 **批量打包命令 + 乐观锁**。

### 6.2 Lua 脚本

```lua
-- 原子递增并返回结果
local current = redis.call('GET', KEYS[1])
if not current then current = 0 end
current = tonumber(current) + tonumber(ARGV[1])
redis.call('SET', KEYS[1], current)
return current
```

```bash
EVAL "上面的脚本" 1 counter 5
```

**Lua 的优势**：
- **原子性**：脚本在 Redis 内**单线程执行**，中间不会被其他命令打断。
- **减少网络往返**：复杂操作一次完成（如分布式锁的"判断+删除"）。
- **可缓存**：`EVALSHA` 用脚本 SHA1 哈希调用，省去传输。

**重要变化（Redis 7.0+）**：脚本默认**复制副作用**而非脚本本身（避免主从不一致）。生产建议用 Functions（7.0 新特性）替代。

---

## 七、主从复制

### 7.1 全量同步流程

```text
Slave                          Master
  │                              │
  ├──PSYNC ? -1────────────────→│  首次连接
  │                              │
  │←──+FULLRESYNC <id> <offset>─┤  告知 replid 和 offset
  │                              │
  │                              ├─ fork 子进程 BGSAVE
  │                              ├─ 生成 RDB
  │←─────+发送 RDB 文件──────────┤
  │                              │
  │  加载 RDB（期间 master 命令   │
  │  缓存在 client output buffer) │
  │                              │
  │←─────+发送缓冲区命令──────────┤
  │                              │
  └──进入增量同步状态─────────────┘
```

### 7.2 增量同步（断线重连）

Slave 断线重连后：
1. 发送 `PSYNC <replid> <offset>`。
2. Master 检查 offset 是否在**复制积压缓冲区**（默认 1MB）内。
   - **在**：发送缺失部分（增量同步）。
   - **不在**：触发全量同步。

```bash
repl-backlog-size 256mb    # 缓冲区大小，大集群建议调大
```

### 7.3 复制陷阱

- **延迟**：默认异步复制，主从延迟取决于网络 + master 写入压力。
- **数据丢失**：master 宕机时未同步到 slave 的数据会丢失（异步复制本质）。
- **脑裂**：master 假死，sentinel 选举新 master，旧 master 恢复后写入会冲突。

```bash
min-replicas-to-write 1        # 至少 1 个 slave 同步成功才接受写
min-replicas-max-lag 10        # slave 延迟超过 10s 不算"成功"
```

---

## 八、Sentinel 哨兵

### 8.1 作用

- **监控**：实时检查 master/slave 是否存活。
- **通知**：故障时通知运维或客户端。
- **自动故障转移**：master 宕机时自动选 slave 升级为新 master。
- **配置提供者**：客户端连接 Sentinel 查询 master 地址。

### 8.2 故障转移流程

```text
1. 主观下线 (SDOWN)：单个 Sentinel 发现 master 30s 内无响应
                    ↓
2. 客观下线 (ODOWN)：超过 quorum 个 Sentinel 都报告 SDOWN
                    ↓
3. 选举 Sentinel Leader（Raft 算法）
                    ↓
4. Leader 选新 master：
   - 排除故障 slave
   - 按 priority → replication offset → runid 排序
                    ↓
5. 执行切换：
   - 把新 master 设为 master
   - 其他 slave 指向新 master
   - 旧 master 恢复后变 slave
                    ↓
6. 通知客户端 + 更新配置
```

### 8.3 关键配置

```bash
sentinel monitor mymaster 192.168.1.10 6379 2    # 2 = quorum
sentinel down-after-milliseconds mymaster 30000  # 30s 无响应判定下线
sentinel parallel-syncs mymaster 1               # 切换后多少 slave 同时同步
sentinel failover-timeout mymaster 180000        # 故障转移超时
```

---

## 九、Cluster 集群

### 9.1 哈希槽（Hash Slot）

- **16384 个槽位**（不是 65536，原因见下方 Q3）。
- 每个 key 经 `CRC16(key) & 16383` 计算槽位。
- 槽位**均匀分布**到所有 master 节点（如 3 节点各分 0-5460、5461-10922、10923-16383）。

### 9.2 集群架构

```text
        ┌────────────────────────────────────────┐
        │             客户端（含 slot 路由表）     │
        └────────────┬───────────────────────────┘
                     │ CRC16 & 16383
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Node A  │  │ Node B  │  │ Node C  │   ← Master
   │0-5460   │  │5461-    │  │10923-   │
   │         │  │10922    │  │16383    │
   └────┬────┘  └────┬────┘  └────┬────┘
        ↓            ↓            ↓
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Node A' │  │ Node B' │  │ Node C' │   ← Slave
   └─────────┘  └─────────┘  └─────────┘
```

### 9.3 MOVED 与 ASK 重定向

| 类型 | 含义 | 客户端行为 |
| --- | --- | --- |
| **MOVED** | slot 已经永久迁移到新节点 | **更新本地路由表**，重试 |
| **ASK** | slot 正在迁移中（临时） | **不更新路由表**，本次重定向到目标节点 |

### 9.4 Gossip 协议

集群节点间用 Gossip 协议（PING/PONG）交换状态：
- 每秒与 5 个随机节点通信。
- 携带自己已知的集群信息（一部分）。
- 最终所有节点达成一致（最终一致性）。

### 9.5 故障检测与转移

1. 节点 A 发现节点 B 的 PING 超时 → 标记 **pfail**（主观下线）。
2. 通过 Gossip 扩散，超过半数 master 标记 B 为 pfail → 升级为 **fail**（客观下线）。
3. B 的 slave 发起选举（Raft），胜出后升级为新 master。
4. 广播 PONG 通知全集群。

---

## 十、缓存三大问题

### 10.1 缓存穿透（Penetration）

**现象**：查询**不存在的 key**，缓存和数据库都没有，每次都打到 DB。常被恶意攻击（如 `user_id = -1`）。

**解决方案**：

| 方案 | 实现 | 优缺点 |
| --- | --- | --- |
| **缓存空值** | DB 没查到也写入 `key → ""`（短 TTL，60s） | 简单；可能存大量空值占内存 |
| **布隆过滤器** | 启动时加载所有 key 到 BF，请求先过 BF | 内存省；有误判（不存在的可能误判存在），无漏判 |
| **接口层校验** | 拦截非法 ID（负数、特殊字符） | 治标 |

```text
请求 → 布隆过滤器 →  [不存在 → 直接返回（拦截）]
                    [可能存在 → 查缓存 → 查 DB]
```

### 10.2 缓存击穿（Breakdown）

**现象**：**热点 key 突然过期**，瞬间大量请求穿透到 DB。

**解决方案**：

| 方案 | 实现 |
| --- | --- |
| **互斥锁** | 缓存 miss 后，第一个线程拿锁查 DB 并回填，其他线程等待/重试 |
| **逻辑过期** | value 内部存过期时间，过期后**异步**刷新，期间返回旧值 |
| **热点 key 永不过期** | 主动更新，不依赖 TTL |

```python
# 互斥锁伪代码
def get(key):
    val = redis.get(key)
    if val: return val
    if redis.set("lock:" + key, 1, nx=True, ex=10):
        try:
            val = db.query(key)
            redis.set(key, val, ex=3600)
            return val
        finally:
            redis.del("lock:" + key)
    else:
        time.sleep(0.05)
        return get(key)   # 重试
```

### 10.3 缓存雪崩（Avalanche）

**现象**：**大量 key 同时过期**或 Redis 宕机，请求全压到 DB。

**解决方案**：

| 场景 | 方案 |
| --- | --- |
| 大量 key 同时过期 | **打散过期时间**：`expire = base + random(0, 300s)` |
| Redis 宕机 | **集群高可用**：主从 + 哨兵 / Cluster |
| DB 被打挂 | **服务降级**：返回默认值、限流、熔断 |

---

## 十一、分布式锁

### 11.1 基础版：SETNX

```bash
SET lock "client_1" NX EX 30
# NX：不存在才设置（互斥）
# EX 30：30 秒过期（防死锁）
```

**释放锁**（必须用 Lua 保证原子性）：

```lua
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end
```

### 11.2 问题：锁提前过期

业务执行超过 TTL，锁被自动释放，其他线程拿到锁；当前线程结束后误删别人的锁 → 用 **看门狗**（Redisson）解决：

```text
线程 A 拿锁（TTL 30s）
        ↓
每 10s 检查业务是否完成：
  - 未完成 → 续期到 30s
  - 已完成 → 释放（停止看门狗）
```

### 11.3 Redlock（Redis 之父提出）

**算法**（5 个独立 Redis 实例）：

1. 客户端记录开始时间 T1。
2. 用**相同 key + value** 依次向 5 个实例发 `SET NX EX`。
3. 至少 `N/2 + 1 = 3` 个成功，且耗时 < TTL → 锁成功。
4. 否则向**所有**实例发 DEL（包括失败的，防止脏锁）。

**争议**：
- **Martin Kleppmann 批评**：GC pause / 时钟漂移可能破坏互斥性。
- **Redis 作者反驳**：实践中足够可靠，且时钟同步（NTP）下问题概率极低。
- **生产建议**：**用 Redisson**（封装了 Redlock + 看门狗），对正确性要求极高（如金融）用 **Zookeeper / etcd**（基于 Raft 共识）。

### 11.4 Redisson 看门狗原理

```java
RLock lock = redisson.getLock("myLock");
lock.lock();   // 默认 TTL 30s，看门狗每 10s 续期
try { ... }
finally { lock.unlock(); }

// 显式指定 leaseTime 时看门狗不启动
lock.lock(10, TimeUnit.SECONDS);
```

底层基于 **Netty HashedWheelTimer**（时间轮）定时任务，每隔 TTL/3 检查持有线程是否存活。

---

## 十二、大 Key 与 热 Key

### 12.1 大 Key 的危害

| 类型 | 大 Key 阈值（参考） | 危害 |
| --- | --- | --- |
| String | 单个 value > 10KB | 网络阻塞、内存碎片 |
| Hash/List/Set/ZSet | 元素数 > 1w 或 总大小 > 10MB | 阻塞主线程、过期删除卡顿 |

**典型故障**：一个 100MB 的 List 执行 `DEL`，主线程阻塞 1s，所有请求超时。

### 12.2 发现大 Key

```bash
# 1. redis-cli 自带工具
redis-cli --bigkeys
redis-cli --memkeys              # 7.0+ 按内存排序

# 2. 离线分析 RDB
rdb-tools --memory dump.rdb

# 3. 在线扫描（小心！SCAN 不阻塞，HSCAN/SSCAN 仍可能慢）
redis-cli --scan --pattern '*' | xargs -L 1000 redis-cli DEBUG OBJECT
```

### 12.3 删除大 Key

```bash
# ❌ 危险：阻塞主线程
DEL huge_list

# ✅ Redis 4.0+ 后台异步删除
UNLINK huge_list

# ✅ List 分批删除（每批 100）
LRANGE huge_list 0 99
LTRIM huge_list 100 -1
# ... 循环直到 list 为空
```

### 12.4 大 Key 拆分

```text
Hash：把 10w 字段的 hash 拆成 100 个 hash，每个 1000 字段
  user:profile:{uid/1000} → Hash（字段数 1000）

List：把 1w 元素的 list 拆成多个 list
  news:list:1, news:list:2, ...
```

### 12.5 热 Key 的危害与发现

**危害**：单 key QPS > 10w，**单实例热点**（Cluster 也救不了，因为 key 只能在一个节点）。

**发现方法**：

```bash
# 1. redis-cli 抽样
redis-cli --hotkeys            # 需配合 LFU 淘汰策略

# 2. monitor 抓命令（生产慎用！影响性能）
redis-cli monitor | grep -E 'GET|SET' | awk '{print $3}' | sort | uniq -c | sort -rn
```

**解决方法**：
- **客户端缓存**（本地 cache + Redis 二级）。
- **key 拆副本**：`hotkey` → `hotkey_1, hotkey_2, ..., hotkey_N`，写时全部写，读时随机选一个。
- **读写分离**：热 key 读走 slave。

---

## 十三、性能优化

### 13.1 Pipeline 管道

```text
无 Pipeline：       客户端 ──cmd1→ Redis → 客户端 ──cmd2→ Redis → ...
                   每次一个 RTT，1000 命令 = 1000 RTT

有 Pipeline：       客户端 ──cmd1,cmd2,...,cmd1000→ Redis
                                                  ↘──resp1,...,resp1000──→ 客户端
                   1 个 RTT 搞定 1000 命令
```

**典型提升**：1000 次 INCR 从 ~1s（1ms RTT）降到 ~5ms。

**注意**：
- Pipeline 内命令**不保证原子性**（中间可被其他客户端命令插入）。
- 单个 Pipeline 控制在 **500-1000 条**以内，太多会阻塞其他客户端。

### 13.2 避免慢命令

```bash
# 慢日志配置
slowlog-log-slower-than 10000    # 10ms（微秒）
slowlog-max-len 128

# 查看慢命令
SLOWLOG GET 10
```

**危险命令清单**（生产禁用或慎用）：

| 命令 | 风险 | 替代方案 |
| --- | --- | --- |
| `KEYS *` | O(N) 阻塞 | `SCAN` |
| `FLUSHDB` / `FLUSHALL` | 清库 | `FLUSHDB ASYNC`（4.0+） |
| `HGETALL`（大 hash） | 阻塞 | `HSCAN` |
| `SMEMBERS`（大 set） | 阻塞 | `SSCAN` |
| `SORT` | CPU + 内存 | 业务侧排序 |
| `LRANGE 0 -1`（大 list） | 阻塞 | 分页 |

### 13.3 内存优化

- **共享对象池**：`SET k 1` 中的 `1` 是共享对象（0-9999 默认共享），无需新建。
- **ziplist/listpack 编码**：小 Hash/Set/ZSet 用紧凑编码，省 50%+ 内存。
- **二进制位存储**：用户签到用 Bitmap（365 位 = 46 字节），不要用 365 个 String。

---

## 十四、面试高频 Q&A

### Q1：Redis 为什么快？

> 1. 完全基于内存，纳秒级访问。
> 2. 单线程，避免上下文切换和锁竞争。
> 3. IO 多路复用（epoll）。
> 4. 高效的数据结构（SDS O(1) 取长度、skiplist 范围查询、dict 渐进式 rehash）。

### Q2：String 的底层 SDS 为什么不像 C 字符串那样？

> SDS 多了 `len` 字段 → O(1) 取长度；二进制安全（不依赖 `\0`）；预分配 + 惰性释放减少 realloc。

### Q3：为什么 Cluster 用 16384 槽，而不是 65536？

> 1. **心跳包大小**：节点间每秒 PING，携带自己负责的 slot 位图。16384 位 = 2KB，65536 位 = 8KB，带宽浪费。
> 2. **集群规模上限**：Redis 作者建议集群不超过 1000 节点，16384 槽足够（每节点平均 16 槽）。
> 3. **位图压缩**：2KB 数据在 PING 中可被压缩，更大不容易。

### Q4：缓存与数据库一致性？

> **四种方案对比**：
>
> | 方案 | 一致性 | 复杂度 |
> | --- | --- | --- |
> | Cache Aside（旁路） | 最终一致 | 低，**推荐** |
> | Read/Write Through | 强 | 高（需中间件） |
> | Write Behind | 弱 | 高（异步刷盘） |
> | 双写 | 易不一致 | 中 |
>
> **Cache Aside 最佳实践**：
> - **读**：先查缓存，miss 查 DB 后回填。
> - **写**：**先更新 DB，再删缓存**（不是更新缓存）。
> - **延迟双删**：删缓存 → 更新 DB → sleep 500ms → 再删缓存（应对并发读旧值问题）。

### Q5：Redis 6.0 多线程是否破坏原子性？

> **不会**。多线程仅负责网络 IO（读写 socket），**命令执行仍是单线程**。所有命令仍按顺序串行执行，分布式锁、事务、Lua 脚本的原子性不受影响。

### Q6：持久化对性能影响？

> 1. RDB：fork 子进程时有卡顿（大内存实例尤其明显），主线程不阻塞。
> 2. AOF always：每条命令 fsync，**严重降速**（10× 慢）。
> 3. AOF everysec：每秒一次 fsync，**几乎无影响**（推荐）。
> 4. AOF rewrite：fork + 大量磁盘 IO，可能造成主线程卡顿。

### Q7：Redis 怎么实现延迟队列？

> **三种方案**：
> 1. **ZSet**：`score = 执行时间戳`，后台 worker 轮询 `ZRANGEBYSCORE` 取到期任务。
> 2. **Redis Stream**（5.0+）：`XADD` + 消费组，支持 ACK、回溯。
> 3. **键过期 + keyspace notification**：监听过期事件（不推荐，通知不可靠）。

### Q8：Redis 怎么实现限流？

> **三种方案**：
> 1. **计数器**（固定窗口）：`INCR` + `EXPIRE`，临界点会有突刺。
> 2. **滑动窗口**（ZSet）：score 为时间戳，`ZREMRANGEBYSCORE` 清理过期 + `ZCARD` 计数。
> 3. **令牌桶**（Lua）：桶容量 + 速率，每次请求计算补充令牌数。
>
> 生产推荐 **Redis-Cell** 模块（CL.THROTTLE 命令）或 **Sentinel/Resilience4j** 客户端限流。

---

## 十五、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| 用 `KEYS *` 在生产 | 改用 `SCAN` |
| `DEL` 大 key | 用 `UNLINK` 或分批 |
| 分布式锁只 SETNX，不校验 value | 释放时用 Lua 校验 value 再 DEL |
| 锁设置短 TTL，业务超时 | 用 Redisson 看门狗自动续期 |
| 缓存写时更新而非删除 | **先更 DB，再删缓存**（延迟双删更稳） |
| 大量 key 同一时刻过期 | 加随机偏移 `expire = base + rand(300)` |
| `MULTI` 后命令运行时出错 | Redis 不回滚，需自行 check（生产用 Lua 替代） |
| Hash 字段数过多仍用 listpack 编码 | 调大阈值或拆分 Hash |
| 哨兵 quorum 设为 1 | 至少 3 节点，quorum = `N/2 + 1` |
| Cluster 用 `MULTI` 跨 slot | 同事务必须用 **hash tag**（`{user}:1`、`{user}:2`）|
| 用 Redis 存超大 List 后 `LRANGE 0 -1` | 分页或拆 List |
| 主从切换后客户端仍连旧 master | 客户端订阅 Sentinel 事件或定时刷新 |

---

## 十六、Redis 7/8 重要演进

| 版本 | 关键特性 |
| --- | --- |
| **Redis 6.0**（2020） | 多线程 IO、ACL、RESP3、客户端缓存 |
| **Redis 7.0**（2022） | listpack 替代 ziplist、Functions、multi-part AOF、sharded Pub/Sub |
| **Redis 7.2**（2023） | Cluster 优化、命令 LATENCY 图形化、Bitop 优化 |
| **Redis 8.0**（2024） | 默认多线程、Vector Set（AI 向量检索）、JSON/TimeSeries 内置（不再是模块） |

> Redis 8 是个里程碑：内置向量检索直接对标 Qdrant/Milvus，AI 场景下无需额外中间件。

---

## 十七、相关文章

- [MySQL 与调试工具链](/posts/八股文-7-mysql-debug)
- [Linux 操作系统核心八股](/posts/八股文-5-linux-os)
- [网络编程与无锁队列](/posts/八股文-6-network-lockfree)
- [Docker 入门](/posts/docker-basics)
- [部署指南](/posts/deployment-guide)

---

> Redis 八股的核心是**数据结构 + 工程权衡**：跳表为何替代红黑树、listpack 如何解决连锁更新、混合持久化如何兼顾速度与安全、看门狗如何防止锁提前释放——每一个设计背后都有清晰的工程动机。理解这些"为什么"，远比背命令更重要。
