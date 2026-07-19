---
title: Kubernetes 实战指南
date: 2026-07-19
tags:
  - Kubernetes
  - K8S
  - 容器编排
  - DevOps
  - 八股文
description: K8S 架构/Pod/Deployment/Service/网络/存储/调度/HPA/Helm/Operator — 后端求职必备
category: 工具与部署
---

# Kubernetes 实战指南

> K8S 是后端工程化绕不开的话题。本文从架构切入，依次讲 Pod/Deployment/Service/Ingress、ConfigMap/Secret、PV/PVC、调度（affinity/taints/QoS）、健康检查、HPA、Helm、Operator，最后给故障排查实战和面试问答。

---

## 一、K8S 是什么

**Kubernetes**（希腊语"舵手"）——Google 2014 年开源的容器编排系统，基于 Borg 论文经验重写。

**核心能力**：

| 能力 | 含义 |
| --- | --- |
| **服务发现 + 负载均衡** | Pod 自动有 DNS 名，流量自动分发 |
| **自动扩缩** | 按 CPU/内存/自定义指标横向扩 |
| **自愈** | 容器挂了自动重启，节点挂了自动迁移 |
| **滚动更新 + 回滚** | 不停机发布 |
| **声明式 API** | 你描述"想要的状态"，K8S 调到这个状态 |
| **配置/密钥管理** | ConfigMap/Secret 解耦 |
| **批量任务** | Job/CronJob |

**对比 Docker Swarm/Mesos/Nomad**：

| 工具 | 特点 | 现状 |
| --- | --- | --- |
| **K8S** | 功能全、生态大、复杂 | **事实标准** |
| Docker Swarm | 轻量、Docker 原生 | 衰退中 |
| Mesos | 多负载（含非容器） | 项目衰退 |
| Nomad | HashiCorp 出品，单二进制 | 中小团队 |

---

## 二、整体架构

```text
                ┌────────────────────────────────────┐
                │          Control Plane             │
                │  ┌──────────────────────────────┐ │
                │  │ kube-apiserver               │ │  ← 唯一入口（REST）
                │  │   • 验证 / 鉴权 / 准入        │ │
                │  │   • 所有操作都过它            │ │
                │  └──────────────┬───────────────┘ │
                │                 │                 │
                │  ┌──────────────┴───────────────┐ │
                │  │ etcd                         │ │  ← KV 存储
                │  │   • 所有集群状态的真相        │ │     (Raft 共识)
                │  └──────────────────────────────┘ │
                │                                   │
                │  ┌────────────┐  ┌──────────────┐ │
                │  │ scheduler  │  │ controller   │ │
                │  │ 调度 Pod   │  │ manager      │ │
                │  │ 到哪个 Node │  │ 各种 reconciler│ │
                │  └────────────┘  └──────────────┘ │
                └────────────────────────────────────┘
                            ↕
        ┌───────────────────┴────────────────────┐
        ↓                                         ↓
   ┌──────────────┐                         ┌──────────────┐
   │  Node 1      │                         │  Node 2      │
   │ ┌──────────┐ │                         │ ┌──────────┐ │
   │ │ kubelet  │ │                         │ │ kubelet  │ │
   │ │ 上报状态 │ │                         │ │ 接收 Pod │ │
   │ └──────────┘ │                         │ └──────────┘ │
   │ ┌──────────┐ │                         │ ┌──────────┐ │
   │ │kube-proxy│ │                         │ │kube-proxy│ │
   │ │ iptables │ │                         │ │ iptables │ │
   │ └──────────┘ │                         │ └──────────┘ │
   │ ┌──────────┐ │                         │ ┌──────────┐ │
   │ │containerd│ │                         │ │containerd│ │
   │ │  (CRI)   │ │                         │ │  (CRI)   │ │
   │ └────┬─────┘ │                         │ └────┬─────┘ │
   │      ↓       │                         │      ↓       │
   │  Pod Pod Pod │                         │  Pod Pod Pod │
   └──────────────┘                         └──────────────┘
```

**典型工作流**：

```text
kubectl apply -f deployment.yaml
       ↓
apiserver 校验并写入 etcd
       ↓
scheduler 监听到新 Pod（Pending）
       ↓
scheduler 按 resource/affinity/taints 决定调度到哪个 Node
       ↓
目标 Node 的 kubelet 收到
       ↓
kubelet 调用 containerd 拉镜像、起容器
       ↓
kubelet 上报状态给 apiserver
       ↓
controller manager 监控副本数，发现少了就再创建
```

---

## 三、核心 API 对象

### 3.1 Pod —— 最小调度单位

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  containers:
    - name: web
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests: { cpu: 100m, memory: 128Mi }
        limits:   { cpu: 500m, memory: 256Mi }
      env:
        - name: LOG_LEVEL
          value: "info"
  restartPolicy: Always
```

**为什么 Pod 不是容器**：

一个 Pod 可以有多个**紧耦合**的容器，它们**共享**：
- **Network**：同一 Pod 内容器互通 localhost
- **IPC**：可用 shm、消息队列
- **Volume**：共享磁盘

**典型 sidecar 模式**：

```text
   Pod (app)
   ┌──────────────────────────┐
   │ ┌──────────┐ ┌─────────┐ │
   │ │  main    │ │ sidecar │ │
   │ │ (业务)   │ │ (日志   │ │   ← 日志采集
   │ │          │ │  agent) │ │
   │ └────┬─────┘ └────┬────┘ │
   │      └─────┬──────┘      │
   │       shared volume      │
   └──────────────────────────┘
```

### 3.2 Deployment（管理 ReplicaSet）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels: { app: webapp }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # 滚动时最多多出 1 个
      maxUnavailable: 0   # 滚动时不允许少
  template:
    metadata:
      labels: { app: webapp }
    spec:
      containers:
        - name: web
          image: myrepo/web:v2
          readinessProbe:
            httpGet: { path: /health, port: 8080 }
            initialDelaySeconds: 5
            periodSeconds: 5
```

**操作**：

```bash
kubectl scale deployment webapp --replicas=5
kubectl set image deployment webapp web=myrepo/web:v3
kubectl rollout status deployment webapp
kubectl rollout undo deployment webapp          # 回滚上一版
kubectl rollout undo deployment webapp --to-revision=3
kubectl rollout history deployment webapp
```

### 3.3 StatefulSet（有状态）

适合 MySQL/Kafka/Redis：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels: { app: mysql }
  template:
    metadata: { labels: { app: mysql } }
    spec:
      containers:
        - name: mysql
          image: mysql:8
          volumeMounts:
            - { name: data, mountPath: /var/lib/mysql }
  volumeClaimTemplates:    # ← 每个 Pod 独立 PVC
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: fast-ssd
        resources: { requests: { storage: 100Gi } }
```

**StatefulSet vs Deployment 关键差异**：

| 维度 | Deployment | StatefulSet |
| --- | --- | --- |
| Pod 名 | 随机后缀（webapp-abc123） | 有序（mysql-0、mysql-1、mysql-2） |
| DNS | 仅 Service 有 | 每个 Pod 有独立 DNS（`mysql-0.mysql`） |
| 启停顺序 | 并行、无序 | 启动顺序 0→1→2，逆序停止 |
| 存储 | 共享 / 无 | **每 Pod 独立 PVC**，不丢 |
| 适用 | 无状态 | 数据库、消息队列 |

### 3.4 DaemonSet（每节点一个）

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata: { name: fluentd }
spec:
  selector: { matchLabels: { app: fluentd } }
  template:
    spec:
      containers:
        - name: fluentd
          image: fluentd:v1.16
          volumeMounts:
            - { name: varlog, mountPath: /var/log }
      volumes:
        - name: varlog
          hostPath: { path: /var/log }
```

典型用例：日志采集（fluentd/filebeat）、网络插件（calico/cilium）、监控 agent（node-exporter）。

### 3.5 Job / CronJob

```yaml
# Job：跑完即停
apiVersion: batch/v1
kind: Job
metadata: { name: db-migrate }
spec:
  completions: 1
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          image: myrepo/db-tools:v1
          command: ["./migrate.sh"]

---
# CronJob：定时
apiVersion: batch/v1
kind: CronJob
metadata: { name: backup }
spec:
  schedule: "0 2 * * *"     # 每天 2 点
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: myrepo/backup:v1
```

---

## 四、Service 与网络

### 4.1 Service 四种类型

```yaml
apiVersion: v1
kind: Service
metadata: { name: webapp }
spec:
  type: ClusterIP          # ← 改这里换类型
  selector:
    app: webapp
  ports:
    - port: 80             # Service 端口
      targetPort: 8080     # Pod 端口
```

| 类型 | 可见范围 | 用途 |
| --- | --- | --- |
| **ClusterIP**（默认） | 集群内 | **最常用**，内部服务互调 |
| **NodePort** | 集群外（节点 IP:30000-32767） | 简单对外，端口受限 |
| **LoadBalancer** | 云厂商 LB | **生产推荐**，自动创建 ELB/SLB |
| **ExternalName** | CNAME 到外部域名 | 引用集群外服务（如外部数据库） |

### 4.2 Endpoints / EndpointSlices

```bash
kubectl get endpoints webapp
# NAME     ENDPOINTS
# webapp   10.244.1.5:8080,10.244.2.6:8080,10.244.3.7:8080
```

Service 通过 Endpoints 知道哪些 Pod 接收流量。`readinessProbe` 失败的 Pod 会被从 Endpoints 摘掉。

### 4.3 Ingress（七层路由）

Service 是 L4，Ingress 是 L7（HTTP/HTTPS）。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts: [api.example.com]
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service: { name: webapp-v1, port: { number: 80 } }
          - path: /v2
            pathType: Prefix
            backend:
              service: { name: webapp-v2, port: { number: 80 } }
```

**实现**：
- **nginx-ingress**（最常见）
- **traefik**
- **Istio Gateway**（service mesh）

### 4.4 DNS（CoreDNS）

K8S 自带 DNS 服务器（CoreDNS），给每个 Service 自动注册：

```text
<service>.<namespace>.svc.cluster.local
```

例：`webapp.default.svc.cluster.local`

短名解析：
- 同 namespace 内：`webapp`
- 跨 namespace：`webapp.prod`

### 4.5 CNI（容器网络）

| 方案 | 特点 |
| --- | --- |
| **Calico** | BGP，主流选择 |
| **Flannel** | 简单，Overlay VXLAN |
| **Cilium** | 基于 eBPF，性能好 |
| **Weave** | 加密 Overlay |

### 4.6 NetworkPolicy（白名单）

默认全通，加 NetworkPolicy 后变白名单。

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: db-policy }
spec:
  podSelector:
    matchLabels: { app: mysql }
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: webapp }
      ports:
        - protocol: TCP
          port: 3306
```

只允许 `app=webapp` 的 Pod 访问 MySQL 3306。

---

## 五、配置与密钥

### 5.1 ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: webapp-config }
data:
  application.yml: |
    server:
      port: 8080
    db:
      host: mysql.prod
      port: 3306
  LOG_LEVEL: "info"
```

**投递方式**：

```yaml
# 1. 环境变量
spec:
  containers:
    - name: app
      env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: webapp-config
              key: LOG_LEVEL

# 2. Volume 挂载为文件
spec:
  volumes:
    - name: config
      configMap: { name: webapp-config }
  containers:
    - name: app
      volumeMounts:
        - { name: config, mountPath: /etc/app }
```

### 5.2 Secret

```yaml
apiVersion: v1
kind: Secret
metadata: { name: db-secret }
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=    # base64 编码（不是加密！）
```

```bash
echo -n "password123" | base64
# cGFzc3dvcmQxMjM=
```

**重要警告**：base64 不是加密。生产环境用：
- **Sealed Secrets**（Bitnami）
- **External Secrets Operator**（接 AWS Secrets Manager/Vault）
- **SOPS**（Mozilla）

---

## 六、存储

### 6.1 Volume 类型

| 类型 | 含义 |
| --- | --- |
| `emptyDir` | Pod 内共享，Pod 删了就没 |
| `hostPath` | 挂主机目录（危险，慎用） |
| `configMap` / `secret` | 投递配置 |
| `persistentVolumeClaim` | 持久卷（推荐） |

### 6.2 PV / PVC / StorageClass

```text
   开发者                集群管理员
   ┌─────┐               ┌─────┐
   │ PVC │ ←── 绑定 ──── │ PV  │
   └─────┘               └─────┘
       ↑                     ↑
       │  StorageClass       │
       │  (动态供给)         │
       └───────┬─────────────┘
               ↓
          云厂商 CSI
       (AWS EBS / GCP PD / Azure Disk)
```

```yaml
# StorageClass（管理员定义一次）
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata: { name: fast-ssd }
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer

---
# PVC（开发者用）
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data-pvc }
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: fast-ssd
  resources: { requests: { storage: 100Gi } }
```

**accessModes**：
- `ReadWriteOnce`（RWO）：单节点读写（最常见的 EBS）
- `ReadOnlyMany`（ROX）：多节点只读
- `ReadWriteMany`（RWX）：多节点读写（NFS/CephFS/EFS）
- `ReadWriteOncePod`（RWOP）：单 Pod 读写

---

## 七、调度

### 7.1 资源 requests/limits

```yaml
resources:
  requests:           # 调度依据
    cpu: 100m         # 100 millicpu = 0.1 核
    memory: 256Mi
  limits:             # 实际上限
    cpu: 500m
    memory: 512Mi
```

**`m` = millicpu**（千分之一核）。`1000m = 1 核`。

**CPU 超过 limit**：被 throttle（节流），不会杀。
**Memory 超过 limit**：**OOMKilled**，容器被杀重启。

### 7.2 QoS 等级

| 等级 | 条件 | 行为 |
| --- | --- | --- |
| **Guaranteed** | requests == limits（CPU 和 Memory 都满足） | 最后被驱逐 |
| **Burstable** | 至少一个有 requests | 中间 |
| **BestEffort** | 都不设 requests/limits | 最先被驱逐 |

**生产建议**：核心服务 Guaranteed，次要服务 Burstable。

### 7.3 nodeSelector / nodeAffinity

```yaml
# 简单：节点标签匹配
spec:
  nodeSelector:
    disktype: ssd

# 高级：nodeAffinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:    # 硬约束
        nodeSelectorTerms:
          - matchExpressions:
              - { key: kubernetes.io/arch, operator: In, values: [amd64] }
      preferredDuringSchedulingIgnoredDuringExecution:   # 软约束
        - weight: 100
          preference:
            matchExpressions:
              - { key: zone, operator: In, values: [us-east-1a] }
```

### 7.4 PodAntiAffinity（分散调度）

让同一 Deployment 的 Pod 分散到不同 Node，避免单点故障：

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels: { app: webapp }
        topologyKey: kubernetes.io/hostname
```

### 7.5 Taints & Tolerations

让特定节点专门跑特定 Pod。

**给 Node 打污点**：

```bash
kubectl taint nodes gpu-node dedicated=gpu:NoSchedule
```

**Pod 容忍该污点**：

```yaml
spec:
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
```

**effect 三种**：
- `NoSchedule`：不容忍就不调度
- `PreferNoSchedule`：尽量不调度
- `NoExecute`：不容忍就**驱逐已有 Pod**

---

## 八、健康检查

```yaml
livenessProbe:           # 失败重启
  httpGet: { path: /health, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:          # 失败摘流量（不入 Endpoints）
  httpGet: { path: /ready, port: 8080 }
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:            # 启动慢的服务（JVM）
  httpGet: { path: /startup, port: 8080 }
  failureThreshold: 30
  periodSeconds: 10       # 5 分钟启动时间
```

**三种探测方式**：
- `httpGet`：HTTP 2xx/3xx 视为成功
- `tcpSocket`：能建立 TCP 连接即成功
- `exec`：执行命令，退出码 0 成功

**为什么 liveness 和 readiness 要分开**：
- **liveness 失败** → 重启容器（解决死锁、内存泄漏）
- **readiness 失败** → 摘流量（不让上游访问），但**不重启**（让程序自己恢复）

---

## 九、HPA / VPA / CA 自动扩缩

### 9.1 HPA（HorizontalPodAutoscaler）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: webapp-hpa }
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
    - type: Pods                         # 自定义指标
      pods:
        metric: { name: http_requests_per_second }
        target: { type: AverageValue, averageValue: 100 }
```

**依赖**：
- `metrics-server`（CPU/内存）
- `Prometheus Adapter`（自定义指标）

### 9.2 VPA（Vertical Pod Autoscaler）

自动调 Pod 的 requests/limits。**少用**，因为改 resources 需要重启 Pod。

### 9.3 Cluster Autoscaler

节点不够时自动加 Node，闲时缩。云厂商支持。

### 9.4 KEDA（事件驱动扩缩）

按 Kafka 队列长度、Redis Stream、AWS SQS 等扩缩。

---

## 十、Helm —— 包管理

```bash
# 加仓库
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 装
helm install my-release bitnami/redis -f values.yaml

# 升级
helm upgrade my-release bitnami/redis -f values.yaml

# 回滚
helm rollback my-release 1

# 卸载
helm uninstall my-release
```

**Chart 结构**：

```
mychart/
├── Chart.yaml            # 元信息
├── values.yaml           # 默认参数
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl      # 共用模板
└── charts/               # 子 chart
```

**values.yaml 示例**：

```yaml
image:
  repository: nginx
  tag: "1.25"

replicaCount: 3

resources:
  requests: { cpu: 100m }
  limits:   { cpu: 500m }

ingress:
  enabled: true
  host: api.example.com
```

**templates/deployment.yaml**：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources: {{ toYaml .Values.resources | nindent 12 }}
```

---

## 十一、Operator 模式

**Operator = CRD（自定义资源）+ Controller（控制循环）**

把运维知识代码化。例：

```yaml
# Prometheus Operator 的 CRD
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata: { name: my-prom }
spec:
  replicas: 2
  version: v2.45.0
  storage:
    volumeClaimTemplate:
      spec:
        resources: { requests: { storage: 100Gi } }
```

Operator 帮你管理 Prometheus 集群（部署、配置、备份）。

**主流 Operator**：
- **Prometheus Operator**
- **Redis Operator**（Redis 集群）
- **Strimzi**（Kafka）
- **PostgreSQL Operator**（CrunchyData）

---

## 十二、kubectl 实战

```bash
# 查看
kubectl get pods                          # 默认 namespace
kubectl get pods -A                       # 所有 namespace
kubectl get pods -o wide                  # 详情
kubectl get pods --show-labels
kubectl get pods -l app=webapp

# 详情
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl logs -f <pod-name>                # 跟随
kubectl logs --previous <pod-name>        # 上一个容器（崩溃前的日志）
kubectl logs <pod-name> -c <container>    # 多容器 Pod 指定容器

# 执行
kubectl exec -it <pod-name> -- bash
kubectl exec -it <pod-name> -- /bin/sh

# 端口转发
kubectl port-forward svc/webapp 8080:80   # 本地 8080 → Service 80

# 应用 YAML
kubectl apply -f deployment.yaml
kubectl apply -f ./                       # 目录下所有 yaml
kubectl delete -f deployment.yaml

# 滚动
kubectl rollout status deployment webapp
kubectl rollout undo deployment webapp

# 调试
kubectl debug -it <pod-name> --image=busybox       # 临时容器
kubectl debug node/<node> -it --image=busybox      # 节点调试

# 集群信息
kubectl cluster-info
kubectl get nodes -o wide
kubectl top pod                            # 需要 metrics-server
kubectl top node

# 配置切换
kubectl config get-contexts
kubectl config use-context my-cluster
kubectl config current-context

# 帮助
kubectl explain deployment.spec.template   # 看字段定义
kubectl explain pod.spec.containers.resources
```

---

## 十三、故障排查实战

### 13.1 Pod 一直 Pending

```bash
kubectl describe pod <pending-pod>
```

**Events 段常见原因**：
- `Insufficient cpu` / `Insufficient memory`：节点资源不够
- `node(s) didn't match node selector`：nodeSelector 配错
- `node(s) had taints that the pod didn't tolerate`：节点有污点
- `ImagePullBackOff`：镜像拉不下来

**解决**：
- 加节点 / 降 requests / 改 nodeSelector / 加 toleration。

### 13.2 CrashLoopBackOff

容器反复崩溃。

```bash
kubectl logs <pod> --previous
kubectl describe pod <pod>
```

**常见原因**：
- 应用启动崩（看 logs）
- livenessProbe 配错，频繁重启
- 配置错误（DB 连不上）
- 资源不足（OOMKilled）

### 13.3 OOMKilled

```bash
kubectl describe pod <pod>
# 看到 Last State: Terminated
#   Reason: OOMKilled
#   Exit Code: 137
```

**原因**：limits.memory 太低。

**解决**：
- 加大 limits.memory
- 排查内存泄漏（看监控、valgrind）
- 加内存监控告警

### 13.4 Service 不通

```bash
# 1. Endpoints 是否有内容
kubectl get endpoints svc/webapp
# 如果是 <none>，说明没有 Pod 匹配 selector 或都没通过 readinessProbe

# 2. Pod 是否 Running
kubectl get pods -l app=webapp

# 3. 直接 Pod IP 通吗
kubectl exec -it debug-pod -- curl http://<pod-ip>:8080

# 4. Service 通吗
kubectl exec -it debug-pod -- curl http://webapp.default.svc.cluster.local

# 5. NetworkPolicy 拦截了吗
kubectl get networkpolicy
```

### 13.5 滚动更新卡住

新 Pod 起不来，老 Pod 不下线。

```bash
kubectl rollout status deployment webapp
# "deployment is in progress, but not making progress"

# 看 readinessProbe
kubectl describe pod <new-pod>
# 如果 readinessProbe failed，新 Pod 不会进 Endpoints
```

---

## 十四、面试高频 Q&A

### Q1：K8S 与 Docker 关系？

> Docker 是**容器运行时**（容器化技术），K8S 是**容器编排**（管理多容器）。
> K8S 早期用 Docker 作为 runtime（dockershim），但 1.24 起弃用，改用 **containerd** / **CRI-O**（通过 CRI 接口）。
> 现在生产环境 K8S 集群通常装的是 containerd 而不是 Docker。

### Q2：Service 和 Ingress 区别？

> - **Service**：L4（TCP/UDP），将流量负载到一组 Pod。ClusterIP（内部）/NodePort/LB/ExternalName 四种类型。
> - **Ingress**：L7（HTTP/HTTPS），基于域名/路径路由到不同 Service。
> 典型组合：外部 LB → Ingress Controller（nginx-ingress）→ Service → Pod。

### Q3：如何实现零停机滚动更新？

> 1. Deployment `strategy: RollingUpdate`。
> 2. `maxSurge: 1, maxUnavailable: 0`：先起新的再删旧的。
> 3. **readinessProbe** 必须配，确保新 Pod 真就绪才进 Endpoints。
> 4. **preStop hook** 优雅关闭（处理完已有连接再退）。
> 5. **terminationGracePeriodSeconds** 给足时间。
> 6. 上游有 LB（Ingress）自动切换。

### Q4：etcd 挂了集群还能跑吗？

> **能跑，但不能改**：
> - 已运行的 Pod 继续运行（kubelet、kube-proxy 不依赖 etcd，只听 apiserver）。
> - **不能** kubectl apply、扩缩容、改任何配置。
> - 修复 etcd 后集群恢复同步。
> 这也是为什么 etcd 要 3 或 5 节点高可用。

### Q5：Pod 之间如何通信？

> 同 Pod 内：**localhost**（共享 network namespace）。
> 同 Node 跨 Pod：**容器网络（CNI）**，通过 veth pair + 网桥。
> 跨 Node 跨 Pod：**Overlay 网络（VXLAN）** 或 **BGP 路由**（Calico）。
> 都通过 **Pod IP** 通信，但 Pod IP 易变，所以生产用 **Service DNS**。

### Q6：StatefulSet 为什么适合数据库？

> 1. **稳定的网络标识**：每个 Pod 有独立 DNS（`mysql-0.mysql`），主从切换时其他节点能稳定连主。
> 2. **稳定的持久存储**：每个 Pod 独立 PVC，重启后数据还在。
> 3. **有序启停**：主先启，从依次启；停止时逆序。
> 4. **副本可识别**：通过序号区分主从。

### Q7：怎么调试一个跑着的 Pod？

> 1. `kubectl logs` 看日志。
> 2. `kubectl exec -it` 进容器。
> 3. Pod 没有 shell（distroless 镜像）→ `kubectl debug` 加临时容器。
> 4. 网络问题 → `kubectl port-forward` 本地访问。
> 5. 节点问题 → `kubectl debug node/<x>`。
> 6. 持续观察 → `kubectl get events --watch`。

---

## 十五、易错点速查表

| 易错点 | 正确做法 |
| --- | --- |
| 不设 resources requests/limits | 必须设，否则 QoS 是 BestEffort |
| resources requests ≠ limits | 核心服务设 Guaranteed（相等） |
| 不设 readinessProbe | 滚动更新会断流量 |
| livenessProbe 设太敏感 | 容器频繁重启 |
| ConfigMap 改了不重启 Pod | 用 Reloader 或滚动重启 |
| Secret 直接 base64 当加密 | 用 SealedSecret/External Secrets |
| 单副本 Deployment 上生产 | 至少 3 副本 + podAntiAffinity |
| 镜像用 `latest` 标签 | 永远用具体版本 |
| Job 没设 backoffLimit | 失败任务无限重试 |
| terminationGracePeriodSeconds 太短 | 优雅关闭至少 30s |
| 用 emptyDir 存重要数据 | Pod 删了就没，用 PVC |
| StatefulSet 没 serviceName | DNS 解析不了 |
| HPA 基于 CPU 但没 requests | HPA 算不出利用率 |

---

## 十六、相关文章

- [Docker 入门](/posts/docker-basics)
- [部署指南](/posts/deployment-guide)
- [CI/CD 流水线与 AI 门禁探索](/posts/cicd-ai-gate)
- [Redis 核心八股](/posts/redis-interview)

---

> K8S 的哲学是**声明式 + 控制循环**：你描述"想要的状态"，控制器不断把现实往目标调。理解这一点，从 Pod、Service 到 Operator 都是同一套抽象的应用。学 K8S 别背命令，先理解 reconcile 模式，剩下的都是它的具象。
