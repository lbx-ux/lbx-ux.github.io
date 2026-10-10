---
title: 6.网络编程
description: 在网络通信协议下，不同计算机上运行的程序，进行的数据传输。
pubDate: 2026-10-10
series: Java
order: 6
source: Java/网络编程/2.网络编程
---

## 网络编程

### 什么是网络编程

在网络通信协议下，不同计算机上运行的程序，进行的数据传输。

-   应用场景：即时通信、网游对战、金融证券、国际贸易、邮件、等等。不管是什么场景，都是计算机跟计算机之间通过网络进行数据传输。
    
-   Java中可以使用java.net包下的技术轻松开发出常见的网络应用程序。
    
-   常见的软件架构
    
    -   BS : Browser/Server(浏览器/服务器) — 只需要一个浏览器 ,用户通过不同的网址 ,客户访问不同的服务器(京东 ,淘宝)
    -   CS : Client/Server(客户端/服务端) — 在用户本地需要下载并安装客户端程序 ,在远程有一个服务端程序(QQ,Steam)

![image-20231003200308770](/covers/java--2-5cwbvh/99366b7884910d20a59c9652575532bd.webp)

### 网络编程三要素

-   IP : 设备(笔记本电脑,电脑,watch,ipad)在网络上的地址 ,是唯一标识
-   端口号 : 应用程序在设备中的唯一标识
-   协议 : 数据在网络中传输的规则 ,常见的协议有UDP,TCP,http,https,ftp

#### IP

全称 : Internet Protocol 互联网协议地址 ,也称IP地址 ,是分配给上网设备的数字标签

通俗理解 : 上网设备在网络中的地址 ,是唯一的

常见的IP分类 : IPv4 IPv6

##### IPv4

255 \* 255 \* 255 \* 255 = 42.9亿个IP 2019.11.26不到43亿个IP已经全部分配完毕

<img src="/covers/java--2-5cwbvh/e75e4f7b6dc4dbf2c29dc11745e3daa5.webp" alt="image-20231003223449682" style="zoom:67%;" />

##### IPv6

<img src="/covers/java--2-5cwbvh/c949a84616126a4f22f0c9b40515c218.webp" alt="image-20231003223728907" style="zoom:67%;" />

<img src="/covers/java--2-5cwbvh/5982a53bbcdb38d8fa9158251a4a0f60.webp" alt="image-20231003223818979" style="zoom:67%;" />

> 总结

<img src="/covers/java--2-5cwbvh/e12ab8582ff1d5c3fe4b99c58a0b216e.webp" alt="image-20231003223908528" style="zoom:67%;" />

##### IPv4的地址分类

![image-20231003224531091](/covers/java--2-5cwbvh/6e74826acffad2a9ec15dcc02021a755.webp)

![image-20231003224123909](/covers/java--2-5cwbvh/2c35ff1b7578503abce75c8b425ede2b.webp)

![image-20231003224854336](/covers/java--2-5cwbvh/f22ecdad9d873b1b596f2265763b4da7.webp)

![image-20231003225707525](/covers/java--2-5cwbvh/e4011de369d13f8c015a3f26f23e638f.webp)

> 一般下面的代码只是前置代码 ,用来获取要发送数据的机器的地址 ,有了这个就可以发送数据了

```java
public static void main(String[] args) throws UnknownHostException {
    //1.获取InetAddress对象
    //IP的对象 一台电脑的对象
    InetAddress inetAddress = InetAddress.getByName("LAPTOP-F24TMGNG");
    System.out.println(inetAddress);

    String hostName = inetAddress.getHostName();
    System.out.println(hostName);

    String hostAddress = inetAddress.getHostAddress();
    System.out.println(hostAddress);

}
```

#### 端口

![image-20231003233624054](/covers/java--2-5cwbvh/5656860d1e61fb86f5dde3ccfa5bfb10.webp)

![image-20231003233724615](/covers/java--2-5cwbvh/b1cb9ccd9531fe8fb87d970e595a9e43.webp)

#### 协议

![image-20231003233837114](/covers/java--2-5cwbvh/98f9125795b9dfd428bed742c73ab596.webp)

> 如下图 ,从左到右 ,一条信息先从左边的最上面传到最下面 ,然后从右边的最下面传输到最上面 ,左边的信息解析到最下面时候变成01字符串 ,到了右边的最上层就变成信息了

![image-20231003234122915](/covers/java--2-5cwbvh/d627415973be7944046b97fce4280554.webp)

> 但是演变成TCP/IP协议

![image-20231003234228028](/covers/java--2-5cwbvh/ec29fa3cd95e9761185d347ca691eda4.webp)

##### UDP协议

-   用户数据报协议(User Datagram Protocol)
-   UDP是面向无连接通信协议 ,速度快 ,有大小限制 ,一次最多发送64K ,数据不安全 ,易丢失数据
-   无连接 : 意思是就算两台电脑之间的网络没有连接畅通 ,也是可以发送数据的 ,但是不会保证是否会收到 ,不管是否已经连接成功
    -   比如看在线视频 视频通话 语音通话 丢一点数据没有影响

##### TCP协议

-   传输控制协议(Transmission Control Protocol)
-   面向连接的通信协议 ,速度慢 ,没有大小限制 ,数据安全
-   也就是确保连接成功之后才会发送数据
    -   比如下载软件 文字聊天 发送邮件

###### UDP协议发送数据

![image-20231004001416742](/covers/java--2-5cwbvh/a7e58bd2497007ed6e53c22f08149d10.webp)

> DatagramSocket快递公司 DatagramPacket打包的数据

```java
package udpdemo;

import java.io.IOException;
import java.net.*;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class SendMessageDemo {

    public static void main(String[] args) throws IOException {

        //创建DatagramSocket对象(快递公司)
        //细节
        //绑定端口 : 以后我们就是通过这个端口往外发送
        //空参 : 所有可用的端口随机使用一个
        //有参 : 指定端口号进行绑定
        DatagramSocket ds = new DatagramSocket();

        //打包数据
        String str = "你好!";
        byte[] bytes = str.getBytes();
        InetAddress address = InetAddress.getByName("127.0.0.1");
        int port = 10086;

        DatagramPacket dp = new DatagramPacket(bytes, bytes.length, address, port);

        ds.send(dp);

        ds.close();

    }
}
```

###### UDP协议接受数据

![image-20231004005045524](/covers/java--2-5cwbvh/29a484824127a644e6709aff07d270cb.webp)

注意这回的DatagramSocket()括号里面一定要指定端口

```java
package udpdemo;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketException;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class ReceiveMessageDemo {
    public static void main(String[] args) throws IOException {
        //1.接收数据
        //细节
        //在接受的时候,一定要绑定端口
        //而且绑定的端口要和发送数据的端口一样
        DatagramSocket ds = new DatagramSocket(10086);

        //2.接受数据包
        byte[] bytes = new byte[1024];
        DatagramPacket dp = new DatagramPacket(bytes, bytes.length);
        //该方法是阻塞的 ,程序运行到这一步 ,会在这里死等 ,直到接收端接收到信息
        ds.receive(dp);

        //3.解析数据包
        byte[] data = dp.getData();
        int length = dp.getLength();
        InetAddress address = dp.getAddress();
        int port = dp.getPort();

        System.out.println("接收到数据"+new String(data,0,length));//new String可以把字节数组变成数据
        System.out.println("数据是从 "+address+" 这台电脑的 "+port+" 端口发出的");

        //4.释放资源
        ds.close();


    }
}
```

**运行的时候一定要注意先开启接收端 ,然后开启发送端 ,并且接收端的DatagramSocket要指定端口 ,发送端的DatagramSocket不用指定 ,因为在DatagramPacket()里面已经添加了端口信息**

###### UDP练习(聊天室)

![image-20231004013415273](/covers/java--2-5cwbvh/140faa3b0201833737bc94013f662ca8.webp)

> SendMessage

```java
package udpdemo2;

import java.io.IOException;
import java.net.*;
import java.util.Scanner;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class SendMessage {
    public static void main(String[] args) throws IOException {

        //1.创建DatagramSocket对象
        DatagramSocket ds = new DatagramSocket();

        //2.打包数据
        Scanner sc = new Scanner(System.in);
        while (true) {
            System.out.println("请输入要说的话:");
            String str = sc.nextLine();
            if ("886".equals(str)){
                break;
            }
            byte[] bytes = str.getBytes();

            InetAddress address = InetAddress.getByName("127.0.0.1");

            int port = 10086;

            DatagramPacket dp = new DatagramPacket(bytes, bytes.length,address,port);

            //3.发送数据
            ds.send(dp);
        }

        //4.释放资源
        ds.close();


    }
}
```

> ReceiveMessage

```java
package udpdemo2;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class ReceiveMessage {
    public static void main(String[] args) throws IOException {
        //1.创建DatagramSocket对象
        DatagramSocket ds = new DatagramSocket(10086);

        //2.接受数据包
        byte[] bytes = new byte[1024];
        DatagramPacket dp = new DatagramPacket(bytes, bytes.length);


        while (true) {
            ds.receive(dp);
            //3.解析数据包
            byte[] data = dp.getData();
            int length = dp.getLength();
            String ip = dp.getAddress().getHostAddress();
            String name = dp.getAddress().getHostName();

            //4.打印数据
            System.out.println("IP为: "+ip+",主机名为: "+name+"的人, 发送了数据: "+new String(data,0, length));
        }


    }
}
```

> 改造成为聊天室

在发送端代码 ,点击右上角

![image-20231004191305500](/covers/java--2-5cwbvh/e7527105bd06dd23cd1cd613a4115572.webp)

点击Modify Options

![image-20231004191334300](/covers/java--2-5cwbvh/ea35ceee0008dff8420b2a792cfd1a69.webp)

勾选Allow multipul instances

![image-20231004191353002](/covers/java--2-5cwbvh/33c6596545413883397973d68ea39509.webp)

这样就可以实现一个聊天室功能

> 发送端可以同时创建多个运行程序

![image-20231004191529789](/covers/java--2-5cwbvh/95aae30e196620e97268ed87ccf42145.webp)

> 接收端都可以接收到三个发送端的消息

![image-20231004191537856](/covers/java--2-5cwbvh/9092a412507fc447024957c79fc0e8f7.webp)

##### 单播 ,组播 ,广播

-   是UDP的三种通信方式

![image-20231004225107452](/covers/java--2-5cwbvh/c8e4fe2e76aa2f2285b5824d040d2283.webp)

![image-20231004225117754](/covers/java--2-5cwbvh/61a5322da4fa192eeb5f63e7b0f6b2d5.webp)

![image-20231004225130556](/covers/java--2-5cwbvh/da5c0831bd7a9cce5bc4ca99c288a7a6.webp)

> 概念

![image-20231004222639724](/covers/java--2-5cwbvh/243fd2f4db346611ab1355310aa68b4e.webp)

-   组播代码
    
    如下代码 ,只要添加到224.0.0.2这个地址的设备都能接受到发送端的代码
    

> 下面的代码 乘 3 份
> 
> 重点是创建MulticastSocket的对象
> 
> 还有一步是这个ms.joinGroup(address);

```java
package udpdemo3;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class ReceiveMessageDemo1 {
    //组播接收端代码
    public static void main(String[] args) throws IOException {
        //创建MulticastSocket对象
        MulticastSocket ms = new MulticastSocket(10000);

        //将当前本机,添加到224.0.0.1的这一组当中
        InetAddress address = InetAddress.getByName("224.0.0.2");
        ms.joinGroup(address);

        //创建DatagramPacket对象
        byte[] bytes = new byte[1024];
        DatagramPacket dp = new DatagramPacket(bytes, bytes.length);

        //接收数据
        ms.receive(dp);

        //解析数据
        byte[] data = dp.getData();
        int length = dp.getLength();
        String ip = dp.getAddress().getHostAddress();
        String name = dp.getAddress().getHostName();

        System.out.println("ip为: "+ip+",主机名为: "+name+"的人,发送了数据"+new String(data,0,length));

        //释放资源
        ms.close();

    }


}
```

> SendMessageDemo

```java
package udpdemo3;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class SendMessageDemo {
    public static void main(String[] args) throws IOException {

        //创建MulticastSocket对象
        MulticastSocket ms = new MulticastSocket();

        //创建DatagramPacket对象
        String str = "你好你好!";
        byte[] bytes = str.getBytes();
        InetAddress address = InetAddress.getByName("224.0.0.2");
        int port = 10000;

        DatagramPacket dp = new DatagramPacket(bytes, bytes.length,address,port);

        //发送数据
        ms.send(dp);

        //释放资源
        ms.close();

    }
}
```

-   广播代码
    
    广播代码就是把发送端的getByName后面的地址改成(“255.255.255.255”)
    

###### TCP协议发送和接收数据

![image-20231004225255171](/covers/java--2-5cwbvh/92827684bdacc3c8b131df4fa5dbb875.webp)

-   因为使用的IO流发送信息 ,所以注意对于输出端 ,他是输出流 ,对于接收端 ,他是输入流
-   右边服务器 ,监听到数据之后会返回一个Socket对象

![image-20231004225728115](/covers/java--2-5cwbvh/baf7cae7916e64ecbdf968be925d1e08.webp)

-   细节 : 对于发送端 ,创建Socket对象的同时会链接服务器 ,如果连接不上就会报错
    
-   代码
    

> 客户端

```java
package tcpdemo;

import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Client {

    public static void main(String[] args) throws IOException {
        //TCP协议 发送数据
        //创建Socket对象
        Socket socket = new Socket("127.0.0.1",10000);

        //创建输出流对象,注意这里是用socket来get
        //从连接通道中获取输出流
        OutputStream os = socket.getOutputStream();

        //写出数据
        os.write("你好你好".getBytes());

        //释放资源
        os.close();
        socket.close();

    }
}
```

> 服务器
> 
> 注意下面两行代码
> 
> //因为用的是字节流 ,中文读取会出现乱码
> 
> InputStreamReader isr = new InputStreamReader(is);
> 
> 打印结果出现换行 ,只要把其中打印语句变成System.out.print即可
> 
> 因为想要提高读取的效率 ,所以在外面还可以套一个缓冲流

```java
package tcpdemo;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Server {
    //TCP协议 ,接受数据
    public static void main(String[] args) throws IOException {

        //创建ServerSocket对象
        ServerSocket ss = new ServerSocket(10000);

        //使用ss获取输入流
        //如果没有获取到客户端连接就会一直等 ,等到之后就会返回socket对象
        Socket socket = ss.accept();

        //使用socket获取输入流
        InputStream is = socket.getInputStream();
        //因为用的是字节流 ,中文读取会出现乱码 ,所以这里用InputStreamReader转换成字符流
        InputStreamReader isr = new InputStreamReader(is);
        //缓冲流
        BufferedReader bs = new BufferedReader(isr);
        
        //浓缩为一行
        //BufferedReader bs = new BufferedReader(new InputStreamReader(socket.getInputStream()));

        //因为不知道什么时候获取结束 ,所以先用一个循环接收一下
        int b;
        while ((b=bs.read())!=-1){
            System.out.println((char) b);
        }

        //释放资源
        socket.close();//先把和客户端的连接关闭了
        ss.close();//关闭服务器


    }
}

```

###### TCP协议代码细节

![image-20231004233559771](/covers/java--2-5cwbvh/98b9dc54564b8577b6c2246803023fab.webp)

-   一定是先启动右边的服务端 ,因为如果左边的客户端第一行代码获取不到嗯好和127.0.0.1的连接 ,就会报错
-   在连接的时候遵守三次握手协议
-   在断开的时候遵循四次挥手协议

#### 三次握手四次挥手

-   三次握手
-   "三次"其实就是一个反复确认的过程

![image-20231004233834026](/covers/java--2-5cwbvh/56d3d691a217493aa698e4aff95b679c.webp)

-   四次挥手
-   "四次"原因就是多了一个处理通道内残留数据的过程 ,需要确保通道内数据已经被处理完毕才会断开连接

![image-20231004234032720](/covers/java--2-5cwbvh/3dfcabae8c0bb6773b8d38fc930fa592.webp)

-   三次握手四次挥手这个过程会互相发消息 ,底层采取的就是ICMP协议

![image-20231004234430232](/covers/java--2-5cwbvh/c96b489adafab35a25a94632ed1ec523.webp)

> ICMP（Internet Control Message Protocol）Internet控制[报文](https://baike.baidu.com/item/%E6%8A%A5%E6%96%87/3164352?fromModule=lemma_inlink)协议。它是[TCP/IP](https://baike.baidu.com/item/TCP%2FIP/214077?fromModule=lemma_inlink)协议簇的一个子协议，用于在IP[主机](https://baike.baidu.com/item/%E4%B8%BB%E6%9C%BA/455151?fromModule=lemma_inlink)、[路由器](https://baike.baidu.com/item/%E8%B7%AF%E7%94%B1%E5%99%A8/108294?fromModule=lemma_inlink)之间传递控制消息。控制消息是指网络通不通、[主机](https://baike.baidu.com/item/%E4%B8%BB%E6%9C%BA/455151?fromModule=lemma_inlink)是否可达、[路由](https://baike.baidu.com/item/%E8%B7%AF%E7%94%B1/363497?fromModule=lemma_inlink)是否可用等网络本身的消息。这些控制消息虽然并不传输用户数据，但是对于用户数据的传递起着重要的作用.

#### 综合练习

##### 1.多发多收

![image-20231004234730324](/covers/java--2-5cwbvh/7df0122a5fc0a0d95ecf1215f4cd5d8f.webp)

> Client.class

```java
package a07test1;

import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;
import java.util.Scanner;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Client {
    public static void main(String[] args) throws IOException {
        //1.创建Socket对象并且连接服务器
        Socket socket = new Socket("127.0.0.1",10000);

        //2.写出数据
        Scanner scanner = new Scanner(System.in);
        OutputStream os = socket.getOutputStream();

        while (true) {
            System.out.println("请输入要发送的消息:");
            String s = scanner.nextLine();
            if ("886".equals(s)){
                break;
            }
            s = s+"\n";
            os.write(s.getBytes());
        }

        //3.释放资源
        socket.close();//只要把socket关了 ,流就会随之消失
    }
}
```

> Server.class
> 
> 如果想要输入的数据在服务器端换行打印 ,那么就拼接一个换行符

```java
package a07test1;

import java.io.IOException;
import java.io.OutputStream;
import java.net.Socket;
import java.util.Scanner;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Client {
    public static void main(String[] args) throws IOException {
        //1.创建Socket对象并且连接服务器
        Socket socket = new Socket("127.0.0.1",10000);

        //2.写出数据
        Scanner scanner = new Scanner(System.in);
        OutputStream os = socket.getOutputStream();

        while (true) {
            System.out.println("请输入要发送的消息:");
            String s = scanner.nextLine();
            if ("886".equals(s)){
                break;
            }
            s = s+"\n";
            os.write(s.getBytes());
        }

        //3.释放资源
        socket.close();//只要把socket关了 ,流就会随之消失
    }
}
```

##### 2.接受和反馈

![image-20231004234752181](/covers/java--2-5cwbvh/43d87718b2fd976898b6f13c6715fa76.webp)

> 注意
> 
> ```java
> //写出一个结束标记
> socket.shutdownOutput();
> ```

> Client.class

```java
package a08test2;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;
import java.util.Scanner;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Client {
    public static void main(String[] args) throws IOException {

        //1.创建Socket对象并且连接服务器
        Socket socket = new Socket("127.0.0.1",10000);

        //2.写出数据
        String str = "见到你很高兴!";
        OutputStream os = socket.getOutputStream();
        os.write(str.getBytes());

        //写出一个结束标记
        socket.shutdownOutput();

        //3.接受回写的数据
        BufferedReader bs = new BufferedReader(new InputStreamReader(socket.getInputStream()));

        int b;
        while ((b=bs.read())!=-1){
            System.out.print((char) b);
        }

        //释放资源
        socket.close();

    }
}
```

> Server.class

```java
package a08test2;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/04
 */
public class Server {
    public static void main(String[] args) throws IOException {

        //1.创建对象并且绑定10000端口
        ServerSocket ss = new ServerSocket(10000);

        //2.等待客户端连接
        Socket socket = ss.accept();

        //3.Socket中获取输入流并且读取数据
        BufferedReader bs = new BufferedReader(new InputStreamReader(socket.getInputStream()));

        //读取数据
        int b;
        //read方法会从通道中读取数据,但是会有一个结束标记,此时的循环才会停止
        //否则程序就会一直停在read方法这里等待读取下面的数据
        //结束标记需要在客户端那里去标记
        while ((b=bs.read())!=-1){
            System.out.print((char) b);
        }

        //4.回写数据
        String str = "到底有多开心?";
        OutputStream os = socket.getOutputStream();
        os.write(str.getBytes());

        //释放资源
        socket.close();//断开和客户端的连接
        ss.close();//关闭服务器


    }
}
```

##### 3.上传文件

![image-20231004235046333](/covers/java--2-5cwbvh/a92cbdc9f3bff184b7d9e03eddb88761.webp)

-   图片只能用字节流 ,不能用字符流

![image-20231007200653105](/covers/java--2-5cwbvh/6ecd646d6b1921e083db0a605b720e9d.png)

-   这道题是网络流和本地流的结合 ,体现在客户端需要用本地的字节流(new FileInputStream)读取数据 ,然后用socket的网络流(socket.getOutputStream)输出数据 ; 并且对于服务端 ,需要用网络流(socket.getInputStream)读取管道中的数据 ,用本地流(new FileOutputStream)写出到本地文件夹当中

> Server.class

```java
package a09test3.test;

import java.io.*;
import java.net.Socket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/07
 */
public class Client {
    public static void main(String[] args) throws IOException {
        //创建链接
        Socket socket = new Socket("127.0.0.1", 10000);

        //输出文件
        BufferedInputStream bis = new BufferedInputStream(new FileInputStream("clientdir/a.jpg"));
        BufferedOutputStream bos = new BufferedOutputStream(socket.getOutputStream());
        int len;
        byte[] bytes = new byte[1024];
        while ((len=bis.read(bytes))!=-1){
            bos.write(bytes,0,len);
        }

        //向服务器写出结束标记
        socket.shutdownOutput();

        //接受回写数据
        BufferedReader br = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        String str = br.readLine();
        System.out.println(str);

        socket.close();


    }
}
```

> Client.class

```java
package a09test3;

import java.io.*;
import java.net.Socket;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/05
 */
public class Client {
    public static void main(String[] args) throws IOException {
        //创建Socket对象 ,并连接服务器
        Socket socket = new Socket("127.0.0.1",10000);

        //读取本地文件中的数据 ,并且写到服务器当中
        BufferedInputStream bis = new BufferedInputStream(new FileInputStream("clientdir/a.jpg"));
        //使用BufferedOutputStream包裹字节流 ,提升传输效率
        BufferedOutputStream bos = new BufferedOutputStream(socket.getOutputStream());

        //定义数组
        byte[] bytes = new byte[1024];
        int len;
        //这里是用bis读取本地文件 ,然后用字节数组接受 ,再用bos写出 ,从0字节写到len字节 ,形成了一个在本地读多少就写多少的效果
        while ((len=bis.read(bytes))!=-1){
            bos.write(bytes,0,len);
        }


        //往服务器写出结束标记
        socket.shutdownOutput();

        //接受服务器的回写数据
        //因为服务器回写只有一句话 ,那么我们就直接读取一整行就可以 ,就不用循环了 ,那么就用BufferedReader就好 ,读取一整行
        //先获取到通道里面的输入流 ,这个流是字节流 ,将其转换为字符流 ,再用缓冲流进行包裹
        BufferedReader br = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        String line = br.readLine();//读一次就好了
        System.out.println(line);

        //释放资源
        socket.close();


    }
}
```

##### 4.解决文件名字冲突问题

![image-20231004235124880](/covers/java--2-5cwbvh/90608ae55a225df544eea41c6a6be1aa.webp)

-   通过Java自带的UUID的类 ，生成随机的文件名 ，只需要调用静态方法 ，randomUUID返回一个UUID对象

```java
String str = UUID.randomUUID().toString().replace("-","");
        System.out.println(str);
```

![image-20231009191525396](/covers/java--2-5cwbvh/80a506daf2545e80dfdfc52b49b336da.webp)

##### 5.多个用户同时上传文件

![image-20231004235149917](/covers/java--2-5cwbvh/76a63c9c80dd711fde5ffc1bcc75d10e.webp)

-   单线程的弊端，第一个用户传完了，第二个用户才能传输
    
-   第一步，先把ss.close删掉 ，不让服务器关闭
    
-   第二步，将Server绑定端口下面的所有代码放到while循环里面，将accept方法下面的代码剪切到Run方法（MyRunnable类）里面，只要有一个来连接 ，那么就开启一条线程
    
-   注意构造方法的创建和类的调用
    

> MyRunnable类

![image-20231009200219220](/covers/java--2-5cwbvh/eb21cbece722d40f3d122e7febbbd62a.webp)

> Server类

![image-20231009200238841](/covers/java--2-5cwbvh/80e14e45cd197e30d2f2ec8e0bd8893b.webp)

```java
package a10test4;

import java.io.*;
import java.net.Socket;
import java.util.UUID;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/09
 */
public class MyRunnable implements Runnable{

    Socket socket;

    public MyRunnable(Socket socket) {
        this.socket = socket;
    }

    @Override
    public void run() {
        try {
            //读取数据并且保存到本地
            BufferedInputStream bis = new BufferedInputStream(socket.getInputStream());
            String name = UUID.randomUUID().toString().replace("-","");
            BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream("serverdir/"+name+".jpg"));
            int len;
            byte[] bytes = new byte[1024];
            while ((len=bis.read(bytes))!=-1){
                bos.write(bytes,0,len);
            }
            //回写数据
            //socket.getOutputStream()是从连接通道里面获取的输出流(字节流),转换成字节流 ,再用缓冲流进行包裹
            BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()));
            bw.write("上传成功");
            bw.newLine();
            bw.flush();
        } catch (IOException e) {
            throw new RuntimeException(e);
        } finally {
            //释放资源
            if (socket!=null){
                try {
                    socket.close();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }

            }

        }
    }
}

```

```java
package a10test4;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.UUID;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/05
 */
public class Server {
    public static void main(String[] args) throws IOException {
        //将本地文件上传到服务器 ,接收服务器的反馈
        //服务器 : 接受客户端上传的文件 ,上传完毕之后给出反馈
        ServerSocket ss = new ServerSocket(10000);

        //循环连接 ,允许多用户同时上传
        while (true) {
            //等待客户端连接
            Socket socket = ss.accept();

            //开启一条线程
            //一个用户就对应服务端的一条线程
            new Thread(new MyRunnable(socket)).start();

        }


    }
}
```

##### 6.线程池优化

![image-20231004235216908](/covers/java--2-5cwbvh/1fad040cfc15a5fb363bc9ea80d56c95.webp)

-   只需要修改服务端 ,加一个ThreadPoolExecutor

```java
package a10test4;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * @description:
 * @author: 李嘉健
 * @date: 2023/10/05
 */
public class Server {
    public static void main(String[] args) throws IOException {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                3,//核心线程数量
                16,//线程池总大小
                60,//空闲时间
                TimeUnit.SECONDS,//空闲时间(单位)
                new ArrayBlockingQueue<Runnable>(2),//队列
                Executors.defaultThreadFactory(),//线程工厂,让线程池如何创建线程对象
                new ThreadPoolExecutor.AbortPolicy()//拒绝策略
        );


        //将本地文件上传到服务器 ,接收服务器的反馈
        //服务器 : 接受客户端上传的文件 ,上传完毕之后给出反馈
        ServerSocket ss = new ServerSocket(10000);

        //循环连接 ,允许多用户同时上传
        while (true) {
            //等待客户端连接
            Socket socket = ss.accept();

            //开启一条线程
            //一个用户就对应服务端的一条线程
            //new Thread(new MyRunnable(socket)).start();
            pool.submit(new MyRunnable(socket));

        }


    }
}
```

##### 7.BS模式

![image-20231004235303210](/covers/java--2-5cwbvh/b5fd63a62109e27015aa18cfd4d4f842.webp)

-   打开服务器,让服务器运行
    
-   访问浏览器的127.0.0.1:10000
    
-   访问之后 ,控制台报出如下代码
    
-   其中有很多数据 ,所以BS架构的客户端就是浏览器,浏览器可以给我们后端传输很多内容 ,例如下面的操作系统是Windows,发送的是GET请求,在这里我们还可以会写数据 ,这就属于前端的知识了
    

![image-20231009202047654](/covers/java--2-5cwbvh/9ec0a0dcd09ffab553392ff531e3517e.webp)