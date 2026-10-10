---
title: 5.cpolar
description: 1.第一步：注册并获取Authtoken:获取属于你的专属凭证.
pubDate: 2026-10-10
series: 部署
order: 5
source: 部署/5.cpolar
---

# cpolar

**1.第一步：注册并获取 Authtoken:**获取属于你的专属凭证.

1. 访问 [cpolar 官网](https://www.cpolar.com/)。
2. 使用手机号或邮箱免费注册一个账号，并登录后台控制面板。
3. 在控制面板的左侧导航栏找到 **“验证”**（或者直接看仪表盘首页），你会看到一串专属的 **Authtoken**（一长串字符）。先把它复制下来备用。



**2.第二步：一键安装 cpolar:**在 CentOS 中下载并部署.

打开你的 CentOS 虚拟机终端，直接复制并运行官方提供的一键安装脚本：

```bash
curl -L https://www.cpolar.com/static/downloads/install-release-cpolar.sh | sudo bash
```



**3.第三步：配置 Authtoken:**将账号与服务器绑定.

在 CentOS 终端中，执行以下命令（将 `<你的token>` 替换为你刚才在第一步复制的那串字符）：

```bash
cpolar authtoken MzBlZDk2MmMtNWVmNC00YTA1LWE1NmEtOWRkNzQzODA4MDVj
```

执行后，系统会提示 `Authtoken saved to ...`，说明绑定成功。



**4.第四步：启动 cpolar 后台服务:**让穿透服务在后台稳定运行.

为了防止你关掉终端窗口后穿透就断开，我们把它注册为系统的后台守护进程并设置开机自启：

```bash
# 设置开机自启
sudo systemctl enable cpolar

# 禁用开机自启
sudo systemctl disable cpolar

# 启动 cpolar 服务
sudo systemctl start cpolar

# 停止 coplar 服务
sudo systemctl stop cpolar

# 检查运行状态（看到绿色的 active (running) 就说明成功了）
sudo systemctl status cpolar
```





cpolar 启动后，你**完全不需要再敲命令了**，它自带了一个超级好用的本地 Web 管理后台！

1. 在你的 Windows 主机浏览器里，输入你 CentOS 虚拟机的局域网 IP 加上 `9200` 端口。
   - 例如：http://192.168.146.130:9200
2. 使用你刚刚注册的 cpolar 账号密码登录。
3. 登录后，点击左侧的 **“隧道管理” -> “创建隧道”**。
   - **隧道名称**：随便起（比如 `hm-dianping-api` 或者 `vue-frontend`）。
   - **协议**：选择 `http`。
   - **本地地址**：填写你的服务端口。比如要暴露 Spring Boot 后端就填 `8080`，暴露 Nginx 托管的前端就填 `80`。
   - **域名类型**：免费版选择“随机域名”。
   - **地区**：选择 China（国内节点，速度快）。
4. 点击 **“创建”**。