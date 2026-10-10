---
title: 3.MinIo
description: xml<dependency<groupIdio.minio</groupId<artifactIdminio</artifactId<version8.6.0</version</dependenc
pubDate: 2026-09-02
series: 存储技术
order: 1
source: 实战/存储技术/3.MinIo.md
---

## 一. 通用

### 1. 引入依赖

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.6.0</version> 
</dependency>
```



### 2. 完善 `application.yml` 

将连接信息写入配置文件。密码等敏感信息使用双引号包裹，防止特殊字符导致 YAML 解析错误。

```yml
minio:
  endpoint: http://192.168.146.130:9005 
  access-key: wuyanzu
  secret-key: "bo@DwF1mzr_wF7am"
  bucket-name: my-bucket
```



### 3. 编写绑定类（MinioProperties.java）

使用 `@ConfigurationProperties` 进行面向对象的属性绑定

`@ConfigurationProperties(prefix = "minio")` 的作用是：**把配置文件（`application.yml`）中以 `minio` 开头的那些配置项，自动批量地“装配”到这个 Java 类的属性中。**

```java
@Data
@Component
@ConfigurationProperties(prefix = "minio")
public class MinioProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucketName;
}
```



## 二. 私有桶

### 1. 编写配置类（MinioConfig.java）

在这里将 `MinioClient` 注入到 Spring 容器中，并确保在项目启动时自动检查并创建指定的私有桶。

`MinioClient` 是 MinIO 官方提供给 Java 开发者的**核心操作类**（也就是 SDK 的主入口）。

如果用一句最通俗的话来解释：**如果把搭建在虚拟机里的 MinIO 服务端比作一个巨大的“远程集装箱仓库”，那么 `MinioClient` 就是你握在手里的“全自动遥控器”。**



它的本质是一个**高度封装的 HTTP 客户端**。

因为 MinIO（以及 AWS S3）的底层通信协议是基于 HTTP/RESTful 的。假如没有 `MinioClient`，你想传一个文件，你需要自己手写 Java 代码去：

1. 建立 HTTP 连接。
2. 按照 S3 的复杂加密算法，用你的 `AccessKey` 和 `SecretKey` 把当前时间和请求参数计算出一个 Hash 签名（Signature），放到 HTTP 请求头里（非常痛苦且容易出错）。
3. 把文件转换成字节流，塞进 HTTP 的 Body 里发过去。
4. 解析 MinIO 返回的 XML 格式结果。

**有了 `MinioClient` 之后，上面这些折磨人的网络通信、加密鉴权、流处理，它全替你干了。** 它向外暴露了非常简单、语义化的 Java 方法。

你在这个类里能找到操作存储对象的一切方法：



**`endpoint`（端点地址）**：就是仓库的**精确 GPS 定位坐标**，告诉程序去哪里找这个仓库。

**`credentials`（身份凭证）**：就是你手里的**最高级别通行证和密码**，告诉门卫你有权调动里面的货物。

在咱们的 `MinioConfig.java` 中，这两个参数是通过建造者模式（Builder Pattern）组装到一起的：

```java
 MinioClient minioClient=MinioClient.builder()
                .endpoint(minioProperties.getEndpoint()) // 2. 传入 endpoint：告诉它服务器在哪
      			 // 3. 传入 credentials：把 AK 和 SK 喂给它，赋予它权限
                .credentials(minioProperties.getAccessKey(),minioProperties.getSecretKey()) 
                .build();  // 4. 执行 build：完成组装，生产出一个随时待命的 MinioClient 实例
```

这段代码只要成功执行一次，这个带有你专属 `endpoint` 和 `credentials` 记忆的 `MinioClient` 就会常驻在 Spring 的容器里。



- **桶级别操作 (Bucket)**
  - `bucketExists()`：查一下这个桶存不存在。
  - `makeBucket()`：新建一个桶。
  - `removeBucket()`：删掉一个桶。
- **对象级别操作 (Object/文件)**
  - `putObject()`：核心方法，把 Java 里的文件流上传到 MinIO。
  - `getObject()`：把 MinIO 里的文件拉回 Java，变成输入流（用于后端代理下载）。
  - `removeObject()`：删除某个文件。
  - `getPresignedObjectUrl()`：不下载文件，而是算出一个带有倒计时的、临时公开的 URL 链接让前端去下载。

```java
@Configuration
public class MinioConfig {

    @Bean
    public MinioClient minioClient(MinioProperties minioProperties) {
        MinioClient minioClient=MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(),minioProperties.getSecretKey())
                .build();

        try {
            boolean found=minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(minioProperties.getBucketName()).build()
            );
            if(!found){
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(minioProperties.getBucketName()).build()
                );
            }
        } catch (Exception e) {
            throw new RuntimeException("MinIO 自动初始化 Bucket 失败，请检查网络或配置！",e);
        }
        return minioClient;
    }
}
```

**`boolean found = minioClient.bucketExists(...)`**

- **动作：** 拿着遥控器（`minioClient`）去问远端的 MinIO 服务器：“你那边有没有一个叫 `my-bucket`（从配置文件读出来的名字）的桶？”
- **结果：** 有就返回 `true`，没有就返回 `false`。

**`if (!found) { minioClient.makeBucket(...) }`**

- **动作：** 如果上一步查出来**没有（`!found`）**，程序就会自动向 MinIO 发送指令，立刻帮你把这个桶建好。

**`catch (Exception e) { throw new RuntimeException(...) }`**

- **动作：** 这是整个代码块的**灵魂**。如果在查桶或者建桶的过程中抛出了异常（比如你的 CentOS 虚拟机没开机、MinIO 挂了、或者你在 yml 里把密码配错了），这行代码会立刻抛出一个严重的运行时异常



### 2. 核心业务层（MinioService.java）

1. `uploadFile`（文件上传：改名与防漏）

这个方法负责接收前端传来的文件，并安全地存进 MinIO。它里面藏了三个非常高级的工程细节：

- **细节一：为什么要用 UUID 重新起名字？（第 15-19 行）**
  - **场景**：张三上传了一个 `头像.jpg`，李四也上传了一个 `头像.jpg`。如果直接原名存进去，后上传的就会把前面的**覆盖（吃掉）**。
  - **做法**：程序先截取出文件的后缀名（比如 `.jpg`），然后用 `UUID.randomUUID()` 生成一串全球唯一的乱码（比如 `a1b2c3d4...`），拼成全新的名字存进 MinIO。这样就彻底杜绝了重名覆盖的问题。
- **细节二：高级的 `try-with-resources` 语法（第 21 行）**
  - **场景**：处理文件流（InputStream）就像接水管，用完必须手动关掉（`.close()`），否则会导致服务器内存泄漏、崩溃。
  - **做法**：注意看 `try` 后面跟着的圆括号 `(InputStream inputStream = ...)`。这是 Java 的高级语法，只要写在括号里的流对象，**无论代码正常执行还是报错抛异常，Java 都会在结束时全自动帮你关闭水管**，极其安全。
- **细节三：指定 ContentType（第 27 行）**
  - 如果不告诉 MinIO 这是一个什么类型的文件（比如它是 image/jpeg），MinIO 会默认它是“未知二进制流”。结果就是：前端哪怕拿到了链接，在浏览器里一打开也会立刻变成“下载文件”，而不是直接“在网页里预览图片”。

2. `getPresignedUrl`（发临时通行证）

这是处理私有桶（PRIVATE）最常用、性能最好的方案。

- **通俗理解**：前端找后端要一份机密文件。后端（Spring Boot）**不亲自去拿**，而是用自己的密钥算出一个带有倒计时（比如 10 分钟失效）的“临时 VIP 通行证（URL 链接）”交给前端。前端拿着这个链接，直接去 MinIO 仓库拿文件。
- **优势**：极大地节省了 Spring Boot 服务器的网络带宽。因为大文件是前端直接跟 MinIO 产生流量，不经过后端中转。

   3.`deleteFile`（常规清理）

这个最简单，就是按图索骥。

前端传过来一个文件名（也就是当初上传时生成的那个 UUID 名字），后端调用 `minioClient.removeObject` 告诉仓库：“把这个文件销毁掉”。

**总结这一个类的设计哲学：**

这个类完美体现了“职责单一”原则。它只负责和 MinIO 打交道，不管 HTTP 请求的参数是对是错，也不管怎么给前端返回 JSON 格式。那些杂活都交给了外层的 `FileController` 去处理。当你以后在写实际项目时，这种“把底层组件操作封装在专门的 Service 中”的设计模式，会让你的代码非常清晰、好维护。

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {
    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    /*
      上传文件
      @return 存储在 MinIO 中的唯一文件名（Object Key）
     */
    public String uploadFile(MultipartFile file) {
    String originalFilename = file.getOriginalFilename();
    String extension = originalFilename != null && originalFilename.contains(".")
            ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        // 使用 UUID 生成唯一文件名，防止重名冲突
    String objectName = UUID.randomUUID().toString().replace("-", "") + extension;

    // 直接将外层 try 和资源 try 合并
    try (InputStream inputStream = file.getInputStream()) {
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(minioProperties.getBucketName())
                        .object(objectName)
                        .stream(inputStream, file.getSize(), -1)
                        .contentType(file.getContentType())  // 必须指定类型，否则浏览器访问时一律变成下载而非预览
                        .build()
        );
        log.info("文件上传成功: {}", objectName);
        return objectName;
    } catch (Exception e) {
        log.error("MinIO 上传文件失败", e);
        throw new RuntimeException("文件上传失败: " + e.getMessage());
    }
}

    /*
      生成有有效期的预签名访问链接（供前端直接预览/下载）
      @param objectName 文件名
     * @param expiry     有效时间
     * @param timeUnit   时间单位
     */
    public String getPresignedUrl(String objectName, int expiry, TimeUnit timeUnit){
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucketName())
                            .object(objectName)
                            .expiry(expiry, timeUnit)
                            .build()
            );
        } catch (Exception e) {
            log.error("生成预签名链接失败", e);
            throw new RuntimeException("获取文件访问链接失败");
        }
    }

    /**
     * 删除文件
     */
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectName)
                            .build()
            );
            log.info("文件删除成功: {}", objectName);
        } catch (Exception e) {
            log.error("MinIO 删除文件失败", e);
            throw new RuntimeException("文件删除失败");
        }
    }
    
    /**
     * 列出 Bucket 中所有文件
     * @return 文件列表，每条包含 name / size / lastModified / etag
     */
    public List<Map<String, Object>> listFiles() {
        List<Map<String, Object>> files = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .recursive(true)
                            .build()
            );
            for (Result<Item> result : results) {
                Item item = result.get();
                Map<String, Object> fileInfo = new LinkedHashMap<>();
                fileInfo.put("name", item.objectName());
                fileInfo.put("size", item.size());
                fileInfo.put("lastModified", item.lastModified());
                fileInfo.put("etag", item.etag());
                files.add(fileInfo);
            }
        } catch (Exception e) {
            log.error("MinIO 列出文件失败", e);
            throw new RuntimeException("获取文件列表失败");
        }
        return files;
    }
    

}
```

### 3.控制层实现（FileController.java）

提供标准的 RESTful 接口，将上述功能暴露。

```java
@RestController
@RequestMapping("/api/oss")
@RequiredArgsConstructor
public class FileController {

    private final MinioService minioService;

    /**
     * 上传接口
     */
    @PostMapping("/upload")
    public Result<String> upload(@RequestParam("file") MultipartFile file) {
        String objectName = minioService.uploadFile(file);
        return Result.success(onjectName);
    }

    /**
     * 获取授权预览链接
     * 默认生成 10 分钟有效的临时链接
     */
    @GetMapping("/preview/{objectName}")
    public Result<String> getPreviewUrl(@PathVariable String objectName) {
        String url = minioService.getPresignedUrl(objectName, 10, TimeUnit.MINUTES);
        return Result.success(onjectName);
    }
    /**
     * 删除文件
     */
    @DeleteMapping("/delete/{objectName}")
    public Result<Void> delete(@PathVariable String objectName) {
        minioService.deleteFile(objectName);
        return Result.success();
    }

    /**
     * 列出所有文件
     */
    @GetMapping("/list")
    public Result<List<Map<String, Object>>> list() {
        List<Map<String, Object>> files = minioService.listFiles();
        return Result.success(files);
    }

}
```

### 💡 生产级避坑指南

1. **`contentType` 丢失问题**：在 `putObject` 时，一定要加上 `.contentType(file.getContentType())`。如果不加，MinIO 会默认将其设置为 `application/octet-stream`。这会导致后期即便你拿到了预签名链接，在浏览器里打开时也会直接触发**文件下载**，而不是在浏览器中直接**预览图片或 PDF**。

2. **大文件上传限制**：Spring Boot 默认最大支持 1MB/10MB 的文件上传。在整合 MinIO 后，通常需要处理大文件，记得在 `application.yml` 中调整 Spring 的文件上传大小限制：

   ```yml
   spring:
     servlet:
       multipart:
         max-file-size: 50MB
         max-request-size: 50MB
   ```

3. **时钟同步问题**：在使用**私有桶**生成方案 A（预签名链接）时，**你的 Spring Boot 服务端所在的机器时间**必须与 **CentOS 虚拟机（MinIO 容器）的时间**保持同步。如果两者时区或时间相差几分钟以上，生成的链接可能会在刚刚发给前端时就已经显示“过期作废”。



## 三. 公有桶

### 1. 编写配置类（MinioConfig.java）

```java
@Configuration
public class MinioConfig {

    @Bean
    public MinioClient minioClient(MinioProperties minioProperties) {
        MinioClient minioClient = MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();

        try {
            String bucketName = minioProperties.getBucketName();
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build()
            );

            if (!found) {
                // 1. 创建 Bucket
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(bucketName).build()
                );

                // 2. 赋予公开读权限 (Public Policy)
                String policyJson = "{\n" +
                        "  \"Statement\": [\n" +
                        "    {\n" +
                        "      \"Action\": \"s3:GetObject\",\n" +
                        "      \"Effect\": \"Allow\",\n" +
                        "      \"Principal\": \"*\",\n" +
                        "      \"Resource\": \"arn:aws:s3:::" + bucketName + "/*\"\n" +
                        "    }\n" +
                        "  ],\n" +
                        "  \"Version\": \"2012-10-17\"\n" +
                        "}";
                
                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder()
                                .bucket(bucketName)
                                .config(policyJson)
                                .build()
                );
            }
        } catch (Exception e) {
            throw new RuntimeException("MinIO 自动初始化 Bucket 失败，请检查网络或配置！", e);
        }

        return minioClient;
    }
}
```



### 2. MinioService

如果将 MinIO 的 Bucket 设置为**公有桶（Public）**，最大的区别在于：**前端读取/下载文件时，不再需要动态生成“预签名 URL”，而是可以直接通过固定的 URL 拼接来访问**。

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {
    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    /**
     * 上传文件（公有桶）
     * 
     * @return 返回文件名
     */
    public String uploadFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        
        // 使用 UUID 生成唯一文件名，防止重名冲突
        String objectName = IdUtil.fastSimpleUUID() + extension;

        // 合并了 try 块，更简洁
        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType()) // 必须指定类型，否则浏览器访问时一律变成下载
                            .build()
            );
            log.info("文件上传成功: {}", objectName);
            
            // 公有桶场景下，上传成功后直接返回相对路径给前端
            return "/" + minioProperties.getBucketName() + "/" + objectName;
            
        } catch (Exception e) {
            log.error("MinIO 上传文件失败", e);
            throw new RuntimeException("文件上传失败: " + e.getMessage());
        }
    }
    
    /**
     * 删除文件
     * 注意：即便桶是公开读的，删除等写入操作依然需要验证，所以此代码与私有桶完全一致
     */
    public void deleteFile(String objectName) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectName)
                            .build()
            );
            log.info("文件删除成功: {}", objectName);
        } catch (Exception e) {
            log.error("MinIO 删除文件失败", e);
            throw new RuntimeException("文件删除失败");
        }
    }
    
    public void deleteByRelativePath(String relativePath) {
    // 构造前缀，例如 "/my-bucket/"
    String prefix = "/" + minioProperties.getBucketName() + "/";
    
    // 校验前端传来的路径是否合法
    if (relativePath != null && relativePath.startsWith(prefix)) {
        // 截取掉前缀，剩下的就是纯 objectName
        String objectName = relativePath.substring(prefix.length());
        
        // 调用你截图中的删除方法
        deleteFile(objectName);
    } else {
        throw new IllegalArgumentException("无效的文件路径");
    }
}

    /**
     * 列出 Bucket 中所有文件
     * 同样，列出文件列表也属于管理操作，代码与私有桶保持一致
     */
    public List<Map<String, Object>> listFiles() {
        List<Map<String, Object>> files = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .recursive(true)
                            .build()
            );
            for (Result<Item> result : results) {
                Item item = result.get();
                Map<String, Object> fileInfo = new LinkedHashMap<>();
                fileInfo.put("name", item.objectName());
                fileInfo.put("size", item.size());
                fileInfo.put("lastModified", item.lastModified());
                fileInfo.put("etag", item.etag());
                files.add(fileInfo);
            }
        } catch (Exception e) {
            log.error("MinIO 列出文件失败", e);
            throw new RuntimeException("获取文件列表失败");
        }
        return files;
    }
}
```



### 3. Controller

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("upload")
public class UploadController {

    private final MinioService minioService;

    @PostMapping("avatar")
    public Result uploadAvatar(@RequestParam("file") MultipartFile image) {
        String url = minioService.uploadFile(image);
        return Result.success(url);
    }

    //从完整的图片 URL 中，精准提取出真正的文件名，然后交给 MinIO 删除。
    @GetMapping("/delete")
    public Result deleteImg(@RequestParam("name") String filename) {
        // filename 可能是完整 URL，提取对象名
        String objectName = filename;
        if (StrUtil.isNotBlank(filename) && filename.contains("/")) {
            objectName = filename.substring(filename.lastIndexOf("/") + 1);
        }
        minioService.deleteFile(objectName);
        return Result.success();
    }
}
```

