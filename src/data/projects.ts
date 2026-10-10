/**
 * 项目展示数据。
 *
 * 与渲染分离：以后加第三个项目只往 PROJECTS 数组里追加一条。
 * relatedSeries 填站内专栏名（frontmatter 的 series），页面会实时统计该专栏
 * 篇数并生成链接——这是项目与学习笔记互相印证的地方，专栏改名后要同步。
 */
export interface ProjectStack {
  label: string;
  version?: string;
}

export interface Project {
  /** 卡片主标题 */
  title: string;
  /** 一句话定位 */
  tagline: string;
  /** 1–2 段说明 */
  summary: string[];
  /** GitHub 仓库地址 */
  repo: string;
  /** 仓库短名（按钮文案） */
  repoName: string;
  /** 量化结果，没有就别写。short 供首页紧凑卡片使用 */
  metrics?: { value: string; label: string; short?: string }[];
  stack: ProjectStack[];
  highlights: { title: string; detail: string }[];
  /** 站内相关专栏名 */
  relatedSeries: string[];
}

export const PROJECTS: Project[] = [
  {
    title: 'sl-express · 神领物流系统',
    tagline: '基于 Spring Cloud Alibaba 从 0 独立实现的物流快运平台',
    summary: [
      '用户在小程序下单后，系统基于 MongoDB 地理围栏自动分单至所属网点，调度中心按快递员排班与任务量均衡分配取件任务；揽收后订单转为运单，经 Neo4j 路线规划得出多级中转方案，Redis 队列按转运节点合并运单，由 xxl-job 分片调度完成装车分配并生成运输任务与司机作业单；司机入库驱动运单沿链路逐级流转，直至末端派件签收。',
      '按微服务拆成 16 个服务，从需求分析、表结构设计、业务编码到 Jenkins 持续集成部署独立完成，服务用户、快递员、司机、管理四端。',
    ],
    repo: 'https://github.com/lbx-ux/sl-express',
    repoName: 'lbx-ux/sl-express',
    metrics: [
      { value: '16', label: '个微服务' },
      { value: '4', label: '端接入' },
      { value: '4', label: '种存储协同' },
    ],
    stack: [
      { label: 'Spring Boot', version: '2.7' },
      { label: 'Spring Cloud Alibaba' },
      { label: 'Nacos' },
      { label: 'Gateway' },
      { label: 'OpenFeign' },
      { label: 'MySQL', version: '8.0' },
      { label: 'Redis + Caffeine' },
      { label: 'Redisson' },
      { label: 'RabbitMQ' },
      { label: 'Neo4j', version: '5' },
      { label: 'MongoDB' },
      { label: 'xxl-job' },
      { label: 'Leaf' },
    ],
    highlights: [
      {
        title: '消息驱动的智能调度中心',
        detail:
          '取派件与装车调度全部走 RabbitMQ 异步解耦，延迟队列 + 死信队列兜底，调度中心做成无状态纯计算服务，可随流量水平扩容。',
      },
      {
        title: 'Neo4j 图数据库路线规划',
        detail:
          '机构为节点、线路为带成本属性的双向边，用 Cypher 直接求多级中转方案，替掉关系型数据库里的多层递归查询。',
      },
      {
        title: 'MongoDB 地理围栏 + 两级缓存',
        detail:
          'GeoJSON + 2dsphere 索引判定网点作业范围，下单即自动分单到所属网点；Caffeine 进程内缓存与 Redis 组成多级缓存。',
      },
      {
        title: '运单合并与分片装车调度',
        detail:
          'Redis 队列按转运节点合并同向运单，xxl-job 分片广播让多实例并行装车，Redisson 公平锁把互斥粒度收敛到「起点-终点」队列。',
      },
      {
        title: 'Leaf 号段 ID 与双 token 认证',
        detail:
          '运单号用美团 Leaf 号段模式生成，全局唯一且趋势递增、不暴露业务量；四端登录用 access / refresh 双 token 三验证做无感续期。',
      },
      {
        title: '责任链运费计算与 BFF 聚合',
        detail:
          '首重、续重、偏远、时效等规则拆成责任链节点可独立增删；网关统一鉴权，四端各自保留聚合服务，避免一个接口服务所有端。',
      },
    ],
    relatedSeries: ['SpringCloud', 'Redis', 'RabbitMQ', 'MySQL', '登录技术', 'Mybatis', '部署'],
  },
  {
    title: 'RateHub · 本地生活与高并发秒杀平台',
    tagline: '对标大众点评的后端工程，主攻高并发流量治理与缓存一致性',
    summary: [
      '涵盖商铺探索、探店日记社交、优惠券秒杀等典型高并发场景。核心聚焦高并发流量治理、分布式事务与锁生命周期控制、缓存架构设计与多中间件深度协同——通过全链路异步化、Redis 内存级原子计算以及消息队列削峰填谷，构建高可用、高吞吐、数据强一致的后端架构。',
    ],
    repo: 'https://github.com/lbx-ux/RateHub',
    repoName: 'lbx-ux/RateHub',
    metrics: [
      { value: '465.5+ QPS', label: '秒杀吞吐（原 250.8）', short: '秒杀吞吐' },
      { value: '1695 ms', label: 'P90 响应（原 3516 ms）', short: 'P90 响应' },
      { value: '0', label: '超卖 / 漏单' },
    ],
    stack: [
      { label: 'Spring Boot', version: '3.2.10' },
      { label: 'Java', version: '17' },
      { label: 'MyBatis-Plus' },
      { label: 'MySQL', version: '8.0' },
      { label: 'Redis' },
      { label: 'Redisson', version: '3.27' },
      { label: 'RabbitMQ' },
      { label: 'MinIO' },
      { label: 'Hutool' },
    ],
    highlights: [
      {
        title: '全链路异步秒杀与削峰填谷',
        detail:
          'Redis + Lua 在内存里原子预扣库存，扣减成功才投递 RabbitMQ 异步落库，MySQL 只承接平稳的异步写。JMeter 压测吞吐从 250.8 提到 465.5+ QPS，P90 从 3516 ms 降到 1695 ms，且 0 超卖 0 漏单。',
      },
      {
        title: '通用缓存治理组件 CacheClient',
        detail:
          '把「逻辑过期防击穿、空值缓存防穿透、主动失效保一致」收敛成一个可复用客户端，业务侧只关心缓存 key 与回源函数，不再各处手写双写逻辑。',
      },
      {
        title: 'Redisson 分布式锁生命周期治理',
        detail:
          '针对误删他人锁、锁提前过期而业务未完、锁粒度过粗三类问题，用 WatchDog 自动续期并把临界区压到最小，避免整段业务被串行化。',
      },
      {
        title: '双拦截器鉴权与无感数据大盘',
        detail:
          'ThreadLocal 传递登录用户，一个拦截器负责鉴权、一个负责流量与行为采集，业务代码零侵入即拿到埋点数据。',
      },
      {
        title: 'Redis 多数据结构场景化选型',
        detail:
          '点赞排行用 ZSET、关注关系用 SET、滚动分页用 ZSET 游标、库存用 HASH——按访问模式选结构，而不是一律 String。',
      },
    ],
    relatedSeries: ['Redis', 'RabbitMQ', 'MySQL', 'SpringBoot', '登录技术', '验证码', '存储技术'],
  },
];
