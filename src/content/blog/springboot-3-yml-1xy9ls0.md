---
title: 3.yml配置文件
description: 大小写敏感数值前边必须有空格，作为分隔符使用缩进表示层级关系，缩进时，不允许使用Tab键，只能用空格缩进的空格数目不重要，只要相同层级的元素左侧对齐即可
pubDate: 2026-10-10
series: SpringBoot
order: 3
source: SpringBoot/3.yml配置文件
---

## 一.yml配置文件

### 1.基本语法

* 大小写敏感
* **数值前边必须有空格，作为分隔符**
* 使用缩进表示层级关系，缩进时，不允许使用Tab键，只能用空格
* 缩进的空格数目不重要，只要相同层级的元素左侧对齐即可

**配置文件优先级**：

`application.properties`  >  `application.yml`   >  `application.yaml`

**修改访问端口和默认路径：**

```yml
默认的访问端口是8080 ，默认的访问路径为空
server:
 port: 9191
 servlet:
  context-path: /start
```



### 2.配置文件

```yml
spring:
  application:
    name: tlias 这个是当前项目的名字
  datasource: 
    url: jdbc:mysql://localhost:3306/tlias 连接的数据库的名字
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root 数据库账号
    password: fan810523 数据库密码
  servlet:
    multipart: 与文件上传有关
      max-file-size: 10MB 上传的最大单个文件大小
      max-request-size: 10MB 最大请求大小（包括所有文件和表单数据）

mybatis:
  mapper-locations: classpath*:/mapper/**/*.xml  # Mapper XML 位置
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl 配置Mybatis的日志输出，会把执行的SQL打印到控制台，不推荐使用
    map-underscore-to-camel-case: true 开启下划线转驼峰命名自动映射:数据库字段user_name会自动匹配java实体类的userName属性
    
pagehelper:
  # 数据库方言
  helper-dialect: mysql
  # 分页合理化参数
  reasonable: true
  # 默认分页参数
  page-size-zero: false
  reasonable: true
   # 支持通过Mapper接口参数传递分页参数
  support-methods-arguments: true
  params: count=countSql
  reasonable：分页合理化参数，默认值为false。当该参数设置为true时，pageNum<=0时会查询第一页，pageNum>pages（超过总数时），会查询最后一页。默认false 时，直接根据参数进行查询


mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 开启 SQL 日志，不推荐使用
    map-underscore-to-camel-case: true                      # 下划线转驼峰
  global-config:
    db-config:
      id-type: auto          # 主键策略：auto 表示数据库自增
      logic-delete-field: deleted  # 逻辑删除字段
      logic-delete-value: 1        # 删除标记值
      logic-not-delete-value: 0    # 未删除标记值
  mapper-locations: classpath*:/mapper/**/*.xml  # Mapper XML 位置
  
  
阿里云OSS
aliyun:
  oss:
    endpoint: https://oss-cn-beijing.aliyuncs.com OSS的访问端点
    bucketName: java-ai123w 存储体名称
    region: cn-beijing 地域
```



### 3.日志配置

```yml
logging:
  level:
    com.itheima: debug
    org.springframework.jdbc.support.JdbcTransactionManager: debug
  pattern:
    dateformat: HH:mm:ss
```



**1）设置特定包的日志级别 (logging.level)**

```yml
logging:
  level:
    com.itheima: debug
```

- **含义：** 将 `com.itheima` 这个包（以及它的所有子包）的日志输出级别设置为了 `debug` 级别。
- **作用**
  - 在开发 MyBatis 或 MyBatis-Plus 项目时，默认的日志级别通常是 `info`，框架为了保持控制台整洁，不会把底层执行的 SQL 语句打印出来。如果你想**在控制台看到程序究竟执行了什么 SQL 语句、传入了什么参数**，最常见的做法就是把 Mapper 接口所在的包（这里是 `com.itheima`）的日志级别调低到 `debug`。
  - **如果不加这段配置（Spring Boot 默认是 INFO 级别），你代码里写的 `log.debug(...)` 就如同石沉大海，控制台根本不会显示。** 加上这段配置后，只要你的代码在 `com.itheima` 包及其子包下，这些调试信息就会全部放行。

**2）自定义日志的时间格式 (logging.pattern)**

```yml
logging:
  pattern:
    dateformat: HH:mm:ss
```

- **含义：** 自定义了控制台打印日志时的时间戳格式，这里的 `HH:mm:ss` 表示只显示“**时:分:秒**”。
- **作用：** Spring Boot 默认的日志时间格式是很长的一串，包含年月日（比如 `2023-10-27 15:30:45.123`）。配置了这个之后，你控制台打印出来的日志前面就只会带上 `15:30:45` 这样的时间。通常是为了让控制台输出更简洁，节省屏幕空间。

**3）JdbcTransactionManager: debug**

```yml
logging:
  level:
    org.springframework.jdbc.support.JdbcTransactionManager: debug
```

- **作用：** 它的目的是**打印 Spring 数据库事务的生命周期**。
- **原理：**它**不会打印 SQL 语句**，而是告诉你系统什么时候“创建了事务”、“提交了事务”或者“回滚了事务”。
- **适用场景：** 当你怀疑方法上的 `@Transactional` 注解没生效，或者排查数据回滚异常、死锁等问题时开启。



## 二.yml配置信息

### 1.@Value 注解

**适合获取单个配置**

`@Value` 是最直接、最简单的方式，适合用来注入某一个特定的、不常变动的底层基础配置项。

**语法格式：** `@Value("${配置路径:默认值}")`

```java
@RestController
public class ConfigController {

    // 获取 yml 中的项目名称，如果没有配置则默认为 "default-app"
    @Value("${spring.application.name:default-app}")
    private String applicationName;

    // 获取自定义的阿里云 OSS 桶名称
    @Value("${aliyun.oss.bucketName}")
    private String bucketName;

    @GetMapping("/config/info")
    public String getConfigInfo() {
        return "当前项目名: " + applicationName + ", OSS桶名: " + bucketName;
    }
}
```

- **注意：** 使用 `@Value` 的类必须是交给 Spring 容器管理的 Bean（例如带有 `@Component`、`@Service`、`@RestController` 等注解的类），否则注入会失效。



### 2.  @ConfigurationProperties 注解

**结构化批量绑定，强烈推荐**

当 yml 中有一组相关联的配置（比如数据库连接池参数、第三方服务的各种 key、或者多项业务参数）时，使用 `@Value` 一个个去点名注入就显得很臃肿。

此时，推荐将这组配置**批量绑定到一个专有的实体类/配置类**中。

**第一步：引入依赖**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>
</dependency>
```

当你在 `application.yml` 中输入 `aliyun.oss.` 时，IDEA 会像识别 Spring Boot 官方配置一样，**自动弹出下拉框，提示你 `endpoint`、`bucketName` 等属性，并且如果你在 Java 类里写了注释，提示框里还会显示中文注释**

**第二步：创建配置属性类**

```java
@Data // 自动生成 getter/setter 方法
@Component // 交给 Spring 容器管理
@ConfigurationProperties(prefix = "aliyun.oss") // 指定 yml 中的前缀
public class AliOssProperties {
    // 属性名需要与 yml 中的 key 保持一致（Spring 支持驼峰与下划线/中划线的自动转换）
    private String endpoint;
    private String bucketName;
    private String region;
}
```

**第三步：在需要用的地方直接注入该对象**

```java
@RestController
@RequiredArgsConstructor
public class OssController {
    private final AliOssProperties aliOssProperties;
    public void doSomething() {
        // 直接通过对象获取属性，代码极其优雅且不易出错
        String bucket = aliOssProperties.getBucketName();
        String endpoint = aliOssProperties.getEndpoint();
        // 执行上传逻辑...
    }
}
```

- **优势：** 支持面向对象的操作、支持松散绑定（例如 yml 里的 `bucket-name` 能自动映射到 Java 的 `bucketName` 属性上）、利于后期维护和重构。



### **3.  Environment接口**

**动态获取配置**

Spring 提供的 `Environment` 接口代表了当前应用运行的环境，它内部保存了所有的配置源。如果某些配置项需要**动态决定**去获取哪一个 key，或者在非通用组件中临时读取，可以使用它。

**示例代码：**

```java
@Component
@RequiredArgsConstructor
public class EnvironmentConfigReader {

    private final Environment environment;

    public void printConfig() {
        // 动态获取配置
        String appName = environment.getProperty("spring.application.name");
        
        // 获取配置并指定返回类型，若不存在则返回默认值
        Integer maxFileSize = environment.getProperty("spring.servlet.multipart.max-file-size", Integer.class, 10);
        
        System.out.println("App Name: " + appName);
    }
}
```

**总结与选型建议**

| **方式**                       | **适用场景**                                                 | **优点**                                                     |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`@Value`**                   | 临时零散读取、个别全局开关、单项常量注入。                   | 简单快捷，即写即用。                                         |
| **`@ConfigurationProperties`** | 模块化配置、拥有相同前缀的一组复杂参数（如 OSS、Redis、Database）。 | 结构清晰、类型安全、支持复杂嵌套（如 List、Map）、契合面向对象。 |
| **`Environment`**              | 框架底层底层开发、动态拼接 key 查找配置、判断当前 active profile 的场景。 | 灵活度最高，无需提前硬编码属性名。                           |



## 三.多环境配置

这种方式结构最清晰，便于维护和版本控制。你需要创建多个独立的文件，命名规则必须遵循：`application-{profile}.yml`。

带有环境后缀的特定配置文件（如 `application-dev.yml`）优先级永远高于基础全局文件（`application.yml`）

### 1. 基础配置文件：`application.yml`

存放所有环境**共用**的配置（如项目名、MyBatis 映射路径、文件上传大小限制等），并在此指定当前激活的环境。

```yml
spring:
  application:
    name: rentify-backend
  profiles:
    # 激活开发环境，若要切换到生产环境改为 prod
    active: dev 

# 共用配置
mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
  configuration:
    map-underscore-to-camel-case: true
```

### 2. 开发环境配置文件：`application-dev.yml`

存放本地开发或虚拟机测试的专属配置。例如本地连接的数据库和 Redis。

```yml
server:
  port: 8080 # 开发环境使用 8080 端口

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/rentify_db?useSSL=false&serverTimezone=UTC
    username: root
    password: dev_password
  data:
    redis:
      host: localhost
      port: 6379
```

### 3. 生产环境配置文件：`application-prod.yml`

存放云服务器部署时的正式配置，通常包含更严格的安全策略和不同的 IP 地址。

```
server:
  port: 9090 # 生产环境为了安全或避免冲突，更换端口

spring:
  datasource:
    url: jdbc:mysql://10.0.0.15:3306/rentify_db?useSSL=true&serverTimezone=Asia/Shanghai
    username: prod_root
    password: prod_secure_password_999
  data:
    redis:
      host: 10.0.0.16
      port: 6379
      password: redis_secure_pass
```

