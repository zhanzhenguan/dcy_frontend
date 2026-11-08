import { type InspirationItem } from '../types'

export const mockInspirations: InspirationItem[] = [
  {
    id: 'insp-1',
    brand: 'PetSmart',
    brandCode: 'PS',
    brandBgColor: 'bg-rose-500 text-white',
    industry: '宠物用品',
    platform: 'TikTok',
    title: '“这款喂食器让我家猫学会了按时吃饭”',
    creativeStrategy: 'UGC风格开箱+产品功能展示+使用场景对比',
    tags: ['UGC', '开箱', '宠物'],
    metrics: {
      views: '2.4M',
      ctr: '7.8%',
      duration: '28s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '家里主子总是凌晨吵着要吃饭？这个智能定时喂食器彻底解放了我！',
      targetAudience: '上班族宠物主、养猫人士、智能家居爱好者',
      visualStyle: '真实手持UGC镜头 + 高清产品细节 + 宠物可爱反馈',
      sellingPoints: [
        '定时定量自动投喂，防卡粮设计',
        '手机App遥控，随时随地观察吃粮记录',
        '双向语音喊饭，保持与宠物互动',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:03',
          title: '黄金钩子 (Hook)',
          description: '猫咪凌晨开门大叫的搞笑镜头，搭配直击痛点配音',
          technique: '痛点共鸣与视线引导',
        },
        {
          timeframe: '00:03 - 00:12',
          title: '产品拆箱 (Unboxing)',
          description: '展示极简造型与倒出粮粒无卡顿细节',
          technique: '特写展现材质与做工',
        },
        {
          timeframe: '00:12 - 00:22',
          title: '使用场景 (Usage)',
          description: '演示App一键设定时间，猫咪按时听到声音跑过来开吃',
          technique: '实操演示 + 宠物正面情绪反馈',
        },
        {
          timeframe: '00:22 - 00:28',
          title: '行动号召 (CTA)',
          description: '点击左下角链接，限时赠送宠物零食包',
          technique: '利益点催化下单',
        },
      ],
      fullScript:
        '[画面: 猫咪凌晨敲门特写]\n配音: 每次早上5点被猫叫醒，真的要崩溃！\n[画面: 切换智能喂食器App特写]\n配音: 直到我入手了这款智能定时喂食器，在手机上设定好时间和克数。\n[画面: 喂食器自动出粮，猫咪飞奔过来吃]\n配音: 出粮顺畅不卡粮，还能录制我的喊饭声！现在每天都能睡到自然醒，评论区链接领券立减！',
      aiPrompt:
        'UGC vertical video style, cinematic lighting, a fluffy cat running happily towards a sleek smart pet feeder, close-up details of kibble dispensing smoothly, vibrant and warm modern apartment setting.',
    },
  },
  {
    id: 'insp-2',
    brand: 'Decathlon',
    brandCode: 'DE',
    brandBgColor: 'bg-emerald-500 text-white',
    industry: '户外运动',
    platform: 'TikTok',
    title: '“一个人也能轻松搭起来的超轻帐篷”',
    creativeStrategy: '户外实拍+搭建过程加速+多角度展示',
    tags: ['户外', '实拍', '演示'],
    metrics: {
      views: '1.8M',
      ctr: '6.5%',
      duration: '30s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '还在为一个人户外露营搭帐篷手忙脚乱？看完这个3秒搞定！',
      targetAudience: '露营爱好者、户外新手、周末自驾游人群',
      visualStyle: '自然风光开场 + 快动作对比 + 搭建细节拉近',
      sellingPoints: [
        '自动快开支架，轻松单人秒搭',
        '防雨防风黑胶隔热，全天候舒适',
        '超轻收纳重量仅2.5kg',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:04',
          title: '黄金钩子 (Hook)',
          description: '传统帐篷繁重搭建对比快开帐篷抛出即开',
          technique: '强烈前后对比震慑视觉',
        },
        {
          timeframe: '00:04 - 00:15',
          title: '搭建过程 (Setup)',
          description: '单人轻松撑开，展示支架结实程度与面料防雨防水测试',
          technique: '特写喷水测试证明品质',
        },
        {
          timeframe: '00:15 - 00:25',
          title: '内部空间 (Interior)',
          description: '走进帐篷内部展示大空间与通风网窗',
          technique: '沉浸式第一视角展示',
        },
        {
          timeframe: '00:25 - 00:30',
          title: '行动号召 (CTA)',
          description: '展示折叠轻巧收纳效果，引导点击下单',
          technique: '消除重量顾虑',
        },
      ],
      fullScript:
        '[画面: 露营地山峰风景+单人抛出帐篷瞬间展开]\n配音: 一个人去露营，最怕搭建繁琐。这款快开帐篷抛开即成型！\n[画面: 帐篷表面水珠滑落+室内大空间全景]\n配音: 黑胶防晒隔热，外面暴雨里面干爽。收纳起来只有一卷手提包大小！趁现在夏日促销快抢！',
      aiPrompt:
        'High-definition outdoor adventure video shot, gorgeous mountain campsite backdrop at sunset, person easily popping up a modern lightweight camping tent, water droplets splashing on waterproof fabric.',
    },
  },
  {
    id: 'insp-3',
    brand: 'The Ordinary',
    brandCode: 'TO',
    brandBgColor: 'bg-purple-500 text-white',
    industry: '美妆个护',
    platform: 'Instagram',
    title: '“¥30的精华液凭什么比¥300的好用？”',
    creativeStrategy: '成分解析+使用前后对比+性价比强调',
    tags: ['美妆', '测评', '对比'],
    metrics: {
      views: '3.2M',
      ctr: '8.2%',
      duration: '22s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '别再花大价钱买智商税了！成分党博主真实测评告诉你真相！',
      targetAudience: '护肤成分党、年轻白领、追求性价比女性',
      visualStyle: '实验室干净明亮风 + 皮肤前后对比透镜 + 质地特写',
      sellingPoints: [
        '高浓度玻尿酸+B5深层补水锁水',
        '极简配方无香精防腐剂，敏感肌适用',
        '百元内院线级修护质感',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:03',
          title: '黄金钩子 (Hook)',
          description: '博主将大牌瓶子与透明滴管瓶对比并拿剪刀剪开包装',
          technique: '悬念与反直觉问答',
        },
        {
          timeframe: '00:03 - 00:10',
          title: '成分剖析 (Ingredients)',
          description: '列出修护核心成分，展示滴管流动清爽质地',
          technique: '权威专业感营造',
        },
        {
          timeframe: '00:10 - 00:18',
          title: '真人试用 (Before/After)',
          description: '分屏对比使用前干燥泛红与使用后水润透亮',
          technique: '前后高清对比直观感知',
        },
        {
          timeframe: '00:18 - 00:22',
          title: '行动号召 (CTA)',
          description: '点击主页链接享受限时买二送一活动',
          technique: '限时优惠刺激',
        },
      ],
      fullScript:
        '[画面: 滴管将清透精华滴于手背，水感流动特写]\n配音: 为什么成分党都在悄悄囤这款精华？配方表只有核心有效成分！\n[画面: 脸部高能水润特写+水分测试仪对比]\n配音: 涂抹吸收极快，水分值瞬间提升80%。平价天花板，赶紧囤起来！',
      aiPrompt:
        'Minimalist aesthetic skincare video shoot, high speed macro shot of a clear liquid drop falling from a dropper onto glowing moisturized skin, bright studio lighting, soft pink and pastel background.',
    },
  },
  {
    id: 'insp-4',
    brand: 'Anker',
    brandCode: 'AN',
    brandBgColor: 'bg-blue-500 text-white',
    industry: '3C电子',
    platform: 'Amazon',
    title: '“充电5分钟，用一整天”',
    creativeStrategy: '产品特写+数据可视化+场景化使用',
    tags: ['3C', '数据', '场景'],
    metrics: {
      views: '0.9M',
      ctr: '5.1%',
      duration: '35s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '出差手机没电急着出门？这颗冰糖大小的快充头拯救你的电量焦虑！',
      targetAudience: '商务出差族、数码发烧友、苹果/安卓手机用户',
      visualStyle: '赛博科技感+数字跳动特效+极简金属质感',
      sellingPoints: [
        '氮化镓GaN技术，体积缩小50%',
        '65W大功率兼容笔记本与手机',
        '智能控温不发烫',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:05',
          title: '黄金钩子 (Hook)',
          description: '手机电量红字1%告警+登机广播急促背景音',
          technique: '紧急场景代入感',
        },
        {
          timeframe: '00:05 - 00:18',
          title: '科技演示 (Tech Specs)',
          description: '电量数字疯狂飙升至80%的3D特效展示',
          technique: '数字可视化直观展现速度',
        },
        {
          timeframe: '00:18 - 00:28',
          title: '多设备通用 (Compatibility)',
          description: '同时给MacBook、iPad和iPhone快速充电',
          technique: '多功能卖点叠加',
        },
        {
          timeframe: '00:28 - 00:35',
          title: '行动号召 (CTA)',
          description: '亚马逊自营旗舰店现货直发，包邮保修两年',
          technique: '信任保证与售后保障',
        },
      ],
      fullScript:
        '[画面: 极小充电头插在插头瞬间出现电光与数字飞升特效]\n配音: 别再用原装慢充了！全新GaN氮化镓快充，体积只有冰糖大。\n[画面: 笔记本与手机同时满电提示音]\n配音: 刷牙的工夫就能充进大半电量，出差一个头全搞定！',
      aiPrompt:
        'Futuristic tech gadget product showcase, sleek metallic GaN charger plugged into wall with neon blue fast-charging battery graphics animation floating around it, cinematic dark studio lighting.',
    },
  },
  {
    id: 'insp-5',
    brand: 'Gymshark',
    brandCode: 'GS',
    brandBgColor: 'bg-amber-500 text-white',
    industry: '运动健身',
    platform: 'TikTok',
    title: '“穿上这件运动衣，连教练都问我要链接”',
    creativeStrategy: '运动场景+服装展示+多人出镜+音乐卡点',
    tags: ['运动', '服装', '卡点'],
    metrics: {
      views: '4.1M',
      ctr: '9.1%',
      duration: '25s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '在健身房想拥有好线条？选对无缝运动塑形衣直接视觉瘦10斤！',
      targetAudience: '健身达人、瑜伽人群、塑形女性',
      visualStyle: '高燃律动音乐 + 镜头快速卡点切换 + 汗水与肌肉线条特写',
      sellingPoints: [
        '四维弹力无缝包裹，提臀收腹',
        '速干透气面料，高强度训练不黏腻',
        '高腰不卷边设计',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:04',
          title: '黄金钩子 (Hook)',
          description: '健身房灯光下侧身一转，展现完美腰臀比',
          technique: '视觉冲击与身材展示',
        },
        {
          timeframe: '00:04 - 00:15',
          title: '动作实测 (Movement)',
          description: '做深蹲、拉伸等大幅度动作，服装完好贴合无挤压拉扯',
          technique: '运动场景真实质感',
        },
        {
          timeframe: '00:15 - 00:21',
          title: '细节拉近 (Detail)',
          description: '面料透气孔与做工平整无线头特写',
          technique: '细节展示体现高端品质',
        },
        {
          timeframe: '00:21 - 00:25',
          title: '行动号召 (CTA)',
          description: '爆款配色补货到位，点击抢购同款',
          technique: '紧迫感稀缺性催化',
        },
      ],
      fullScript:
        '[画面: 健身房硬核训练，深蹲拉伸动作切换]\n配音: 找很久的宝藏运动裤！高腰收腹完全不卷边，深蹲也不透光。\n[画面: 侧身曲线特写，弹力拉伸拉回原样]\n配音: 吸汗透气不粘身，多色可选，戳下方抢限量新款！',
      aiPrompt:
        'Dynamic fitness apparel video shot, energetic female athlete performing deadlifts in modern industrial gym setting, wearing high-waisted seamless activewear, dramatic contrast lighting.',
    },
  },
  {
    id: 'insp-6',
    brand: 'IKEA',
    brandCode: 'IK',
    brandBgColor: 'bg-indigo-500 text-white',
    industry: '家居用品',
    platform: 'Facebook',
    title: '“小户型必备！这个收纳神器让房间大了一倍”',
    creativeStrategy: '改造前后对比+产品功能+空间利用展示',
    tags: ['家居', '收纳', '对比'],
    metrics: {
      views: '1.2M',
      ctr: '4.3%',
      duration: '30s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '房间太小杂物堆满桌？教你用百元内小推车实现空间魔法！',
      targetAudience: '租房党、小户型住户、收纳强迫症人群',
      visualStyle: '杂乱环境Before vs 整洁治愈After对比 + 沉浸式ASMR收纳音效',
      sellingPoints: [
        '三层大容量灵活分区',
        '静音万向轮，推到哪里用哪里',
        '承重力强，客厅卧室厨房全通用',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:04',
          title: '黄金钩子 (Hook)',
          description: '展示杂乱不堪的桌子，配上灰暗音效',
          technique: '痛点代入与心理刺激',
        },
        {
          timeframe: '00:04 - 00:16',
          title: '收纳过程 (ASMR Setup)',
          description: '逐个将瓶瓶罐罐摆入小推车，音效清晰解压',
          technique: '解压ASMR提升完播率',
        },
        {
          timeframe: '00:16 - 00:24',
          title: '多场景滑动 (Multi-scene)',
          description: '推车从沙发旁滑到床头，化身移动小床头柜',
          technique: '多用途使用价值展现',
        },
        {
          timeframe: '00:24 - 00:30',
          title: '行动号召 (CTA)',
          description: '官方商城现货包邮，点击选购多色款',
          technique: '便利与包邮利益诱惑',
        },
      ],
      fullScript:
        '[画面: 杂乱桌面一秒变成整洁白墙+三层移动小推车]\n配音: 房间再小也能越住越大！这个移动小推车真的绝了。\n[画面: 放置书籍与化妆品ASMR音效]\n配音: 顺滑静音轮随推随停，零食、书本、化妆品一车装下，拯救所有小户型！',
      aiPrompt:
        'Cozy modern Scandinavian room makeover video, crisp shot of a stylish minimalist rolling utility cart holding books and plants, warm sunbeams filtering through sheer window curtains.',
    },
  },
  {
    id: 'insp-7',
    brand: 'Lululemon',
    brandCode: 'LL',
    brandBgColor: 'bg-teal-500 text-white',
    industry: '服饰鞋包',
    platform: 'Instagram',
    title: '“修身显瘦神裤，运动通勤两不误”',
    creativeStrategy: '穿搭灵感+日常通勤+运动伸展+面料触感',
    tags: ['穿搭', '显瘦', '通勤'],
    metrics: {
      views: '2.9M',
      ctr: '8.7%',
      duration: '26s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '早晨出门不知道穿什么？一条能从办公室穿到瑜伽房的神裤！',
      targetAudience: '职场女性、瑜伽爱好者、高品质生活追求者',
      visualStyle: '优雅都市风 + 自然日光光影 + 快速换装特写',
      sellingPoints: [
        'Nulu™裸感面料，极致亲肤云朵触感',
        '高腰微喇剪裁，拉长腿部比例',
        '抗褶皱免烫，轻松应对全天行程',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:03',
          title: '黄金钩子 (Hook)',
          description: '女主一脚踏出办公楼，旋转镜头无缝切换到瑜伽房',
          technique: '场景秒切转场吸引注意力',
        },
        {
          timeframe: '00:03 - 00:12',
          title: '面料质感 (Fabric Touch)',
          description: '手指划过软糯面料，展示柔韧拉伸回弹',
          technique: '触觉联想',
        },
        {
          timeframe: '00:12 - 00:20',
          title: '穿搭搭配 (OOTD)',
          description: '搭配西装外套 vs 搭配短款运动背心',
          technique: '提供百搭场景方案',
        },
        {
          timeframe: '00:20 - 00:26',
          title: '行动号召 (CTA)',
          description: '官网同步上市，体验裸感包裹',
          technique: '品牌质感引导转化',
        },
      ],
      fullScript:
        '[画面: 职场女性大步走在城市街道，镜头流畅换装]\n配音: 终于找到上班能穿、下班健身不用换的裸感神裤！\n[画面: 瑜伽房柔韧拉伸与面料细纹特写]\n配音: 像第二层肌肤一样舒适透气，腿长秒变1米8，现在下单享受品牌赠礼！',
      aiPrompt:
        'Chic urban lifestyle fashion clip, elegant woman wearing sleek high-waisted flare leggings walking confidently down a sunny modern city street with blazer jacket.',
    },
  },
  {
    id: 'insp-8',
    brand: 'Nespresso',
    brandCode: 'NE',
    brandBgColor: 'bg-orange-500 text-white',
    industry: '食品饮料',
    platform: 'YouTube',
    title: '“在家30秒做出一杯大师级冰美式”',
    creativeStrategy: '特写萃取+冰块碰撞音效+品质生活体验',
    tags: ['咖啡', '特写', '美食'],
    metrics: {
      views: '5.6M',
      ctr: '9.4%',
      duration: '20s',
    },
    coverImage:
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    scriptBreakdown: {
      hook: '每天去咖啡馆排队多花钱？教你用胶囊机打造私人咖啡角！',
      targetAudience: '咖啡爱好者、居家办公人群、精致生活一族',
      visualStyle: '4K超慢动作特写 + 浓郁油脂流淌 + 冰块碰撞高品质声音',
      sellingPoints: [
        '一键智能萃取，黄金油脂Crema沉淀',
        '丰富风味胶囊可选，满足不同口味',
        '小巧精致外观，提升居家仪式感',
      ],
      timeline: [
        {
          timeframe: '00:00 - 00:03',
          title: '黄金钩子 (Hook)',
          description: '冰块掉入玻璃杯的高清慢动作与叮当声',
          technique: '视听双重解压体验',
        },
        {
          timeframe: '00:03 - 00:10',
          title: '萃取过程 (Extraction)',
          description: '金黄色咖啡油脂缓缓分层注入玻璃杯',
          technique: '极具诱惑力的极致美食视效',
        },
        {
          timeframe: '00:10 - 00:16',
          title: '品鉴体验 (Tasting)',
          description: '拿在手中浅尝一口，惬意居家办公镜头',
          technique: '美好生活憧憬代入',
        },
        {
          timeframe: '00:16 - 00:20',
          title: '行动号召 (CTA)',
          description: '买机器即赠选色胶囊体验装组',
          technique: '赠品激励直达购买',
        },
      ],
      fullScript:
        '[画面: 胶囊放入机器，按键后金黄色咖啡油脂缓缓滴入冰块杯]\n配音: 30秒，在家就能喝到现萃咖啡师级冰美式！\n[画面: 浓郁奶泡与油脂交融特写]\n配音: 满屋飘香，油脂厚重丰盈。限时购机送50颗精选胶囊，开启你的咖啡自由！',
      aiPrompt:
        'Ultra high definition slow-motion food videography, rich golden espresso coffee crema pouring into a clear glass filled with crystal ice cubes, sunlight shining through coffee layers.',
    },
  },
]
