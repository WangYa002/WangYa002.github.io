---
title: Git 常用命令速查表
date: 2026-04-10
tags:
  - Git
  - 工具
description: 日常开发中常用的Git命令，涵盖分支管理、版本控制、协作等场景
---

# Git 常用命令速查表

## 基础配置

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 查看配置
git config --list
```

## 初始化与克隆

```bash
# 初始化仓库
git init

# 克隆远程仓库
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git folder-name
```

## 基本操作

```bash
# 查看状态
git status

# 添加文件到暂存区
git add file.txt
git add .  # 添加所有文件

# 提交到本地仓库
git commit -m "提交信息"

# 查看提交历史
git log
git log --oneline  # 简洁模式
git log -n 5       # 最近5次提交
```

## 分支管理

```bash
# 查看分支
git branch           # 本地分支
git branch -a        # 所有分支（包括远程）

# 创建分支
git branch feature-new

# 切换分支
git checkout feature-new
git switch feature-new  # 新语法

# 创建并切换
git checkout -b feature-new
git switch -c feature-new

# 删除分支
git branch -d feature-new  # 已合并
git branch -D feature-new  # 强制删除

# 重命名分支
git branch -m old-name new-name
```

## 远程操作

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin https://github.com/user/repo.git

# 推送代码
git push origin main
git push -u origin main  # 关联后可直接 push

# 拉取代码
git pull origin main

# 获取远程分支
git fetch origin
```

## 合并与变基

```bash
# 合并分支
git merge feature-new

# 变基（保持线性历史）
git rebase main

# 解决冲突后继续变基
git rebase --continue

# 取消变基
git rebase --abort
```

## 暂存与恢复

```bash
# 暂存当前修改
git stash
git stash save "工作进行中"

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop    # 恢复并删除
git stash apply  # 恢复但不删除

# 清除暂存
git stash drop
```

## 标签管理

```bash
# 创建标签
git tag v1.0.0
git tag -a v1.0.0 -m "版本说明"

# 推送标签
git push origin v1.0.0
git push origin --tags  # 推送所有标签

# 删除标签
git tag -d v1.0.0
git push origin --delete v1.0.0
```

## 撤销操作

```bash
# 撤销工作区修改
git checkout -- file.txt
git restore file.txt

# 取消暂存
git reset HEAD file.txt

# 回退提交（保留工作区）
git reset --soft HEAD~1

# 回退提交（保留修改）
git reset --mixed HEAD~1

# 回退提交（丢弃修改）
git reset --hard HEAD~1
```

## 实用技巧

```bash
# 忽略已提交的文件（从暂存区移除）
git rm --cached file.txt

# 查看修改内容
git diff
git diff --staged  # 暂存区

# 搜索提交记录
git log --author="name"
git log --grep="keyword"

# 查看文件历史
git log --follow file.txt
git blame file.txt
```

---

建议收藏此页，需要时快速查阅！