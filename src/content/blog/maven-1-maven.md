---
title: 1.Maven
description: Maven是一款用于管理和构建Java项目的工具，它基于项目对象模型(ProjectObjectModel,简称:POM)，通过一小段描述信息来管理项目的构建、报告和文档。
pubDate: 2026-10-10
series: Maven
order: 1
source: Maven/1.Maven
---

## 一.Maven

Maven 是一款用于管理和构建Java项目的工具，它基于项目对象模型(Project Object Model , 简称: POM)，通过一小段描述信息来管理项目的构建、报告和文档。

Maven就是让你不用再为"怎么管理库"、"怎么编译代码"这些琐事操心，专心写代码的工具。就像你点外卖一样，只需要告诉店家要什么，店家会帮你准备好，你不用自己去买菜、做饭

### 1.Maven模型

* 项目对象模型 (Project Object Model)

* 依赖管理模型(Dependency)

* 构建生命周期(Build lifecycle & phases)

<!-- 缺图：image-20260204144242674.png —— 未随笔记上传 -->

1\). 构建生命周期/阶段(Build lifecycle & phases)

当我们需要编译，Maven提供了一个编译插件供我们使用；当我们需要打包，Maven就提供了一个打包插件供我们使用等，当我们需要什么功能，Maven就提供一个什么样的插件供我们使用

2\). 项目对象模型 (Project Object Model)

就是将我们自己的项目抽象成一个对象模型，有自己专属的坐标，如下图所示是一个Maven项目：

<!-- 缺图：image-20260204145621909.png —— 未随笔记上传 -->

> 坐标，就是资源(jar包)的唯一标识，通过坐标可以定位到所需资源(jar包)位置。
>
> 坐标的组成部分：
>
> * groupId: 组织名
>
> * artifactId: 模块名
>
> * Version: 版本号

3\). 依赖管理模型(Dependency)

依赖管理模型，是使用坐标来描述当前项目依赖哪些第三方jar包。

之前我们项目中需要jar包时，直接就把jar包复制到项目下的lib目录，而现在我们只需要在pom.xml中配置依赖的配置文件即可。 而这个依赖对应的jar包其实就在我们本地电脑上的maven仓库中

### 2.作用

- 依赖管理

**方便快捷管理项目依赖的资源(jar包)，避免版本冲突问题**

我们项目中要想使用某一个jar包，就需要把这个jar包从官方网站下载下来，然后再导入到项目中。然后在这个项目中，就可以使用这个jar包了。

当使用maven进行项目依赖(jar包)管理，则很方便的可以解决这个问题。 我们只需要在maven项目的pom.xml文件中，添加一段如下图所示的配置即可实现。

```
  <dependencies>
        <dependency>
            <groupId>commons-io</groupId>
            <artifactId>commons-io</artifactId>
            <version>2.14.0</version>
        </dependency>
    </dependencies>
```

在maven项目的配置文件中，加入上面这么一段配置信息之后，maven会自动的根据配置信息的描述，去下载对应的依赖。 然后在项目中，就可以直接使用了。&#x20;



- 项目构建

Maven还提供了**标准化的跨平台的自动化构建方式**

我们开发了一套系统，代码需要进行编译、测试、打包、发布等过程，这些操作是所有项目中都需要做的，如果需要反复进行就显得特别麻烦，而Maven提供了一套简单的命令来完成项目构建。

通过Maven中的命令，就可以很方便的完成项目的编译(compile)、测试(test)、打包(package)、发布(deploy) 等操作。&#x20;

而且这些操作都是跨平台的，也就是说无论你是Windows系统，还是Linux系统，还是Mac系统，这些命令都是支持的。



- 统一项目结构

**Maven 还提供了标准、统一的项目结构**

由于java的开发工具呢，有很多，除了大家熟悉的IDEA以外，还有像早期的Eclipse、MyEclipse。而不同的开发工具，创建出来的java项目的目录结构是存在差异的，那这就会出现一个问题。

Eclipse创建的java项目，并不能直接导入IDEA中。 IDEA创建的java项目，也没有办法直接导入到Eclipse中。

而如果我们使用了Maven这一款项目构建工具，它给我们提供了一套标准的java项目目录。如下所示：

<!-- 缺图：image-20260204132302884.png —— 未随笔记上传 -->

也就意味着，无论我们使用的是什么开发工具，只要是基于maven构建的java项目，最终的目录结构都是相同的，我们使用Eclipse、MyEclipse、IDEA创建的maven项目，就可以在各个开发工具直接直接导入使用了，更加方便、快捷。

而在上面的maven项目的目录结构中，src目录下是用来存放源代码的，main目录下存放的是项目的核心代码，主程序，test目录下存放的是项目的测试代码。 而无论是在main还是在test下，都有两个目录，一个是java，用来存放源代码文件；另一个是resources，用来存放配置文件, target (编译、打包生成文件存放目录)



### 3.Maven仓库

仓库：用于存储资源，管理各种jar包

> **仓库的本质**就是一个目录(文件夹)，这个目录被用来存储开发中所有依赖(就是jar包)和插件

Maven仓库分为：

* 本地仓库：自己计算机上的一个目录(用来存储jar包)

* 中央仓库：由Maven团队维护的全球唯一的。仓库地址：https://repo1.maven.org/maven2/

* 远程仓库(私服)：一般由公司团队搭建的私有仓库

当项目中使用坐标引入对应依赖jar包后，

* 首先会查找本地仓库中是否有对应的jar包

  * 如果有，则在项目直接引用

  * 如果没有，则去中央仓库中下载对应的jar包到本地仓库

  如果还可以搭建远程仓库(私服)，将来jar包的查找顺序则变为： 本地仓库 --> 远程仓库--> 中央仓库



### 4.Maven坐标

* Maven中的坐标是**资源的唯一标识** , 通过该坐标可以唯一定位资源位置

* 使用坐标来定义项目或引入项目中需要的依赖

Maven坐标主要组成：

* groupId：定义当前Maven项目隶属组织名称（通常是域名反写，例如：com.itheima）

* artifactId：定义当前Maven项目名称（通常是模块名称，例如 order-service、goods-service）

* version：定义当前项目版本号

  * SNAPSHOT: 功能不稳定、尚处于开发中的版本，即快照版本

  * RELEASE: 功能趋于稳定、当前更新停止，可以用于发行的版本



### 5.pom文件详解

POM (Project Object Model) ：指的是项目对象模型，用来描述当前的maven项目。

使用pom.xml文件来描述当前项目。 pom.xml文件如下：

* `<project> `：pom文件的根标签，表示当前maven项目

* `<modelVersion>`：声明项目描述遵循哪一个POM模型版本

  * 虽然模型本身的版本很少改变，但它仍然是必不可少的。目前POM模型版本是4.0.0

* 坐标 ：

  * `<groupId>` `<artifactId>` `<version>`

  * 定位项目在本地仓库中的位置，由以上三个标签组成一个坐标

* `<maven.compiler.source>` ：编译JDK的版本

* `<maven.compiler.target>` ：运行JDK的版本

* `<project.build.sourceEncoding>` : 设置项目的字符集



## 二.依赖管理

### 1.依赖配置

依赖：指当前项目运行所需要的jar包。一个项目中可以引入多个依赖：

1. 在pom.xml中编写`<dependencies>`标签

2. 在`<dependencies>`标签中使用`<dependency>`引入坐标

3) 定义坐标的 `groupId`、`artifactId`、`version`

4) 点击刷新按钮，引入最新加入的坐标

刷新依赖：保证每一次引入新的依赖，或者修改现有的依赖配置，都可以加入最新的坐标

> 1. 如果引入的依赖，在本地仓库中不存在，将会连接远程仓库 / 中央仓库，然后下载依赖（这个过程会比较耗时，耐心等待）
>
> 2. 如果不知道依赖的坐标信息，可以到mvn的中央仓库（https://mvnrepository.com/）中搜索



### 2.依赖传递

我们上面在pom.xml中配置了一项依赖，就是spring-context，但是我们通过右侧的maven面板可以看到，其实引入进来的依赖，并不是这一项，有非常多的依赖，都引入进来了

为什么会出现这样的现象呢? 那这里呢，就涉及到maven中非常重要的一个特性，那就是Maven中的**依赖传递**。

所谓maven的依赖传递，指的就是如果在maven项目中，A 依赖了B，B依赖了C，C依赖了D，那么在A项目中，也会有C、D依赖，因为依赖会传递。

那如果，传递下来的依赖，在项目开发中，我们确实不需要，此时，我们可以通过Maven中的排除依赖功能，来将这个依赖排除掉。



### 3.排除依赖

* &#x20;排除依赖：指主动断开依赖的资源，被排除的资源无需指定版本。
* 配置形式如下：

<!-- 缺图：image-20260204165442192.png —— 未随笔记上传 -->



### 4.依赖范围

依赖的jar包，默认情况下，可以在任何地方使用，在main目录下，可以使用；在test目录下，也可以使用。&#x20;

在maven中，如果希望限制依赖的使用范围，可以通过 `<scope>…</scope>` 设置其作用范围。

**作用范围：**

* 主程序范围有效。（main文件夹范围内）

* 测试程序范围有效。（test文件夹范围内）

* 是否参与打包运行。（package指令范围内）

可以在pom.xml中配置 `<scope></scope>` 属性来控制依赖范围。

<!-- 缺图：image-20260204201348539.png —— 未随笔记上传 -->

如果对Junit单元测试的依赖，设置了scope为 test，就代表，该依赖，只是在测试程序中可以使用，在主程序中是无法使用的



## 三.生命周期

Maven的生命周期就是为了对所有的构建过程进行抽象和统一。 描述了一次项目构建，经历哪些阶段。

在Maven出现之前，项目构建的生命周期就已经存在，软件开发人员每天都在对项目进行清理，编译，测试及部署。虽然大家都在不停地做构建工作，但公司和公司间、项目和项目间，往往使用不同的方式做类似的工作。

Maven从大量项目和构建工具中学习和反思，然后总结了一套高度完美的，易扩展的项目构建生命周期。这个生命周期包含了项目的清理，初始化，编译，测试，打包，集成测试，验证，部署和站点生成等几乎所有构建步骤。

Maven对项目构建的生命周期划分为3套（相互独立）：

* clean：清理工作。

* default：核心工作。如：编译、测试、打包、安装、部署等。

* site：生成报告、发布站点等。

三套生命周期又包含哪些具体的阶段呢, 我们来看下面这幅图:

<!-- 缺图：image-20260204165829134.png —— 未随笔记上传 -->

每套生命周期包含一些阶段（phase），阶段是有顺序的，后面的阶段依赖于前面的阶段。

我们看到这三套生命周期，里面有很多很多的阶段，这么多生命周期阶段，其实我们常用的并不多，主要关注以下几个：

* clean：移除上一次构建生成的文件

* compile：编译项目源代码

* test：使用合适的单元测试框架运行测试(junit)

* package：将编译后的文件打包，如：jar、war等

* install：安装项目到本地仓库



Maven的生命周期是抽象的，这意味着生命周期本身不做任何实际工作。**在Maven的设计中，实际任务（如源代码编译）都交由插件来完成。**

<!-- 缺图：image-20260204165948796.png —— 未随笔记上传 -->

IDEA工具为了方便程序员使用maven生命周期，在右侧的maven工具栏中，已给出快速访问通道。

* 生命周期的顺序是：`clean` --> `validate` --> `compile` --> `test` --> `package` --> `verify` --> `install` --> `site` --> `deploy`

* 我们需要关注的就是：`clean` -->  `compile` --> `test` --> `package`  --> `install`

> **说明：**&#x5728;同一套生命周期中，我们在执行后面的生命周期时，前面的生命周期都会执行。

> **思考：**&#x5F53;运行package生命周期时，clean、compile生命周期会不会运行？
>
> &#x20;   clean不会运行，compile会运行。  因为compile与package属于同一套生命周期，而clean与package不属于同一套生命周期。



在日常开发中，当我们要执行指定的生命周期时，有两种执行方式：

1. 在idea工具右侧的maven工具栏中，选择对应的生命周期，双击执行

2. 在DOS命令行中，通过maven命令执行

**方式一：在idea中执行生命周期**

* 选择对应的生命周期，双击执行

**方式二：在命令行中执行生命周期**

- 打开maven项目对应的磁盘目录

* 在当前目录下打开CMD

在命令执行：

* mvn clean

* mvn compile

* mvn test

* mvn package

* mvn install  



## 四.单元测试

**测试：**&#x662F;一种用来促进鉴定软件的正确性、完整性、安全性和质量的过程。

**阶段划分：**&#x5355;元测试、集成测试、系统测试、验收测试。

1\). 单元测试

* 介绍：对软件的基本组成单位进行测试，最小测试单位。

* 目的：检验软件基本组成单位的正确性。

* 测试人员：开发人员

2\). 集成测试

* 介绍：将已分别通过测试的单元，按设计要求组合成系统或子系统，再进行的测试。

* 目的：检查单元之间的协作是否正确。

* 测试人员：开发人员

3\). 系统测试

* 介绍：对已经集成好的软件系统进行彻底的测试。

* 目的：验证软件系统的正确性、性能是否满足指定的要求。

* 测试人员：测试人员

4\). 验收测试

* 介绍：交付测试，是针对用户需求、业务流程进行的正式的测试。

* 目的：验证软件系统是否满足验收标准。

* 测试人员：客户/需求方



**测试方法：**&#x767D;盒测试、黑盒测试 及 灰盒测试。

1\). 白盒测试

清楚软件内部结构、代码逻辑。

用于验证代码、逻辑正确性。

2\). 黑盒测试

不清楚软件内部结构、代码逻辑。

用于验证软件的功能、兼容性、验收测试等方面。

3\). 灰盒测试

结合了白盒测试和黑盒测试的特点，既关注软件的内部结构又考虑外部表现（功能）

<!-- 缺图：image-20260204171728325.png —— 未随笔记上传 -->



### 1.单元测试

* 单元测试：就是针对最小的功能单元(方法)，编写测试代码对其正确性进行测试。

* JUnit：最流行的Java测试框架之一，提供了一些功能，方便程序进行单元测试（第三方公司提供）。

在之前的课程中，我们进行程序的测试 ，都是main方法中进行测试 

通过**main方法**是可以进行测试的，可以测试程序是否正常运行。但是main方法进行测试时，会存在如下问题：

1. 测试代码与源代码未分开，难维护。

2. 一个方法测试失败，影响后面方法。

3. 无法自动化测试，得到测试报告。

而如果我们使用了**JUnit单元测试**框架进行测试，将会有以下优势：

1. 测试代码与源代码分开，便于维护。

2. 可根据需要进行自动化测试。

3) 可自动分析测试结果，产出测试报告。

**在编写测试方法时，要尽可能的覆盖业务方法中所有可能的情况（尤其是边界值）**

需求：使用JUnit，对UserService中的业务方法进行单元测试，测试其正确性。

- 在`pom.xml`中，引入JUnit的依赖。

  ```java
  <dependencies>
          <dependency>
              <groupId>org.junit.jupiter</groupId>
              <artifactId>junit-jupiter</artifactId>
              <version>5.9.1</version>
          </dependency>
  </dependencies>
  ```

* 在test/java目录下，创建测试类，并编写对应的测试方法，并在方法上声明@Test注解。

  ```java
  package com.fjq;
  
  import org.junit.jupiter.api.Test;
  
  public class UserServiceTest {
      @Test
      public void testGetage(){
          UserService userservice =new UserService();
          Integer age=userservice.getAge("140227200603240037");
          System.out.println(age);
      }
  }
  ```

* 运行单元测试 (测试通过：绿色；测试失败：红色)。

- 测试通过显示绿色

* 测试失败显示红色

> * 测试类的命名规范为：XxxxTest
>
> * 测试方法的命名规定为：public void xxx(){...}



### 2.断言

JUnit提供了一些辅助方法，用来帮我们确定被测试的方法是否按照预期的效果正常工作，这种方式称为**断言**。

<!-- 缺图：image-20260204180404500.png —— 未随笔记上传 -->

上述方法形参的最后一个参数msg，表示错误提示信息，可以不指定（有对应的重载方法）

测试结果输出：

```java
@Test
    public void testGenderWithAssert(){
        UserService userservice =new UserService();
        String gender=userservice.getGender("140227200603240037");
        Assertions.assertEquals("男",gender);
    }
```



### 3.常见注解

在JUnit中还提供了一些注解，还增强其功能，常见的注解有以下几个：

<!-- 缺图：image-20260204185432391.png —— 未随笔记上传，请手动放置到 public/covers/maven-1-maven/ 并改此行为 ![](/covers/maven-1-maven/image-20260204185432391.png) -->

```java
@ParameterizedTest
    @ValueSource(strings={"140227200603240037","140227200603240032"})
    public void testGender01(String idCard){
        UserService userService=new UserService();
        String gender=userService.getGender(idCard);
        Assertions.assertEquals("女",gender);
    }
```

**思考: 在maven项目中，test目录存放单元测试的代码，是否可以在main目录中编写单元测试呢 ？ 可以，但是不规范**



## 五. IDEA集成Maven

在IDEA中导入Maven项目，有两种方式。

先将要导入的Maven项目复制到你的项目目录下，然后选择maven项目的pom.xml文件进行导入

* 方式一：`File` -> `Project Structure` -> `Modules` -> `Import Module` -> `选择maven项目的pom.xml`

* 方式二：`Maven面板` -> `+（Add Maven Projects）` -> `选择maven项目的pom.xml`



## 六.Maven常见问题

**问题现象：**&#x4D;aven项目中添加的依赖，未正确下载，造成右侧Maven面板中的依赖报红，再次reload重新加载也不会再下载。

**产生原因：**&#x7531;于网络原因，依赖没有下载完整导致的，在maven仓库中生成了**xxx.lastUpdated**文件，该文件不删除，不会再重新下载。

**解决方案：**

1. 根据maven依赖的坐标，找到仓库中对应的 xxx.lastUpdated 文件，删除，删除之后重新加载项目即可。

2. 通过命令 (del /s \*.lastUpdated) 批量递归删除指定目录下的 xxx.lastUpdated 文件，删除之后重新加载项目即可。

3. 重新加载依赖，依赖下载了之后，maven面板可能还会报红，此时可以关闭IDEA，重新打开IDEA加载此项目即可。

为了使大家能够方便的解决这个问题，大家可以将资料中提供的 del.bat 批处理脚本，拷贝到maven的安装目录下。 双击这个文件，就可以递归删除该目录下所有的 xxx.lastUpdated 文件nm，
