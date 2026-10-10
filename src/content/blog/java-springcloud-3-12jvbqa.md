---
title: 3.远程调用
description: 一.RestTemplateRestTemplate是Spring提供的同步，异步HTTP客户端，它封装了HTTP请求的细节，让您能用Java方法风格调用RESTful接口，并自动将响应转换成对象。1
pubDate: 2026-09-01
series: SpringCloud
order: 6
draft: true
source: Java后端/SpringCloud/3.服务调用.md
---

# 一. RestTemplate

`RestTemplate` 是 Spring 提供的**同步，异步 HTTP 客户端**，它封装了 HTTP 请求的细节，让您能用 Java 方法风格调用 RESTful 接口，并自动将响应转换成对象。

## 1. 使用方法

**1）创建实例**

最简单的创建方式（Spring Boot 项目中）：
```java
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```
然后在需要调用的地方注入即可。



**2）发起 GET 请求**

```java
// 方式1：直接返回响应体（转换为指定类型）
String result = restTemplate.getForObject("http://localhost:8080/api/users/1", String.class);
User user = restTemplate.getForObject("http://localhost:8080/api/users/1", User.class);

// 方式2：返回包含状态码、头信息的 ResponseEntity
ResponseEntity<User> response = restTemplate.getForEntity("http://localhost:8080/api/users/1", User.class);
HttpStatus status = response.getStatusCode();
User body = response.getBody();
```



**3）发起 POST 请求**

```java
User newUser = new User("John", 30);
// 提交 JSON 对象，并返回响应体
User created = restTemplate.postForObject("http://localhost:8080/api/users", newUser, User.class);

// 或返回完整响应
ResponseEntity<User> response = restTemplate.postForEntity("http://localhost:8080/api/users", newUser, User.class);
```



**4）更通用的 `exchange()` 方法**

适用于所有 HTTP 方法（PUT、DELETE 等），并能灵活设置请求头。
```java
// 设置请求头
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON);
HttpEntity<User> requestEntity = new HttpEntity<>(newUser, headers);

// 执行 PUT 请求
ResponseEntity<Void> response = restTemplate.exchange(
    "http://localhost:8080/api/users/{id}",
    HttpMethod.PUT,
    requestEntity,
    Void.class,
    "1"  // 替换路径变量 {id}
);
```



## 2.  传递参数

**1）路径变量（PathVariable）**

使用 `{占位符}`，后面用可变参数或 Map 填充。
```java
restTemplate.getForObject("http://localhost:8080/users/{id}", User.class, 123);
// 或使用 Map
Map<String, Object> params = new HashMap<>();
params.put("id", 123);
restTemplate.getForObject("http://localhost:8080/users/{id}", User.class, params);
```



**2）查询参数（RequestParam）**

直接拼接在 URL 后面，或使用 `UriComponentsBuilder` 构建。
```java
String url = "http://localhost:8080/search?name={name}&age={age}";
restTemplate.getForObject(url, List.class, "John", 30);
```



**3）请求体（RequestBody）**

如上例，直接传入对象即可，`RestTemplate` 默认使用 Jackson 序列化为 JSON。



## 3. 设置请求头

通过 `HttpEntity` 携带。
```java
HttpHeaders headers = new HttpHeaders();
headers.set("Authorization", "Bearer token");
headers.setContentType(MediaType.APPLICATION_JSON);
HttpEntity<?> entity = new HttpEntity<>(headers);
ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
```



# 二. OpenFeign

我们利用Nacos实现了服务的治理，利用RestTemplate实现了服务的远程调用。但是远程调用的代码太复杂了：

```java
        ResponseEntity<List<ItemDTO>> response = restTemplate.exchange(
                instance.getUri()+"/items?ids={ids}",    //请求路径
                HttpMethod.GET,                              //请求方式
                null,                                        //请求实体
                new ParameterizedTypeReference<List<ItemDTO>>() {}, //返回值类型
                Map.of("ids", CollUtils.join(itemIds, ","))   //请求参数
        );
        ...
```

而且这种调用方式，与原本的本地方法调用差异太大，编程时的体验也不统一，一会儿远程调用，一会儿本地调用。

因此，我们必须想办法改变远程调用的开发模式，让**远程调用像本地方法调用一样简单**。而这就要用到OpenFeign组件了。

其实远程调用的关键点就在于四个：

* 请求方式

* 请求路径

* 请求参数

* 返回值类型

所以，OpenFeign就利用SpringMVC的相关注解来声明上述4个参数，然后基于动态代理帮我们生成远程调用的代码





## 1. 快速入门

我们还是以cart-service中的查询我的购物车为例。因此下面的操作都是在cart-service中进行。

### 1. 引入依赖

在`cart-service`服务的pom.xml中引入`OpenFeign`的依赖和`loadBalancer`依赖：

```xml
  <!--openFeign-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-openfeign</artifactId>
  </dependency>
  <!--负载均衡器-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-loadbalancer</artifactId>
  </dependency>
```



### 2. 启用OpenFeign

接下来，在`cart-service`的`CartApplication`启动类上添加注解**@EnableFeignClients**，启动OpenFeign功能：

```java
@EnableFeignClients
@MapperScan("com.hmall.cart.mapper")
@SpringBootApplication
public class CartApplication {
    public static void main(String[] args) {
        SpringApplication.run(CartApplication.class, args);
    }
}
```



### 3. 编写OpenFeign客户端

在`cart-service`中，定义一个新的接口，编写Feign客户端，写这个就和在ItemController写的那个方法一样

其中代码如下：

```java
@FeignClient("item-service")
public interface ItemClient {
    @GetMapping("/items")
    List<ItemDTO> queryItemByIds(@RequestParam("ids") Collection<Long> ids);
}
```

这里只需要声明接口，无需实现方法。接口中的几个关键信息：

* `@FeignClient("item-service")` ：声明服务名称

* `@GetMapping` ：声明请求方式

* `@GetMapping("/items")` ：声明请求路径

* `@RequestParam("ids") Collection<Long> ids` ：声明请求参数

* `List<ItemDTO>` ：返回值类型



Feign 底层自动帮你做了这些事：

1. **服务发现**：从 Nacos 根据 `item-service` 名拿到实例列表
2. **负载均衡**：挑一个实例（默认轮询）
3. **请求发送**：把方法参数拼成 HTTP 请求发出去
4. **响应转换**：把 JSON 响应反序列化成 `List<ItemDTO>`
5. **错误处理**：HTTP 错误码可以映射成异常

有了上述信息，OpenFeign就可以利用动态代理帮我们实现这个方法，并且向`http://item-service/items`发送一个`GET`请求，携带ids为请求参数，并自动将返回值处理为`List<ItemDTO>`。

我们只需要直接调用这个方法，即可实现远程调用了。



### 4. 使用FeignClient

最后，我们在`cart-service`的`com.hmall.cart.service.impl.CartServiceImpl`中改造代码，直接调用`ItemClient`的方法：

```java
@Service
@RequiredArgsConstructor
public class CartServiceImpl extends ServiceImpl<CartMapper, Cart> implements ICartService {
    private final ItemClient itemClient;
    private void handleCartItems(List<CartVO> vos) {
        // 1.获取商品id
        Set<Long> itemIds = vos.stream().map(CartVO::getItemId).collect(Collectors.toSet());
        // 2.查询商品
        List<ItemDTO> items = itemClient.queryItemByIds(itemIds);
        ...
    }
}
```

openFeign替我们完成了服务拉取、负载均衡、发送http请求的所有工作，是不是看起来优雅多了。





## 2. 连接池

OpenFeign 本身不管理 HTTP 连接，它只负责把接口方法翻译成 HTTP 请求。真正发请求的是底层的 **Client 实现**，连接池也得配在这个层面。

其底层支持的http客户端实现包括：

- HttpURLConnection：默认实现，不支持连接池
- Apache HttpClient ：支持连接池
- OKHttp：支持连接池

### 1. 作用

TCP 连接池的核心作用就一句话：**让多个 HTTP 请求复用同一条 TCP 连接，省掉反复创建和关闭连接的开销**。

**没有连接池时每次请求在做什么**

假设你的 `cart-service` 要调 `item-service`，发起一次 HTTP 请求，底层其实经历了这些：

1. **DNS 解析** — 域名转 IP
2. **TCP 三次握手** — 客户端和服务端打招呼建立连接
3. **TLS 握手**（如果是 HTTPS）— 交换密钥
4. **发送 HTTP 请求** — 真正的业务数据
5. **等待响应**
6. **TCP 四次挥手** — 断开连接

如果每次请求都走完整流程，那第 2~3 步和第 6 步就是纯额外开销，和业务本身无关。微服务之间可能毫秒级就调一次下游，握手挥手却占了几十毫秒。



**连接池怎么解决**

连接池在内存里维护一组**已经建立好的 TCP 连接**。请求来时从池子里取一条空闲连接，用完不是关掉，而是**放回池子**给下一个请求用。

**一次握手，多次复用**。就像公司的内线电话，打完不用拆线，下一个人直接拿起来说。



**在微服务场景下为什么特别重要**

微服务的特征就是"高频、短连接"——一个接口内部可能要串行调三四个下游服务，QPS 一高并发量惊人：

- **没有连接池**：1000 并发 = 1000 个 TCP 连接瞬间建立，OS 端口很快耗尽（`TIME_WAIT` 堆积），服务端也扛不住。大量 CPU 花在握手而不是处理业务上。
- **有连接池**：1000 并发可能只维持 50 条连接，交替复用。系统压力骤降，延迟也更稳定。



**连接池的几个关键行为**

- **最大连接数**（`maxConnTotal`）：池子最多养多少条连接。不是越大越好，太多闲置连接占内存，且对下游服务端也是压力。
- **每个路由最大连接数**（`maxConnPerRoute`）：比如你要调 `item-service`（2 个实例）和 `user-service`（3 个实例），这个参数限制"针对同一个 IP:端口"最多开几条。防止某个下游把连接全占满。
- **连接超时**：从池子取连接等多久，池子空了不能无限等。
- **存活时间**：一条连接在池子里躺多久会被清理，防止占着茅坑不拉屎，也避免断掉的连接被复用。

连接池把"每次请求都重新交朋友"变成"交一次朋友，反复合作"——省掉握手挥手的时间、减少端口和线程消耗、让系统在高并发下更扛得住。微服务间调用频率高，这个优化是必须的，不是可选的。生产环境必须换成带连接池的客户端，主流两个选择：**Apache HttpClient 5**（推荐）或 **OKHttp**。



### 2. Apache HttpClient 5

Spring Cloud 2020.x 之后官方主推 HttpClient 5（简称 hc5）。

#### 1. 引入依赖

```xml
<!-- OpenFeign 已经引入的情况下，只需要加 hc5 支持 -->
<dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-hc5</artifactId>
</dependency>
```

注意不需要单独引入 `httpclient5` 的依赖，`feign-hc5` 会把它传递进来。



#### 2. 开启配置

`application.yml`：

```yaml
spring:
  cloud:
    openfeign:
      httpclient:
        hc5:
          enabled: true    # 启用 HttpClient 5
      client:
        config:
          default:         # default 表示全局配置，也可以写具体的服务名
            connectTimeout: 5000   # 连接超时（毫秒）：TCP 连接建立时间
            readTimeout: 10000    # 读取超时（毫秒）：服务端响应时间
```



`default` 是 OpenFeign 配置里的一个**保留关键字**，意思是**"所有 FeignClient 的默认配置"**。如果某个下游服务需要特殊处理（更长的超时、重试策略等），就在同级再写一个**具体的服务名**节点来覆盖。

**全局配置**，所有 `@FeignClient` 都用这套超时：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:              # ← 保留关键字，表示"所有服务的默认配置"
            connectTimeout: 5000
            readTimeout: 10000
```

但不同下游服务的性能不一样，比如调 `item-service` 很快，调 `order-service` 很慢。可以**针对具体服务名覆盖**：

```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connectTimeout: 5000
            readTimeout: 10000
          item-service:         # ← 这里写具体的 FeignClient 服务名
            readTimeout: 3000   # item-service 单独改成 3 秒
          order-service:        # ← 另一个服务
            connectTimeout: 10000
            readTimeout: 30000
```

**优先级规则**

**具体服务名配置 > `default` 全局配置**

- `item-service` 会用自己的 `readTimeout: 3000`，其他的沿用 `default`
- `order-service` 会用自己的连接超时和读取超时
- 其他没单独指定的 FeignClient，全部沿用 `default` 里的 5 秒 / 10 秒

**对应到代码**

```java
@FeignClient("item-service")   // 服务名对应配置里的 item-service
public interface ItemClient { ... }

@FeignClient("order-service")  // 服务名对应配置里的 order-service
public interface OrderClient { ... }
```





#### 3. 连接池参数调优

如果需要自定义连接池大小，写一个配置类：

```java
//自动装配
@Configuration
public class FeignHttpClientConfig {
    
    @Bean
    public HttpClient5FeignConfigurationCustomizer httpClientCustomizer() {
        return builder -> builder.setPoolConcurrencyPolicy(PoolConcurrencyPolicy.STRICT)
                .setConnPoolPolicy(PoolReusePolicy.LIFO)
                .setMaxConnTotal(200)        // 整个连接池最大连接数
                .setMaxConnPerRoute(50)      // 每个目标服务（路由）最大连接数
                .setConnectionTimeToLive(30, TimeUnit.SECONDS);  // 连接存活时间
    }
}
```

参数含义：

- `maxConnTotal`：整个进程最多保持多少个 TCP 连接。如果你的微服务要调 10 个下游服务，这个值设大点。
- `maxConnPerRoute`：针对**同一个目标服务**的最大连接数。比如调 `item-service` 最多同时开 50 个连接。如果下游只有 2 个实例且负载均衡轮询，这 50 个会在这 2 个 IP 上分配。
- `connectTimeout`：TCP 握手超时，默认通常 10 秒，建议改成 3~5 秒。下游挂了不要干等。
- `readTimeout`：等响应的超时，取决于业务，一般 5~30 秒。



#### 4. 手动装配

如果上述的自动装配没有触发，那么就需要手动装配，手动装配之后

```java
//手动装配
@Configuration
public class FeignHttpClientConfig {

    @Bean
    public CloseableHttpClient httpClient5() {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(5000, TimeUnit.MILLISECONDS)   // TCP 连接建立超时 5 秒
                .setResponseTimeout(10000, TimeUnit.MILLISECONDS) // 等待响应超时 10 秒
                .build();

        return HttpClientBuilder.create()
                .setConnectionManager(
                    PoolingHttpClientConnectionManagerBuilder.create()
                        .setMaxConnTotal(200)                      // 整个连接池最大连接数
                        .setMaxConnPerRoute(50)                    // 每个目标服务（路由）最大连接数
                        .build()
                )
                .setDefaultRequestConfig(requestConfig)
                .build();
    }

    @Bean
    public Client feignClient(CloseableHttpClient httpClient5) {
        return new ApacheHttp5Client(httpClient5);
    }

    // 兜底：Feign 层面的超时选项
    @Bean
    public Request.Options feignOptions() {
        return new Request.Options(5, TimeUnit.SECONDS, 10, TimeUnit.SECONDS, true);
    }
}
```



要为不同的下游服务配置不同的连接池，利用 Spring Cloud OpenFeign 的**子上下文隔离机制**：每个 `@FeignClient` 可以指定独立的 `configuration` 类，里面定义专属的 `Client` Bean，彼此互不干扰。

**具体做法**

**1. 删掉全局配置**（或保留作为默认 fallback）

把之前创建的 `FeignClientConfig.java` 删掉，或者把 `@Configuration` 去掉，改成普通类。

**2. 给每个 Feign Client 单独建配置类**

例如给 `ItemClient` 建一个：

```java
package com.hmall.api.config;

import feign.Client;
import feign.hc5.ApacheHttp5Client;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.springframework.context.annotation.Bean;

public class ItemClientConfig {

    @Bean
    public Client feignClient() {
        return new ApacheHttp5Client(
            HttpClientBuilder.create()
                .setMaxConnTotal(100)      // item-service 专用
                .setMaxConnPerRoute(30)
                .build()
        );
    }
}
```

**3. 在 `@FeignClient` 上引用**

```java
@FeignClient(
    value = "item-service",
    configuration = ItemClientConfig.class
)
public interface ItemClient { ... }
```



**如果以后有第二个下游**

比如 `OrderClient`，同样方式：

```java
public class OrderClientConfig {
    @Bean
    public Client feignClient() {
        return new ApacheHttp5Client(
            HttpClientBuilder.create()
                .setMaxConnTotal(50)
                .setMaxConnPerRoute(10)
                .build()
        );
    }
}
@FeignClient(value = "order-service", configuration = OrderClientConfig.class)
public interface OrderClient { ... }
```



**关键点**

| 注意                            | 说明                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| 配置类**不加 `@Configuration`** | 只作为 `@FeignClient` 的 `configuration` 属性引用，避免被全局扫描 |
| 每个子上下文独立                | `ItemClient` 和 `OrderClient` 里的 `Client` Bean 同名也不冲突 |
| 默认 fallback                   | 没有 `configuration` 的 Feign Client 会用 Spring 全局的 `Client` Bean（如果有的话） |





### 3. OKHttp

如果团队技术栈已经统一用 OKHttp，也可以：

```xml
<dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-okhttp</artifactId>
</dependency>

spring:
  cloud:
    openfeign:
      okhttp:
        enabled: true
```

OKHttp 也有自己的连接池（默认最大空闲连接 5 个，存活 5 分钟），支持 HTTP/2。但 Spring Cloud 官方文档和示例现在更偏向 hc5。





## 3. 最佳实践

### 1. 思路分析

相信大家都能想到，避免重复编码的办法就是**抽取**。不过这里有两种抽取思路：

* 思路1：抽取到微服务之外的公共module

* 思路2：每个微服务自己抽取一个module

<img src="/covers/java-springcloud-3-12jvbqa/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-Ol77bM8FboZf7dxh4yvcNYTAnQh.jpg" style="zoom:67%;" />

方案1抽取更加简单，工程结构也比较清晰，但缺点是整个项目耦合度偏高。

方案2抽取相对麻烦，工程结构相对更复杂，但服务之间耦合度降低。



### 2. 抽取Feign客户端

在`hmall`下定义一个新的module，命名为hm-api，然后把ItemDTO和ItemClient都拷贝过来，最终结构如下：

<img src="/covers/java-springcloud-3-12jvbqa/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-LalGbIXsloExXbxKjc1ccP1PnGb.webp" style="zoom:67%;" />

现在，任何微服务要调用`item-service`中的接口，只需要引入`hm-api`模块依赖即可，无需自己编写Feign客户端了。



### 3. 扫描包

接下来，我们在`cart-service`的`pom.xml`中引入`hm-api`模块：

```xml
  <!--feign模块-->
  <dependency>
      <groupId>com.heima</groupId>
      <artifactId>hm-api</artifactId>
      <version>1.0.0</version>
  </dependency>
```

删除`cart-service`中原来的ItemDTO和ItemClient，重启项目，发现报错了：

![](/covers/java-springcloud-3-12jvbqa/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-JxTpbn4Pgoasl9x6YLbcVSNHnXe.webp)

这里因为`ItemClient`现在定义到了`com.hmall.api.client`包下，而cart-service的启动类定义在`com.hmall.cart`包下，扫描不到`ItemClient`，所以报错了。

解决办法很简单，在cart-service的启动类上添加声明即可，两种方式：

* 方式1：声明扫描包：

![](/covers/java-springcloud-3-12jvbqa/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-HHGtblxUaorotaxo3p4cLkFsnEc.webp)

* 方式2：声明要用的FeignClient

![](/covers/java-springcloud-3-12jvbqa/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-Ne49bVSuho9Jcvx2CNycOwI2nyg.webp)





## 4. 日志配置

OpenFeign只会在FeignClient所在包的日志级别为**DEBUG**时，才会输出日志。而且其日志级别有4级：

* **NONE**：不记录任何日志信息，这是默认值。

* **BASIC**：仅记录请求的方法，URL以及响应状态码和执行时间

* **HEADERS**：在BASIC的基础上，额外记录了请求和响应的头信息

* **FULL**：记录所有请求和响应的明细，包括头信息、请求体、元数据。

Feign默认的日志级别就是NONE，所以默认我们看不到请求日志。

OpenFeign 的日志级别分两层：一层是 Feign 自身的日志策略（是否记录请求头、响应体等），另一层是你项目里 logback/log4j 的日志输出级别。两层都配好，才能看到完整日志。



### 1. 定义日志级别

**方式一：配置文件（推荐，简单）**

```yaml
# application.yml
feign:
  client:
    config:
      default:           # default = 对所有 FeignClient 生效
        loggerLevel: full
      # 或者只给某个客户端配
      # order-service:
      #   loggerLevel: full
```

可选值：`none`（不记）、`basic`（仅方法和 URL + 响应状态 + 耗时）、`headers`（加请求/响应头）、`full`（完整请求/响应体）。



**方式二：Java 配置类**

```java
@Configuration
public class FeignConfig {
    
    @Bean
    Logger.Level feignLoggerLevel() {
        return Logger.Level.FULL;
    }
}
```

如果用这个方式且想**只针对某个客户端**，把配置类写在 `@FeignClient(configuration = XxxConfig.class)` 里，并且注意避免被全局 Spring 上下文扫到（不要加 `@Configuration`，或在 `@ComponentScan` 里排除）。



* **局部**生效：在某个`FeignClient`中配置，只对当前`FeignClient`生效

  * ```java
    @FeignClient(value = "item-service", configuration = DefaultFeignConfig.class)
    ```

* **全局**生效：在`@EnableFeignClients`中配置，针对所有`FeignClient`生效。

  * ```java
    @EnableFeignClients(defaultConfiguration = DefaultFeignConfig.class)
    ```

    

### 2. 开启底层日志输出级别

上面配的 `Logger.Level.FULL` 只是告诉 Feign "我要记录什么内容"，但真正打不打印到控制台/文件，还取决于你日志框架的级别。Feign 的 logger 用的是 `LoggerFactory.getLogger(xxx)`，类名通常是客户端接口的全限定名。

所以必须把对应 logger 的级别设为 **DEBUG**，否则看不到输出。

```yaml
logging:
  level:
    # 包路径下所有 Feign 接口
    com.example.client: DEBUG
    # 或者某个具体接口
    # com.example.client.OrderClient: DEBUG
```



**效果示例**

配好后，控制台会输出类似这样：

```
[OrderClient#getOrder] ---> GET http://order-service/api/orders/123 HTTP/1.1
[OrderClient#getOrder] ---> END HTTP (0-byte body)
[OrderClient#getOrder] <--- HTTP/1.1 200 (125ms)
[OrderClient#getOrder] connection: keep-alive
[OrderClient#getOrder] content-type: application/json
[OrderClient#getOrder] 
[OrderClient#getOrder] {"id":123,"status":"PAID"}
[OrderClient#getOrder] <--- END HTTP (32-byte body)
```





# 三. 负载均衡

OpenFeign 自己不管负载均衡，它把挑实例的事交给底层的负载均衡器。在当前的 Spring Cloud（2020.x 以后），默认使用的是 **Spring Cloud LoadBalancer**，默认算法是 **轮询（Round Robin）**。

**默认行为**

当你注入 `ItemClient` 调方法时，流程是这样的：

1. OpenFeign 发现目标服务名是 `item-service`
2. 把"挑哪个实例"交给 **Spring Cloud LoadBalancer**
3. 它的默认实现 `RoundRobinLoadBalancer` 从 Nacos 拉到的实例列表里，**挨个轮流选**：第 1 次请求给实例 A，第 2 次给实例 B，第 3 次给实例 C，第 4 次回到 A……



## 怎么换成别的算法

如果你不想用轮询，可以自定义。比如改成**随机**：

```java
@Bean
public ReactorLoadBalancer<ServiceInstance> randomLoadBalancer(
        Environment environment,
        LoadBalancerClientFactory loadBalancerClientFactory) {
    
    String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
    
    return new ReactorServiceInstanceLoadBalancer() {
        private Random random = new Random();
        
        @Override
        public Mono<Response<ServiceInstance>> choose(Request request) {
            ServiceInstanceListSupplier supplier = loadBalancerClientFactory
                    .getLazyProvider(name, ServiceInstanceListSupplier.class)
                    .getIfAvailable();
            
            return supplier.get().next().map(instances -> {
                if (instances.isEmpty()) return new EmptyResponse();
                int index = random.nextInt(instances.size());
                return new DefaultResponse(instances.get(index));
            });
        }
    };
}
```



更简单的方式是用 Spring Cloud Alibaba 提供的 **NacosLoadBalancer**，它支持**按 Nacos 控制台里设置的权重来分配流量**：

```java
@Bean
@LoadBalancerClients(defaultConfiguration = NacosLoadBalancer.class)
public class LoadBalancerConfig {
}
```

然后在 Nacos 控制台的服务详情里，给每个实例设置不同的权重（比如机器配置好的给权重 100，配置差的给权重 50），负载均衡器会自动按权重比例分配请求。



## 常见算法

| 算法                         | 说明                  | 适用场景                             |
| ---------------------------- | --------------------- | ------------------------------------ |
| **Round Robin（轮询）**      | 挨个轮流，默认        | 实例性能相近，最简单公平             |
| **Random（随机）**           | 随机挑一个            | 简单，但不如轮询均匀                 |
| **Weighted（权重）**         | 按 Nacos 权重比例分配 | 实例配置不同，想让高配机器多扛点流量 |
| **Same Instance Preference** | 优先选上次用过的实例  | 有状态服务，减少连接切换             |

