---
title: 7.webSocket
description: 1.什么是WebSocket？WebSocket是基于TCP的一种新的网络协议。它实现了浏览器与服务器全双工通信——浏览器和服务器只需要完成一次握手，两者之间就可以创建持久性的连接，并进行双向数据传输
pubDate: 2026-10-10
series: Java
order: 7
source: Java/网络编程/3.webSocket
---

## 1. 什么是 WebSocket？

WebSocket 是基于 TCP 的一种新的**网络协议**。它实现了浏览器与服务器全双工通信——浏览器和服务器只需要完成一次握手，两者之间就可以创建**持久性**的连接， 并进行**双向**数据传输。

想象你打电话（WebSocket）和写信（HTTP）的区别：

- **HTTP** 是“一问一答”，每次通信都要发起新的请求，服务器不能主动给你发消息。
- **WebSocket** 是“拿起电话聊天”，一旦连接建立，双方可以随时向对方发送数据，直到连接断开。

**关键特性**

- **全双工通信**：客户端和服务器可以同时发送和接收消息。
  - 全双工：允许数据在两个方向上同时传输
  - 半双工：允许数据在两个方向上传输，但是同一个时间段内只允许一个方向上传输

- **长连接**：建立一次连接后保持不断开，减少频繁握手的开销。
- **轻量级**：数据帧头部很小，传输效率高。
- **基于 TCP**：和HTTP 一样运行在 TCP 之上，但它是独立协议。

**WebSocket缺点：**

服务器长期维护长连接需要一定的成本
各个浏览器支持程度不一
WebSocket 是长连接，受网络限制比较大，需要处理好重连

**应用场景**

- **即时通讯（IM）**：一对一聊天、群聊。
- **实时通知**：站内信、系统消息、订单状态更新。
- **数据看板**：股票行情、监控大屏的数据实时推送。
- **在线协作**：文档协同编辑、白板。
- **游戏**：实时对战、状态同步。

​    <img src="/covers/java--3-websocket-1938bwr/image-20221222184340172.webp" alt="image-20221222184340172"  />     <img src="/covers/java--3-websocket-1938bwr/image-20221222184352573.webp" alt="image-20221222184352573"  /> 

**与 HTTP 的关系**

WebSocket 是通过 HTTP 升级而来的。客户端发起一个 HTTP 请求，带上特殊的 `Upgrade: websocket` 头，服务器如果支持就会返回 `101 Switching Protocols`，然后连接协议从 HTTP 切换到 WebSocket。

```
客户端请求：
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13

服务器响应：
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: ...
```

之后，这条 TCP 连接就变成了 WebSocket 连接。



## 2. WebSocket

### 客户端API

**websocket对象的创建**

```
let  ws  =  new WebSocket(URL);
```

格式：协议://ip地址/访问路径协议：协议名称为 ws

**websocket对象相关事件**

![image-20260501155653589](/covers/java--3-websocket-1938bwr/image-20260501155653589.webp)

**websocket对象提供的方法**

![image-20260501155826153](/covers/java--3-websocket-1938bwr/image-20260501155826153.webp)



### 服务端API

Java WebSocket应用由一系列的Endpoint组成。Endpoint 是一个java对象，代表WebSocket链接的一端，对于服务端，我们可以视为处理具体WebSocket消息的接口。

我们可以通过两种方式定义Endpoint:

第一种是编程式， 即继承类 javax.websocket.Endpoint并实现其方法。 

第二种是注解式, 即定义一个POJO, 并添加 @ServerEndpoint相关注解。

Endpoint实例在WebSocket握手时创建，并在客户端与服务端链接过程中有效，最后在链接关闭时结束。在Endpoint接口中明确定义了与其生命周期相关的方法， 规范实现者确保生命周期的各个阶段调用实例的相关方法。生命周期方法如下：

![image-20260501160059327](/covers/java--3-websocket-1938bwr/image-20260501160059327.webp)

​	

## 3. Spring Boot 使用 WebSocket

Spring Boot 对 WebSocket 提供了很好的支持，有两种主要实现方式：

1. **原生 WebSocket**：直接处理底层 WebSocket 会话，适合简单的场景。
2. **基于 STOMP 协议**：STOMP（Simple Text Oriented Messaging Protocol）是一个子协议，提供发布-订阅模型，让 WebSocket 更像消息中间件，开发更高效。



### 1. 原生 WebSocket 实现

**实现步骤：**

1). 直接使用websocket.html页面作为WebSocket客户端

2). 导入WebSocket的maven坐标

3). 导入WebSocket服务端组件WebSocketServer，用于和客户端通信

4). 导入配置类WebSocketConfiguration，注册WebSocket的服务端组件

5). 导入定时任务类WebSocketTask，定时向客户端推送数据

**1). 定义websocket.html页面**

```html
<!DOCTYPE HTML>
<html>
<head>
    <meta charset="UTF-8">
    <title>WebSocket Demo</title>
</head>
<body>
    <input id="text" type="text" />
    <button onclick="send()">发送消息</button>
    <button onclick="closeWebSocket()">关闭连接</button>
    <div id="message">
    </div>
</body>
<script type="text/javascript">
    var websocket = null;
    var clientId = Math.random().toString(36).substr(2);

    //判断当前浏览器是否支持WebSocket
    if('WebSocket' in window){
        //连接WebSocket节点
        websocket = new WebSocket("ws://localhost:8080/ws/"+clientId);
    }
    else{
        alert('Not support websocket')
    }

    //连接发生错误的回调方法
    websocket.onerror = function(){
        setMessageInnerHTML("error");
    };

    //连接成功建立的回调方法
    websocket.onopen = function(){
        setMessageInnerHTML("连接成功");
    }

    //接收到消息的回调方法
    websocket.onmessage = function(event){
        setMessageInnerHTML(event.data);
    }

    //连接关闭的回调方法
    websocket.onclose = function(){
        setMessageInnerHTML("close");
    }

    //监听窗口关闭事件，当窗口关闭时，主动去关闭websocket连接，防止连接还没断开就关闭窗口，server端会抛异常。
    window.onbeforeunload = function(){
        websocket.close();
    }

    //将消息显示在网页上
    function setMessageInnerHTML(innerHTML){
        document.getElementById('message').innerHTML += innerHTML + '<br/>';
    }

    //发送消息
    function send(){
        var message = document.getElementById('text').value;
        websocket.send(message);
    }
	
	//关闭连接
    function closeWebSocket() {
        websocket.close();
    }
</script>
</html>
```

**2). 导入maven坐标**

在sky-server模块pom.xml中已定义

```xml
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

**3). 定义WebSocket服务端组件**

```java
/**
 * WebSocket服务
 */
@Component
@ServerEndpoint("/ws/{sid}")
public class WebSocketServer {

    //存放会话对象
    private static Map<String, Session> sessionMap = new HashMap();

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, @PathParam("sid") String sid) {
        System.out.println("客户端：" + sid + "建立连接");
        sessionMap.put(sid, session);
    }

    /**
     * 收到客户端消息后调用的方法
     *
     * @param message 客户端发送过来的消息
     */
    @OnMessage
    public void onMessage(String message, @PathParam("sid") String sid) {
        System.out.println("收到来自客户端：" + sid + "的信息:" + message);
    }

    /**
     * 连接关闭调用的方法
     *
     * @param sid
     */
    @OnClose
    public void onClose(@PathParam("sid") String sid) {
        System.out.println("连接断开:" + sid);
        sessionMap.remove(sid);
    }

    /**
     * 群发
     *
     * @param message
     */
    public void sendToAllClient(String message) {
        Collection<Session> sessions = sessionMap.values();
        for (Session session : sessions) {
            try {
                //服务器向客户端发送消息
                session.getBasicRemote().sendText(message);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

}
```

**4). 定义配置类，注册WebSocket的服务端组件**

```java
/**
 * WebSocket配置类，用于注册WebSocket的Bean
 */
@Configuration
public class WebSocketConfiguration {

    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        return new ServerEndpointExporter();
    }
}
```

**5). 定义定时任务类，定时向客户端推送数据**

```java
@Component
public class WebSocketTask {
    @Autowired
    private WebSocketServer webSocketServer;

    /**
     * 通过WebSocket每隔5秒向客户端发送消息
     */
    @Scheduled(cron = "0/5 * * * * ?")
    public void sendMessageToClient() {
        webSocketServer.sendToAllClient("这是来自服务端的消息：" + DateTimeFormatter.ofPattern("HH:mm:ss").format(LocalDateTime.now()));
    }
}
```



### 2. 使用 STOMP 协议实现

STOMP 是一种基于帧的简单文本协议，Spring 对它有深度集成，可以像写 Controller 一样处理消息，支持 @MessageMapping、发布订阅、用户队列等。

**1)依赖及配置**

依赖同样用 `spring-boot-starter-websocket`。

创建一个配置类，启用 STOMP 支持：

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class StompWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 启用一个简单的内存消息代理，将消息广播到所有订阅了前缀为 /topic 或 /queue 的客户端
        config.enableSimpleBroker("/topic", "/queue");
        // 设置应用程序的前缀，客户端发送消息到 @MessageMapping 方法时需要用 /app 前缀
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 注册 STOMP 端点，客户端通过这个端点建立连接
        registry.addEndpoint("/chat").setAllowedOriginPatterns("*").withSockJS(); // 支持 SockJS 降级
        // 如果不使用 SockJS，可以去掉 .withSockJS()
    }
}
```

- **消息代理前缀**：`/topic` 一般用于广播，`/queue` 用于点对点（一对一消息）。
- **应用目标前缀**：客户端发送消息时，目的地需要以 `/app` 开头，对应服务端 `@MessageMapping` 方法。
- **SockJS**：为不支持 WebSocket 的浏览器提供后备方案，生产环境建议开启。

**2)编写消息处理 Controller**

```java
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 广播消息：客户端发送 /app/chat，经过处理后广播到 /topic/messages
    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public String handleChat(String message) {
        System.out.println("收到消息: " + message);
        // 可以在这里处理业务逻辑，返回的消息会发送到 /topic/messages
        return "服务器回复: " + message;
    }

    // 点对点消息：只发送给指定用户
    @MessageMapping("/private")
    public void handlePrivate(String message, Principal principal) {
        // 假设消息格式为 JSON，包含目标用户和内容
        // 这里简单处理：将收到的消息原样返回给当前用户
        messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/notifications", message);
    }
}
```

- `@MessageMapping("/chat")` 对应客户端发送的目的地 `/app/chat`。
- `@SendTo` 表示将方法返回值发送到该目的地，所有订阅该目的地的客户端都会收到。
- `SimpMessagingTemplate` 可以用来自定义发送消息的时间、目的地和用户，非常灵活。

**3)前端连接（使用 STOMP.js）**

前端需要引入 STOMP 协议的 JavaScript 库，比如 `stomp.js` 和 `sockjs.js`。

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/stompjs@2/bundles/stomp.umd.min.js"></script>
</head>
<body>
    <input id="msg" type="text"><button onclick="send()">发送</button>
    <div id="log"></div>

    <script>
        var stompClient = null;
        // 使用 SockJS 连接
        var socket = new SockJS('/chat');  // 对应注册端点 /chat
        stompClient = Stomp.over(socket);
        stompClient.connect({}, function(frame) {
            console.log('连接成功: ' + frame);
            // 订阅广播频道
            stompClient.subscribe('/topic/messages', function(message) {
                showMessage(JSON.parse(message.body)); // 消息体可能是字符串
            });
            // 订阅个人队列（点对点），用户名为服务端 Principal 名称，通常需要登录集成
            // stompClient.subscribe('/user/queue/notifications', function(msg) { ... });
        }, function(error) {
            console.log('连接失败: ' + error);
        });

        function send() {
            var msg = document.getElementById("msg").value;
            // 发送到服务端 @MessageMapping("/chat")
            stompClient.send("/app/chat", {}, msg);
        }

        function showMessage(msg) {
            document.getElementById("log").innerHTML += "<p>" + msg + "</p>";
        }
    </script>
</body>
</html>
```

如果不想用 SockJS，直接使用 WebSocket：

```js
var ws = new WebSocket("ws://localhost:8080/chat");
var stompClient = Stomp.over(ws);
stompClient.connect({}, ...);
```

**4)安全与认证**（可选）

如果你的应用使用了 Spring Security，就能直接在 STOMP 中使用认证信息。客户端连接时可以携带登录信息，服务端通过 `Principal` 获取当前用户。

配置 STOMP 拦截器来进行认证：

```java
@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(new ChannelInterceptor() {
        // 可以在这里从 headers 中获取用户信息
    });
}
```

或者配置 `csrf` 保护、消息大小限制等，这些可以参考 Spring Security 文档。
