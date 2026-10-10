---
title: 2.服务注册与发现
description: 服务注册和发现我们实现了微服务拆分，并且通过Http请求实现了跨微服务的远程调用。不过这种手动发送Http请求的方式存在一些问题。试想一下，假如商品微服务被调用较多，为了应对更高的并发，我们进行了多实
pubDate: 2026-10-10
series: SpringCloud
order: 2
source: SpringCloud/2.服务注册与发现
---

# 服务注册和发现

我们实现了微服务拆分，并且通过Http请求实现了跨微服务的远程调用。不过这种手动发送Http请求的方式存在一些问题。

试想一下，假如商品微服务被调用较多，为了应对更高的并发，我们进行了多实例部署，如图：

<img src="/covers/springcloud-2-14nzb11/image-20260829162308995.webp" alt="image-20260829162308995" style="zoom:67%;" />

此时，每个`item-service`的实例其IP或端口不同，问题来了：

* item-service这么多实例，cart-service如何知道每一个实例的地址？

* http请求要写url地址，`cart-service`服务到底该调用哪个实例呢？

* 如果在运行过程中，某一个`item-service`实例宕机，`cart-service`依然在调用该怎么办？

* 如果并发太高，`item-service`临时多部署了N台实例，`cart-service`如何知道新实例的地址？



微服务拆分后有两个绕不开的问题：

1. **服务在哪** — 订单服务要调用户服务，但用户服务有 3 个实例，IP 端口随时可能变（扩容、重启、容器化后 IP 动态分配），写死地址不现实。Nacos 作为注册中心：提供方启动时把地址注册上去，消费方按服务名查地址，实例上下线自动感知。
2. **配置怎么管** — 几十个服务、几套环境，改一个配置挨个登录机器改文件再重启太痛苦。Nacos 作为配置中心：配置统一存在 Nacos 服务端，改了之后**推送到各个服务，不用重启就生效**。



## 1. 注册中心

在微服务远程调用的过程中，包括两个角色：

* 服务提供者：提供接口供其它微服务访问，比如`item-service`

* 服务消费者：调用其它微服务提供的接口，比如`cart-service`



在大型微服务项目中，服务提供者的数量会非常多，为了管理这些服务就引入了**注册中心**的概念。注册中心、服务提供者、服务消费者三者间关系如下：

<img src="/covers/springcloud-2-14nzb11/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-I585bymUMoaPSBxmzdUcoxf6ncf.jpg" style="zoom:67%;" />

流程如下：

* 服务启动时就会注册自己的服务信息（服务名、IP、端口）到注册中心

* 调用者可以从注册中心订阅想要的服务，获取服务对应的实例列表（1个服务可能多实例部署）

* 调用者自己对实例列表负载均衡，挑选一个实例

* 调用者向该实例发起远程调用



当服务提供者的实例宕机或者启动新实例时，调用者如何得知呢？

* 服务提供者会定期向注册中心发送请求，报告自己的健康状态（心跳请求）

* 当注册中心长时间收不到提供者的心跳时，会认为该实例宕机，将其从服务的实例列表中剔除

* 当服务有新实例启动时，会发送注册服务请求，其信息会被记录在注册中心的服务实例列表

* 当注册中心服务列表变更时，会主动通知微服务，更新本地服务列表





## 2. Nacos注册中心

目前开源的注册中心框架有很多，国内比较常见的有：

* Eureka：Netflix公司出品，目前被集成在SpringCloud当中，一般用于Java应用

* Nacos：Alibaba公司出品，目前被集成在SpringCloudAlibaba中，一般用于Java应用

* Consul：HashiCorp公司出品，目前集成在SpringCloud中，不限制微服务语言



基于Docker来部署Nacos的注册中心，首先要准备MySQL数据库表（E:\AI\nacos)，用来存储Nacos的数据。由于是Docker部署，所以需要将SQL文件导入到Docker中的MySQL容器中：

最终表结构如下：

<img src="/covers/springcloud-2-14nzb11/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-X3DbbkptNowBVFxxcXgco71TnYb.webp" style="zoom: 80%;" />

然后，找到nacos文件夹：

![](/covers/springcloud-2-14nzb11/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-Xma8b1fjvoMcTqxjxR6cLC7mn5e.webp)

其中的`nacos/custom.env`文件中，有一个MYSQL\_SERVICE\_HOST也就是mysql地址，需要修改为你自己的虚拟机IP地址：

```
PREFER_HOST_MODE=hostname
MODE=standalone
SPRING_DATASOURCE_PLATFORM=mysql
MYSQL_SERVICE_HOST=192.168.146.130
MYSQL_SERVICE_DB_NAME=nacos
MYSQL_SERVICE_PORT=3306
MYSQL_SERVICE_USER=root
MYSQL_SERVICE_PASSWORD=123456
MYSQL_SERVICE_DB_PARAM=characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai
```

然后，将`nacos`目录上传至虚拟机的`/root`目录。

进入root目录，然后执行下面的docker命令：

```
docker run -d \
  --name nacos \
  --env-file ./nacos/custom.env \
  -p 8848:8848 -p 9848:9848 -p 9849:9849 \
  --restart=always \
  nacos/nacos-server:v2.1.0-slim
```

启动完成后，访问下面地址：<http://192.168.146.130:8848/nacos/>

首次访问会跳转到登录页，**账号密码都是nacos**





## 3. 服务注册

接下来，我们把`item-service`注册到Nacos，步骤如下：

### 1. 添加依赖

在`item-service`的`pom.xml`中添加依赖：

```xml
<!--nacos 服务注册发现-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```



### 2. 配置Nacos

在`item-service`的`application.yml`中添加nacos地址配置：

```yml
spring:
  application:
    name: item-service # 服务名称
  cloud:
    nacos:
      server-addr: 192.168.146.130:8848 # nacos地址
```



### 3. 启动服务实例

为了测试一个服务多个实例的情况，我们再配置一个`item-service`的部署实例：

然后配置启动项，注意重命名并且配置新的端口，避免冲突：

<img src="/covers/springcloud-2-14nzb11/day03-%E5%BE%AE%E6%9C%8D%E5%8A%A101-ZqNjb9lCkoXhbUxvAE1cDOa5n6d.webp" style="zoom:67%;" />

重启`item-service`的两个实例：

![image-20260829171338738](/covers/springcloud-2-14nzb11/image-20260829171338738.webp)

访问nacos控制台，可以发现服务注册成功,点击详情，可以查看到`item-service`服务的两个实例信息：

<img src="/covers/springcloud-2-14nzb11/image-20260829171720850.webp" alt="image-20260829171720850" style="zoom: 67%;" />



## 4. 服务发现

服务的消费者要去nacos订阅服务，这个过程就是服务发现，步骤如下：

### 1. 引入依赖

服务发现除了要引入nacos依赖以外，由于还需要负载均衡，因此要引入SpringCloud提供的LoadBalancer依赖。

我们在`cart-service`中的`pom.xml`中添加下面的依赖：

```xml
<!--nacos 服务注册发现-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

可以发现，这里Nacos的依赖于服务注册时一致，这个依赖中同时包含了服务注册和发现的功能。因为任何一个微服务都可以调用别人，也可以被别人调用，即可以是调用者，也可以是提供者。

因此，等一会儿`cart-service`启动，同样会注册到Nacos



### 2. 配置Nacos地址

在`cart-service`的`application.yml`中添加nacos地址配置：

```yml
spring:
  cloud:
    nacos:
      server-addr: 192.168.146.130:8848
```



### 3. 发现并调用服务

接下来，服务调用者`cart-service`就可以去订阅`item-service`服务了。不过item-service有多个实例，而真正发起调用时只需要知道一个实例的地址。

因此，服务调用者必须利用负载均衡的算法，从多个实例中挑选一个去访问。常见的负载均衡算法有：

* 随机

* 轮询

* IP的hash

* 最近最少访问

* ...

这里我们可以选择最简单的随机负载均衡。



另外，服务发现需要用到一个工具，DiscoveryClient，SpringCloud已经帮我们自动装配，我们可以直接注入使用：

```java
private final DiscoveryClient discoveryClient;
```

接下来，我们就可以对原来的远程调用做修改了，之前调用时我们需要写死服务提供者的IP和端口，但现在不需要了，我们通过DiscoveryClient发现服务实例列表，然后通过负载均衡算法，选择一个实例去调用：

```java
@Service
@RequiredArgsConstructor
public class CartServiceImpl extends ServiceImpl<CartMapper, Cart> implements ICartService {
    private final RestTemplate restTemplate;
    private final DiscoveryClient discoveryClient;
    
    private void handleCartItems(List<CartVO> vos) {
        // 1.获取商品id
        Set<Long> itemIds = vos.stream().map(CartVO::getItemId).collect(Collectors.toSet());
        // 2.查询商品
        //根据服务名称获取服务的实例列表
        List<ServiceInstance> instances = discoveryClient.getInstances("item-service");
        //负载均衡，挑选一个实例
        ServiceInstance instance = instances.get(RandomUtil.randomInt(instances.size()));
        //发送请求
        ResponseEntity<List<ItemDTO>> response = restTemplate.exchange(
                instance.getUri()+"/items?ids={ids}",    //请求路径
                HttpMethod.GET,                              //请求方式
                null,                                        //请求实体
                new ParameterizedTypeReference<List<ItemDTO>>() {}, //返回值类型
                Map.of("ids", CollUtils.join(itemIds, ","))   //请求参数
        );
        List<ItemDTO> items = response.getBody();
        ...
    }
}
```