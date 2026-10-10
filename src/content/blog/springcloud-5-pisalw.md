---
title: 5.配置中心
description: 到目前为止我们已经解决了微服务相关的几个问题：
pubDate: 2026-10-10
series: SpringCloud
order: 5
source: SpringCloud/5.配置中心
---

# 配置中心

到目前为止我们已经解决了微服务相关的几个问题：

* 微服务远程调用

* 微服务注册、发现

* 微服务请求路由、负载均衡

* 微服务登录用户信息传递



不过，现在依然还有几个问题需要解决：

* 网关路由在配置文件中写死了，如果变更必须重启微服务

* 某些业务配置在配置文件中写死了，每次修改都要重启服务

* 每个微服务都有很多重复的配置，维护成本高



这些问题都可以通过统一的**配置管理器服务**解决。而Nacos不仅仅具备注册中心功能，也具备配置管理的功能：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-E6aHb40gYoDM11xMUNKc4c6Znxf.jpg" style="zoom:67%;" />

**微服务共享的配置可以统一交给Nacos保存和管理，在Nacos控制台修改配置后，Nacos会将配置变更推送给相关的微服务，并且无需重启即可生效，实现配置热更新。**

**网关的路由同样是配置，因此同样可以基于这个功能实现动态路由功能，无需重启网关即可修改路由配置。**



## 1. 配置共享

我们可以把微服务共享的配置抽取到Nacos中统一管理，这样就不需要每个微服务都重复配置了。分为两步：

* 在Nacos中添加共享配置

* 微服务拉取配置

### 1. 添加共享配置

以cart-service为例，我们看看有哪些配置是重复的，可以抽取的：

首先是jdbc相关配置：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-SGzLbc9OhomXrBxLwyfcjOR8nTb.webp" style="zoom:67%;" />

然后是日志配置：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-HDzXbMoOhouzZNxb0sdctc2Mnqg.webp" style="zoom:67%;" />

然后是swagger以及OpenFeign的配置：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-RHkObtlmcogGu1xXTlUceGilnob.webp" style="zoom:67%;" />



我们在nacos控制台分别添加这些配置。

首先是jdbc相关配置，在`配置管理`->`配置列表`中点击`+`新建一个配置：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-ToaobgZmUoO2aOx9t7vcHCfbnKf.webp" style="zoom:67%;" />

在弹出的表单中填写信息：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-ENvbbM2CfoWaTXx2BdPcDjysnEc.webp" style="zoom:67%;" />

其中详细的配置如下：

```yml
spring:
  datasource:
    url: jdbc:mysql://${hm.db.host:192.168.150.101}:${hm.db.port:3306}/${hm.db.database}?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${hm.db.un:root}
    password: ${hm.db.pw:123}
mybatis-plus:
  configuration:
    default-enum-type-handler: com.baomidou.mybatisplus.core.handlers.MybatisEnumTypeHandler
  global-config:
    db-config:
      update-strategy: not_null
      id-type: auto
```

注意这里的jdbc的相关参数并没有写死，例如：

* `数据库ip`：通过`${hm.db.host:192.168.150.101}`配置了默认值为`192.168.150.101`，同时允许通过`${hm.db.host}`来覆盖默认值

* `数据库端口`：通过`${hm.db.port:3306}`配置了默认值为`3306`，同时允许通过`${hm.db.port}`来覆盖默认值

* `数据库database`：可以通过`${hm.db.database}`来设定，无默认值



然后是统一的日志配置，命名为`shared-log.yaml`，配置内容如下：

```yml
logging:
  level:
    com.hmall: debug
  pattern:
    dateformat: HH:mm:ss:SSS
  file:
    path: "logs/${spring.application.name}"
```



然后是统一的swagger配置，命名为`shared-swagger.yaml`，配置内容如下：

```yml
knife4j:
  enable: true
  openapi:
    title: ${hm.swagger.title:黑马商城接口文档}
    description: ${hm.swagger.description:黑马商城接口文档}
    email: ${hm.swagger.email:zhanghuyi@itcast.cn}
    concat: ${hm.swagger.concat:虎哥}
    url: https://www.itcast.cn
    version: v1.0.0
    group:
      default:
        group-name: default
        api-rule: package
        api-rule-resources:
          - ${hm.swagger.package}
```

注意，这里的swagger相关配置我们没有写死，例如：

* `title`：接口文档标题，我们用了`${hm.swagger.title}`来代替，将来可以有用户手动指定





### 2. 拉取共享配置

接下来，我们要在微服务拉取共享配置。将拉取到的共享配置与本地的`application.yaml`配置合并，完成项目上下文的初始化。

不过，需要注意的是，读取Nacos配置是SpringCloud上下文（`ApplicationContext`）初始化时处理的，发生在项目的引导阶段。然后才会初始化SpringBoot上下文，去读取`application.yaml`。

也就是说引导阶段，`application.yaml`文件尚未读取，根本不知道nacos 地址，该如何去加载nacos中的配置文件呢？



SpringCloud在初始化上下文的时候会先读取一个名为`bootstrap.yaml`(或者`bootstrap.properties`)的文件，如果我们将nacos地址配置到`bootstrap.yaml`中，那么在项目引导阶段就可以读取nacos中的配置了。

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-LidubbjyhoF4sKxFdwKcZXcnnWf.jpg" style="zoom:67%;" />

因此，微服务整合Nacos配置管理的步骤如下：

**1）引入依赖**

在cart-service模块引入依赖：

这个配置文件和nacod服务注册与发现的依赖是不一样的，要注意

```xml
  <!--nacos配置管理-->
  <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
  </dependency>
  <!--读取bootstrap文件-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-bootstrap</artifactId>
  </dependency>
```

**2）新建bootstrap.yaml**

在resources目录新建一个bootstrap.yaml文件：

内容如下：

```yml
spring:
  application:
    name: cart-service # 服务名称
  profiles:
    active: dev
  cloud:
    nacos:
      server-addr: 192.168.146.130:8848 # nacos地址
      config:
        file-extension: yaml # 文件后缀名
        shared-configs: # 共享配置
          - dataId: shared-jdbc.yaml # 共享mybatis配置
          - dataId: shared-log.yaml # 共享日志配置
          - dataId: shared-swagger.yaml # 共享日志配置
```

**3）修改application.yaml**

由于一些配置挪到了bootstrap.yaml，因此application.yaml需要修改为：

```yml
server:
  port: 8086
feign:
  okhttp:
    enabled: true # 开启OKHttp连接池支持
hm:
  swagger:
    title: 购物车服务接口文档
    package: com.hmall.cart.controller
  db:
    database: hm-cart
```

重启服务，发现所有配置都生效了。



## 2. 配置热更新

有很多的业务相关参数，将来可能会根据实际情况临时调整。例如购物车业务，购物车数量有一个上限，默认是10，对应代码如下：

```java
private void checkCartsFull(Long userId) {
        int count = lambdaQuery().eq(Cart::getUserId, userId).count();
        if (count >= 10) {
            throw new BizIllegalException(StrUtil.format("用户购物车课程不能超过{}", 10));
        }
    }
```

现在这里购物车是写死的固定值，我们应该将其配置在配置文件中，方便后期修改。

但现在的问题是，即便写在配置文件中，修改了配置还是需要重新打包、重启服务才能生效。能不能不用重启，直接生效呢？

这就要用到Nacos的**配置热更新**能力（微服务无需重启即可使配置生效）了，分为两步：

* 在Nacos中添加配置
* 在微服务读取配置

前提条件：

- nacos中要有一个与微服务名有关的配置文件

  - ```
    spring.application.name - spring.active.profile - file.extension
              |                        |                     |
           微服务名称            项目的profile（可选）      文件后缀名
    ```

- 微服务中要以特定的方式读取需要热更新的配置属性

  - 方式一（推荐）：

    - ```java
      @Data
      @ConfigurationProperties(prefix="hm.cart")
      public class CartProperties{
          private int maxItems;
      }
      ```

  - 方式二：

    - ```java
      @Data
      @RefreshScope
      public class CartProperties{
          @Vaule("${hm.cart.maxItems}")
          private int maxItems;
      }
      ```

      



### 1. 添加配置到Nacos

首先，我们在nacos中添加一个配置文件，将购物车的上限数量添加到配置中：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-NvbrbqIMXoSOt5x4cqwc4kmmnrg.webp" style="zoom:67%;" />

注意文件的dataId格式：

文件名称由三部分组成：

* **`服务名`**：我们是购物车服务，所以是`cart-service`

* **`spring.active.profile`**：就是spring boot中的`spring.active.profile`，可以省略，则所有profile共享该配置

* **`后缀名`**：例如yaml



这里我们直接使用`cart-service.yaml`这个名称，则不管是dev还是local环境都可以共享该配置。

配置内容如下：

```yml
hm:
  cart:
    maxAmount: 1 # 购物车商品数量上限
```



### 2. 配置热更新

接着，我们在微服务中读取配置，实现配置热更新。

在`cart-service`中新建一个属性读取类，代码如下：

```java
@Data
@Component
@ConfigurationProperties(prefix = "hm.cart")
public class CartProperties {
    private Integer maxAmount;
}

```

接着，在业务中使用该属性加载类：

```java
public class CartServiceImpl extends ServiceImpl<CartMapper, Cart> implements ICartService {
    private final CartProperties cartProperties;
    private void checkCartsFull(Long userId) {
        int count = lambdaQuery().eq(Cart::getUserId, userId).count();
        if (count >= cartProperties.getMaxItems()) {
            throw new BizIllegalException(StrUtil.format("用户购物车课程不能超过{}", cartProperties.getMaxItems()));
        }
    }
}
```





## 3. 动态路由

网关的路由配置全部是在项目启动时由`org.springframework.cloud.gateway.route.CompositeRouteDefinitionLocator`在项目启动的时候加载，并且一经加载就会缓存到内存中的路由表内（一个Map），不会改变。也不会监听路由变更，所以，我们无法利用配置热更新来实现路由更新。

因此，我们必须监听Nacos的配置变更，然后手动把最新的路由更新到路由表中。这里有两个难点：

* 如何监听Nacos配置变更？

* 如何把路由信息更新到路由表？



### 1. 监听Nacos配置变更

如果希望 Nacos 推送配置变更，可以使用 Nacos 动态监听配置接口来实现。

```java
public void addListener(String dataId, String group, Listener listener) 
```

**请求参数**

| 参数名   | 参数类型 | 描述                                                         |
| -------- | -------- | ------------------------------------------------------------ |
| dataId   | string   | 配置 ID，采用类似 package.class（如com.taobao.tc.refund.log.level）的命名规则保证全局唯一性，class 部分建议是配置的业务含义。 全部字符小写。只允许英文字符和 4 种特殊字符（"."、":"、"-"、"_"）。不超过 256 字节。 |
| group    | string   | 配置分组，建议填写**产品名：模块名**（如 Nacos:Test）保证唯一性。 只允许英文字符和4种特殊字符（"."、":"、"-"、"_"），不超过128字节，一般是默认的DEFAULT\_GROUP。 |
| listener | Listener | 监听器，配置变更进入监听器的回调函数。                       |

**返回值**

| 参数类型 | 描述                                                   |
| :------- | :----------------------------------------------------- |
| string   | 配置值，初始化或者配置变更的时候通过回调函数返回该值。 |

**请求示例**

```java
String serverAddr = "{serverAddr}";
String dataId = "{dataId}";
String group = "{group}";
//创建ConfigService，连接Nacos
Properties properties = new Properties();
properties.put("serverAddr", serverAddr);
ConfigService configService = NacosFactory.createConfigService(properties);
//读取配置
String content = configService.getConfig(dataId, group, 5000);
System.out.println(content);
//添加配置监听器
configService.addListener(dataId, group, new Listener() {
	@Override
	public void receiveConfigInfo(String configInfo) {
		System.out.println("recieve1:" + configInfo);
	}
	@Override
	public Executor getExecutor() {
		return null;
	}
});
```

这里核心的步骤有2步：

* 创建ConfigService，目的是连接到Nacos

* 添加配置监听器，编写配置变更的通知处理逻辑



由于我们采用了`spring-cloud-starter-alibaba-nacos-config`自动装配，因此`ConfigService`已经在`com.alibaba.cloud.nacos.NacosConfigAutoConfiguration`中自动创建好了：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-INEIbFX9WozMryx0LjvcxmV1nqe.webp" style="zoom:67%;" />

NacosConfigManager中是负责管理Nacos的ConfigService的，具体代码如下：

<img src="/covers/springcloud-5-pisalw/day04-%E5%BE%AE%E6%9C%8D%E5%8A%A102-JmqbbAPoHoNxeAxeKikcjn1MnIh.webp" style="zoom:67%;" />

因此，只要我们拿到`NacosConfigManager`就等于拿到了`ConfigService`，第一步就实现了。



第二步，编写监听器。虽然官方提供的SDK是ConfigService中的addListener，不过项目第一次启动时不仅仅需要添加监听器，也需要读取配置，因此建议使用的API是这个：

```java
String getConfigAndSignListener(
    String dataId, // 配置文件id
    String group, // 配置组，走默认
    long timeoutMs, // 读取配置的超时时间
    Listener listener // 监听器
) throws NacosException;
```

既可以配置监听器，并且会根据dataId和group读取配置并返回。我们就可以在项目启动时先更新一次路由，后续随着配置变更通知到监听器，完成路由更新。



### 2. 更新路由

更新路由要用到`org.springframework.cloud.gateway.route.RouteDefinitionWriter`这个接口：

```java
/**
 * @author Spencer Gibb
 */
public interface RouteDefinitionWriter {
        /**
     * 更新路由到路由表，如果路由id重复，则会覆盖旧的路由
     */
        Mono<Void> save(Mono<RouteDefinition> route);
        /**
     * 根据路由id删除某个路由
     */
        Mono<Void> delete(Mono<String> routeId);

}

```

这里更新的路由，也就是RouteDefinition，之前我们见过，包含下列常见字段：

* id：路由id

* predicates：路由匹配规则

* filters：路由过滤器

* uri：路由目的地

将来我们保存到Nacos的配置也要符合这个对象结构，将来我们以JSON来保存，格式如下：

```json
[
    {
        "id": "item",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/items/**", "_genkey_1":"/search/**"}
        }],
        "filters": [],
        "uri": "lb://item-service"
    },
    {
        "id": "cart",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/carts/**"}
        }],
        "filters": [],
        "uri": "lb://cart-service"
    },
    {
        "id": "user",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/users/**", "_genkey_1":"/addresses/**"}
        }],
        "filters": [],
        "uri": "lb://user-service"
    },
    {
        "id": "trade",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/orders/**"}
        }],
        "filters": [],
        "uri": "lb://trade-service"
    },
    {
        "id": "pay",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/pay-orders/**"}
        }],
        "filters": [],
        "uri": "lb://pay-service"
    }
]
```

以上JSON配置就等同于：

```java
spring:
  cloud:
    gateway:
      routes:
        - id: item
          uri: lb://item-service
          predicates:
            - Path=/items/**,/search/**
```



### 3. 实现动态路由

首先， 我们在网关gateway引入依赖：

```xml
<!--统一配置管理-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
<!--加载bootstrap-->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-bootstrap</artifactId>
</dependency>
```

然后在网关`gateway`的`resources`目录创建`bootstrap.yaml`文件，内容如下：

```yml
spring:
  application:
    name: hm-gateway
  cloud:
    nacos:
      server-addr: 192.168.146.130
      config:
        file-extension: yaml
        shared-configs:
          - dataId: shared-log.yaml # 共享日志配置
```

接着，修改`gateway`的`resources`目录下的`application.yml`，把之前的路由移除，最终内容如下：

```yml
server:
  port: 8080 # 端口
hm:
  jwt:
    location: classpath:hmall.jks # 秘钥地址
    alias: hmall # 秘钥别名
    password: hmall123 # 秘钥文件密码
    tokenTTL: 30m # 登录有效期
  auth:
    excludePaths: # 无需登录校验的路径
      - /search/**
      - /users/login
      - /items/**
```

然后，在`gateway`中定义配置监听器DynamicRouteLoader

```java
@Component
@RequiredArgsConstructor
public class DynamicRouteLoader {
    private final NacosConfigManager nacosConfigManager;
    private final RouteDefinitionWriter writer;
    
    private final String dataId="gateway-routes.json";
    private final String group="DEFAULT_GROUP";
    private final Set<String> routeIds = new HashSet<>();
    
    @PostConstruct
    public void initRouteConfigListener() throws NacosException {
        //1.项目启动时，先拉取一次配置，并且添加配置监听器
        String configInfo = nacosConfigManager.getConfigService()
                .getConfigAndSignListener(dataId, group, 5000, new Listener() {
                    @Override
                    public Executor getExecutor() {
                        return null;
                    }

                    @Override
                    public void receiveConfigInfo(String s) {
                        //2.监听到配置变更，需要去更新路由表
                        updateConfigInfo(s);
                    }
                });
        //3.第一次读取到配置，也需要更新到路由表
        updateConfigInfo(configInfo);
    }

    public void updateConfigInfo(String configInfo){
        List<RouteDefinition> routeDefinitions = JSONUtil.toList(configInfo, RouteDefinition.class);
        // 2.更新前先清空旧路由
        // 2.1.清除旧路由
        for (String routeId : routeIds) {
            writer.delete(Mono.just(routeId)).subscribe();
        }
        routeIds.clear();
        // 2.2.判断是否有新的路由要更新
        if (CollUtils.isEmpty(routeDefinitions)) {
            // 无新路由配置，直接结束
            return;
        }
        // 3.更新路由
        routeDefinitions.forEach(routeDefinition -> {
            // 3.1.更新路由
            writer.save(Mono.just(routeDefinition)).subscribe();
            // 3.2.记录路由id，方便将来删除
            routeIds.add(routeDefinition.getId());
        });
    }
}
```
