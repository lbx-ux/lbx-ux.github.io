---
title: 5.Http请求
description: HttpClientJDK11正式引入了原生的java.net.http.HttpClient，彻底替代了古老且难用的HttpURLConnection。它原生支持HTTP/2、WebSocket以及
pubDate: 2026-10-10
series: 工具
order: 5
source: 工具/5.Http请求
---

# HttpClient

JDK 11 正式引入了原生的 `java.net.http.HttpClient`，彻底替代了古老且难用的 `HttpURLConnection`。它原生支持 **HTTP/2**、**WebSocket** 以及**同步与异步非阻塞调用**，无需引入任何第三方依赖（如 Apache HttpClient 或 OkHttp）。

## 三要素架构

`HttpClient` 采用了标准的**建造者模式（Builder Pattern）**，主要由以下三个核心类协同工作：

- **`HttpClient`：** 全局客户端入口，负责配置和管理连接池、SSL/TLS 上下文、重定向策略、全局超时和代理。通常在应用中作为**单例**复用。
- **`HttpRequest`：** 代表单次 HTTP 请求，用于设置请求 URL、HTTP 方法（GET/POST/PUT/DELETE）、请求头（Headers）、请求超时以及请求体（Body）。
- **`HttpResponse<T>`：** 代表 HTTP 响应，包含状态码（Status Code）、响应头以及由 `BodyHandler` 解析转换后的响应体数据。



## 代码示例

**1. 同步 GET 请求**

```java
// 1. 构建 HttpClient (建议声明为全局单例)
HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)) // 连接建立超时时间
        .followRedirects(HttpClient.Redirect.NORMAL) // 自动跟随重定向
        .build();

// 2. 构建 HttpRequest
HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://api.weixin.qq.com/sns/jscode2session?appid=123&secret=456"))
        .timeout(Duration.ofSeconds(5)) // 请求响应超时时间
        .header("Accept", "application/json")
        .GET()
        .build();

// 3. 发送同步请求，并使用 BodyHandlers.ofString() 将响应体转为字符串
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

System.out.println("状态码: " + response.statusCode());
System.out.println("响应体内容: " + response.body());
```



**2. 异步 POST 请求 (发送 JSON 数据)**

通过 `.sendAsync()` 方法返回 `CompletableFuture`，实现非阻塞的响应式调用：

```java
String jsonBody = "{\"username\": \"admin\", \"password\": \"123456\"}";

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://example.com/api/login"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(jsonBody)) // 写入请求体
        .build();

// 异步发送，链式回调处理结果
client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
        .thenApply(HttpResponse::body)
        .thenAccept(body -> System.out.println("异步返回结果: " + body))
        .exceptionally(ex -> {
            System.err.println("请求发生异常: " + ex.getMessage());
            return null;
        });
```



**请求体与响应体处理器**

为了灵活处理不同类型的数据（如文本、文件、字节流），`HttpClient` 引入了 **Publisher/Handler** 机制：

| **机制**                           | **常用工厂方法**                                             | **适用场景**                                                 |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **`BodyPublishers`**  (写入请求体) | `ofString(String)`  `ofFile(Path)`  `ofByteArray(byte[])`  `noBody()` | 将 Java 内存对象转为字节流发送给服务端（如上传文件、发送 JSON/表单）。 |
| **`BodyHandlers`**  (解析响应体)   | `ofString()`  `ofFile(Path)`  `ofByteArray()`  `ofInputStream()` | 指定如何接收和解析服务端返回的数据。支持直接下载文件到磁盘或按流读取。 |



**最佳实践与性能建议**

- **必须单例复用：** `HttpClient` 内部自带连接池和线程池。**切忌每次发送请求都重新 `HttpClient.newHttpClient()`**，否则会导致大量 TCP 连接无法释放而造成内存泄漏。在 Spring 环境中应将其配置为 `@Bean`。
- **大文件流式处理：** 处理大文件下载时，避免使用 `HttpResponse.BodyHandlers.ofString()`，应使用 `ofFile(Path)` 直接保存到本地，或者使用 `ofInputStream()` 进行流式读取，防止内存溢出（OOM）。
- **HTTP/2 自动协商：** 默认启用了 HTTP/2 协议，如果目标服务器支持 HTTP/2，会自动提升传输效率（多路复用）；如果不支持，会自动降级为 HTTP/1.1。



# HttpRequest

 **hutool 的 `HttpRequest`/`HttpResponse`**（`cn.hutool.http` 包）——它是对 JDK HttpURLConnection 的封装，链式 API、极简。

## 1. 核心 API 总览

### 1. HttpRequest 

**发送请求的链式构建器**

```java
HttpResponse response = HttpRequest.get(url)      // 请求方式：get/post/put/delete
        .form(map)                                // 表单参数（GET 拼 query，POST 放 body）
        .body(jsonStr)                            // 请求体（配合 POST 发 JSON）
        .header("Authorization", token)           // 请求头
        .timeout(20000)                           // 超时（毫秒）
        .execute();                               // 发送，拿到响应
```

### 2. HttpResponse

**响应对象**

```java
response.getStatus();   // HTTP 状态码 int（200/404/500…）
response.isOk();        //  response.isOk() 就是判断这次 HTTP 请求是不是成功到达并正常响应了——具体说，就是检查 HTTP 状态码是不是 200。
response.body();        // 响应体字符串 ★ 最常用
response.bodyBytes();   // 字节（下载文件用）
```

------

## 2. 用法

| 传参方式    | hutool 写法       | 细节                                                         |
| ----------- | ----------------- | ------------------------------------------------------------ |
| JSON 请求体 | `.body(jsonStr)`  | Content-Type 自动为 application/json；JSON 对象要 `.toString()` |
| 查询参数    | `.form(map)`      | ⚠️ 仅 **GET** 时拼到 URL 后面                                 |
| 表单        | `.form(map)`      | **POST** 时放进请求体（Content-Type 自动为 x-www-form-urlencoded） |
| 路径变量    | 直接拼 URL 字符串 | 如 `LOGIN_URL + "/" + id`。                                  |

### 1. GET + 表单参数

```java
// WechatServiceImpl#getOpenid：GET + form 会把参数拼到 URL 后面
// 最终：https://api.weixin.qq.com/sns/jscode2session?appid=xx&secret=xx&js_code=xx&grant_type=xx
Map<String, Object> requestParam = MapUtil.<String, Object>builder()
        .put("appid", appid)
        .put("secret", secret)
        .put("js_code", code)
        .put("grant_type", "authorization_code")
        .build();
HttpResponse response = HttpRequest.get(LOGIN_URL)
        .form(requestParam)
        .timeout(20000)
        .execute();
```

要点：**GET 时 `.form()` 的参数拼成 query string**，不是请求体。



### 2. POST + JSON 请求体 

```java
JSONObject body = JSONUtil.parseObj("{\"orderId\": 1001}");

HttpResponse response = HttpRequest.post("http://sl-express-ms-oms/order/pickup")
        .header("Authorization", token)
        .body(body.toString())       // JSON 字符串放请求体
        .execute();
```

要点：**POST 时 `.body()` 发 JSON**（Content-Type 自动带 application/json），`.form()` 则发表单编码——二者选一，别混用。



### 3. GET + URL 拼参

```java
// access_token 直接拼在 URL 上
HttpResponse response = HttpRequest.post(PHONE_URL + accessToken)
        .body(jsonStr)               // 微信 getPhone 的 code 放 body
        .execute();
```



### 4. 带请求头 

```java
HttpRequest.get(url)
        .header("Authorization", token)          // 单个头
        .headerMap(headerMap)                    // 批量头
        .execute();
```



**常见的坑**

| 坑                           | 说明                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `.timeout()` 单位是**毫秒**  | 20000 = 20s；不设的话 hutool 有默认超时，调第三方建议显式设置 |
| GET + form ≠ POST + form     | GET 拼 URL，POST 放表单体；发 JSON 一律用 `.body()`          |
| `response.body()` 只能读一次 | 拿到后先存变量，别重复调（流式读取）                         |
| URL 里的中文/特殊字符        | 用 `URLUtil.encodeAll()` 编码，微信 openid 拼参时偶尔踩      |
| 忘了 `.execute()`            | 链式只是构建，execute 才真正发请求                           |
| 项目风格的异常选择           | 调外部接口失败抛 `SLWebException`（BFF 层面向用户），别抛 `SLException` |