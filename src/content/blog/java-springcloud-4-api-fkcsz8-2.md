---
title: 4.网关路由
description: 顾明思议，网关就是网络的关口。数据在网络间传输，从一个网络传输到另一网络时就需要经过网关来做数据的路由和转发以及数据安全的校验。
pubDate: 2026-09-01
series: SpringCloud
order: 2
source: Java后端/SpringCloud/4.API网关.md
---

# 一. 网关路由

## 1. 认识网关

顾明思议，网关就是**网**络的**关**口。数据在网络间传输，从一个网络传输到另一网络时就需要经过网关来做数据的**路由和转发以及数据安全的校验**。

更通俗的来讲，网关就像是以前园区传达室的大爷。

* 外面的人要想进入园区，必须经过大爷的认可，如果你是不怀好意的人，肯定被直接拦截。

* 外面的人要传话或送信，要找大爷。大爷帮你带给目标人。

<img src="/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-MOmebPN8hoTCVhxN1tTcbqUhngh.jpg" style="zoom:67%;" />



现在，微服务网关就起到同样的作用。前端请求不能直接访问微服务，而是要请求网关：

* 网关可以做安全控制，也就是登录身份校验，校验通过才放行

* 通过认证后，网关再根据请求判断应该访问哪个微服务，将请求转发过去

<img src="/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-XWfibn1JJoIh3LxWmRtcgxulnoe.jpg" style="zoom:67%;" />

在SpringCloud当中，提供了两种网关实现方案：

* Netflix Zuul：早期实现，目前已经淘汰

* SpringCloudGateway：基于Spring的WebFlux技术，完全支持响应式编程，吞吐能力更强





## 2. 快速入门

由于网关本身也是一个独立的微服务，因此也需要创建一个模块开发功能。大概步骤如下：

* 创建网关微服务

* 引入SpringCloudGateway、NacosDiscovery依赖

* 编写启动类

* 配置网关路由



### 1. 创建项目

首先，我们要在hmall下创建一个新的module，命名为hm-gateway，作为网关微服务：

<img src="/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-R9vpbNo6CoM5G0xjL2ccq9NWnMf.webp" style="zoom:67%;" />



### 2. 引入依赖

在`hm-gateway`模块的`pom.xml`文件中引入依赖：

```xml
        <!--common-->
        <dependency>
            <groupId>com.heima</groupId>
            <artifactId>hm-common</artifactId>
            <version>1.0.0</version>
        </dependency>
        <!--网关-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-gateway</artifactId>
        </dependency>
        <!--nacos discovery-->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>
        <!--负载均衡-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>
```



### 3. 启动类

在`hm-gateway`模块的`com.hmall.gateway`包下新建一个启动类，代码如下：

```java
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```



### 4. 配置路由

接下来，在`hm-gateway`模块的`resources`目录新建一个`application.yaml`文件，内容如下：

```yml
server:
  port: 8080
spring:
  application:
    name: gateway
  cloud:
    nacos:
      server-addr: 192.168.146.130:8848
    gateway:
      routes:
        - id: item # 路由规则id，自定义，唯一
          uri: lb://item-service # 路由的目标服务，lb代表负载均衡，会从注册中心拉取服务列表
          predicates: # 路由断言，判断当前请求是否符合当前规则，符合则路由到目标服务
            - Path=/items/**,/search/** # 这里是以请求路径作为判断规则
        - id: cart
          uri: lb://cart-service
          predicates:
            - Path=/carts/**
        - id: user
          uri: lb://user-service
          predicates:
            - Path=/users/**,/addresses/**
        - id: trade
          uri: lb://trade-service
          predicates:
            - Path=/orders/**
        - id: pay
          uri: lb://pay-service
          predicates:
            - Path=/pay-orders/**
```



### 5. 测试

启动GatewayApplication，以 http://localhost:8080 拼接微服务接口路径来测试。例如：<http://localhost:8080/items/page?pageNo=1&pageSize=1>

![](/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-W63Rb4EMpo4BvkxPm5KcTTctnEg.webp)





## 3. 路由过滤

路由规则的定义语法如下：

```yml
spring:
  cloud:
    gateway:
      routes:
        - id: item
          uri: lb://item-service
          predicates:
            - Path=/items/**,/search/**
      default-filiters:    对所有路由都生效
        - `AddRequestHeader=headerName,headerValue` 
```

路由属性含义如下：

* `id`：路由的唯一标示

* `uri`：路由目标地址，`lb://`代表负载均衡，从注册中心获取目标微服务的实例列表，并且负载均衡选择一个访问。

* `predicates`：路由断言，判断请求是否符合当前路由

* `filters`：路由过滤条件，对请求或响应做特殊处理

  

SpringCloudGateway中支持的**路由断言**类型有很多：

| **名称**   | **说明**                       | **示例**                                                     |
| ---------- | ------------------------------ | ------------------------------------------------------------ |
| After      | 是某个时间点后的请求           | - After=2037-01-20T17:42:47.789-07:00\[America/Denver]       |
| Before     | 是某个时间点之前的请求         | - Before=2031-04-13T15:14:47.433+08:00\[Asia/Shanghai]       |
| Between    | 是某两个时间点之前的请求       | - Between=2037-01-20T17:42:47.789-07:00\[America/Denver], 2037-01-21T17:42:47.789-07:00\[America/Denver] |
| Cookie     | 请求必须包含某些cookie         | - Cookie=chocolate, ch.p                                     |
| Header     | 请求必须包含某些header         | - Header=X-Request-Id, \d+                                   |
| Host       | 请求必须是访问某个host（域名） | - Host=\*\*.somehost.org,\*\*.anotherhost.org                |
| Method     | 请求方式必须是指定方式         | - Method=GET,POST                                            |
| Path       | 请求路径必须符合指定规则       | - Path=/red/{segment},/blue/\*\*                             |
| Query      | 请求参数必须包含指定参数       | - Query=name, Jack或者- Query=name                           |
| RemoteAddr | 请求者的ip必须是指定范围       | - RemoteAddr=192.168.1.1/24                                  |
| weight     | 权重处理                       |                                                              |



**路由过滤器**

| 名称                 | 说明                         | 示例                                            |
| -------------------- | ---------------------------- | ----------------------------------------------- |
| AddRequestHeader     | 给当前请求添加一个请求头     | `AddRequestHeader=headerName,headerValue`       |
| RemoveRequestHeader  | 移除请求中的一个请求头       | `RemoveRequestHeader=headerName`                |
| AddResponseHeader    | 给响应结果中添加一个响应头   | `AddResponseHeader=headerName,headerValue`      |
| RemoveResponseHeader | 从响应结果中移除有一个响应头 | `RemoveResponseHeader=headerName`               |
| RewritePath          | 请求路径重写                 | `RewritePath=/red/?(?<segment>.*), /${segment}` |
| StripPrefix          | 去除请求路径中的N段前缀      | `StripPrefix=1, 则路径/a/b转发时只保留/b`       |
| ...                  |                              |                                                 |





# 二. 网关登录校验

单体架构时我们只需要完成一次用户登录、身份校验，就可以在所有业务中获取到用户信息。而微服务拆分后，每个微服务都独立部署，不再共享数据。也就意味着每个微服务都需要做登录校验，这显然不可取。

## 1. 鉴权思路分析

我们的登录是基于JWT来实现的，校验JWT的算法复杂，而且需要用到秘钥。如果每个微服务都去做登录校验，这就存在着两大问题：

* 每个微服务都需要知道JWT的秘钥，不安全

* 每个微服务重复编写登录校验代码、权限校验代码，麻烦

既然网关是所有微服务的入口，一切请求都需要先经过网关。我们完全可以把登录校验的工作放到网关去做，这样之前说的问题就解决了：

* 只需要在网关和用户服务保存秘钥

* 只需要在网关开发登录校验功能



此时，登录校验的流程如图：

<img src="/covers/java-springcloud-4-api-fkcsz8-2/image-20260831090117415.webp" alt="image-20260831090117415" style="zoom:67%;" />

不过，这里存在几个问题：

* 网关路由是配置的，请求转发是Gateway内部代码，我们如何在转发之前做登录校验？

* 网关校验JWT之后，如何将用户信息传递给微服务？

* 微服务之间也会相互调用，这种调用不经过网关，又该如何传递用户信息？



## 2. 网关过滤器

登录校验必须在请求转发到微服务之前做，否则就失去了意义。而网关的请求转发是`Gateway`内部代码实现的，要想在请求转发之前做登录校验，就必须了解`Gateway`内部工作的基本原理。

![image-20260831085525023](/covers/java-springcloud-4-api-fkcsz8-2/image-20260831085525023.webp)

如图所示：

1. 客户端请求进入网关后由`HandlerMapping`对请求做判断，找到与当前请求匹配的路由规则（**`Route`**），然后将请求交给`WebHandler`去处理。

2. `WebHandler`则会加载当前路由下需要执行的过滤器链（**`Filter chain`**），然后按照顺序逐一执行过滤器（后面称&#x4E3A;**`Filter`**）。

3. 图中`Filter`被虚线分为左右两部分，是因为`Filter`内部的逻辑分为`pre`和`post`两部分，分别会在请求路由到微服务**之前**和**之后**被执行。

4. 只有所有`Filter`的`pre`逻辑都依次顺序执行通过后，请求才会被路由到微服务。

5. 微服务返回结果后，再倒序执行`Filter`的`post`逻辑。

6. 最终把响应结果返回。

最终请求转发是有一个名为`NettyRoutingFilter`的过滤器来执行的，而且这个过滤器是整个过滤器链中顺序最靠后的一个。**如果我们能够定义一个过滤器，在其中实现登录校验逻辑，并且将过滤器执行顺序定义到`NettyRoutingFilter`之前**，这就符合我们的需求了！



网关过滤器链中的过滤器有两种：

* **`GatewayFilter`**：路由过滤器，作用范围比较灵活，可以是任意指定的路由`Route`

* **`GlobalFilter`**：全局过滤器，作用范围是所有路由

> **注意**：过滤器链之外还有一种过滤器，HttpHeadersFilter，用来处理传递到下游微服务的请求头。例如org.springframework.cloud.gateway.filter.headers.XForwardedHeadersFilter可以传递代理请求原本的host头到下游微服务。

其实`GatewayFilter`和`GlobalFilter`这两种过滤器的方法签名完全一致：

```java
/**
 * 处理请求并将其传递给下一个过滤器
 * @param exchange 当前请求的上下文，其中包含request、response等各种数据
 * @param chain 过滤器链，基于它向下传递请求
 * @return 根据返回值标记当前请求是否被完成或拦截，chain.filter(exchange)就放行了。
 */
Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain);
```



`FilteringWebHandler`在处理请求时，会将`GlobalFilter`装饰为`GatewayFilter`，然后放到同一个过滤器链中，排序以后依次执行。

`Gateway`内置的`GatewayFilter`过滤器使用起来非常简单，无需编码，只要在yaml文件中简单配置即可。而且其作用范围也很灵活，配置在哪个`Route`下，就作用于哪个`Route`.

例如，有一个过滤器叫做`AddRequestHeaderGatewayFilterFacotry`，顾明思议，就是添加请求头的过滤器，可以给请求添加一个请求头并传递到下游微服务。

使用的使用只需要在application.yaml中这样配置：

```yml
spring:
  cloud:
    gateway:
      routes:
      - id: test_route
        uri: lb://test-service
        predicates:
          -Path=/test/**
        filters:
          - AddRequestHeader=key, value # 逗号之前是请求头的key，逗号之后是value
```

如果想要让过滤器作用于所有的路由，则可以这样配置：

```yml
spring:
  cloud:
    gateway:
      default-filters: # default-filters下的过滤器可以作用于所有路由
        - AddRequestHeader=key, value
      routes:
      - id: test_route
        uri: lb://test-service
        predicates:
          -Path=/test/**
```



##  3. 自定义过滤器

无论是`GatewayFilter`还是`GlobalFilter`都支持自定义，只不过**编码**方式、**使用**方式略有差别。

### 1. 自定义GatewayFilter

自定义`GatewayFilter`不是直接实现`GatewayFilter`，而是实现`AbstractGatewayFilterFactory`。最简单的方式是这样的：

```java
@Component
public class PrintAnyGatewayFilterFactory extends AbstractGatewayFilterFactory<Object> {
    @Override
    public GatewayFilter apply(Object config) {
        return new GatewayFilter() {
            @Override
            public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
                // 获取请求
                ServerHttpRequest request = exchange.getRequest();
                // 编写过滤器逻辑
                System.out.println("过滤器执行了");
                // 放行
                return chain.filter(exchange);
            }
        };
    }
}
```

> **注意**：该类的名称一定要以`GatewayFilterFactory`为后缀！

然后在yaml配置中这样使用：

```yml
spring:
  cloud:
    gateway:
      default-filters:
            - PrintAny # 此处直接以自定义的GatewayFilterFactory类名称前缀类声明过滤器
```



### 2. 自定义GlobalFilter

自定义GlobalFilter则简单很多，直接实现GlobalFilter即可，而且也无法设置动态参数：

```java
@Slf4j
@Component
public class MyGlobalFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        //获取请求头
        HttpHeaders headers = exchange.getRequest().getHeaders();
        log.info("请求头：{}", headers);
        //放行
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // 过滤器执行顺序，值越小，优先级越高
        return 0;
    }
}
```



## 4. 登录校验

接下来，我们就利用自定义`GlobalFilter`来完成登录校验。

### 1. JWT工具

登录校验需要用到JWT，而且JWT的加密需要秘钥和加密工具。这些在`hm-service`中已经有了，我们直接拷贝过来：

<img src="/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-Qv5NbXnFXoSEulxRldWcaQhRnHe.webp" style="zoom:67%;" />

具体作用如下：

* `AuthProperties`：配置登录校验需要拦截的路径，因为不是所有的路径都需要登录才能访问

* `JwtProperties`：定义与JWT工具有关的属性，比如秘钥文件位置

* `SecurityConfig`：工具的自动装配

* `JwtTool`：JWT工具，其中包含了校验和解析`token`的功能

* `hmall.jks`：秘钥文件

其中`AuthProperties`和`JwtProperties`所需的属性要在`application.yaml`中配置：

```yml
hm:
  jwt:
    location: classpath:hmall.jks
    alias: hmall
    password: hmall123
    tokenTTL: 30m
  auth:
    excludePaths:
      - /search/**
      - /users/login
      - /items/**
      - /hi
```



### 2. 登录校验过滤器

接下来，我们定义一个登录校验的过滤器：

```java
@Component
@RequiredArgsConstructor
public class AuthGlobalFilter implements GlobalFilter, Ordered {
    private final AuthProperties authProperties;
    private final JwtTool  jwtTool;
    private final AntPathMatcher antPathMatcher=new  AntPathMatcher();
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        //1.获取request
        ServerHttpRequest request = exchange.getRequest();
        //2.判断是否需要做登录拦截
        if(isExclude(request.getPath().toString())){
            //不需要做登录拦截，直接放行
            return chain.filter(exchange);
        }
        //3.需要，从请求头中获取token
        String token=null;
        List<String> headers = request.getHeaders().get("authorization");
        if(headers != null && !headers.isEmpty()){
            token=headers.get(0);
        }
        //4.校验并解析token
        Long userId=null;
        try{
            userId = jwtTool.parseToken(token);
        }catch (UnauthorizedException e){
            //拦截，设置响应状态码为401
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return response.setComplete();
        }
        //5.传递用户信息
        System.out.println("userId:"+userId);
        //6.放行
        return chain.filter(exchange);
    }

    private boolean isExclude(String path) {
        for (String pathPattern : authProperties.getExcludePaths()) {
            if(antPathMatcher.match(pathPattern, path)){
                return true;
            }
        }
        return false;
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
```





## 5. 微服务获取用户

现在，网关已经可以完成登录校验并获取登录用户身份信息。但是当网关将请求转发到微服务时，微服务又该如何获取用户身份呢？

由于网关发送请求到微服务依然采用的是`Http`请求，因此我们可以将用户信息以请求头的方式传递到下游微服务。然后微服务可以从请求头中获取登录用户信息。考虑到微服务内部可能很多地方都需要用到登录用户信息，因此我们可以利用SpringMVC的拦截器来实现登录用户信息获取，并存入ThreadLocal，方便后续使用。

据图流程图如下：

![](/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-KhxEb6rjBoNrVCxsehLcFPLEnSd.jpg)

因此，接下来我们要做的事情有：

* 改造网关过滤器，在获取用户信息后保存到请求头，转发到下游微服务

* 编写微服务拦截器，拦截请求获取用户信息，保存到ThreadLocal后放行



### 1.保存用户到请求头

首先，我们修改登录校验拦截器的处理逻辑，保存用户信息到请求头中：

要修改转发到微服务的请求，需要用到ServerWebExchange类提供的API

```java
exchange.mutate()   //mutate就是对下游请求做更改
    .request(builder->builder.header("user-info",userInfo))
    .build();
```

完整代码如下：

```java
@Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        //1.获取request
        ServerHttpRequest request = exchange.getRequest();
        //2.判断是否需要做登录拦截
        if(isExclude(request.getPath().toString())){
            //不需要做登录拦截，直接放行
            return chain.filter(exchange);
        }
        //3.需要，从请求头中获取token
        String token=null;
        List<String> headers = request.getHeaders().get("authorization");
        if(headers != null && !headers.isEmpty()){
            token=headers.get(0);
        }
        //4.校验并解析token
        Long userId=null;
        try{
            userId = jwtTool.parseToken(token);
        }catch (UnauthorizedException e){
            //拦截，设置响应状态码为401
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return response.setComplete();
        }
        //5.传递用户信息
        String userInfo=userId.toString();
        ServerWebExchange ex = exchange.mutate()
                .request(builder -> builder.header("user-info", userInfo))
                .build();
        //6.放行
        return chain.filter(ex);
    }
```



### 2.拦截器获取用户

在hm-common中已经有一个用于保存登录用户的ThreadLocal工具，其中已经提供了保存和获取用户的方法 

接下来，我们只需要编写拦截器，获取用户信息并保存到`UserContext`，然后放行即可。

由于每个微服务都有获取登录用户的需求，因此拦截器我们直接写在`hm-common`中，并写好自动装配。这样微服务只需要引入`hm-common`就可以直接具备拦截器功能，无需重复编写。



我们在`hm-common`模块下定义一个拦截器：具体代码如下：

```java
public class UserinfoInterceptor implements  HandlerInterceptor {
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, @Nullable Exception ex) throws Exception {
        //清理用户
        UserContext.removeUser();
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        //获取登录用户信息
        String userInfo = request.getHeader("user-info");
        //是否获取了用户登录信息,如果有，存入到ThreadLocal
        if(StrUtil.isNotBlank(userInfo)){
            UserContext.setUser(Long.valueOf(userInfo));
        }
        //无论有没有都放行
        return true;
    }
}
```



接着在`hm-common`模块下编写`SpringMVC`的配置类，配置登录拦截器：具体代码如下：

```java
@Configuration
public class MvcConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new UserinfoInterceptor());
    }
}
```



不过，需要注意的是，这个配置类默认是不会生效的，因为它所在的包是`com.hmall.common.config`，与其它微服务的扫描包不一致，无法被扫描到，因此无法生效。

基于SpringBoot的自动装配原理，我们要将其添加到`resources`目录下的`META-INF/spring.factories`文件中：

<img src="/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-FSrybmKRjoN1uexAKBDcEcz6nVd.webp" style="zoom:67%;" />

内容如下：

```
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
  com.hmall.common.config.MyBatisConfig,\
  com.hmall.common.config.JsonConfig,\
  com.hmall.common.config.MvcConfig
```





## 6. OpenFeign传递用户

前端发起的请求都会经过网关再到微服务，由于我们之前编写的过滤器和拦截器功能，微服务可以轻松获取登录用户信息。

但有些业务是比较复杂的，请求到达微服务后还需要调用其它多个微服务。比如下单业务，流程如下：

![](/covers/java-springcloud-4-api-fkcsz8-2/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-Yp5Xb6eaPo5VbSxtQsPcBkJbnXl.jpg)

下单的过程中，需要调用商品服务扣减库存，调用购物车服务清理用户购物车。而清理购物车时必须知道当前登录的用户身份。但是，**订单服务调用购物车时并没有传递用户信息**，购物车服务无法知道当前用户是谁！

由于微服务获取用户信息是通过拦截器在请求头中读取，因此要想实现微服务之间的用户信息传递，就**必须在微服务发起调用时把用户信息存入请求头**。



**网关过滤器处理的是“入口请求”，而OpenFeign发起的是一次“出口请求”**。两者是独立的HTTP调用，上下文（请求头）绝不会自动传递。

具体来说，分为三步走：

**1. 网关阶段（入口）—— 你理解正确的部分**

- 浏览器 -> 网关：网关校验JWT，把用户信息塞进**请求头（Request Headers）**。
- 网关 -> 订单服务：订单服务收到请求，拦截器从**请求头**读取用户信息，存入**ThreadLocal**。
- **此时**：订单服务的`ThreadLocal`里有值，但仅存在于“处理浏览器请求”的这个线程上下文中。

**2. 服务调用阶段（出口）—— 这里断裂了**

- 当订单服务调用购物车服务时，**OpenFeign底层是通过HttpClient或OKHttp重新发起的一个全新的HTTP请求**。
- **这个新请求默认只携带Feign接口定义的参数，完全不携带浏览器请求的原始请求头（如Authorization）**。
- 更重要的是：**这个新请求根本不经过网关**（微服务之间通过服务名直连，网关只负责路由外部流量）。

**3. 为什么必须加OpenFeign拦截器（搬运工）**

OpenFeign的`RequestInterceptor`作用就是**手动搬运**：

- 它从当前线程的`ThreadLocal`中，把之前存好的用户信息**取出来**。
- 然后**显式地**设置到新请求（Feign即将发出的请求）的**请求头（Headers）**中。

这样，购物车服务收到这个新请求时，它的拦截器才能从请求头中读到用户信息，并存入自己的`ThreadLocal`。

**打个比方：**
网关就像是“小区大门”（入口），保安（网关过滤器）给你贴了个访客标签（请求头）。你进了订单部（订单服务），把标签拍照存进了电脑（ThreadLocal）。现在你要去隔壁购物车部办事（Feign调用），**你不能直接推门过去（不走网关）**，你**必须**根据电脑里的照片（ThreadLocal），重新手写一张纸条（OpenFeign拦截器塞请求头），拿给隔壁保安看。否则，隔壁保安不知道你是谁。

**总结：** 网关过滤器管“**进**”，Feign拦截器管“**出**”。缺了后者，用户信息就断在了订单服务的内存里，传不到下游。





微服务之间调用是基于OpenFeign来实现的，并不是我们自己发送的请求。我们如何才能让每一个由OpenFeign发起的请求自动携带登录用户信息呢？

这里要借助Feign中提供的一个拦截器接口：`feign.RequestInterceptor`

```java
public interface RequestInterceptor {

  /**
   * Called for every request. 
   * Add data using methods on the supplied {@link RequestTemplate}.
   */
  void apply(RequestTemplate template);
}

```

我们只需要实现这个接口，然后实现apply方法，利用`RequestTemplate`类来添加请求头，将用户信息保存到请求头中。这样以来，每次OpenFeign发起请求的时候都会调用该方法，传递用户信息。

由于`FeignClient`全部都是在`hm-api`模块，因此我们在`hm-api`模块的`com.hmall.api.config.DefaultFeignConfig`中编写这个拦截器：

```java
@Bean
public RequestInterceptor userInfoRequestInterceptor(){
    return new RequestInterceptor() {
        @Override
        public void apply(RequestTemplate template) {
            // 获取登录用户
            Long userId = UserContext.getUser();
            if(userId == null) {
                // 如果为空则直接跳过
                return;
            }
            // 如果不为空则放入请求头中，传递给下游微服务
            template.header("user-info", userId.toString());
        }
    };
}
```

然后在需要使用OpenFeign的微服务里面的启动类上加上

```java
@EnableFeignClients(basePackages = "com.hmall.api.client",defaultConfiguration = DefaultFeignConfig.class)
```

现在微服务之间通过OpenFeign调用时也会传递登录用户信息了
