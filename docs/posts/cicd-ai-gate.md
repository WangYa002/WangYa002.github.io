---
title: CI/CD 流水线与 AI 门禁探索
date: 2026-07-19
tags:
  - CI/CD
  - GitHub Actions
  - AI
  - 代码审查
  - DevOps
  - 八股文
description: GitHub Actions 实战 + 传统门禁体系 + AI 代码审查/AI 测试/AI 安全扫描的探索与反模式
category: 工具与部署
---

# CI/CD 流水线与 AI 门禁探索

> CI/CD 是工程化的基础，AI 门禁是这两年的新变量。本文前半讲清传统 CI/CD 与门禁体系（GitHub Actions 实战），后半探索 AI 在代码审查、自动测试、安全扫描的落地，最后坦诚 AI 门禁的局限和反模式。

---

## 一、CI/CD 是什么

```text
   代码提交                部署完成
   ──────►                ──────►
   ┌──────────────────────────────────────┐
   │  CI (持续集成)                        │
   │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  │
   │  │ lint│→│ build│→│ test │→│ scan│   │
   │  └─────┘  └─────┘  └─────┘  └─────┘  │
   └──────────────────┬───────────────────┘
                      ↓ 通过
   ┌──────────────────────────────────────┐
   │  CD (持续交付 / 持续部署)             │
   │  ┌─────┐  ┌─────┐  ┌─────┐           │
   │  │ pack│→│stage│→│ prod│              │
   │  └─────┘  └─────┘  └─────┘           │
   └──────────────────────────────────────┘
```

| 概念 | 全称 | 含义 |
| --- | --- | --- |
| **CI** | Continuous Integration | 每次 push 自动 build + test |
| **CD（Delivery）** | Continuous Delivery | 自动打包到可部署状态，**手动点按钮上线** |
| **CD（Deployment）** | Continuous Deployment | **全自动上线**（合并 main 立即部署） |

**核心价值**：
- 早发现问题（10 分钟前改的代码不会明天才暴雷）
- 降低发布风险（小步快跑，每次改动小）
- 释放人力（重复劳动自动化）

---

## 二、主流 CI/CD 工具对比

| 工具 | 类型 | 特点 | 适合 |
| --- | --- | --- | --- |
| **GitHub Actions** | 云 + 仓库内嵌 | 生态最大、上手快 | **小到中型、开源项目** |
| **GitLab CI** | 自托管/云 | YAML + Docker in Docker 友好 | 中大型企业 |
| **Jenkins** | 自托管 | 老牌、插件多、UI 老 | 历史项目 |
| **CircleCI/TravisCI** | 云 | 配置简洁 | 中小项目 |
| **Drone** | 云原生 | Go 写的、轻量 | K8S 团队 |
| **ArgoCD** | GitOps | K8S 原生、声明式 | K8S 重度用户 |
| **Tekton** | K8S 原生 | Kubernetes 标准 CI/CD | 大型企业 |

**选型建议**：
- 个人/小团队：**GitHub Actions**。
- 中大型公司：GitLab + ArgoCD（K8S 部署）。
- 已有 Jenkins：逐步迁出，迁移成本是手动的几倍。

---

## 三、GitHub Actions 深度

### 3.1 核心概念

```text
   workflow（流水线）
       ↓
   ┌──────────┐
   │   job    │   ← 并行或串行（needs 依赖）
   └─────┬────┘
         ↓
   ┌──────────┐
   │  step    │   ← 顺序执行
   └─────┬────┘
         ↓
   ┌──────────┐
   │  action  │   ← 复用单元
   └──────────┘
```

### 3.2 完整 workflow 结构

本博客的实际部署 workflow（`.github/workflows/deploy.yml`）就是典型：

```yaml
name: Deploy VitePress to GitHub Pages

on:
  push:
    branches: [ master ]
  workflow_dispatch:      # 网页手动触发

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false    # 不取消正在跑的部署

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0       # 全历史（VitePress lastUpdated 需要）

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    needs: build               # 等 build 完
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**关键设计**：
- `concurrency`：防止两次部署打架（要么排队，要么 cancel）。
- `needs`：job 之间依赖。
- `environment`：保护生产，可加审批人。

### 3.3 C++ 项目实战

```yaml
name: Build & Test

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false       # 一个矩阵失败不影响其他
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        config: [Debug, Release]
        compiler: [gcc, clang]
        exclude:
          - os: windows-latest
            compiler: clang   # Windows 上跳过 clang
    steps:
      - uses: actions/checkout@v4

      - uses: hendrikmuhs/ccache-action@v1.2    # CCache 缓存

      - uses: lukka/get-cmake@latest

      - name: Configure
        run: cmake -B build -DCMAKE_BUILD_TYPE=${{ matrix.config }}

      - name: Build
        run: cmake --build build -j --config ${{ matrix.config }}

      - name: Test
        run: ctest --test-dir build --output-on-failure
```

### 3.4 Actions 市场常用

| Action | 用途 |
| --- | --- |
| `actions/checkout` | 拉代码 |
| `actions/cache` | 缓存依赖/编译产物 |
| `actions/upload-artifact` | 上传构建产物 |
| `actions/upload-pages-artifact` | GitHub Pages 专用 |
| `actions/setup-node` / `setup-python` / `setup-java` | 语言环境 |
| `hendrikmuhs/ccache-action` | CCache |
| `lukka/get-cmake` / `run-vcpkg` | C++ 构建 |
| `actions/download-artifact` | 跨 job 下载产物 |
| `softprops/action-gh-release` | 发 GitHub Release |

### 3.5 关键参数

```yaml
# 触发器
on:
  push:
    branches: [ main ]
    paths: [ 'src/**', 'tests/**' ]    # 路径过滤
    tags: [ 'v*' ]                       # tag 触发
  pull_request:
    types: [ opened, synchronize, reopened ]
  schedule:
    - cron: '0 2 * * *'                  # 定时
  workflow_dispatch:
    inputs:
      env:
        description: 'Target environment'
        type: choice
        options: [ staging, production ]
```

**并发控制**：

```yaml
concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true   # 同 PR 新 push 取消旧 run
```

**Secrets 管理**：

```yaml
- name: Deploy
  env:
    SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
  run: |
    echo "$SSH_KEY" > /tmp/id_rsa
    chmod 600 /tmp/id_rsa
    ssh -i /tmp/id_rsa user@host "deploy.sh"
```

**注意**：Secret 不应该被 `echo` 出来（容易在日志泄漏），用 `ssh-agent` 更安全。

---

## 四、传统门禁体系

CI 通过 = 一系列**门禁（gate）**全过。

```text
   PR/Push
     ↓
   ┌────────────────────────────────────────────────┐
   │  CI 流水线                                       │
   │                                                │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
   │  │ 格式化  │ │  Lint   │ │ 类型/编译│          │
   │  │clang-fmt│ │clang-tidy│ │  tsc    │          │
   │  └────┬────┘ └────┬────┘ └────┬────┘          │
   │       └───────────┴───────────┘                │
   │                   ↓                            │
   │  ┌─────────────────────────────────────┐      │
   │  │  单元测试 + 覆盖率门槛 (80%+)         │      │
   │  └────────────────┬────────────────────┘      │
   │                   ↓                            │
   │  ┌──────────────┐ ┌──────────────┐            │
   │  │ SAST 静态扫描│ │ 依赖漏洞扫描  │            │
   │  │  SonarQube   │ │  Dependabot  │            │
   │  │  CodeQL      │ │  Snyk/Trivy  │            │
   │  └──────────────┘ └──────────────┘            │
   │                   ↓                            │
   │  ┌──────────────┐ ┌──────────────┐            │
   │  │ 容器镜像扫描 │ │ License 检查 │            │
   │  │  Trivy/Grype │ │  FOSSA       │            │
   │  └──────────────┘ └──────────────┘            │
   │                   ↓                            │
   │  ┌──────────────┐                              │
   │  │ 集成测试     │                              │
   │  │ docker-comp  │                              │
   │  └──────────────┘                              │
   │                   ↓                            │
   │  ┌──────────────┐                              │
   │  │ DAST（动态）│                              │
   │  │  OWASP ZAP   │                              │
   │  └──────────────┘                              │
   └────────────────────────────────────────────────┘
                       ↓
                    允许合并
```

### 4.1 各门禁详解

| 门禁 | 工具 | 检查内容 |
| --- | --- | --- |
| **代码格式** | clang-format / prettier / black | 风格统一 |
| **Lint** | clang-tidy / cppcheck / eslint | 风格/潜在 bug |
| **类型检查** | tsc / mypy | 类型安全 |
| **编译** | 必过 | 基础正确性 |
| **单元测试** | gtest / pytest / jest | 函数级行为 |
| **覆盖率** | gcov / coverage.py | 测试质量门槛 |
| **集成测试** | docker-compose | 模块协作 |
| **SAST** | SonarQube / CodeQL / cppcheck | 静态安全漏洞 |
| **依赖扫描** | Dependabot / Snyk / Trivy | 第三方 CVE |
| **镜像扫描** | Trivy / Grype / Clair | 容器漏洞 |
| **License** | FOSSA / license-checker | 合规 |
| **DAST** | OWASP ZAP | 运行时漏洞 |
| **密钥扫描** | GitGuardian / gitleaks | 误传 token |

### 4.2 CodeQL 实战

GitHub 自家的 SAST，免费给公开仓库。

```yaml
# .github/workflows/codeql.yml
name: CodeQL

on:
  push:
    branches: [ main ]
  pull_request:
  schedule:
    - cron: '0 0 * * 1'    # 每周一扫描

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    strategy:
      matrix:
        language: [cpp, javascript, python]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-and-quality
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

结果直接进 PR 评论和 Security tab。

---

## 五、AI 门禁的兴起

### 5.1 背景：传统门禁的局限

传统门禁只能查"机械错误"，无法判断：

- **设计合理性**：违反 SOLID、过度抽象、循环依赖
- **业务正确性**：边界条件、并发问题、错误处理
- **可读性**：命名、注释必要性、模块划分
- **性能问题**：N+1 查询、不必要的拷贝、算法复杂度

**结论**：人能看出来的"代码味道"，机器规则查不出来。

### 5.2 AI 代码审查机器人

| 工具 | 厂商 | 特点 |
| --- | --- | --- |
| **GitHub Copilot Code Review** | GitHub | 集成 PR 体验 |
| **Claude Code Action** | Anthropic | 通过 Anthropic API 自部署 |
| **CodeRabbit** | 第三方 | 专注 AI PR review，免费层 |
| **Greptile** | 第三方 | 代码库语义搜索 + review |
| **Cursor BugBot** | Cursor | IDE 厂出的 review 机器人 |
| **Bito AI** | 第三方 | 印度团队，企业版 |
| **Continuous Reflect** | 开源 | 自托管 Claude/GPT |

**核心流程**：

```text
   PR 创建/更新
       ↓
   GitHub Webhook
       ↓
   AI 服务读取 PR diff + 必要 context
       ↓
   调 LLM 生成 review
       ↓
   通过 GitHub API 发评论
       ↓
   人工 review + AI 评论共同决定是否合并
```

### 5.3 Claude Code Action 实战

```yaml
# .github/workflows/claude-review.yml
name: Claude Review

on:
  pull_request:
    types: [ opened, synchronize, reopened ]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Claude Review
        uses: anthropics/claude-code-action@v0.5
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            审查这个 PR 的代码质量，重点关注：
            1. 逻辑错误（边界、空指针、并发）
            2. 性能问题（不必要的拷贝、O(N²)）
            3. 可读性（命名、结构）
            4. 与项目代码风格的一致性
            
            只发 critical/high 级别的评论，每条评论必须给出具体改进建议。
          max_tokens: 4000
```

**经验参数**：
- `max_tokens` 别太大，PR 评论应该精炼（2000-4000）。
- 用 `prompt` 控制 reviewer 角色（"你是资深 C++ 工程师"）。
- 限制只看 diff + 必要文件，别全库塞给它。

### 5.4 CodeRabbit 实战（开箱即用）

```yaml
# .github/workflows/coderabbit.yml
name: CodeRabbit

on:
  pull_request:
    types: [ opened, synchronize ]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: coderabbitai/ai-pr-reviewer@v1
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          max_files: 50
          language: zh-CN
```

或直接装 CodeRabbit GitHub App，零配置。

### 5.5 AI 审查能查什么

实测下来 AI 擅长的问题：

| 类别 | 例子 |
| --- | --- |
| **逻辑错误** | `if (a = b)` 应为 `==`、`off-by-one`、错误的条件 |
| **空指针/异常处理** | 没检查 `nullptr`、`try/catch` 漏掉异常 |
| **资源管理** | `fopen` 没 `fclose`、`malloc` 漏 `free`、RAII 机会 |
| **并发问题** | 共享变量没加锁、`std::atomic` 缺 memory order |
| **性能** | `vector` 复制、`find()` O(N) 在热路径、循环里 I/O |
| **可读性** | 命名歧义、过长函数、注释缺失/冗余 |
| **设计** | 圈复杂度高、重复代码、违反单一职责 |

**实测 AI 不擅长的**：
- 跨文件的大局观（context 限制）
- 业务逻辑正确性（不知道业务规则）
- 复杂模板元编程
- 第三方库 API 的最佳实践（除非给了文档）

### 5.6 AI 审查的局限与陷阱

**1. 大 PR 处理能力差**

200 文件 5000 行的 PR，AI 容易：
- 只看前几个文件就下结论
- 重复指出同类问题
- 错过关键文件

**解决**：
- 限制 PR 大小（团队约定 < 500 行）
- 大 PR 拆小 PR
- AI review 设置只看新代码

**2. 误报噪音**

AI 经常对**没问题**的代码发表意见（"考虑用 const"），开发者全部忽略。

**解决**：
- prompt 里明确"只发 critical/high"
- 设置 severity 阈值
- 把 AI 评论和人工评论区分开（用不同标签）

**3. 业务上下文缺失**

AI 不知道这个 PR 是为了修哪个 bug，会给出"通用建议"。

**解决**：
- PR 描述里讲清楚动机
- prompt 里粘贴相关上下文
- 链接到 issue/ticket

**4. 成本失控**

每次 PR 跑 LLM，平均消耗 0.05-0.5 美元。高频 PR 项目月成本可能 1000 美元+。

**解决**：
- 只在 `pull_request` 触发，不在每次 push
- 小 PR 用 Haiku，大 PR 用 Sonnet
- 缓存相同 commit 的 review 结果

**5. 不能替代人工 review**

AI 看不到：
- 跨模块影响
- 长期维护成本
- 团队约定（口头传下来的）
- 业务正确性

**AI 是 reviewer 的助手，不是替代品。**

---

## 六、AI 自动测试生成

| 工具 | 语言 | 能力 |
| --- | --- | --- |
| **Diffblue Cover** | Java | 自动生成 JUnit 测试 |
| **GitHub Copilot Workspace** | 多语言 | 端到端 AI 修复任务 |
| **Testim / Mabl** | 前端 E2E | AI 增强录制 |
| **Pynguin** | Python | 自动生成 pytest |
| **EvoSuite** | Java | 演化算法生成测试 |

**实战体验**：
- AI 生成的单测**容易堆覆盖率**（每行都覆盖，但断言弱）。
- AI 拿不准"边界值"，需要人工补充。
- AI 不擅长集成测试和 E2E（涉及业务流程）。

**推荐组合**：
- AI 生成的测试 → 人工筛选 → 加边界 → 进 CI。
- 不要直接合入。

---

## 七、AI 增强安全扫描

### 7.1 SAST + LLM

传统 SAST（CodeQL/SonarQube）报很多**假阳性**。把告警喂给 LLM 让它判断是 true/false positive：

```text
   SAST 输出 100 条告警
       ↓
   LLM 分类
   ├── true positive: 15 条 → 人工修
   ├── false positive: 75 条 → 自动忽略
   └── uncertain: 10 条 → 人工看
```

工具：
- **Semgrep AI**：自动 triage
- **Snyk Code**：内置 LLM 解释
- **GitHub Copilot Autofix**：CodeQL 告警 + AI 自动修复 PR

### 7.2 AI 修复 PR

```text
   Dependabot 报告：requests 2.20 有 CVE
       ↓
   Copilot Workspace
       ↓
   分析新版本 API 变化
       ↓
   自动改代码 + 跑测试
       ↓
   提交 PR
       ↓
   人工 review 合并
```

---

## 八、生产环境反模式

| 反模式 | 现象 | 解决 |
| --- | --- | --- |
| **流水线 > 30 分钟** | 开发者不愿等、跳过 CI | 并行化 + 缓存 + 增量测试 |
| **flaky tests** | 随机失败，比没测试更糟 | 隔离/quarantine，定期修 |
| **AI 评论噪音** | 100 条 AI 意见全部忽略 | 调 prompt + 限制 severity |
| **盲信 AI** | "AI 说没问题" 就合并 | AI 是助手，不是审批人 |
| **secret 泄漏** | CI 日志输出 token | 用 secret masking，加 gitleaks 预检 |
| **monorepo 全量测试** | 改一个文件跑所有测试 | 增量测试 + Bazel/Nx |
| **没缓存依赖** | 每次 CI 重装依赖 5 分钟 | actions/cache / CCache |
| **同步阻塞** | 一个 job 卡死整条流水线 | 异步通知 + 超时 |
| **生产环境没审批** | 自动部署直接打 prod | 加 environment + required reviewers |
| **不加 retry** | 网络/限流一抖 CI 挂 | 关键步骤加 retry-with-backoff |

### 8.1 缩短流水线时间的实战

```yaml
# 1. 矩阵并行
strategy:
  matrix:
    test-suite: [unit, integration, e2e]    # 三个并行

# 2. 缓存
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/pip
      build/
    key: ${{ runner.os }}-${{ hashFiles('**/lock files') }}

# 3. 失败快出（fail-fast）
- name: Critical tests first
  run: ctest -L critical

# 4. 增量构建
- uses: hendrikmuhs/ccache-action@v1.2
```

---

## 九、作者实践 / 思考

### 9.1 本博客的实际 CI

本博客的 `.github/workflows/deploy.yml` 极简：

```text
push master → npm install → vitepress build → 部署 GitHub Pages
```

没有 lint、没有测试、没有 AI review。**因为它就是个静态站点**。

但哪怕这么简单的流水线也踩过坑：
- 早期没设 `concurrency`，多次 push 触发并发部署互相覆盖。
- 没有 `fetch-depth: 0`，`lastUpdated` 时间全部错误。

**结论**：CI 复杂度要匹配项目复杂度，不是越多越好。

### 9.2 给 AI 门禁算笔账

假设一个中型团队（10 人）：

| 项 | 月成本 |
| --- | --- |
| Claude Sonnet 4.x，每 PR 平均 5K tokens，每天 10 个 PR | $0.5 × 30 × 10 × 30 ≈ $450 |
| GitHub Actions 额外跑 LLM 调用 | ~$50 |
| 人工筛选 AI 评论的时间成本（每人 30 分钟/周） | ~$2000（按 50% 节省 1 个 review） |
| **总计** | **~$2500/月** |

**收益**：
- 重复性的 lint 评论被 AI 接管 → senior 精力放到设计层。
- catch 一部分边界 bug，减少线上事故（哪怕一次也是省的）。
- AI 自动修复 Dependabot PR → 减少维护负担。

**结论**：ROI 取决于团队规模和代码质量门槛。10 人以上、代码质量要求高的团队，**值得**；3 人以下小团队，**用免费的 CodeRabbit 够了**。

### 9.3 校招面试的加分项

如果简历里写"GitHub Actions + Claude Code Action 实现 AI 自动代码审查"，面试官通常会追问：

1. **AI 评论准确率怎么保证？**（答：prompt 工程 + severity 阈值 + 人工反馈闭环）
2. **成本怎么控制？**（答：只在 PR 触发、模型分级、缓存结果）
3. **怎么避免 AI 噪音淹没人工 review？**（答：分标签、过滤 critical、定期回顾）
4. **能不能 100% 信任 AI？**（答：不能，AI 是助手不是审批者，必须配合 mandatory human review）

准备这些答案比"我用了 AI"有价值得多。

### 9.4 个人观点

AI 门禁是**趋势但不是银弹**。我的判断：

- 5 年内：AI 会接管 80% 的"机械 lint"工作（格式、明显 bug、命名）。
- 5 年内：AI 无法替代"设计层" review（架构、跨模块影响）。
- 谁先在生产中跑通 AI 门禁并迭代好 prompt，谁就在校招中更有竞争力。
- 但**别迷信**：见过太多团队装了 AI reviewer 后开发者全部忽略，AI 评论变成"背景噪音"。

**正确的姿势**：AI + 人工 review + 强 CI = 三层防御。任何一层都不够，三层配合才能稳。

---

## 十、面试高频 Q&A

### Q1：CI 和 CD 区别？

> - **CI（持续集成）**：开发阶段，每次 push 自动 build + test，**早发现问题**。
> - **CD（持续交付）**：自动打包到**可部署**状态，**手动**决定上线。
> - **CD（持续部署）**：自动**上线**到生产，无需人工。
>
> 区分口诀：CI 是"我能编过"，CDelivery 是"我准备好发"，CDeployment 是"我已经发了"。

### Q2：如何设计一个 5 分钟内完成的 CI 流水线？

> 1. **并行化**：lint/build/test 拆 job，矩阵并行跑。
> 2. **缓存**：actions/cache 缓存依赖、CCache 缓存编译产物。
> 3. **增量测试**：根据 diff 只跑受影响的测试（Bazel/Nx）。
> 4. **fail-fast**：失败立即停，不浪费跑完整套。
> 5. **fail-critical-first**：先跑最可能失败的（quick win）。
> 6. **延迟重型任务**：E2E/DAST 异步触发，不阻塞合并。

### Q3：如何处理 flaky tests？

> 1. **隔离**：标记为 flaky，从必过列表移除。
> 2. **retry**：失败的测试自动重试 3 次（治标）。
> 3. **根因**：找依赖时序、外部资源、网络抖动。
> 4. **修复**：mock 外部依赖、加 await、移除共享状态。
> 5. **不修就删**：flaky 比没有更糟， devs 会失去信任。

### Q4：你怎么看待 AI 代码审查？

> 看法：
> - **是助手不是替代**：AI 擅长机械/边界问题，看不懂设计层。
> - **必须控制噪音**：只发 critical/high，否则被开发者忽略。
> - **需要迭代**：prompt 工程是核心，初始 prompt 上线后要持续调。
> - **结合传统**：AI 之上 + 之下还有传统 lint/SAST/单测，三层防御。
>
> 工程上我会先用免费 CodeRabbit 试跑一个月，看准确率和噪音情况，再决定是否上付费版。

### Q5：怎么保证 CI 安全？

> 1. **Secret 不入仓**：用 GitHub Secrets / Vault。
> 2. **gitleaks 预检**：commit hook 拦截密钥。
> 3. **PR 来自 fork 时禁 secrets**：`pull_request_target` 而非 `pull_request`。
> 4. **第三方 action 固定 SHA**：不用 `@v1` 用 `@<commit-sha>`，防止供应链攻击。
> 5. **最小权限**：`permissions:` 显式声明，不给默认 write-all。
> 6. **self-hosted runner 隔离**：别让 PR 跑在能访问生产的 runner 上。

### Q6：CI 跑得慢，从哪开始排查？

> 排查顺序：
> 1. **看时间分布**：哪个 job/step 占大头。
> 2. **依赖安装**：加 cache 通常省最多。
> 3. **编译**：CCache + Ninja。
> 4. **测试**：并行 + 增量。
> 5. **串行改并行**：用 strategy.matrix 拆开。
> 6. **网络**：换镜像源（国内）。
>
> 通常一两个 cache + 一两个并行就能砍掉 50% 时间。

### Q7：GitOps 是什么？

> **GitOps = 用 Git 仓库作为部署的唯一真相来源**。
> 流程：
> 1. 开发者改 Git 仓库的声明（K8S YAML、Helm values）。
> 2. GitOps Controller（如 ArgoCD）监听 Git 变化。
> 3. 把 Git 的状态同步到集群。
> 4. 集群偏移了也自动纠正。
>
> 优点：版本化、可回滚、审计日志天然在 Git history。
> 缺点：门槛比传统 CI/CD 高。

---

## 十一、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| 用 `pull_request_target` 给 PR 跑 secrets | 用 `pull_request`，target 会执行 PR 代码 |
| `actions/checkout@v1` 旧版 | 升级到 @v4 |
| 第三方 action 用 `@main` 或 `@v1` | 固定到具体 commit SHA |
| workflow 没有 `permissions` | 显式声明，最小权限 |
| 不设 `concurrency` | 多 push 触发并发部署 |
| Secret 直接 `echo` | 用环境变量，别打印 |
| 把生产 token 给 PR runner | 用 environment + required reviewers |
| AI 评论没 severity | 加分级，只发 critical |
| 不缓存依赖 | actions/cache 必加 |
| flaky test 不修 | 隔离/修复/删除三选一 |
| CI > 30 分钟没人管 | 必须优化，否则团队会跳过 CI |
| 主分支直接部署无审批 | 加 environment + manual approval |

---

## 十二、相关文章

- [Kubernetes 实战指南](/posts/kubernetes-guide)
- [Docker 入门](/posts/docker-basics)
- [部署指南](/posts/deployment-guide)
- [CMake 实战指南](/posts/cmake-guide)

---

> CI/CD 是工程化的基础设施，AI 门禁是这个基础设施上正在长出来的新层。**先建好传统门禁，再叠 AI**——顺序反了就是空中楼阁。能用 AI 提效的前提是 CI 本身跑得稳、跑得快、跑得有意义。
