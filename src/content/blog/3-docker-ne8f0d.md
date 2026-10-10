---
title: 3.Docker
description: 首先如果系统中已经存在旧的Docker，则先卸载：
pubDate: 2026-10-10
series: 部署
order: 3
source: 部署/3.Docker
---



# 安装

## 1. 卸载旧版

首先如果系统中已经存在旧的Docker，则先卸载：

```shell
yum remove docker \
    docker-client \
    docker-client-latest \
    docker-common \
    docker-latest \
    docker-latest-logrotate \
    docker-logrotate \
    docker-engine \
    docker-selinux 
```



## 2. 配置Docker的yum库

首先要安装一个yum工具

```bash
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
```

安装成功后，执行命令，配置Docker的yum源（已更新为阿里云源）：

```bash
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

sudo sed -i 's+download.docker.com+mirrors.aliyun.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo
```

更新yum，建立缓存

```bash
sudo yum makecache fast
```



## 3. 安装Docker

最后，执行命令，安装Docker

```bash
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```



## 4. 启动和校验

```bash
# 启动Docker
systemctl start docker

# 停止Docker
systemctl stop docker

# 重启
systemctl restart docker

# 设置开机自启
systemctl enable docker

# 执行docker ps命令，如果不报错，说明安装启动成功
docker ps
```





# 加速

之前的很多公共镜像源（比如中科大、网易、Docker 官方中国区等）因为政策和网络原因，确实大面积失效或被严重限速了。

虽然公共源失效了，但阿里云提供的**个人专属加速地址**目前大多数情况下依然可用，因为它绑定了你的阿里云账号，不是公开滥用的。

**操作步骤：**

1. 登录 [阿里云容器镜像服务控制台](https://cr.console.aliyun.com/)（直接用支付宝或淘宝扫码登录即可）。
2. 在左侧导航栏找到 **镜像工具** -> **镜像加速器**。
3. 你会看到一个属于你个人的加速器地址，格式类似于：`[https://xxxxxx.mirror.aliyuncs.com](https://xxxxxx.mirror.aliyuncs.com)`。
4. 回到你的 FinalShell 终端，依次执行以下命令配置 Docker：

```bash
# 1. 创建 docker 配置目录
sudo mkdir -p /etc/docker

# 2. 写入配置文件（请把下面 https://xxxxxx.mirror.aliyuncs.com 换成你自己的真实地址）
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://8puuwba5.mirror.aliyuncs.com"]
}
EOF

# 3. 重新加载系统配置
sudo systemctl daemon-reload

# 4. 重启 Docker 服务
sudo systemctl restart docker
```

配置完成后，再去执行你的 `docker compose up -d`，通常下载速度会有质的飞跃。
