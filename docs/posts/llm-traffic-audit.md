---
title: LLM 流量安全审计：SSE chunk 零拷贝 + JWT 弱签名检测
date: 2026-06-10
tags:
  - C++
  - 项目经历
  - 网络编程
description: ai_aas 实习模块 — std::string_view 零拷贝处理 LLM 流式响应，yyjson 解析合并推理/非推理 token，OpenSSL HMAC 实现 JWT 弱签名检测
category: C++ 实战
---

# LLM 流量安全审计：SSE chunk 零拷贝 + JWT 弱签名检测

> 这是我在 ai_aas 实习期间负责的 LLM 大模型 API 流量审计模块。本文把 SSE 流式响应处理、string_view 使用陷阱、JWT 弱签名检测的完整实现讲透。

## 一、业务背景

### 1.1 为什么需要审计 LLM 流量

随着 ChatGPT、Claude、通义千问等大模型在企业内的普及，**LLM API 调用审计**成为数据安全的新痛点：

| 风险 | 业务场景 |
| --- | --- |
| **数据泄露** | 员工把内部代码 / 文档贴到 ChatGPT → 泄密风险 |
| **合规要求** | 金融 / 医疗行业必须审计所有外部 API 调用 |
| **成本控制** | 统计每部门 LLM token 消耗，做成本归因 |
| **模型治理** | 识别"员工私自接第三方 LLM 服务"绕过公司白名单 |

### 1.2 审计需求

| 需求 | 实现要点 |
| --- | --- |
| 内容采集 | 抓取 prompt + 响应正文（可能跨多个 chunk） |
| Token 统计 | 区分推理 token / 非推理 token，按部门归因 |
| 异常告警 | prompt 中包含敏感词、内部代码片段 → 告警 |
| JWT 验证 | 检测 LLM API 是否使用弱签名的 JWT（伪造风险） |
| 流式处理 | SSE chunk 响应不能等所有 chunk 到齐再处理 |

## 二、SSE chunk 流式响应处理

### 2.1 SSE 协议简介

**Server-Sent Events（SSE）** 是 HTTP 长连接流式响应协议，格式：

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n
data: {"choices":[{"delta":{"content":", "}}]}\n\n
data: {"choices":[{"delta":{"content":"world!"}}]}\n\n
data: [DONE]\n\n
```

每个 chunk 以 `data: ` 开头，以 `\n\n` 结尾。OpenAI、Anthropic、Ollama 等主流 LLM API 都用 SSE。

### 2.2 处理挑战

| 挑战 | 说明 |
| --- | --- |
| **chunk 数量多** | 单次会话可能数千 chunk |
| **每个 chunk 小** | 单 chunk 通常几十字节（一个 token） |
| **不能等齐** | 等所有 chunk 到齐再处理 = 严重延迟 |
| **跨包缓冲** | 单个 chunk 可能被 TCP 拆成多个包，需要 buffer |

### 2.3 string_view 零拷贝方案

```cpp
class SSEChunkProcessor {
public:
    // 输入：原始报文缓冲区（不拷贝）
    void feed(const char* data, size_t len) {
        // buffer_ 是 std::string_view 的视图，指向原始报文内存
        buffer_ = std::string_view(data, len);
        parse();
    }
    
    // 输出：合并后的完整 prompt + 响应
    std::string get_merged_content() const {
        return merged_content_;
    }
    
    // 输出：token 统计
    TokenUsage get_token_usage() const {
        return token_usage_;
    }
    
private:
    void parse() {
        size_t pos = 0;
        while (pos < buffer_.size()) {
            // 找下一个 \n\n
            size_t chunk_end = buffer_.find("\n\n", pos);
            if (chunk_end == std::string_view::npos) break;
            
            // 提取单个 chunk 的 string_view（零拷贝）
            std::string_view chunk_line = buffer_.substr(pos, chunk_end - pos);
            pos = chunk_end + 2;
            
            // 跳过空行
            if (chunk_line.empty()) continue;
            
            // 必须以 "data: " 开头
            if (chunk_line.starts_with("data: ")) {
                std::string_view json_view = chunk_line.substr(6);
                
                // [DONE] 标记
                if (json_view == "[DONE]") {
                    end_of_stream_ = true;
                    break;
                }
                
                // 解析 JSON（yyjson 不拷贝，直接读 string_view 内存）
                parse_chunk_json(json_view);
            }
        }
    }
    
    void parse_chunk_json(std::string_view json_view) {
        yyjson_doc* doc = yyjson_read(json_view.data(), json_view.size(), 0);
        if (!doc) return;
        
        yyjson_val* root = yyjson_doc_get_root(doc);
        yyjson_val* choices = yyjson_obj_get(root, "choices");
        yyjson_val* first_choice = yyjson_arr_get_first(choices);
        yyjson_val* delta = yyjson_obj_get(first_choice, "delta");
        yyjson_val* content = yyjson_obj_get(delta, "content");
        
        if (content && yyjson_is_str(content)) {
            size_t str_len;
            const char* str = yyjson_get_str(content, &str_len);
            merged_content_.append(str, str_len);
        }
        
        // usage 字段（最后一个 chunk 才有）
        yyjson_val* usage = yyjson_obj_get(root, "usage");
        if (usage) {
            token_usage_.prompt_tokens = yyjson_get_int(yyjson_obj_get(usage, "prompt_tokens"));
            token_usage_.completion_tokens = yyjson_get_int(yyjson_obj_get(usage, "completion_tokens"));
            // 推理模型额外字段
            yyjson_val* reasoning = yyjson_obj_get(usage, "reasoning_tokens");
            if (reasoning) {
                token_usage_.reasoning_tokens = yyjson_get_int(reasoning);
            }
        }
        
        yyjson_doc_free(doc);
    }
    
private:
    std::string_view buffer_;       // 指向原始报文，零拷贝
    std::string merged_content_;    // 累积合并的内容
    TokenUsage token_usage_{};
    bool end_of_stream_ = false;
};
```

### 2.4 关键点：string_view 的生命周期陷阱

**string_view 不拥有数据**！源 string 析构后 view 悬空（dangling view）。

**错误用法**：

```cpp
// ❌ 错误：临时 string 立即析构
std::string_view sv = std::string("temp data");
// sv 现在指向已释放的内存！

// ❌ 错误：跨函数传递后源被覆盖
void process(std::string_view sv) {
    // 调用方如果修改了源 string，sv 看到的是新内容或部分新内容
}

// ❌ 错误：跨线程传递
void thread_a() {
    std::string data = load_data();
    queue.push(std::string_view(data));  // ❌ data 在 thread_a 结束时析构
}
```

**eng_aud 中的安全用法**：

- string_view 仅在**原始报文在 Kafka 缓冲区生命周期内**使用
- 处理完立即丢弃，**不跨线程传递**
- 需要长期保存的内容用 `std::string`（拷贝）

## 三、yyjson 性能对比

### 3.1 主流 C/C++ JSON 库

| 库 | 实现语言 | 解析速度（GB/s） | 备注 |
| --- | --- | --- | --- |
| **simdjson** | C++ | ~3.0 | 最快，但只支持 DOM 一次性解析，不适合流式 |
| **yyjson** | C | ~1.5-2.0 | 纯 C，SIMD 加速，适合流式 |
| **rapidjson** | C++ | ~1.0-1.5 | 模板元编程，编译时间长 |
| **jsoncpp** | C++ | ~0.3-0.5 | 抽象层次高，性能较差 |
| **nlohmann/json** | C++ | ~0.1-0.2 | 极慢，但 API 最易用 |

### 3.2 为什么 eng_aud 选 yyjson

| 维度 | yyjson | simdjson |
| --- | --- | --- |
| 解析速度 | 1.5-2.0 GB/s | 3.0 GB/s |
| **流式支持** | ✅ 支持 | ❌ 仅一次性 |
| 内存占用 | 紧凑 | 较大（需要预分配） |
| API | 类似 rapidjson | DOM 树遍历 |
| 编译速度 | 快（纯 C） | 慢（C++ 模板） |

eng_aud 需要**按 chunk 流式解析**，simdjson 不适合，选 yyjson。

### 3.3 yyjson SIMD 加速

yyjson 按字节流式解析，使用 **SSE4.2 / AVX2** 加速字符串扫描：

```c
// yyjson 内部代码（简化）
__m256i quote_mask = _mm256_set1_epi8('"');
__m256i chunk = _mm256_loadu_si256((__m256i*)str);
__m256i cmp = _mm256_cmpeq_epi8(chunk, quote_mask);
uint32_t mask = _mm256_movemask_epi8(cmp);
// mask 中每个 bit 标记对应字节是否是 '"'
// 一次扫描 32 字节
```

相比逐字节扫描，SIMD 提速 8-16 倍。

## 四、JWT 弱签名检测

### 4.1 JWT 结构

```plain
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← header (Base64URL)
.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ  ← payload (Base64URL)
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← signature
```

- **header**：算法类型（HS256 / RS256 / ES256 / none）
- **payload**：业务数据（用户 ID / 过期时间等）
- **signature**：签名，防止 payload 被篡改

### 4.2 JWT 弱签名风险

| 风险 | 描述 | 防御 |
| --- | --- | --- |
| **alg: none 攻击** | header 声明无签名，部分库直接放行 | 服务端必须拒绝 `alg: none` |
| **弱密钥** | HMAC 用 `secret` / `123456` / 公司名等弱口令 | 弱口令字典匹配 |
| **算法降级** | 服务端配 RS256，攻击者改 HS256 用公钥当 HMAC 密钥 | 严格按 header.alg 校验 |
| **kid 注入** | kid 字段可注入 SQL / 路径遍历 | 严格过滤 kid |

### 4.3 Base64URL 解码

JWT 用 **Base64URL**（不是标准 Base64）：

```plain
Base64    : A-Z a-z 0-9 + /  (= 填充)
Base64URL : A-Z a-z 0-9 - _  (无填充)
```

转换：`+ → -`，`/ → _`，去掉 `=`。

```cpp
std::vector<uint8_t> base64url_decode(std::string_view input) {
    // 还原成标准 Base64
    std::string b64;
    b64.reserve(input.size() + 4);
    for (char c : input) {
        if (c == '-') b64.push_back('+');
        else if (c == '_') b64.push_back('/');
        else b64.push_back(c);
    }
    
    // 补齐 padding
    while (b64.size() % 4 != 0) {
        b64.push_back('=');
    }
    
    // 用 OpenSSL BIO 解码
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* mem = BIO_new_mem_buf(b64.data(), b64.size());
    b64 = BIO_push(b64, mem);
    
    std::vector<uint8_t> output(b64.size() * 3 / 4);
    int len = BIO_read(b64, output.data(), output.size());
    output.resize(len);
    
    BIO_free_all(b64);
    return output;
}
```

### 4.4 弱签名检测实现

```cpp
class JwtWeakSignDetector {
public:
    JwtWeakSignDetector() {
        load_weak_password_dict("/etc/eng_aud/weak_passwords.txt");
    }
    
    // 检测 JWT 是否使用弱签名
    bool is_weak(const std::string& jwt_token) {
        // 1. 分割三段
        auto parts = split(jwt_token, '.');
        if (parts.size() != 3) return false;
        
        auto header_json = base64url_decode(parts[0]);
        auto payload_json = base64url_decode(parts[1]);
        auto signature = base64url_decode(parts[2]);
        
        // 2. 解析 header
        yyjson_doc* doc = yyjson_read((const char*)header_json.data(), 
                                       header_json.size(), 0);
        yyjson_val* alg = yyjson_obj_get(yyjson_doc_get_root(doc), "alg");
        std::string alg_str = yyjson_get_str(alg);
        yyjson_doc_free(doc);
        
        // 3. alg: none 攻击
        if (alg_str == "none" || alg_str == "None" || alg_str == "NONE") {
            return true;  // 弱签名：无签名
        }
        
        // 4. 仅对 HMAC 算法做弱密钥检测
        if (alg_str == "HS256" || alg_str == "HS384" || alg_str == "HS512") {
            std::string signed_input = parts[0] + "." + parts[1];
            
            // 用字典中的每个弱口令尝试签名
            for (const auto& weak_pwd : weak_passwords_) {
                std::vector<uint8_t> computed = hmac_sha256(weak_pwd, signed_input);
                if (computed == signature) {
                    return true;  // 弱签名：命中弱口令字典
                }
            }
        }
        
        return false;
    }
    
private:
    void load_weak_password_dict(const std::string& path) {
        std::ifstream file(path);
        std::string line;
        while (std::getline(file, line)) {
            if (!line.empty()) weak_passwords_.push_back(line);
        }
        std::cout << "Loaded " << weak_passwords_.size() << " weak passwords\n";
    }
    
    std::vector<uint8_t> hmac_sha256(const std::string& key, 
                                      const std::string& data) {
        std::vector<uint8_t> output(32);
        unsigned int len = 32;
        
        HMAC(
            EVP_sha256(),
            key.data(), key.size(),
            (const unsigned char*)data.data(), data.size(),
            output.data(), &len
        );
        
        return output;
    }
    
    std::vector<std::string> weak_passwords_;  // top 10000 弱口令
};
```

### 4.5 弱口令字典来源

- rockyou.txt（公开泄露的密码库，1400 万条）
- 常见默认密钥：`secret` / `key` / `123456` / `password`
- 公司名相关：`openai` / `anthropic` / `chatgpt`
- 框架默认密钥：`your-256-bit-secret`（jwt.io 默认值）

实际工程中用 **top 10000** 就够覆盖 90% 的弱口令。

## 五、推理 vs 非推理 Token 统计

### 5.1 推理模型简介

| 模型类型 | 示例 | 特点 |
| --- | --- | --- |
| **非推理模型** | GPT-4 / Claude 3.5 Sonnet / Qwen-Max | 直接给答案 |
| **推理模型** | OpenAI o1 / o3 / Claude with extended thinking | 先做内部"思考"再给答案 |

推理模型会消耗额外的 `reasoning_tokens`，**计费更贵**。

### 5.2 usage 字段差异

非推理模型：

```json
{
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

推理模型（o1 系列）：

```json
{
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 350,
    "reasoning_tokens": 200
  }
}
```

### 5.3 统一解析逻辑

```cpp
struct TokenUsage {
    int prompt_tokens = 0;       // 输入 token
    int completion_tokens = 0;   // 输出 token（非推理）
    int reasoning_tokens = 0;    // 推理 token（仅推理模型）
    
    int total_tokens() const {
        return prompt_tokens + completion_tokens + reasoning_tokens;
    }
    
    bool is_reasoning_model() const {
        return reasoning_tokens > 0;
    }
};
```

## 六、整体流程

```plain
┌──────────────────────────────────────────────────────────────────┐
│                    报文进入（HTTP API 调用）                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────┐
            │  EventParseAction 识别为 LLM 流量  │
            │  (User-Agent / Host 匹配)          │
            └────────────────┬───────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────┐
            │  LargeLanguageModelAuditAction     │
            └────────────────┬───────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌──────────┐  ┌──────────┐  ┌─────────────┐
        │  请求方向 │  │  响应方向 │  │  鉴权方向   │
        │ (prompt) │  │ (SSE)    │  │  (JWT 校验) │
        └─────┬────┘  └─────┬────┘  └──────┬──────┘
              │            │              │
              ▼            ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌─────────────┐
        │ 提取     │  │ SSE chunk│  │ JWT 弱签名  │
        │ prompt   │  │ 零拷贝   │  │ 检测        │
        │ 内容     │  │ 解析     │  │             │
        └─────┬────┘  └─────┬────┘  └──────┬──────┘
              │            │              │
              └────────────┼──────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │  合并 + 统计 token                  │
            │  + 敏感词告警                       │
            │  + 部门归因                         │
            └────────────────┬───────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────┐
            │  Kafka 投递（审计日志）             │
            └────────────────────────────────────┘
```

## 七、雷区警示

| 雷区 | 后果 | 补救 |
| --- | --- | --- |
| 把 string_view 跨线程传递 | 立即出现悬空引用 bug | 严守"view 仅在源数据生命周期内使用" |
| 答不出 JWT 弱签名三类攻击 | 被怀疑没真做过安全 | 准备 alg:none / 弱密钥 / 算法降级三类 |
| 说 yyjson 是"fastest JSON 库" | 被反问 simdjson | 主动说 simdjson 更快但只支持 DOM 一次性解析 |
| 把 SSE 当成 WebSocket | 概念混淆 | 强调 SSE 是单向（服务器→客户端）的 HTTP 长连接 |
| 忽略 [DONE] 标记 | 永远等不到流结束 | 显式处理 `data: [DONE]\n\n` |

## 八、面试追问链

### L1：SSE chunk 是什么？为什么需要专门处理？

> Server-Sent Events，HTTP 长连接流式响应，每条 chunk 以 `data: {...}\n\n` 结尾。大模型 API 每个 token 推理完就推一条 chunk，单次会话可能数千 chunk。业务需求：合并所有 chunk 提取完整 prompt + 响应内容，统计 token 消耗。

### L2：std::string_view 零拷贝的边界与陷阱？

> 优点：构造只是 ptr+len，不分配内存。
>
> **生命周期陷阱**：string_view 不拥有数据，源 string 析构后 view 悬空（dangling view）。
>
> 项目里安全用法：string_view 仅在"源数据在 Kafka 缓冲区生命周期内"使用，处理完立即丢弃，不跨线程传递。

### L3：yyjson 比 jsoncpp / rapidjson 快在哪？

> yyjson：纯 C 实现，按字节流式解析，使用 SIMD（SSE4.2 / AVX2）加速字符串扫描。
>
> rapidjson：C++ 模板元编程，编译时间长，运行时也快但比 yyjson 慢 1.5-2 倍。
>
> jsoncpp：抽象层次高、易用，但性能是 yyjson 的 1/5-1/10。
>
> nlohmann/json：极慢（约 yyjson 的 1/20），且头文件巨大，不适合热路径。

### L4：JWT 弱签名检测的原理？

> JWT 三段 Base64URL 编码：header.payload.signature。
>
> 弱签名三类攻击：
> 1. **alg: none**：header 声明无签名，部分库直接放行 → 必须拒绝
> 2. **弱密钥**：HMAC 用 `secret` / `123456` → 可暴力破解后伪造
> 3. **算法降级**：服务端配 RS256，攻击者改 HS256 用公钥当 HMAC 密钥
>
> eng_aud 实现：用弱口令字典（top 10000）+ HMAC-SHA256 比对，命中即告警。

### L5：Base64URL 和 Base64 的区别？

> Base64：`A-Z a-z 0-9 + /`，`=` padding。`+` 和 `/` 在 URL 中需要转义。
>
> Base64URL：`A-Z a-z 0-9 - _`，无 padding（JWT 规范省略 `=`）。
>
> 转换：`+ → -`，`/ → _`。

### L6：审计 LLM 流量解决什么业务问题？

> - **数据泄露**：员工把内部代码 / 文档贴到 ChatGPT → 泄密风险
> - **合规要求**：金融 / 医疗行业必须审计所有外部 API 调用
> - **成本控制**：统计每部门 LLM token 消耗，做成本归因
> - **模型治理**：识别"员工私自接第三方 LLM 服务"绕过公司白名单

## 九、延伸阅读

- [ai_aas 项目介绍](/posts/aas-1)
- [CRTP 实战：eng_aud 插件式报文处理框架](/posts/crtp-pluggable-framework)
- [无锁队列实战：CAS + 内存序 + 缓存行对齐](/posts/lockfree-queue-benchmark)

---

> LLM 流量审计的核心难点是**流式响应**：不能等齐再处理，又不能丢数据。string_view + yyjson 的组合让零拷贝解析成为可能。
