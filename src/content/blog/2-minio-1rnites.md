---
title: 2.MinIo介绍
description: 一.AWSS3和MinIo
pubDate: 2026-09-02
series: 存储技术
order: 2
source: 实战/存储技术/2.MinIo介绍.md
---

## 一. AWS S3和MinIo

**AWS S3**（全称是 Amazon Simple Storage Service）是亚马逊云科技（AWS）提供的一项**对象存储服务**。

如果用最通俗的话来说，你可以把它理解为**互联网上的一个无限容量、极其安全且高可用的“超级云盘”**，专门用来存放各种非结构化数据（如图片、视频、文档、备份文件、系统日志等）。

### 1. 对象存储

传统的电脑硬盘使用的是**文件系统**（有 C盘、D盘，里面有层层嵌套的文件夹）。而 S3 使用的是**对象存储**，它的结构更扁平、更简单：

- **存储桶（Bucket）**：它是存放文件的顶层容器。你可以把它理解为一个大网兜或者一个项目专用的空间。在 S3 中，每个 Bucket 的名称在全球必须是唯一的。我们在 MinIO 配置中写的 `bucket-name` 就是这个概念。
- **对象（Object）**：在 S3 中，文件不叫文件，叫“对象”。一个对象由三部分组成：
  1. **数据本身**（比如一张 JPG 图片）。
  2. **元数据（Metadata）**（描述数据的数据，比如图片的拍摄时间、上传者信息、内容类型等）。
  3. **唯一标识符（Key）**（通常就是文件名或者包含路径的名称，比如 `images/2026/avatar.jpg`）。

### 2. AWS S3

AWS S3 诞生于 2006 年，是最早的云服务之一，它解决了很多传统存储的痛点：

- **无限的弹性扩展**：你不需要像买物理硬盘那样预先考虑买多大容量。S3 的容量是无限的，你存 1KB 也行，存几百个 PB（1PB = 1024TB）也行，按实际使用的量付费。
- **变态级的数据持久性**：AWS 宣称 S3 拥有 **11 个 9（99.999999999%）** 的数据持久性。这意味着如果你在 S3 存了 100 亿个文件，平均每一万年才会丢失一个文件。它会在后台自动将你的数据复制到多个不同的物理设备上。
- **原生的 Web 友好性**：S3 中的每一个“对象”都可以通过 HTTP/HTTPS 协议直接访问。只要权限允许，前端浏览器可以通过一个简单的 URL 链接直接下载或显示图片，完全不需要经过你的后端服务器，极大地减轻了后端的带宽压力。

因为 AWS S3 出现得早、用得人多、设计得好，**S3 的 API（应用程序接口）已经成为了整个对象存储行业的“事实标准”**。

- **AWS S3** 是**公有云**服务，数据存在亚马逊的机房里，你需要向亚马逊交钱。
- **MinIO** 则是**私有化部署**的开源替代品。它100%兼容了 S3 的 API 协议。
- **其他大厂**：比如阿里云的 OSS、腾讯云的 COS，其实在很大程度上也参考或兼容了 S3 的生态。

所以，当你在 Spring Boot 项目中引入了兼容 S3 协议的 SDK（比如 MinIO SDK 或是 AWS 官方 SDK）后，只要改一下配置文件里的服务器地址和密钥，你的代码无需修改，就可以无缝在本地 MinIO 和云端 AWS S3 之间来回切换。

### 3. MinIo

MinIO 是一个非常流行的开源**对象存储服务器**。你可以把它理解为一个私有化部署的 AWS S3，或者是用来专门存放大文件（如图片、视频、文档、备份等）的超级云盘。

1. **全面兼容 Amazon S3 API**：这是 MinIO 最大的优势。只要你的应用支持 AWS S3，就可以无缝切换到 MinIO，几乎不需要修改代码。
2. **极致的高性能**：它是用 Go 语言编写的，专门针对海量非结构化数据和并发进行了优化，读写速度极快。
3. **极简与轻量**：没有复杂的依赖，核心就是一个可执行文件。通过 Docker 部署只需要一行命令。
4. **云原生友好**：天然支持 Kubernetes、Docker 等容器化技术。



## 二. MultipartFile

Spring中提供了一个API：**MultipartFile**，这个是用来接受前端传递过来的文件数据的

```java
@Slf4j
@RestController
public class UploadController {
    @PostMapping("/upload")
    public Result handleFileUpload(MultipartFile file) {
        log.info("文件上传:{}", file);
        return Result.success();
    }
}
```

在定义的方法中接收提交过来的数据 （方法中的形参名和请求参数的名字保持一致）：文件： `MultipartFile  file`

前端必须用`Content-Type: multipart/form-data`格式传文件，否则后端接收不到文件，`MultipartFile`会是null。

这时的这个文件是存放在一个临时目录，一旦java项目关闭，这个临时存储的文件也就没有了



### 1. 常见方法

|             方法              |             作用             |
| :---------------------------: | :--------------------------: |
| String  getOriginalFilename() |        获取原始文件名        |
|  void  transferTo(File dest)  | 将接收的文件转存到磁盘文件中 |
|        long  getSize()        |  获取文件的大小，单位：字节  |
|      byte[]  getBytes()       |    获取文件内容的字节数组    |
| InputStream  getInputStream() | 获取接收到的文件内容的输入流 |



### 2.  文件名处理

UUID全称是**通用唯一识别码（Universally Unique Identifier）**，是一种「本地就能生成、保证全世界绝对不重复」的标识符，在文件上传场景用它，核心目的就是**解决文件名重复导致文件覆盖的问题**。

```java
import java.util.UUID;

// 1. 生成带横杠的UUID，格式示例：550e8400-e29b-41d4-a716-446655440000
String uuid = UUID.randomUUID().toString();

// 2. 如果不需要横杠，去掉后得到32位纯字符串（更常用）
String uuid = UUID.randomUUID().toString().replace("-", "");
```



```java
@PostMapping("/upload")
public Result upload(String name, Integer age, MultipartFile file) throws IOException {
        log.info("接受参数{}{}{}",name,age,file);
        //获取原始文件名
        String originalFilename = file.getOriginalFilename();
        //生成新的文件名
        String extension=originalFilename.substring(originalFilename.lastIndexOf("."));
        String newFile= UUID.randomUUID().toString()+extension;
        //保存文件
        file.transferTo(new File("E:/java/test/"+newFile));
        return Result.success();
}
```



### 3. 上传大文件

在解决了文件名唯一性的问题后，我们再次上传一个较大的文件(超出1M)时发现，后端程序报错：

报错原因呢，是因为：在SpringBoot中，文件上传时默认单个文件最大大小为1M

那么如果需要**上传大文件**，可以在 `application.yml` 进行如下配置：

```yml
spring:
  servlet:
    multipart:
      最大单个文件大小
      max-file-size: 10MB
      最大请求大小（包括所有文件和表单数据）
      max-request-size: 10MB
```



## 三. MinIo

### 1. Docker

```bash
sudo docker run \
  -p 9005:9000 \
  -p 9090:9090 \
  --name minio \
  --restart=always \
  -e "MINIO_ROOT_USER=wuyanzu" \
  -e "MINIO_ROOT_PASSWORD=bo@DwF1mzr_wF7am" \
  -v /home/data:/data \
  -v /home/config:/root/.minio \
  -d \
  minio/minio:latest \
  server /data \
  --address ":9000" --console-address ":9090"
```

**1. 基础命令与端口映射 (网络连通)**

- `sudo docker run \`
  - 这是 Docker 最核心的命令，意思是基于某个镜像创建并启动一个新的容器。`\` 是换行符，为了让代码多行显示，方便阅读。
- `-p 9005:9000 \`  **(极其重要：API 通信端口)**
  - `-p` 代表 port（端口映射）。规则是 `宿主机端口:容器内端口`。
  - 这里把 **CentOS 虚拟机的 9005 端口**，映射给了 **MinIO 容器内部的 9000 端口**。
  - **应用场景**：未来你的 Spring Boot 项目（使用 MinioClient SDK）上传、下载文件时，就是向虚拟机的 `9005` 端口发请求。
- `-p 9090:9090 \`  **(极其重要：Web 控制台端口)**
  - 把 CentOS 的 `9090` 端口映射给容器的 `9090` 端口。
  - **应用场景**：你在外面用浏览器管理文件、创建 Bucket 时，访问的就是 `http://虚拟机IP:9090`。

**2. 容器管理与后台守护**

- `--name minio \`
  - 给这个跑起来的容器起个名字叫 `minio`。以后你想停止、重启或删除它，直接敲 `docker stop minio` 就可以了，不用记那一长串随机的容器 ID。
- `--restart=always \`
  - **重启策略**。加上这个参数后，这个容器就像一个“打不死的小强”。如果 MinIO 崩溃了，或者你的 CentOS 虚拟机重启了，只要 Docker 服务一启动，它就会自动把 MinIO 拉起来，不需要你每次开机手动敲命令。
- `-d \`
  - `-d` 代表 detached（后台运行）。如果不加这个参数，MinIO 启动的日志会一直霸占着你的终端窗口，你一关终端，MinIO 就停了。加上 `-d`，它就会在后台静默运行。

**3. 环境变量 (账号密码)**

- `-e "MINIO_ROOT_USER=wuyanzu" \`
- `-e "MINIO_ROOT_PASSWORD=bo@DwF1mzr_wF7am" \`
  - `-e` 代表 environment（环境变量）。我们在启动容器的瞬间，把超级管理员的账号（wuyanzu）和密码强行注入到 MinIO 内部。

**4. 数据卷挂载 (数据持久化 - 核心思想)**

- `-v /home/data:/data \`
- `-v /home/config:/root/.minio \`
  - `-v` 代表 volume（数据卷挂载）。规则是 `宿主机目录:容器内目录`。
  - **为什么要做这一步？** Docker 容器默认是“阅后即焚”的，如果你不挂载，当容器被删除时，里面存的图片和配置也就跟着灰飞烟灭了。
  - **这段代码的作用**：把 CentOS 虚拟机上的 `/home/data` 目录和容器里的 `/data` 目录“绑”在一起。你在 MinIO 里上传了一张图片，实际上它是实实在在地存在了你虚拟机的 `/home/data` 目录里。即使你把名为 `minio` 的容器删了重装，只要重新挂载这个目录，数据就全都在。

**5. 镜像源与程序启动指令**

- `minio/minio:latest \`
  - 告诉 Docker，使用 `minio/minio` 这个镜像的 `latest`（最新）版本来创建容器。
- `server /data \`
  - 这是传给 MinIO 程序本身的启动命令。告诉 MinIO：“请把 `/data` 目录作为你的文件存储仓库启动服务”。
- `--address ":9000" --console-address ":9090"`
  - 这也是传给 MinIO 程序的参数，强制规定 MinIO 在容器内部把 API 服务绑定在 `9000` 端口，把 Web 控制台绑定在 `9090` 端口。这正好和咱们最上面的 `-p` 映射呼应上了。

**总结一下数据的流向：**

当你写好 Spring Boot 代码，调用上传接口时，数据会先发往你虚拟机的 `9005` 端口 ➡️ Docker 帮你转发到容器的 `9000` 端口 ➡️ MinIO 程序接收到文件，存到容器的 `/data` 目录 ➡️ 因为做了数据卷挂载，文件最终安全地落盘在了你虚拟机的 `/home/data` 目录中。



### 2. 创建bucket

登入http://192.168.146.130:9090访问MinIo，然后创建

MinIO（以及它所对标的 AWS S3 或阿里云 OSS）在设计上秉持着一个核心的安全原则：**默认拒绝（Secure by Default）**。

也就是说，任何刚刚创建出来的桶，默认都是最高级别的保密状态

状态为“私有”的桶，就像是一个上了锁的保险箱：

- **谁能访问？** 只有掌握了“保险箱钥匙”（也就是我们在 Docker 里配置的 `Access Key` 和 `Secret Key`）的程序，才能进行文件的上传、下载和查看。
- **直接访问会怎样？** 如果你现在右键复制那个 `.docx` 文件的原始下载链接（比如 `http://你的IP:9005/my-bucket/文件.docx`），然后用浏览器的无痕模式打开，MinIO 会毫不留情地返回一段 `Access Denied` (拒绝访问) 的 XML 报错。

我们在编写 `MinioService.java` 时，获取下载链接不能直接拼接字符串，而是要调用一个看起来很复杂的方法：`getPresignedObjectUrl`（获取预签名链接）。

因为桶是**私有**的，前端直接去拿肯定拿不到。所以我们的 Spring Boot 后端充当了“大管家”的角色：

1. 后端拿着密钥去跟 MinIO 说：“我要授权某人下载这个文件，给他开个后门，有效期 1 小时。”
2. MinIO 生成一串带有复杂加密签名的长 URL 返回给后端。
3. 后端把这个临时 URL 交给前端，前端就能在这个小时内顺利下载文件了。超时后，链接自动作废。