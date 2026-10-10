---
title: 6.SkyWalking
description: 在虚拟机的Docker环境中部署SkyWalking，核心思路依然是启动服务端（OAP）和存储引擎（通常用Elasticsearch），以及UI控制台。
pubDate: 2026-10-10
series: 部署
order: 6
source: 部署/6.SkyWalking
---

在虚拟机的 Docker 环境中部署 SkyWalking，核心思路依然是启动服务端（OAP）和存储引擎（通常用 Elasticsearch），以及 UI 控制台。

为了方便管理，最推荐的方式是使用 **Docker Compose**，这样可以用一个 YAML 文件把 Elasticsearch（存储）、OAP（分析服务）和 UI（可视化）一起编排并启动。



**1.准备工作目录:**创建一个存放配置文件的目录.

在你的虚拟机上，创建一个专门用来存放 SkyWalking 部署文件的目录，并进入该目录：

```bash
mkdir -p /opt/skywalking
cd /opt/skywalking
```



**2.编写 docker-compose.yml:**核心编排文件.

在当前目录下创建一个 `docker-compose.yml` 文件：

```bash
vi docker-compose.yml
```

将以下内容粘贴进去（注意：这里使用  **BanyanDB**作为持久化存储）：

```yml
version: '3.8'

services:
  banyandb:
    image: apache/skywalking-banyandb:0.7.0
    container_name: banyandb
    restart: always
    networks:
      - skywalking-net
    ports:
      - "17912:17912"
    volumes:
      - banyandb-data:/tmp/banyandb-data

  oap:
    image: apache/skywalking-oap-server:10.1.0
    container_name: skywalking-oap
    restart: always
    command: standalone
    depends_on:
      - banyandb
    networks:
      - skywalking-net
    ports:
      - "11800:11800"  # gRPC 端口 (Agent 上报数据使用)
      - "12800:12800"  # HTTP/REST 端口 (UI 请求使用)
    environment:
      SW_STORAGE: banyandb
      SW_STORAGE_BANYANDB_TARGETS: banyandb:17912
      JAVA_OPTS: "-Xms512m -Xmx1024m" # 根据虚拟机实际内存调整

  ui:
    image: apache/skywalking-ui:10.1.0
    container_name: skywalking-ui
    restart: always
    depends_on:
      - oap
    networks:
      - skywalking-net
    ports:
      - "8080:8080"    # UI 访问端口
    environment:
      SW_OAP_ADDRESS: http://oap:12800

networks:
  skywalking-net:
    driver: bridge

volumes:
  banyandb-data:
```



**3.一键启动集群:**拉取镜像并启动所有容器.

保存文件后，在当前目录下执行启动命令：

```bash
docker compose up -d
```

等待几分钟。你可以使用 `docker compose logs -f oap` 来查看服务端的启动日志。如果看到类似 `SkyWalking OAP Server started` 的信息，说明启动成功了。



**4.访问 UI 界面:**验证服务端是否正常运行.

打开宿主机的浏览器，访问 `http://192.168.146.130:8080`。如果能看到 SkyWalking 的控制台，说明服务端和 UI 都已经就绪。



**5. 微服务接入示例 (Java Agent)**

应用接入时，需下载与 OAP 版本匹配的 `skywalking-java-agent`，并在启动 Java 应用时挂载：

```bash
-javaagent:E:\app\apache-SkyWalking\apache-skywalking-java-agent-9.6.0\skywalking-agent\skywalking-agent.jar -Dskywalking.agent.service_name=RateHub -Dskywalking.collector.backend_service=192.168.146.130:11800
```



**更优实践建议**

把所有 `-D` 参数塞到 IDEA 的 **VM options** 会显得很臃肿。更干净的做法是直接修改解压目录下的配置文件：

1. 打开 `E:\app\apache-SkyWalking\apache-skywalking-java-agent-9.6.0\skywalking-agent/config/agent.config`。

2. 找到并修改其中的两个配置项：

   ```
   agent.service_name=${SW_AGENT_NAME:my-boot-service}
   collector.backend_service=${SW_AGENT_COLLECTOR_BACKEND_SERVICES:192.168.146.130:11800}
   ```

3. 这样修改完后，你在 IDEA 的 **VM options** 框里**只需写这一段**即可：

   ```
   -javaagent:E:\app\apache-SkyWalking\apache-skywalking-java-agent-9.6.0\skywalking-agent\skywalking-agent.jar
   ```

