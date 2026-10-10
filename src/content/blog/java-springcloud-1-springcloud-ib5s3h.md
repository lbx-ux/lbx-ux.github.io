---
title: 1.SpringCloud
description: SpringCloud组件组件类别核心组件主要作用学习重点::::1.服务注册与发现Nacos(推荐),Eureka服务启动时自动注册，其他服务通过它获取服务地址，无需硬编码IP。Nacos：配置与服
pubDate: 2026-09-01
series: SpringCloud
order: 1
source: Java后端/SpringCloud/1.SpringCloud.md
---

**Spring Cloud 组件**

| 组件类别                  | 核心组件                                      | 主要作用                                                     | 学习重点                                                     |
| :------------------------ | :-------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **1. 服务注册与发现**     | **Nacos** (推荐), Eureka                      | 服务启动时自动注册，其他服务通过它获取服务地址，无需硬编码 IP。 | **Nacos**：配置与服务注册中心一体，支持 CP/AP 切换，是 Alibaba 体系核心。<br>**Eureka**：了解其高可用配置、服务续约/剔除等机制。 |
| **2. 服务调用与负载均衡** | **OpenFeign** + **Spring Cloud LoadBalancer** | **OpenFeign**：以声明式（类似写接口）简化微服务间的 HTTP 调用。<br>**LoadBalancer**：在客户端实现负载均衡，将请求分发到不同服务实例。 | 掌握 **OpenFeign** 的基本使用和参数配置。了解常见的负载均衡策略（如轮询、随机、权重）。 |
| **3. 服务容错与降级**     | **Sentinel** (推荐), Hystrix                  | 防止单个服务故障引发“雪崩效应”。提供**熔断、降级、限流**等保护机制。 | **Sentinel**：功能更强大，提供可视化控制台，是 Alibaba 体系核心。<br>**Hystrix**：了解其线程隔离、服务降级等基本概念。 |
| **4. API 网关**           | **Spring Cloud Gateway**                      | 作为微服务世界的“大门”，负责**路由转发**、**身份认证**、**限流**等。 | 掌握**路由（Route）**、**断言（Predicate）** 和**过滤器（Filter）** 三大核心概念。 |
| **5. 配置中心**           | **Nacos Config**, Spring Cloud Config         | 将项目的配置文件**集中管理**，支持**动态刷新**，无需重启服务。 | 学习如何将配置存储在 Nacos 或 Git 中，并实现配置的热更新。   |

> **关于技术选型**：目前国内企业更倾向于使用 **Spring Cloud Alibaba** 技术栈（如 Nacos、Sentinel）。你可以直接学习这个体系，它更符合国内的生产实践。



理论学习后，必须通过项目来巩固。可以从一个**完整的电商项目**入手，在实践中串联所有组件：

*   **服务拆分**：按业务模块（如用户、商品、订单）拆分服务。
*   **服务治理**：使用 **Nacos** 实现服务的注册与发现。
*   **服务通信**：使用 **OpenFeign** 实现服务间的远程调用。
*   **API 网关**：使用 **Spring Cloud Gateway** 统一路由前端请求。
*   **服务容错**：使用 **Sentinel** 为关键服务配置限流和熔断规则。
*   **配置管理**：使用 **Nacos Config** 实现配置的集中管理与动态刷新。



**依赖引入**

**版本组合**

| 框架                     | 推荐版本                                  |
| :----------------------- | :---------------------------------------- |
| **Spring Boot**          | `3.2.10`（已确定）                        |
| **Spring Cloud**         | `2023.0.x`（如 `2023.0.1` 或 `2023.0.2`） |
| **Spring Cloud Alibaba** | `2023.0.1.2`                              |



**推荐的项目结构（多模块 Maven 项目）**

```
your-project (父工程)
├── pom.xml (父POM，管理所有版本)
├── common-module (通用模块：工具类、常量等)
├── service-a (微服务A)
│   └── pom.xml (继承父POM，无需重复声明版本)
├── service-b (微服务B)
└── gateway (API网关，可选)
```



**父工程 `pom.xml` 配置**

在父工程的 `pom.xml` 中通过 `<dependencyManagement>` 统一管理所有版本。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- 1. 引入 Spring Boot 父POM -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.10</version>
        <relativePath/>
    </parent>

    <groupId>com.yourcompany</groupId>
    <artifactId>your-project</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    <!-- 2. 子模块列表 -->
    <modules>
        <module>common-module</module>
        <module>service-a</module>
        <module>service-b</module>
        <module>gateway</module>
    </modules>

    <properties>
        <java.version>17</java.version> <!-- 必须 JDK 17+  -->
        <spring-cloud.version>2023.0.2</spring-cloud.version> <!-- 或 2023.0.1 -->
        <spring-cloud-alibaba.version>2023.0.1.2</spring-cloud-alibaba.version>
    </properties>

    <!-- 3. 在 dependencyManagement 中导入 BOM -->
    <dependencyManagement>
        <dependencies>
            <!-- Spring Cloud BOM -->
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <!-- Spring Cloud Alibaba BOM -->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>${spring-cloud-alibaba.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```



**子模块（微服务）`pom.xml` 配置**

子模块只需继承父工程，并添加所需的 `starter` 依赖，**无需再写版本号**。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.yourcompany</groupId>
        <artifactId>your-project</artifactId>
        <version>1.0.0</version>
    </parent>

    <artifactId>service-a</artifactId>

    <dependencies>
        <!-- Spring Boot Web 起步依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Cloud Alibaba Nacos 服务注册与发现 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>

        <!-- Spring Cloud Alibaba Nacos 配置中心 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
        </dependency>

        <!-- Spring Cloud OpenFeign 声明式服务调用（可选） -->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>

        <!-- Spring Cloud Alibaba Sentinel 流量治理（可选） -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
        </dependency>

        <!-- 通用模块（如有） -->
        <dependency>
            <groupId>com.yourcompany</groupId>
            <artifactId>common-module</artifactId>
            <version>${project.version}</version>
        </dependency>
    </dependencies>

</project>
```

