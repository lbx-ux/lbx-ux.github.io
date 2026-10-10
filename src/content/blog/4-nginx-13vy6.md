---
title: 4.nginx
description: Nginx容器使用了宿主机目录挂载（BindMounts）。
pubDate: 2026-10-10
series: 部署
order: 4
source: 部署/4.nginx
---

## 一. 部署nginx

Nginx 容器使用了**宿主机目录挂载（Bind Mounts）**。

Docker 的特性是：**即使你删除了容器，挂载到宿主机上的文件依然会保留**。因此，想要彻底清除里面的东西并重新部署，我们需要分三步走：先干掉旧容器，再清理宿主机的旧文件，最后重新获取默认配置并启动新容器。

以下是完整的清理与重新部署操作步骤：

### 第一步：停止并删除旧的 Nginx 容器

首先，你需要找到当前正在运行的 nginx 容器名称或 ID。

1. **查看当前的容器：**

   ```bash
   docker ps -a
   ```

   *找到你的 Nginx 容器的名字（比如叫 `nginx` 或者 `my-nginx` 等）。*

2. **强制停止并删除该容器：**

   *(将 `<你的容器名>` 替换为实际的名字，例如 `docker rm -f my-nginx`)*

   ```bash
   docker rm -f <你的容器名>
   ```



### 第二步：彻底清理宿主机的旧数据并重建目录

根据 `PixPin_2026-07-24_10-29-26.png` 中的路径，我们需要清空 `/opt/nginx/` 下的所有旧配置和数据。

1. **删除旧的挂载目录及文件：**

   *(⚠️注意：这是一个危险操作，请确保 `/opt/nginx/` 下没有你其他需要备份的重要私人文件。如果有，请先备份 `nginx.conf` 等文件。)*

   ```bash
   rm -rf /opt/nginx/config
   rm -rf /opt/nginx/html
   rm -rf /opt/nginx/logs
   ```

2. **重新创建干净的空目录：**

   ```bash
   mkdir -p /opt/nginx/config
   mkdir -p /opt/nginx/html
   mkdir -p /opt/nginx/logs
   ```



### 第三步：重新获取默认配置

因为如果直接将空目录挂载进 Nginx，它会因为找不到 `nginx.conf` 报错退出，所以我们需要重新借用一个临时容器来生成默认配置文件。

1. **启动一个临时容器：**

   ```bash
   docker run --name nginx-temp -d nginx
   ```

2. **将纯净的默认配置文件拷贝到你刚创建的宿主机目录中：**

   ```bash
   docker cp nginx-temp:/etc/nginx/nginx.conf /opt/nginx/config/
   docker cp nginx-temp:/etc/nginx/conf.d /opt/nginx/config/
   ```

3. **销毁临时容器：**

   ```bash
   docker rm -f nginx-temp
   ```



### 第四步：重新部署全新的 Nginx

现在你的环境已经是完全干净且准备就绪的状态。执行以下命令重新部署：

```bash
docker run -d \
  --name my-nginx \
  -p 80:80 \
  -v /opt/nginx/config/nginx.conf:/etc/nginx/nginx.conf \
  -v /opt/nginx/config/conf.d:/etc/nginx/conf.d \
  -v /opt/nginx/html:/usr/share/nginx/html \
  -v /opt/nginx/logs:/var/log/nginx \
  --restart always \
  nginx
```

**最后验证一下：**

为了确认新的静态目录生效，你可以再创建一个测试页面：

```bash
echo '<h1>Fresh Nginx Deployment Successful!</h1>' > /opt/nginx/html/index.html
```

然后在浏览器访问你虚拟机的 IP 即可看到这个全新的页面。



## 二. 部署前端页面

核心思路是：**将你打包好的前端静态文件，放入之前规划好的宿主机 `html` 挂载目录中，然后配置 Nginx 代理规则（如果需要的话）。**

下面是具体的步骤：

### 第一步：打包你的前端项目

在前端项目根目录下运行：

```bash
npm run build
```

打包完成后，你会得到一个文件夹（通常命名为 `dist` 或 `build`），里面包含了 `index.html` 以及 css、js 等静态资源。



### 第二步：将打包文件上传到 VM 虚拟机

你需要将上一步生成的 `dist` 文件夹里的**所有内容**，传输到你 VM 虚拟机上我们之前配置的 Nginx html 挂载目录：`/opt/nginx/html`。

你有以下几种方式可以实现：

- **方式 A (推荐): 使用 SFTP 客户端** (如 FileZilla, Xftp, WinSCP 等)。连接到你的虚拟机，然后直接将 `dist` 里面的文件拖拽到 `/opt/nginx/html` 目录下。

- **方式 B: 使用 `scp` 命令**。如果你在本地终端操作，可以使用：

  ```bash
  # 将本地的 dist 目录下的所有内容复制到虚拟机的 /opt/nginx/html
  scp -r ./dist/* root@<你的虚拟机IP>:/opt/nginx/html/
  ```

**重要提示：** 传输完成后，你的 `/opt/nginx/html/` 目录下应该直接看到 `index.html`，而不是看到一个名为 `dist` 的文件夹（即 `/opt/nginx/html/index.html`，而不是 `/opt/nginx/html/dist/index.html`）。如果之前我们测试用的那个 `index.html` 还在，直接覆盖它即可。



### 第三步：配置 Nginx (可选，根据项目需求)

如果你的前端项目只是一个纯静态页面，或者前端路由使用的是 Hash 模式（URL 里带 `#`，如 `/#/home`），那么完成第二步后，你直接访问虚拟机的 IP 地址，前端项目就已经部署成功并可以访问了！

**但是，如果你的项目是以下两种情况，你需要修改 Nginx 配置文件：**

1. **使用了 History 路由模式**（URL 没有 `#`，如 `/home`）：刷新页面会报 404。
2. **前端需要请求后端的 API 接口**，且存在跨域问题。

我们需要修改你之前挂载出来的配置文件。

1. 编辑宿主机上的配置文件：

   ```bash
   vim /opt/nginx/config/conf.d/default.conf
   ```

   *(如果这个文件不存在，或者你想直接改主配置，可以编辑 `/opt/nginx/config/nginx.conf`)*

2. 在 `server` 块中，针对你的需求进行配置修改：

   ```bash
   # 1. 全局配置 (最好加上)
   user  nginx;
   worker_processes  auto;
   
   # 2. 必须要有的 events 块 (就是解决你报错的关键)
   events {
       worker_connections  1024;
   }
   
   # 3. HTTP 块 (你原本的业务逻辑)
   http {
       # 引入 MIME 类型，否则可能出现页面样式丢失
       include       /etc/nginx/mime.types;
       default_type  application/octet-stream;
   
       # 定义后端集群
       upstream backend_api {
           server 192.168.146.1:8080;
       }
   
       server {
           listen       80;
           server_name  localhost;
           # 允许最大 10MB 的请求体
           client_max_body_size 10m;
   
           # 部署前端静态代码
           location / {
               root   /usr/share/nginx/html/dist;
               index  index.html index.htm;
               try_files $uri $uri/ /index.html;
           }
   
           # 反向代理到后台集群
           location /api/ {
               proxy_pass http://backend_api/;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           }
       }
   }
   ```



### 第四步：重启 Nginx 让配置生效

如果修改了配置文件，必须让 Nginx 重新加载配置。

```bash
docker restart my-nginx
```
