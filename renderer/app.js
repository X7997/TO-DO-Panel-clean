// =========================================================
// TO-DO PANEL — 极客桌面贴顶工作台 (White Glass State Machine)
// 风格: 极简通透白毛玻璃，输入框融合完成度，大字开源雷达，工程安全清理体系
// =========================================================

let store = {
  projects: [],
  tasks: [],
  trophies: [],
  techRadar: [],
  settings: {
    autoCollapseOnBlur: true,
    twilightHour: 20,
    twilightMinute: 30
  }
};

let activeProjectFilter = null;
let currentTrophyDayFilter = 'all';
let currentScanningPath = null;
let currentHygieneFindings = [];
let selectedFindingsIndices = new Set();
let collapseTimeout = null;
let radarDrawerTimeout = null;
let isSelectingFolder = false;
let isPinned = false;
let twilightReviewing = false;

// DOM 元素缓存
const notchPill = document.getElementById('notch-pill');
const bentoContainer = document.getElementById('bento-container');
const notchTaskTitle = document.getElementById('notch-task-title');
const notchTaskCount = document.getElementById('notch-task-count');
const energyDots = [
  document.getElementById('energy-dot-1'),
  document.getElementById('energy-dot-2'),
  document.getElementById('energy-dot-3')
];

const btnPinPanel = document.getElementById('btn-pin-panel');
const btnCollapsePanel = document.getElementById('btn-collapse-panel');
const btnTwilightAudit = document.getElementById('btn-twilight-audit');
const twilightStatusText = document.getElementById('twilight-status-text');

// 融合流体进度条的输入框容器
const quickAddWrap = document.getElementById('quick-add-wrap');
const inputProgressFill = document.getElementById('input-progress-fill');
const inputQuickAdd = document.getElementById('input-quick-add');
const inputProgressRatio = document.getElementById('input-progress-ratio');
const inputProgressPct = document.getElementById('input-progress-pct');

const focusSlotsContainer = document.getElementById('focus-slots-container');
const nextTaskPreview = document.getElementById('next-task-preview');
const standbyCount = document.getElementById('standby-count');

// 左栏：项目与战果
const projectListContainer = document.getElementById('project-list-container');
const projectCountBadge = document.getElementById('project-count-badge');
const btnRefreshProjects = document.getElementById('btn-refresh-projects');
const btnSyncKbProjects = document.getElementById('btn-sync-kb-projects');
const trophyListContainer = document.getElementById('trophy-list-container');
const trophyWeekBar = document.getElementById('trophy-week-bar');
const btnClearTrophies = document.getElementById('btn-clear-trophies');

// 右栏：开源雷达推荐与刷新
const radarStreamContainer = document.getElementById('radar-stream-container');
const btnRefreshRadar = document.getElementById('btn-refresh-radar');
const btnRadarSettings = document.getElementById('btn-radar-settings');
const radarBadgeStatus = document.getElementById('radar-badge-status');

// 模态框：开源雷达官方 Token 与定时配置 (路线 B)
const modalRadarConfig = document.getElementById('modal-radar-config');
const btnCloseRadarCfg = document.getElementById('btn-close-radar-cfg');
const inputGithubToken = document.getElementById('input-github-token');
const btnToggleTokenVisible = document.getElementById('btn-toggle-token-visible');
const tokenSourceHint = document.getElementById('token-source-hint');
const radarQuotaSearch = document.getElementById('radar-quota-search');
const radarQuotaCore = document.getElementById('radar-quota-core');
const radarScheduleStatus = document.getElementById('radar-schedule-status');
const btnTestFetchRadar = document.getElementById('btn-test-fetch-radar');
const btnSaveRadarCfg = document.getElementById('btn-save-radar-cfg');

// 左右锚定式详情浮窗 (Anchored Popovers)
const leftDetailPopover = document.getElementById('left-detail-popover');
const leftPopoverTag = document.getElementById('left-popover-tag');
const leftPopoverTitle = document.getElementById('left-popover-title');
const leftPopoverContent = document.getElementById('left-popover-content');
const btnCloseLeftPopover = document.getElementById('btn-close-left-popover');

const rightDetailPopover = document.getElementById('right-detail-popover');
const rightPopoverTag = document.getElementById('right-popover-tag');
const rightPopoverTitle = document.getElementById('right-popover-title');
const rightPopoverContent = document.getElementById('right-popover-content');
const btnCloseRightPopover = document.getElementById('btn-close-right-popover');

let currentLeftPopoverProjectId = null;
let currentRightPopoverItemId = null;
let popoverSwitchTimer = null;

// 底部「方案拆解与灵感笔记」小窗 (Bottom Plan Popover)
const bottomPlanPopover = document.getElementById('bottom-plan-popover');
const planPopoverTag = document.getElementById('plan-popover-tag');
const planPopoverTitle = document.getElementById('plan-popover-title');
const planProgressFill = document.getElementById('plan-progress-fill');
const planProgressText = document.getElementById('plan-progress-text');
const btnClosePlanPopover = document.getElementById('btn-close-plan-popover');
const planSubtasksCount = document.getElementById('plan-subtasks-count');
const inputAddSubtask = document.getElementById('input-add-subtask');
const btnAddSubtask = document.getElementById('btn-add-subtask');
const planSubtasksContainer = document.getElementById('plan-subtasks-container');

let currentPlanTaskId = null;

// 晚间复盘模态框
const modalDailyAudit = document.getElementById('modal-daily-audit');
const auditStatDone = document.getElementById('audit-stat-done');
const auditStatRate = document.getElementById('audit-stat-rate');
const auditStatTrophies = document.getElementById('audit-stat-trophies');
const auditProjectBreakdown = document.getElementById('audit-project-breakdown');
const btnAuditOpenKb = document.getElementById('btn-audit-open-kb');
const btnCompleteAudit = document.getElementById('btn-complete-audit');
const btnCloseAudit = document.getElementById('btn-close-audit');

// 极客开源雷达推荐库 (涵盖审美、动效、包管理、Git、代码搜索、Lint与边缘智能)
const HARDCORE_TECH_RADAR = [
  {
    id: 'r0',
    tag: 'GitHub神级补丁',
    stars: '4.6k ★',
    metricNum: '一键去AI味',
    metricLabel: '大厂审美规范',
    title: 'taste-skills: 极简去AI味界面法则',
    repo: 'taste-skills',
    shortTitle: '开发没审美？给 AI 戴上紧箍咒！',
    hook: '光靠写 Prompt 没用！AI 净写土味配色？给它戴上紧箍咒，逼它用大厂顶级方案写前端！',
    douyinQuote: '开发没审美怎么做产品？光靠写 Prompt 是没用的，你得给 AI 编程助手戴上“紧箍咒”！分享两个 GitHub 审美补丁，直接拦截 AI 的低级语法和土味配色，逼着它用大厂最丝滑、最规范的方案写前端。',
    pain: '独立开发者没有 UI 设计师，做出产品土味廉价卖不出去；AI 生成的全是泛滥紫色发光与大圆角塑料感。',
    cure: '已沉淀本地知识库！直接调用反油腻设计法则，严守留白与色彩克制，一秒复刻顶级大厂高质感前端。',
    url: 'https://github.com/taste-skills/taste-skills'
  },
  {
    id: 'r00',
    tag: '大厂丝滑标准',
    stars: '5.2k ★',
    metricNum: '60帧极速',
    metricLabel: '渐进式微交互',
    title: 'impeccable: 严苛动效与微交互标准',
    repo: 'impeccable',
    shortTitle: '页面生硬像后台？一键注入大厂顶级丝滑感！',
    hook: '拒绝 PPT 生硬翻页！渐进式披露 + 呼吸感微动效，60帧丝滑跟手不卡顿！',
    douyinQuote: '界面做出来像十年前企业后台？信息堆砌弹窗晃眼，动效要么没有要么拖沓卡死！一键注入渐进式披露与大厂设计总监级微动效规范，让你的产品交互质感瞬间翻倍！',
    pain: '信息全塞在一个界面里，用户眼花缭乱懒得看；弹窗跳来跳去遮挡主视线，动效生硬掉帧。',
    cure: '已沉淀本地知识库！严控注意力分配，鼠标悬停渐进式呈现，呼吸感平滑过渡，告别视觉轰炸。',
    url: 'https://github.com/impeccable/impeccable'
  },
  {
    id: 'r_lazygit',
    tag: '全键盘Git神器',
    stars: '54k ★',
    metricNum: '单键秒提',
    metricLabel: '告别输错命令',
    title: 'lazygit: 终端最爽全键盘 Git TUI',
    repo: 'lazygit',
    shortTitle: '输 Git 命令太慢？终端单键秒查分段提交！',
    hook: '分支合并冲突头皮发麻？终端打开 lazygit，全键盘可视化单键挑拣、分段暂存，丝滑起飞！',
    douyinQuote: '还在手动敲 git commit、git cherry-pick？命令行终端神器 lazygit，单键可视化搞定分支合并、挑拣重构与冲突解决，让你的 Git 效率直接翻上 5 倍！',
    pain: '分支多时查历史眼花，手动输命令易漏参数，Git GUI 软件太臃肿加载缓慢。',
    cure: '单二进制极速启动，全键盘直觉导航，支持行级暂存与交互式变基，极客必备。',
    url: 'https://github.com/jesseduffield/lazygit'
  },
  {
    id: 'r_uv',
    tag: '极速Python神器',
    stars: '42k ★',
    metricNum: '10-100x',
    metricLabel: 'Rust毫秒解析',
    title: 'uv: Rust 极速 Python 包与环境管理器',
    repo: 'uv',
    shortTitle: 'pip 卡半天？Rust 重写 Python 包管 100 倍狂飙！',
    hook: '装个大型依赖卡半天锁依赖崩溃？uv 毫秒级解析安装，速度比 pip 快 10 到 100 倍！',
    douyinQuote: 'Python 程序员集体狂欢！Astral 出品的 uv 用 Rust 重写全部包管理底层，不仅彻底替换 pip、pip-tools 与 virtualenv，安装依赖秒下秒装，快到怀疑人生！',
    pain: '传统 pip 安装大型依赖解析速度极慢，多虚拟环境切换混乱，CI/CD 打包浪费大量时间。',
    cure: 'Rust 并行解析与全局缓存，单条命令管理 Python 版本与虚拟环境，冷启动零延迟。',
    url: 'https://github.com/astral-sh/uv'
  },
  {
    id: 'r_ripgrep',
    tag: '全宇宙最快检索',
    stars: '48k ★',
    metricNum: '10x 搜索',
    metricLabel: '千万行瞬达',
    title: 'ripgrep: 极速跨平台全局代码检索器',
    repo: 'ripgrep',
    shortTitle: '搜几千个文件卡死？ripgrep 毫秒瞬间命中！',
    hook: '几十个 G 的源码项目找个函数找半天？ripgrep 智能感知 .gitignore，毫秒全盘命中！',
    douyinQuote: '程序员必备效率神器 ripgrep！底层用 Rust 深度优化正则与内存映射，几万个源码文件秒出结果，连 VS Code 底层都在用它做全局搜索！',
    pain: '传统 grep/find 在大型多仓库中遍历耗时极长，经常卡死在庞大的 node_modules 或 build 产物中。',
    cure: '默认跳过 gitignore 与二进制文件，多线程内存映射搜索，彻底消灭等待焦虑。',
    url: 'https://github.com/BurntSushi/ripgrep'
  },
  {
    id: 'r_ruff',
    tag: '超快代码审查',
    stars: '36k ★',
    metricNum: '毫秒级修复',
    metricLabel: 'Flake8/Black合一',
    title: 'ruff: 极速 Python 代码规范检查与格式化',
    repo: 'ruff',
    shortTitle: 'CI 代码检查卡几分钟？ruff 毫秒瞬间格式化！',
    hook: '传统 Python 代码格式化和 linter 跑一次卡半天？ruff 单工具干掉 flake8、black、isort，毫秒秒出结果！',
    douyinQuote: 'Python 工程规范神器 ruff！以前跑一整套格式化要等几分钟，ruff 只要几十毫秒搞定全部规则检查与一键自动修复，彻底解放代码审查！',
    pain: '老旧 Python 工具链碎片化严重，启动慢、规则冲突、CI 耗时长。',
    cure: 'Rust 编译为单原生二进制，兼容数百条 Flake8 规则，格式化与修复一气呵成。',
    url: 'https://github.com/astral-sh/ruff'
  },
  {
    id: 'r1',
    tag: '告别内存刺客',
    stars: '2.4k ★',
    metricNum: '6MB',
    metricLabel: '内存暴降 96%',
    title: 'windows-floating-island: 贴顶微架构',
    repo: 'windows-floating-island',
    shortTitle: 'Electron 吃 200MB？6MB 极客贴顶神器！',
    hook: '开个待办电脑风扇狂转、内存暴涨？纯 Win32 穿透贴顶，冷启只需 8ms，内存暴降 96%！',
    douyinQuote: '打工人必备极客工作台！Electron 动辄吃 200MB 内存还偶尔掉帧漂移？纯 Win32 贴顶微架构，开机秒起只需 8ms，常驻后台仅 6MB，呼之即来挥之即去，丝滑不占资源！',
    pain: 'Electron 庞大臃肿，开着后台风扇呼呼转，低配电脑卡顿，多开几个工程直接爆内存。',
    cure: '纯 C++ 与 Win32 原生 API 绑定，DWM 硬件级透传贴顶，内存不到 Node 的 1/20，零 GC 卡顿。',
    url: 'https://github.com/xiaopu-ai/TO-DO-Panel'
  },
  {
    id: 'r_fzf',
    tag: '终端万能模糊搜索',
    stars: '66k ★',
    metricNum: '全能模糊',
    metricLabel: '键入即所得',
    title: 'fzf: 终端通用交互式模糊搜索器',
    repo: 'fzf',
    shortTitle: '记不住路径命令？终端交互模糊秒命中！',
    hook: '终端翻历史命令翻断手？fzf 配合 Ctrl+R 和 Alt+C，任何文件、Git 提交、历史命令瞬间定位！',
    douyinQuote: '终端老手绝对离不开的模糊搜索器 fzf！无论配合 bash、zsh 还是 powershell，历史命令、文件切换、Git 分支一键秒选，输入几个字符自动模糊匹配！',
    pain: '终端深层目录路径繁琐，历史命令模糊不清，频繁输入重复长命令极其耗费心智。',
    cure: '极速模糊匹配算法，毫秒流式响应，支持预览窗口与任意命令管道组合。',
    url: 'https://github.com/junegunn/fzf'
  },
  {
    id: 'r2',
    tag: '边缘AI黑科技',
    stars: '1.2k ★',
    metricNum: '11ms',
    metricLabel: '定点狂飙 2.5X',
    title: 'fast-k230-yolo: 边缘定点推理加速',
    repo: 'fast-k230-yolo',
    shortTitle: '边缘 AI 卡成 PPT？K230 定点推理狂飙 2.5 倍！',
    hook: 'ONNX 跑边缘推理又烫又丢帧，CPU 爆满？硬件 INT8 指令直通，11ms 极速定点，CPU 零占用！',
    douyinQuote: '做嵌入式视觉与机器人的痛谁懂！传统 Python/ONNX 跑边缘 AI，发烫掉帧还把 CPU 占满，电机控制直接失步！K230 原生 KPU INT8 硬件定点加速，推理只要 11ms，算力全部让给电机！',
    pain: '树莓派、单片机端侧算力拉胯，推理延迟 100ms+，CPU 100% 满载导致外设控制严重丢步。',
    cure: '端侧定点量化硬件直通，解决传统边缘 AI 延迟过大、丢帧、吞吐不足痛点，电机闭环稳如老狗。',
    url: 'https://github.com/kendryte/k230_sdk'
  },
  {
    id: 'r3',
    tag: '硬件语音对讲',
    stars: '1.8k ★',
    metricNum: '28ms',
    metricLabel: '零抖动告别断音',
    title: 'esp-adf-stream: ESP32 双工音频流',
    repo: 'esp-adf-stream',
    shortTitle: '语音对讲总断音爆音？双工乒乓管道彻底解决！',
    hook: '轮询队列处理音频总是卡顿爆音？DMA 乒乓双缓存直通 I2S，延迟压至 28ms，双工如丝般顺滑！',
    douyinQuote: '做智能家居和语音硬件最怕什么？对讲总是断麦、爆破音、唤醒后卡半天！ESP32 DMA 乒乓双工音频流管道，毫秒级实时对讲，彻底消灭破音断音，交互像德芙一样丝滑！',
    pain: 'FreeRTOS 队列轮询处理音频流容易被其他任务抢占，导致 I2S 缓冲区欠载出现爆音与丢包。',
    cure: '纯硬件 DMA 中断级双缓冲传输，CPU 占用率低于 4%，毫秒级全双工实时语音交互。',
    url: 'https://github.com/espressif/esp-adf'
  }
];

// =========================================================
// 真实工程代码目录映射表（坚决杜绝打开 Obsidian 笔记 MD 路径）
// =========================================================
const REAL_WORKSPACE_MAP = {
  P35: 'Q:\\Todo',
  P18: 'Q:\\Chuanzhi_Cup',
  P33: 'Q:\\CUMCM',
  P10: 'Q:\\K230',
  P16: 'Q:\\K230',
  P15: 'Q:\\foodcat',
  P19: 'Q:\\QT_APP',
  P27: 'Q:\\Zigbee',
  P08: 'Q:\\STM32c8t6',
  P04: 'Q:\\444444444444444444444LanQiaoBei',
  P34: 'Q:\\GitHub',
  P32: 'Q:\\xiaohonshu',
  P01: 'Q:\\DynamicIsland'
};

function getTaskRealFolder(task) {
  if (!task) return null;
  // 1. 如果任务显式绑定了自定义工作区，且不是 Obsidian 笔记路径，直接返回
  if (task.customPath && !task.customPath.includes('Obsidian_KB') && !task.customPath.includes('opposite')) {
    return task.customPath;
  }
  // 2. 待选/未绑定的新建任务，绝不回落到任何默认项目（如 Q:\Todo）
  const code = (task.projectCode || '').toUpperCase();
  if (!code || code === '待选' || code === '待做' || code === '未分类') {
    return null;
  }
  if (!task.projectId && !task.customPath) {
    return null;
  }
  if (REAL_WORKSPACE_MAP[code]) {
    return REAL_WORKSPACE_MAP[code];
  }
  if (task.projectId && task.projectId !== 'p35' && task.projectCode && task.projectCode !== '待选') {
    const p = store.projects.find(proj => proj.id === task.projectId || (proj.code && proj.code.toUpperCase() === code));
    if (p && p.path && !p.path.includes('Obsidian_KB') && !p.path.includes('opposite')) {
      return p.path;
    }
  }
  return null;
}

function getProjectRealFolder(proj) {
  if (!proj) return null;
  if (proj.path && !proj.path.includes('Obsidian_KB') && !proj.path.includes('opposite')) {
    return proj.path;
  }
  const code = (proj.code || '').toUpperCase();
  if (REAL_WORKSPACE_MAP[code]) {
    return REAL_WORKSPACE_MAP[code];
  }
  return proj.path;
}

function sanitizeStoreRealPaths(storeObj) {
  if (!storeObj) return storeObj;
  if (Array.isArray(storeObj.projects)) {
    storeObj.projects.forEach(p => {
      p.path = getProjectRealFolder(p);
    });
  }
  if (Array.isArray(storeObj.tasks)) {
    storeObj.tasks.forEach(t => {
      if (t.customPath && (t.customPath.includes('Obsidian_KB') || t.customPath.includes('opposite'))) {
        t.customPath = null;
      }
    });
  }
  return storeObj;
}

// =========================================================
// 初始化与窗口生命周期
// =========================================================
async function init() {
  try {
    const loaded = await window.desktopAPI.getStore();
    if (loaded && Object.keys(loaded).length > 0) {
      store = { ...store, ...loaded };
    }
    sanitizeStoreRealPaths(store);
  } catch (err) {
    console.error('Failed to load store:', err);
  }

  if (!store.techRadar || store.techRadar.length < 10 || !store.techRadar[0].douyinQuote) {
    store.techRadar = HARDCORE_TECH_RADAR;
  }

  // 屏顶药丸事件监听 (若存在)
  if (notchPill) {
    notchPill.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      if (window.desktopAPI && window.desktopAPI.setIgnoreMouseEvents) {
        window.desktopAPI.setIgnoreMouseEvents(false);
      }
      if (collapseTimeout) {
        clearTimeout(collapseTimeout);
        collapseTimeout = null;
      }
      window.desktopAPI.setExpanded(true);
    });
    notchPill.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.desktopAPI && window.desktopAPI.setIgnoreMouseEvents) {
        window.desktopAPI.setIgnoreMouseEvents(false);
      }
      if (collapseTimeout) {
        clearTimeout(collapseTimeout);
        collapseTimeout = null;
      }
      window.desktopAPI.setExpanded(true);
    });
  }

  // 固定 (Pin) 标签切换按键 (去字留无颜色空心钉子)
  if (btnPinPanel) {
    btnPinPanel.addEventListener('click', () => {
      isPinned = !isPinned;
      btnPinPanel.classList.toggle('pinned', isPinned);
      btnPinPanel.title = isPinned ? '已固定常驻 (点击解除)' : '固定置顶常驻 (开启后不自动收起)';
      if (window.desktopAPI && window.desktopAPI.setPinned) {
        window.desktopAPI.setPinned(isPinned);
      }
      showToast(isPinned ? '已开启固定置顶：窗口常驻，不会自动收起' : '已解除固定：移出或点击外部将自动最小化');
    });
  }

  if (btnCollapsePanel) {
    btnCollapsePanel.addEventListener('click', () => {
      window.desktopAPI.minimizePanel();
    });
  }

  // 移出工作台区域自动最小化 (仅在未开启固定时触发)
  setupAutoMinimizeOnLeave();
  setupPlanPopoverListeners();

  // 全局 Escape 键退出逻辑：优先关闭最上层浮窗，最后隐藏工作台至后台
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (bottomPlanPopover && bottomPlanPopover.style.display !== 'none') {
        closeBottomPlanPopover();
        return;
      }
      if (leftDetailPopover && leftDetailPopover.style.display !== 'none') {
        closeLeftPopover();
        return;
      }
      if (rightDetailPopover && rightDetailPopover.style.display !== 'none') {
        closeRightPopover();
        return;
      }
      if (modalDailyAudit && modalDailyAudit.classList.contains('open')) {
        modalDailyAudit.classList.remove('open');
        if (window.desktopAPI && window.desktopAPI.setModalActive) {
          window.desktopAPI.setModalActive(false);
        }
        return;
      }
      window.desktopAPI.minimizePanel();
    }
  });

  // 浮窗关闭按钮
  if (btnCloseLeftPopover) {
    btnCloseLeftPopover.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLeftPopover();
    });
  }

  if (btnCloseRightPopover) {
    btnCloseRightPopover.addEventListener('click', (e) => {
      e.stopPropagation();
      closeRightPopover();
    });
  }

  // 点击浮窗外部区域关闭浮窗
  document.addEventListener('click', (e) => {
    if (isSelectingFolder) return;

    const insideLeft = leftDetailPopover && leftDetailPopover.contains(e.target);
    const insideRight = rightDetailPopover && rightDetailPopover.contains(e.target);
    const insideBottom = bottomPlanPopover && bottomPlanPopover.contains(e.target);
    const insideBento = bentoContainer && bentoContainer.contains(e.target);
    const insideAudit = modalDailyAudit && modalDailyAudit.contains(e.target);

    // 如果点击在浮窗外部，且不是点击卡片触发新浮窗，则关闭当前打开的浮窗
    if (!insideLeft && !insideRight) {
      const isCardClick = e.target.closest('.project-item') || e.target.closest('.radar-chinese-card');
      if (!isCardClick) {
        if (leftDetailPopover && leftDetailPopover.style.display !== 'none') {
          closeLeftPopover();
        }
        if (rightDetailPopover && rightDetailPopover.style.display !== 'none') {
          closeRightPopover();
        }
      }
    }

    // 底部方案拆解小窗点击外部关闭
    if (!insideBottom) {
      const isPlanTrigger = e.target.closest('.task-stripe-trigger') || e.target.closest('.task-plan-badge') || e.target.closest('#btn-pop-plan-proj');
      if (!isPlanTrigger) {
        if (bottomPlanPopover && bottomPlanPopover.style.display !== 'none') {
          closeBottomPlanPopover();
        }
      }
    }
  });

  // 监听屏顶药丸与工作台展开/收回状态同步
  if (window.desktopAPI && window.desktopAPI.onPanelStateChanged) {
    window.desktopAPI.onPanelStateChanged((data) => {
      const expanded = typeof data === 'boolean' ? data : (data && data.isExpanded);
      updatePanelVisibility(Boolean(expanded));
    });
  }

  // 监听外部数据变动（如终端脚本或 AI 自动记录待办）
  if (window.desktopAPI && window.desktopAPI.onStoreUpdated) {
    window.desktopAPI.onStoreUpdated((newStore) => {
      if (newStore) {
        store = newStore;
        renderTasks();
        updateInputProgress();
        showToast('已同步外部新增待做！');
      }
    });
  }

  // 输入框回车快速创建待办任务 (彻底修复回车无响应)
  if (inputQuickAdd) {
    inputQuickAdd.addEventListener('keydown', handleQuickAddKeydown);
  }

  // 晚间复盘：点击直接进入「复盘中」状态并提前复盘 (不弹模态框)，20:30 亦可由定时任务自动执行
  if (btnTwilightAudit) {
    btnTwilightAudit.addEventListener('click', startTwilightReview);
  }
  btnCompleteAudit.addEventListener('click', () => {
    modalDailyAudit.classList.remove('open');
    if (window.desktopAPI && window.desktopAPI.setModalActive) {
      window.desktopAPI.setModalActive(false);
    }
  });
  btnCloseAudit.addEventListener('click', () => {
    modalDailyAudit.classList.remove('open');
    if (window.desktopAPI && window.desktopAPI.setModalActive) {
      window.desktopAPI.setModalActive(false);
    }
  });
  btnAuditOpenKb.addEventListener('click', () => {
    window.desktopAPI.openInExplorer('Q:\\Obsidian_KB\\00_Index_索引\\_master-index.md');
  });

  // 点击模态框半透明遮罩空白区域关闭（修复「20:30 复盘」弹窗打开后无法返回/卡死的问题）
  [modalDailyAudit, modalRadarConfig].forEach((m) => {
    if (!m) return;
    m.addEventListener('click', (e) => {
      if (e.target === m) closeAllModals();
    });
  });

  // 左栏同步 Obsidian 知识库 (标题栏刷新按钮 + 底栏同步胶囊双向联动)
  if (btnRefreshProjects) {
    btnRefreshProjects.addEventListener('click', async () => {
      btnRefreshProjects.classList.add('spinning');
      try {
        await syncProjectsFromKB(true);
      } finally {
        setTimeout(() => {
          btnRefreshProjects.classList.remove('spinning');
        }, 500);
      }
    });
  }
  if (btnSyncKbProjects) {
    btnSyncKbProjects.addEventListener('click', () => syncProjectsFromKB(true));
  }

  // 右栏换一批开源雷达推荐与 Token 模式配置 (路线 B)
  if (btnRefreshRadar) {
    btnRefreshRadar.addEventListener('click', refreshTechRadar);
  }
  if (btnRadarSettings) {
    btnRadarSettings.addEventListener('click', openRadarConfigModal);
  }
  if (radarBadgeStatus) {
    radarBadgeStatus.addEventListener('click', openRadarConfigModal);
  }
  if (btnCloseRadarCfg) {
    btnCloseRadarCfg.addEventListener('click', closeAllModals);
  }
  if (btnToggleTokenVisible && inputGithubToken) {
    btnToggleTokenVisible.addEventListener('click', () => {
      inputGithubToken.type = (inputGithubToken.type === 'password') ? 'text' : 'password';
      btnToggleTokenVisible.textContent = (inputGithubToken.type === 'password') ? '👁️' : '🔒';
    });
  }
  if (btnSaveRadarCfg) {
    btnSaveRadarCfg.addEventListener('click', async () => {
      if (!store.settings) store.settings = {};
      const tokenVal = (inputGithubToken.value || '').trim();
      store.settings.githubToken = tokenVal;
      await saveCurrentStore();
      showToast('✅ GitHub Token 配置已保存');
      closeAllModals();
      updateRadarBadgeStatus();
    });
  }
  if (btnTestFetchRadar) {
    btnTestFetchRadar.addEventListener('click', async () => {
      btnTestFetchRadar.disabled = true;
      btnTestFetchRadar.textContent = '抓取中...';
      try {
        const res = await autoFetchRadarAtTwilight(true);
        if (res && res.rateLimit && radarQuotaSearch) {
          radarQuotaSearch.textContent = `${res.rateLimit.remaining} / ${res.rateLimit.limit} 次/分钟`;
        }
      } finally {
        btnTestFetchRadar.disabled = false;
        btnTestFetchRadar.textContent = '🧪 测试抓取最新爆款';
      }
    });
  }

  // 本周战果周度筛选按钮点击切换 (彻底修复点击星期无切换响应)
  if (trophyWeekBar) {
    trophyWeekBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.day-filter-btn');
      if (!btn) return;
      currentTrophyDayFilter = btn.getAttribute('data-day') || 'all';
      renderTrophies();
    });
  }

  // 清空本周战果记录
  if (btnClearTrophies) {
    btnClearTrophies.addEventListener('click', () => {
      if (!store.trophies || store.trophies.length === 0) {
        showToast('暂无战果记录可清空');
        return;
      }
      store.trophies = [];
      saveCurrentStore();
      renderTrophies();
      renderNotchPill();
      updateInputProgress();
      showToast('已清空所有已完成战果');
    });
  }

  // 监听开源雷达列表滚轮滚动：若详情浮窗处于开启态，平滑联动吸附更新坐标
  if (radarStreamContainer) {
    radarStreamContainer.addEventListener('scroll', () => {
      if (currentRightPopoverItemId && rightDetailPopover && rightDetailPopover.style.display !== 'none') {
        const selectedCard = radarStreamContainer.querySelector('.radar-chinese-card.card-selected');
        if (selectedCard) {
          positionRightPopover(selectedCard);
        }
      }
    }, { passive: true });
  }

  // 定时检查暮色状态
  checkTwilightStatus();
  setInterval(checkTwilightStatus, 60000);

  // 自动探测 Obsidian 知识库
  if (!store.projects || store.projects.length === 0) {
    await syncProjectsFromKB(false);
  }

  // 首次渲染全量面板
  renderAll();
  updateRadarBadgeStatus();
}

// 同步项目（严格只拉取本周在办任务所关联的活跃工程，拒绝灌入全量 35 个知识库项目）
async function syncProjectsFromKB(showFeedback = true) {
  if (showFeedback) showToast('正在刷新在办任务关联工程...');
  try {
    const res = await window.desktopAPI.scanObsidianProjects();
    const kbMap = new Map(); // code -> KB project object
    if (res && res.success && res.projects) {
      res.projects.forEach(p => kbMap.set(p.code.toUpperCase(), p));
    }

    const deletedSet = new Set((store.deletedProjectCodes || []).map(c => (c || '').toUpperCase()));
    const existingMap = new Map((store.projects || []).map(p => [p.code.toUpperCase(), p]));
    const KNOWN_COLOR_PALETTE = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

    // 核心：从在办未完成任务中提取关联的工程标识与路径
    const activeTasks = (store.tasks || []).filter(t => !t.completed);
    const activeProjectCodes = new Set();   // 收集 Pxx 编号
    const standaloneWorkspaces = [];         // 收集非 KB 挂载的独立工作区任务

    activeTasks.forEach(t => {
      const code = (t.projectCode || '').toUpperCase();
      // 跳过未绑定的待选任务
      if (!code || code === '待选' || code === '待做' || code === '未分类') return;

      // 如果是 Pxx 格式编号且在 KB 中存在，标记为活跃 KB 工程
      if (/^P\d+$/.test(code) && kbMap.has(code)) {
        activeProjectCodes.add(code);
      } else if (t.customPath && !t.customPath.includes('Obsidian_KB')) {
        // 非 KB 项目但有真实工作区路径的独立任务（如 抖音推荐、毕设、剪映等）
        const alreadyAdded = standaloneWorkspaces.some(sw => sw.customPath === t.customPath);
        if (!alreadyAdded) {
          standaloneWorkspaces.push({
            projectCode: t.projectCode,
            customPath: t.customPath,
            taskText: t.text
          });
        }
      }
    });

    const updated = [];
    let colorIdx = 0;

    // 1. 按优先级注入 KB 中有活跃任务的项目
    const priorityOrder = ['P35', 'P33', 'P34', 'P32', 'P18', 'P01', 'P03', 'P14', 'P31'];
    const injected = new Set();

    priorityOrder.forEach(code => {
      if (!activeProjectCodes.has(code)) return;
      if (deletedSet.has(code)) return;
      const p = kbMap.get(code);
      if (!p) return;
      const old = existingMap.get(code);
      updated.push({ ...p, progress: old ? old.progress : 85 });
      injected.add(code);
    });

    // 剩余活跃 KB 项目（不在优先级列表中的）
    activeProjectCodes.forEach(code => {
      if (injected.has(code) || deletedSet.has(code)) return;
      const p = kbMap.get(code);
      if (!p) return;
      const old = existingMap.get(code);
      updated.push({ ...p, progress: old ? old.progress : 75, color: KNOWN_COLOR_PALETTE[colorIdx++ % KNOWN_COLOR_PALETTE.length] });
    });

    // 2. 注入独立工作区任务（非 KB 的真实在办工程，如 抖音推荐、毕设、剪映等）
    standaloneWorkspaces.forEach(sw => {
      const syntheticCode = sw.projectCode;
      const cUpper = syntheticCode.toUpperCase();
      if (deletedSet.has(cUpper)) return;
      // 避免重复
      if (updated.some(p => p.code && p.code.toUpperCase() === cUpper)) return;

      const folderName = sw.customPath.split(/[\\/]/).filter(Boolean).pop() || syntheticCode;
      const old = existingMap.get(cUpper);
      updated.push({
        id: cUpper.toLowerCase(),
        code: syntheticCode,
        name: sw.taskText || folderName,
        path: sw.customPath,
        docPath: null,
        progress: old ? old.progress : 50,
        color: KNOWN_COLOR_PALETTE[colorIdx++ % KNOWN_COLOR_PALETTE.length],
        isStandalone: true
      });
    });

    store.projects = updated;
    await saveCurrentStore();
    renderProjects();
    if (showFeedback) {
      const kbCount = updated.filter(p => !p.isStandalone).length;
      const soloCount = updated.filter(p => p.isStandalone).length;
      const parts = [];
      if (kbCount > 0) parts.push(`${kbCount} 个知识库工程`);
      if (soloCount > 0) parts.push(`${soloCount} 个独立工作区`);
      showToast(`🔄 已刷新在办项目：${parts.join(' + ') || '当前无活跃任务工程'}`);
    }
  } catch (e) {
    console.error('Sync KB error:', e);
    if (showFeedback) showToast(`同步异常: ${e.message}`);
  }
}

let isPanelExpanded = false;

function updatePanelVisibility(isExpanded) {
  isPanelExpanded = Boolean(isExpanded);
  document.body.classList.toggle('is-expanded', isPanelExpanded);
  if (collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  }
  if (isExpanded) {
    if (notchPill) notchPill.style.display = 'none';
    if (bentoContainer) bentoContainer.style.display = 'flex';
    if (window.desktopAPI && window.desktopAPI.setIgnoreMouseEvents) {
      window.desktopAPI.setIgnoreMouseEvents(false);
    }
  } else {
    if (notchPill) notchPill.style.display = 'none';
    if (bentoContainer) bentoContainer.style.display = 'none';
    closeAllModals();
    closeLeftPopover();
    closeRightPopover();
  }
}

let preventMinimizeUntil = 0;
let cancelMouseLeaveGlobal = null;

window.setPreventMinimize = (ms = 5000) => {
  preventMinimizeUntil = Date.now() + ms;
  if (typeof cancelMouseLeaveGlobal === 'function') {
    cancelMouseLeaveGlobal();
  }
};

function setupAutoMinimizeOnLeave() {
  let mouseLeaveTimer = null;
  const stageWrapper = document.getElementById('stage-wrapper');

  const cancelMouseLeave = () => {
    if (mouseLeaveTimer) {
      clearTimeout(mouseLeaveTimer);
      mouseLeaveTimer = null;
    }
  };
  cancelMouseLeaveGlobal = cancelMouseLeave;

  const isPointInsideContainers = (x, y) => {
    if (typeof x !== 'number' || typeof y !== 'number') return false;

    const bentoRect = bentoContainer ? bentoContainer.getBoundingClientRect() : null;
    if (!bentoRect) return false;

    // 工作区总体物理翼展（包含居中工作台与左右折叠/展开的工作区浮窗，以及底部展开的方案小窗）：
    // 横向：bentoRect.left - 295 到 bentoRect.right + 295（约 5px ~ 1415px）
    // 纵向：顶部 0 到工作台底部 + 5px（约 0px ~ 465px），底部方案小窗打开时扩展至 675px
    const isBottomOpen = bottomPlanPopover && bottomPlanPopover.style.display !== 'none';
    const stageMinX = bentoRect.left - 295;
    const stageMaxX = bentoRect.right + 295;
    const stageMinY = -2;
    const stageMaxY = isBottomOpen ? 675 : (bentoRect.bottom + 5);

    // 核心判定 1：如果光标已经离开所有工作区的物理范围（向下移入桌面或任务栏，或向外越界）：
    // 无论是否处于安全保护期，均立即判定为出界，并立刻重置保护锁！
    if (x < stageMinX || x > stageMaxX || y < stageMinY || y > stageMaxY) {
      preventMinimizeUntil = 0;
      return false;
    }

    // 核心判定 2：处于所有工作区物理翼展范围内时：
    // a. 若处于交互/清理安全保护期内，保持工作区展开不误关
    if (Date.now() < preventMinimizeUntil) return true;

    // b. 若光标处于居中主工作台内
    if (x >= bentoRect.left && x <= bentoRect.right && y >= bentoRect.top && y <= bentoRect.bottom) {
      return true;
    }

    // c. 若左侧、右侧详情浮窗或底部方案小窗处于展开态，且光标在其内部
    const popovers = [leftDetailPopover, rightDetailPopover, bottomPlanPopover].filter(Boolean);
    const inPopover = popovers.some(c => {
      if (!c || c.style.display === 'none') return false;
      const r = c.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (inPopover) return true;

    // d. 用户明确诉求：“折叠起来的工作区也是工作区”
    // 在左右翼展区域内（即使浮窗刚收起折叠），只要光标未离开工作区物理高度，均判定为在工作区内！
    return true;
  };

  const scheduleMouseLeave = (e) => {
    if (isPinned || !isPanelExpanded || isSelectingFolder) return;
    if (modalDailyAudit && modalDailyAudit.classList.contains('open')) return;

    // 先通过真实鼠标坐标校验是否依然处于工作区内部
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      if (isPointInsideContainers(e.clientX, e.clientY)) {
        cancelMouseLeave();
        return;
      }
    }

    const related = e ? e.relatedTarget : null;
    const containers = [bentoContainer, leftDetailPopover, rightDetailPopover, bottomPlanPopover].filter(Boolean);
    if (related && containers.some(c => c && c.style.display !== 'none' && c.contains(related))) {
      cancelMouseLeave();
      return;
    }

    cancelMouseLeave();
    mouseLeaveTimer = setTimeout(() => {
      if (!isPinned && isPanelExpanded && !isSelectingFolder) {
        // 二次保底校验：检查当前是否有任何容器处于 :hover 状态
        const hoveredElements = document.querySelectorAll(':hover');
        const isStillHovered = Array.from(hoveredElements).some(el => containers.some(c => c && c.style.display !== 'none' && c.contains(el)));
        if (!isStillHovered) {
          window.desktopAPI.minimizePanel();
        }
      }
    }, 320);
  };

  // 全局监听鼠标移动：在工作区内取消延时，离开工作区时立刻调度收起
  window.addEventListener('mousemove', (e) => {
    if (isPointInsideContainers(e.clientX, e.clientY)) {
      cancelMouseLeave();
    } else {
      scheduleMouseLeave(e);
    }
  }, { passive: true });

  // 鼠标移出浏览器可视文档时立刻调度收起
  document.addEventListener('mouseleave', (e) => {
    scheduleMouseLeave(e);
  });

  const interactiveElements = [bentoContainer, leftDetailPopover, rightDetailPopover, bottomPlanPopover].filter(Boolean);
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', cancelMouseLeave);
    el.addEventListener('mousemove', cancelMouseLeave, { passive: true });
    el.addEventListener('mouseleave', scheduleMouseLeave);
  });

  if (stageWrapper) {
    stageWrapper.addEventListener('click', (e) => {
      if (e.target === stageWrapper && !isPinned && isPanelExpanded && !isSelectingFolder) {
        window.desktopAPI.minimizePanel();
      }
    });
  }
}

// 智能鼠标穿透：由主进程硬件光标轮询 (screen.getCursorScreenPoint) 精准驱动，
// 完美解决 Windows 平台下 setIgnoreMouseEvents 导致 Chromium 丢失 mousemove 事件的问题。

function closeAllModals() {
  if (modalDailyAudit) modalDailyAudit.classList.remove('open');
  if (modalRadarConfig) modalRadarConfig.classList.remove('open');
  if (window.desktopAPI && window.desktopAPI.setModalActive) {
    window.desktopAPI.setModalActive(false);
  }
}

async function saveCurrentStore() {
  try {
    const result = await window.desktopAPI.saveStore(store);
    return !result || result.success !== false;
  } catch (e) {
    console.error('Store save error:', e);
    return false;
  }
}

// =========================================================
// 核心渲染流水线 (Render Pipeline)
// =========================================================
function renderAll() {
  renderNotchPill();
  updateInputProgress();
  renderProjects();
  renderTrophies();
  renderTasks();
  renderRadar();
}

// 1. 屏顶药丸渲染 (Notch Pill)
function renderNotchPill() {
  if (!notchPill || !notchTaskTitle || !notchTaskCount) return;
  const uncompleted = store.tasks.filter(t => !t.completed);
  const focusThree = uncompleted.slice(0, 3);

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = today.toISOString().slice(0, 10);
  const todayDoneCount = store.trophies.filter(t => {
    if (t.completedAt && t.completedAt.startsWith(todayDateStr)) return true;
    if (typeof t.dayOfWeek === 'number' && t.dayOfWeek === todayDayOfWeek) return true;
    return false;
  }).length;

  for (let i = 0; i < 3; i++) {
    const dot = energyDots[i];
    if (!dot) continue;
    if (i < focusThree.length) {
      dot.className = 'energy-dot pending';
    } else if (i < focusThree.length + todayDoneCount) {
      dot.className = 'energy-dot done';
    } else {
      dot.className = 'energy-dot';
    }
  }

  if (focusThree.length > 0) {
    notchTaskTitle.textContent = focusThree[0].text;
    notchTaskCount.textContent = `${todayDoneCount}/${uncompleted.length + todayDoneCount}`;
  } else if (todayDoneCount > 0) {
    notchTaskTitle.textContent = '今日主线已达成';
    notchTaskCount.textContent = `${todayDoneCount}/${todayDoneCount}`;
  } else {
    notchTaskTitle.textContent = '今日主线就绪';
    notchTaskCount.textContent = '0/0';
  }
}

// 2. 融入输入框的今日完成度动态计算与渲染
function updateInputProgress() {
  const uncompleted = store.tasks.filter(t => !t.completed).length;

  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = today.toISOString().slice(0, 10);

  const todayDone = store.trophies.filter(t => {
    if (t.completedAt && t.completedAt.startsWith(todayDateStr)) return true;
    if (typeof t.dayOfWeek === 'number' && t.dayOfWeek === todayDayOfWeek) return true;
    return false;
  }).length;

  const total = uncompleted + todayDone;
  const pct = total === 0 ? 0 : Math.round((todayDone / total) * 100);

  if (inputProgressFill) {
    inputProgressFill.style.width = `${pct}%`;
  }
  if (inputProgressRatio) {
    inputProgressRatio.textContent = `${todayDone}/${total}`;
  }
  if (inputProgressPct) {
    inputProgressPct.textContent = `${pct}%`;
  }

  if (quickAddWrap) {
    if (pct === 100 && total > 0) {
      quickAddWrap.classList.add('all-done');
    } else {
      quickAddWrap.classList.remove('all-done');
    }
  }
}

// 3. 左栏：进行中项目
// 交互规则：Apple 极简排版，悬浮出现微型删除键，点击卡片向左弹出锚定 Inspector 详情浮窗
// 计算「本周活跃项目」标识：仅统计存在未完成任务关联到的项目 code / id
function getActiveProjectKeys() {
  const codes = new Set();
  const ids = new Set();
  (store.tasks || []).forEach(t => {
    if (t.completed) return;
    const code = (t.projectCode || '').toUpperCase();
    if (code && code !== '待选' && code !== '待做' && code !== '未分类') {
      codes.add(code);
    }
    if (t.projectId) ids.add(String(t.projectId));
  });
  return { codes, ids };
}

function renderProjects() {
  if (!projectListContainer) return;

  // 核心：只展示本周活跃（存在未完成任务关联）的项目，无待办的项目不上屏；
  // 初始无任何在办任务时回退为全量展示，保证首屏不空。
  const active = getActiveProjectKeys();
  const hasActiveTasks = active.codes.size > 0 || active.ids.size > 0;
  const visibleProjects = hasActiveTasks
    ? store.projects.filter(proj =>
        active.codes.has((proj.code || '').toUpperCase()) ||
        active.ids.has(String(proj.id)))
    : store.projects;

  projectListContainer.innerHTML = '';
  if (projectCountBadge) projectCountBadge.textContent = visibleProjects.length;

  visibleProjects.forEach(proj => {
    const isSelected = currentLeftPopoverProjectId === proj.id;
    const isFiltered = activeProjectFilter === proj.id;
    const progress = clampPercent(proj.progress);
    const accentColor = safeCssColor(proj.color, '#2684ff');
    const item = document.createElement('div');
    item.className = `project-item ${isSelected ? 'card-selected' : ''} ${isFiltered ? 'active' : ''}`;

    item.innerHTML = `
      <div class="project-item-main">
        <div class="project-item-left">
          <span class="project-code-clean">#${escapeHtml(proj.code)}</span>
          <span class="project-name-clean" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>
        </div>
        <div class="project-item-right-actions">
          <span class="project-pct-clean">${progress}%</span>
          <button class="btn-delete-project" title="从工作区删除 #${escapeHtml(proj.code)} 工程">✕</button>
        </div>
      </div>
      <div class="project-bottom-line">
        <div class="project-bottom-fill" style="width: ${progress}%; background: ${accentColor};"></div>
      </div>
    `;

    // 点击项目主体：向左外侧弹出锚定式详情浮窗 (绝不向页面中央遮挡今日任务)
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-project')) return;
      e.stopPropagation();
      openLeftPopover(proj, item);
    });

    const btnDel = item.querySelector('.btn-delete-project');
    if (btnDel) {
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProject(proj.id);
      });
    }

    projectListContainer.appendChild(item);
  });
}

function normalizeWorkspacePath(value) {
  return String(value || '').replace(/\//g, '\\').replace(/[\\]+$/, '').toLowerCase();
}

function workspacePathsOverlap(pathA, pathB) {
  const a = normalizeWorkspacePath(pathA);
  const b = normalizeWorkspacePath(pathB);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}\\`) || b.startsWith(`${a}\\`);
}

// 与 P35 项目约定一致：清理后移出活跃工作区并记录黑名单，避免知识库同步将项目复活。
async function autoRemoveWorkspaceProject(targetProjectId, targetProjectCode, targetWorkspaces = []) {
  // 安全清理保护：立即锁定 6 秒防最小化保护期，确保鼠标留在展开工作区时绝不误关闭
  if (typeof window.setPreventMinimize === 'function') {
    window.setPreventMinimize(6000);
  }

  const normWorkspaces = (targetWorkspaces || []).map(normalizeWorkspacePath).filter(Boolean);
  const deletedNames = [];
  const previousProjects = store.projects;
  const previousTasks = store.tasks;
  const hadDeletedProjectCodes = Object.prototype.hasOwnProperty.call(store, 'deletedProjectCodes');
  const previousDeletedProjectCodes = Array.isArray(store.deletedProjectCodes)
    ? [...store.deletedProjectCodes]
    : store.deletedProjectCodes;

  if (!store.deletedProjectCodes) {
    store.deletedProjectCodes = [];
  }

  // 1. 过滤移出 projects 列表
  store.projects = (store.projects || []).filter(p => {
    const isIdMatch = Boolean(targetProjectId && p.id === targetProjectId);
    const isCodeMatch = Boolean(targetProjectCode && p.code && p.code.toUpperCase() === targetProjectCode.toUpperCase());
    const pPathNorm = normalizeWorkspacePath(p.path);
    const isPathMatch = Boolean(pPathNorm) && normWorkspaces.some(ws => ws.length > 3 && workspacePathsOverlap(ws, pPathNorm));

    if (isIdMatch || isCodeMatch || isPathMatch) {
      deletedNames.push(p.name || p.code);
      if (p.code) {
        const cUpper = p.code.toUpperCase();
        if (!store.deletedProjectCodes.includes(cUpper)) {
          store.deletedProjectCodes.push(cUpper);
        }
      }
      return false;
    }
    return true;
  });

  if (targetProjectCode) {
    const cUpper = targetProjectCode.toUpperCase();
    if (!store.deletedProjectCodes.includes(cUpper)) {
      store.deletedProjectCodes.push(cUpper);
    }
  }

  // 2. 同步清理关联的在办任务
  store.tasks = (store.tasks || []).filter(t => {
    if (targetProjectId && t.projectId === targetProjectId) return false;
    if (targetProjectCode && t.projectCode && t.projectCode.toUpperCase() === targetProjectCode.toUpperCase()) return false;
    if (t.customPath) {
      const tNorm = normalizeWorkspacePath(t.customPath);
      if (tNorm && normWorkspaces.some(ws => ws.length > 3 && workspacePathsOverlap(ws, tNorm))) {
        return false;
      }
    }
    return true;
  });

  const saved = await saveCurrentStore();
  if (!saved) {
    store.projects = previousProjects;
    store.tasks = previousTasks;
    if (hadDeletedProjectCodes) store.deletedProjectCodes = previousDeletedProjectCodes;
    else delete store.deletedProjectCodes;
    renderProjects();
    renderTasks();
    updateInputProgress();
    return { success: false, error: '项目移出状态未能写入本地 store，已保留原列表' };
  }

  if (currentLeftPopoverProjectId === targetProjectId || currentLeftPopoverProjectId === '__clean_review__') {
    closeLeftPopover();
  }
  renderProjects();
  renderTasks();
  updateInputProgress();

  return { success: true, deletedNames };
}

// 从工作区列表彻底删除指定工程
async function deleteProject(projectId) {
  const proj = store.projects.find(p => p.id === projectId);
  if (!proj) return;
  const name = proj.name || proj.code;
  const result = await autoRemoveWorkspaceProject(proj.id, proj.code, [proj.path, getProjectRealFolder(proj)]);
  if (!result.success) {
    showToast(`未能移出 #${proj.code} ${name}: ${result.error}`);
    return;
  }
  showToast(`已从活跃工作区移出 #${proj.code} ${name}；源码目录保留`);
}

// =========================================================
// 左侧「进行中项目」锚定详情浮窗 (macOS Inspector 风格，向左滑出，间距 12px)
// =========================================================
function openLeftPopover(proj, cardEl) {
  if (!leftDetailPopover || !leftPopoverContent) return;

  // 如果点击的是已经打开的同一个项目，则收起浮窗
  if (currentLeftPopoverProjectId === proj.id && leftDetailPopover.style.display !== 'none') {
    closeLeftPopover();
    return;
  }

  // 关闭右侧雷达浮窗，保持单侧聚焦
  closeRightPopover();

  const isAlreadyOpen = (leftDetailPopover.style.display !== 'none');
  currentLeftPopoverProjectId = proj.id;

  // 高亮当前选中的项目卡片
  document.querySelectorAll('.project-item').forEach(el => el.classList.remove('card-selected'));
  if (cardEl) cardEl.classList.add('card-selected');

  // 联动筛选今日任务
  activeProjectFilter = proj.id;
  renderTasks();

  // 浮窗头部
  leftPopoverTag.textContent = `#${proj.code}`;
  leftPopoverTag.style.color = '#64748b';
  leftPopoverTitle.textContent = proj.name;

  const realPath = getProjectRealFolder(proj);

  const renderContent = () => {
    const progress = clampPercent(proj.progress);
    const accentColor = safeCssColor(proj.color, '#2684ff');
    const projectTasks = store.tasks.filter(t => t.projectId === proj.id || t.projectCode === proj.code);
    const pendingTasks = projectTasks.filter(t => !t.completed);
    const displayTasks = pendingTasks.slice(0, 4);

    let tasksHtml = '';
    if (displayTasks.length > 0) {
      tasksHtml = displayTasks.map(t => `
        <div class="inspector-task-row" title="${escapeHtml(t.text)}">
          <span class="inspector-task-dot" style="background:${accentColor};"></span>
          <span class="inspector-task-text">${escapeHtml(t.text)}</span>
        </div>
      `).join('');
    } else {
      tasksHtml = '<div style="font-size:11px;color:#94a3b8;padding:4px 0;">暂无未完成待办</div>';
    }

    const summaryMap = {
      p35: '贴顶极简 Bento 工作台，Win32 原生穿透与白毛玻璃微架构，解决多窗口遮挡痛点。',
      p33: '针对无线电复杂干扰源进行凸包剖分与双重证据门清除，实现定点高速抑制。',
      p34: '集成 QQ 协议端、多 Agent 协作调度系统与长短期记忆插槽，赋能群内智能助理。',
      p32: '跨平台内容全自动化分发矩阵，贝塞尔曲线加速度防风控过检算法。',
      p18: '集成农业机器人机器视觉标定检测与环境联动控制，赋能智慧庭院。',
      p01: '离线多模态语音识别与端侧 IoT 智能中控，低功耗边缘网关调度。'
    };
    const summaryText = summaryMap[proj.id] || `${proj.name} 核心工程模块，规范受保护。`;

    leftPopoverContent.innerHTML = `
      <div class="inspector-meta-bar">
        <span class="inspector-meta-item">${progress === 100 ? '已完成' : '进行中'}</span>
        <span class="inspector-meta-dot">·</span>
        <span class="inspector-meta-item" title="${escapeHtml(realPath)}">${escapeHtml(realPath)}</span>
        <span class="inspector-meta-dot">·</span>
        <span class="inspector-metric-pill">${progress}%</span>
      </div>
      <div class="inspector-progress-line">
        <div class="inspector-progress-fill" style="width: ${progress}%; background: ${accentColor};"></div>
      </div>

      <div class="inspector-divider"></div>

      <div class="inspector-desc-block">
        ${escapeHtml(summaryText)}
      </div>

      <div class="inspector-divider"></div>

      <div style="font-size: 11px; font-weight: 600; color: #1e293b;">关联任务 (${pendingTasks.length})</div>
      <div class="inspector-tasks-list">
        ${tasksHtml}
      </div>

      <div class="inspector-actions-row">
        <button class="btn-apple-action primary" id="btn-pop-open-dir">📂 打开工程</button>
        <button class="btn-apple-action secondary" id="btn-pop-clean-proj">🧹 安全清理</button>
        <button class="btn-apple-action danger" id="btn-pop-delete-proj" title="从工作区删除工程">🗑️ 移出工作区</button>
      </div>
      <button class="btn-apple-action secondary" id="btn-pop-plan-proj" style="margin-top: 6px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px;">💡 方案拆解与灵感笔记</button>
    `;

    const btnOpenDir = leftPopoverContent.querySelector('#btn-pop-open-dir');
    if (btnOpenDir) {
      btnOpenDir.addEventListener('click', () => {
        showToast(`打开真实代码工程: ${realPath}`);
        window.desktopAPI.openInExplorer(realPath);
      });
    }

    const btnPlanProj = leftPopoverContent.querySelector('#btn-pop-plan-proj');
    if (btnPlanProj) {
      btnPlanProj.addEventListener('click', () => {
        let targetTask = store.tasks.find(t => (t.projectId === proj.id || t.projectCode === proj.code) && !t.completed);
        if (!targetTask) {
          targetTask = store.tasks.find(t => t.projectId === proj.id || t.projectCode === proj.code);
        }
        if (!targetTask) {
          targetTask = {
            id: 't-' + Date.now(),
            text: proj.name,
            projectId: proj.id,
            projectCode: proj.code,
            customPath: realPath,
            completed: false,
            createdAt: new Date().toISOString(),
            subtasks: []
          };
          store.tasks.unshift(targetTask);
          saveCurrentStore();
          renderTasks();
        }
        openBottomPlanPopover(targetTask);
      });
    }

    const btnDeleteProj = leftPopoverContent.querySelector('#btn-pop-delete-proj');
    if (btnDeleteProj) {
      btnDeleteProj.addEventListener('click', () => {
        deleteProject(proj.id);
      });
    }

    const btnCleanProj = leftPopoverContent.querySelector('#btn-pop-clean-proj');
    if (btnCleanProj) {
      btnCleanProj.addEventListener('click', async () => {
        if (!realPath) {
          showToast('该工程未设置有效工作区路径');
          return;
        }
        showToast(`正在排查 #${proj.code} 构建冗余...`);
        try {
          const res = await window.desktopAPI.scanTaskWorkspaces([realPath]);
          if (!res || !res.success) {
            showToast(`排查异常: ${res ? res.error : '未知错误'}`);
            return;
          }
          if (!res.items || res.items.length === 0) {
            // 即使没有可回收缓存，完成项目清理也应按 P35 约定退出活跃工作区。
            const removal = await autoRemoveWorkspaceProject(proj.id, proj.code, [realPath, proj.path]);
            if (!removal.success) {
              showToast(`未能移出工作区: ${removal.error}`);
              return;
            }
            showToast(`✅ 工程 #${proj.code} 已从活跃工作区移出；源码目录保留`);
          } else {
            openCleanReviewPopover(res.items, [realPath], proj.id, proj.code);
          }
        } catch (e) {
          showToast(`排查异常: ${e.message}`);
        }
      });
    }
  };

  if (isAlreadyOpen) {
    leftPopoverContent.classList.add('switching');
    clearTimeout(popoverSwitchTimer);
    popoverSwitchTimer = setTimeout(() => {
      renderContent();
      positionLeftPopover(cardEl);
      leftPopoverContent.classList.remove('switching');
    }, 120);
  } else {
    renderContent();
    leftDetailPopover.style.display = 'flex';
    positionLeftPopover(cardEl);
  }
}

function positionLeftPopover(cardEl) {
  if (!leftDetailPopover) return;
  leftDetailPopover.style.left = '6px';
  leftDetailPopover.style.top = '0';
}

function closeLeftPopover() {
  currentLeftPopoverProjectId = null;
  activeProjectFilter = null;
  if (leftDetailPopover) {
    leftDetailPopover.style.display = 'none';
  }
  document.querySelectorAll('.project-item').forEach(el => el.classList.remove('card-selected'));
  renderTasks();
}

// 排查并在左侧浮窗展示在办任务工作区构建缓存审查清单（严格只扫描在办任务绑定目录，供用户审查后确认清理）
async function executeCleanTaskWorkspaces() {
  const tasks = store.tasks || [];
  const targetWorkspaces = Array.from(new Set(
    tasks
      .filter(t => !t.completed && t.customPath && !t.customPath.includes('Obsidian_KB') && !t.customPath.includes('opposite'))
      .map(t => t.customPath)
  ));

  if (targetWorkspaces.length === 0) {
    showToast('当前任务记录无绑定工作区，无需清理');
    return;
  }

  showToast(`正在扫描 ${targetWorkspaces.length} 个在办任务工作区...`);
  try {
    const res = await window.desktopAPI.scanTaskWorkspaces(targetWorkspaces);
    if (!res || !res.success) {
      showToast(`排查失败: ${res ? res.error : '未知错误'}`);
      return;
    }
    if (!res.items || res.items.length === 0) {
      showToast('已全面排查在办任务工作区，代码极净无冗余缓存');
    } else {
      openCleanReviewPopover(res.items, targetWorkspaces);
    }
  } catch (err) {
    showToast(`排查异常: ${err.message}`);
  }
}

// 瘦身审查浮窗呈现（在左侧浮窗展示具体扫描结果、分类标签、占用体积，复选后确认清理，清理后自动移出工作区）
function openCleanReviewPopover(initialItems, targetWorkspaces, targetProjectId, targetProjectCode) {
  if (!leftDetailPopover) return;

  currentLeftPopoverProjectId = '__clean_review__';
  activeProjectFilter = null;
  document.querySelectorAll('.project-item').forEach(el => el.classList.remove('card-selected'));
  // 筛选状态变化后立即重绘任务区，避免清理审查中仍显示旧项目的过滤结果。
  renderTasks();
  updateInputProgress();

  leftPopoverTag.textContent = `${initialItems.length}项`;
  leftPopoverTitle.textContent = '工作区瘦身审查';

  const renderReviewContent = (currentItems) => {
    if (currentItems.length === 0) {
      autoRemoveWorkspaceProject(targetProjectId, targetProjectCode, targetWorkspaces).then((result) => {
        if (result.success) showToast('✅ 工作区无待清理缓存，项目已从活跃工作区移出');
        else showToast(`未能移出工作区: ${result.error}`);
      });
      return;
    }

    const itemsHtml = currentItems.map((item, idx) => {
      let badgeClass = 'ver-badge-junk';
      if (item.versionRole === 'stable') badgeClass = 'ver-badge-stable';
      else if (item.versionRole === 'latest') badgeClass = 'ver-badge-latest';
      else if (item.versionRole === 'intermediate') badgeClass = 'ver-badge-inter';

      const isChecked = !item.isProtected;
      const isDisabled = item.isProtected ? 'disabled' : '';
      const itemClass = `clean-review-item ${item.isProtected ? 'clean-item-protected' : ''}`;
      const encodedPath = escapeHtml(encodeURIComponent(item.fullPath || ''));
      const workspaceName = escapeHtml(item.workspaceName || '');
      const relativePath = escapeHtml(item.relativePath || '');
      const roleLabel = escapeHtml(item.roleLabel || item.category || '');
      const roleDesc = escapeHtml(item.roleDesc || item.category || '');

      return `
        <label class="${itemClass}" data-idx="${idx}" title="${item.isProtected ? '该文件为系统识别的稳定基准或最新活跃版本，已受保护保留' : '中间过渡版本或编译垃圾，建议清理'}">
          <input 
            type="checkbox" 
            class="clean-item-cb" 
            ${isChecked ? 'checked' : ''} 
            ${isDisabled} 
            data-path="${encodedPath}"
            data-protected="${item.isProtected ? '1' : '0'}" 
          />
          <div class="clean-review-info">
            <div class="clean-review-name-row">
              <span class="clean-review-name">${escapeHtml(item.name)}</span>
              <span class="clean-review-size">${escapeHtml(item.sizeFormatted || '')}</span>
            </div>
            <div class="clean-review-meta-row">
              <span class="ver-badge ${badgeClass}">${roleLabel}</span>
              ${item.isProtected ? '<span style="font-size:9.5px;color:#059669;font-weight:600;">🔒 已保护</span>' : ''}
            </div>
            <span class="clean-review-desc">${roleDesc}</span>
            <span class="clean-review-ws" title="${escapeHtml(item.fullPath || '')}">${workspaceName} / ${relativePath}</span>
          </div>
        </label>
      `;
    }).join('');

    leftPopoverContent.innerHTML = `
      <div class="clean-review-wrap">
        <div class="clean-safety-badge">
          <span>🛡️</span>
          <span>智能版本剪裁：自动锁定稳定版与最新版，透彻清理中间过渡版本与编译垃圾！支持 Windows 回收站随时还原。</span>
        </div>

        <div class="clean-filter-bar">
          <button class="btn-filter-inter" id="btn-select-intermediate" title="一键重置：仅勾选中间版本与编译垃圾，保护两端版本">
            🎯 仅选中间版与垃圾
          </button>
          <button class="btn-toggle-all-clean" id="btn-toggle-all-clean">取消全选</button>
        </div>

        <div class="clean-review-stats">
          <span>待清理: <b style="color:var(--text-main);" id="clean-selected-count">0</b> 项</span>
          <span style="font-size:10px;color:var(--text-light);" id="clean-total-summary">共 ${currentItems.length} 项</span>
        </div>

        <div class="clean-review-list custom-scroll" id="clean-review-items-list">
          ${itemsHtml}
        </div>

        <div class="clean-review-actions">
          <button class="btn-confirm-clean" id="btn-execute-clean">
            <span>🗑️ 安全移入回收站</span>
            <span id="clean-btn-size-label">(0 B)</span>
          </button>
        </div>
      </div>
    `;

    const btnToggleAll = leftPopoverContent.querySelector('#btn-toggle-all-clean');
    const btnSelectInter = leftPopoverContent.querySelector('#btn-select-intermediate');
    const checkboxes = leftPopoverContent.querySelectorAll('.clean-item-cb');
    const cleanBtn = leftPopoverContent.querySelector('#btn-execute-clean');
    const cleanSizeLabel = leftPopoverContent.querySelector('#clean-btn-size-label');
    const cleanCountLabel = leftPopoverContent.querySelector('#clean-selected-count');

    const updateSelectedTotal = () => {
      let selBytes = 0;
      let selCount = 0;
      let selectableCount = 0;
      let selectedSelectableCount = 0;

      checkboxes.forEach((cb, i) => {
        if (!cb.disabled) {
          selectableCount++;
          if (cb.checked) selectedSelectableCount++;
        }
        if (cb.checked) {
          selCount++;
          selBytes += currentItems[i].size || 0;
        }
      });

      cleanCountLabel.textContent = selCount;
      cleanSizeLabel.textContent = `(${formatBytes(selBytes)})`;
      btnToggleAll.textContent = (selectableCount > 0 && selectedSelectableCount === selectableCount) ? '取消全选' : '全选';
      cleanBtn.disabled = selCount === 0;
      cleanBtn.style.opacity = selCount === 0 ? '0.5' : '1';
    };

    if (btnSelectInter) {
      btnSelectInter.addEventListener('click', () => {
        checkboxes.forEach((cb, i) => {
          if (currentItems[i].isProtected) {
            cb.checked = false;
          } else {
            cb.checked = true;
          }
        });
        updateSelectedTotal();
        showToast('已选中所有中间版本与垃圾缓存，已保护稳定版与最新版 🛡️');
      });
    }

    if (btnToggleAll) {
      btnToggleAll.addEventListener('click', () => {
        const anyUnchecked = Array.from(checkboxes).some(c => !c.disabled && !c.checked);
        checkboxes.forEach(c => {
          if (!c.disabled) {
            c.checked = anyUnchecked;
          }
        });
        updateSelectedTotal();
      });
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSelectedTotal);
    });

    // 初始计算选中总数与体积
    updateSelectedTotal();

    if (cleanBtn) {
      cleanBtn.addEventListener('click', async () => {
        const selectedPaths = [];
        checkboxes.forEach(cb => {
          if (cb.checked) {
            selectedPaths.push(decodeURIComponent(cb.getAttribute('data-path')));
          }
        });

        if (selectedPaths.length === 0) {
          showToast('未选择任何清理项');
          return;
        }

        cleanBtn.disabled = true;
        cleanBtn.textContent = '正在安全移入回收站...';

        try {
          const res = await window.desktopAPI.cleanTaskWorkspaces(targetWorkspaces, selectedPaths);
          if (!res || !res.success || !(Number(res.cleanedCount) > 0)) {
            const failedCount = res && Number.isFinite(res.failedCount) ? `（${res.failedCount} 项失败）` : '';
            const reason = res && res.error ? res.error : '没有候选实际移入回收站';
            showToast(`清理失败${failedCount}: ${reason}`);
            cleanBtn.disabled = false;
            cleanBtn.textContent = '安全移入回收站';
            return;
          }

          // 清理候选已移入回收站后，复用统一移出流程并持久化黑名单，杜绝知识库同步复活。
          const removal = await autoRemoveWorkspaceProject(targetProjectId, targetProjectCode, targetWorkspaces);
          if (!removal.success) {
            showToast(`缓存已移入回收站，但项目状态未能保存: ${removal.error}`);
            cleanBtn.disabled = false;
            cleanBtn.textContent = '安全移入回收站';
            return;
          }
          showToast(`✅ 清理完成，释放 ${res.freedFormatted}；项目已从活跃工作区移出，源码目录保留`);
        } catch (e) {
          showToast(`清理异常: ${e.message}`);
          cleanBtn.disabled = false;
          cleanBtn.textContent = '安全移入回收站';
        }
      });
    }
  };

  renderReviewContent(initialItems);
  leftDetailPopover.style.display = 'flex';
  positionLeftPopover(null);
}

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getTrophyWeekday(t) {
  if (typeof t.dayOfWeek === 'number' && t.dayOfWeek >= 0 && t.dayOfWeek <= 6) {
    return WEEKDAY_NAMES[t.dayOfWeek];
  }
  if (t.completedAt) {
    const d = new Date(t.completedAt);
    if (!isNaN(d.getTime())) {
      return WEEKDAY_NAMES[d.getDay()];
    }
  }
  return '周内';
}

// 4. 左栏：本周战果
function renderTrophies() {
  trophyListContainer.innerHTML = '';

  const activeDays = new Set();
  store.trophies.forEach(t => {
    if (typeof t.dayOfWeek === 'number') activeDays.add(t.dayOfWeek);
    else if (t.completedAt) {
      const d = new Date(t.completedAt);
      if (!isNaN(d.getTime())) activeDays.add(d.getDay());
    }
  });

  document.querySelectorAll('#trophy-week-bar .day-filter-btn').forEach(btn => {
    const dayAttr = btn.getAttribute('data-day');
    btn.classList.toggle('active', dayAttr === currentTrophyDayFilter);
    if (dayAttr !== 'all') {
      btn.classList.toggle('has-items', activeDays.has(parseInt(dayAttr, 10)));
    }
  });

  let displayTrophies = store.trophies;
  if (currentTrophyDayFilter !== 'all') {
    const targetDay = parseInt(currentTrophyDayFilter, 10);
    displayTrophies = store.trophies.filter(t => {
      if (typeof t.dayOfWeek === 'number') return t.dayOfWeek === targetDay;
      if (t.completedAt) return new Date(t.completedAt).getDay() === targetDay;
      return false;
    });
  }

  if (displayTrophies.length === 0) {
    const dayLabel = currentTrophyDayFilter === 'all' ? '本周' : WEEKDAY_NAMES[parseInt(currentTrophyDayFilter, 10)];
    trophyListContainer.innerHTML = `<div style="color:var(--text-light);font-size:9px;padding:12px 0;text-align:center;">${dayLabel}暂无完成记录</div>`;
    return;
  }

    displayTrophies.slice(0, 25).forEach(t => {
    const weekday = getTrophyWeekday(t);
    const row = document.createElement('div');
    row.className = 'trophy-item';
    row.title = '点击复选框或文字切换回今日待做，或点击 ✕ 彻底删除';
    row.innerHTML = `
      <div class="trophy-left">
        <span class="trophy-weekday-tag">${weekday}</span>
        <span class="trophy-check" title="点击取消完成并切换回待做">✓</span>
        <span class="trophy-text" title="${escapeHtml(t.text)}">${escapeHtml(t.text)}</span>
      </div>
      <div class="trophy-actions">
        <button class="btn-undo-trophy" title="切换回复活至待做">撤销</button>
        <button class="btn-delete-trophy" title="彻底删除此战果">✕</button>
      </div>
    `;

    const handleRevive = (e) => {
      e.stopPropagation();
      reviveTrophyTask(t.id);
    };

    row.querySelector('.trophy-left').addEventListener('click', handleRevive);
    row.querySelector('.btn-undo-trophy').addEventListener('click', handleRevive);

    row.querySelector('.btn-delete-trophy').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTrophyTask(t.id);
    });

    trophyListContainer.appendChild(row);
  });
}

function reviveTrophyTask(trophyId) {
  const trophyIdx = store.trophies.findIndex(t => t.id === trophyId);
  if (trophyIdx === -1) return;
  const [removed] = store.trophies.splice(trophyIdx, 1);

  store.tasks.unshift({
    id: removed.id || `t-${Date.now()}`,
    text: removed.text,
    projectId: removed.projectId || 'p35',
    projectCode: removed.projectCode || 'P35',
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveCurrentStore();
  renderAll();
  showToast(`已将 [${removed.text}] 切换回复活至今日待做`);
}

function deleteTrophyTask(trophyId) {
  const trophyIdx = store.trophies.findIndex(t => t.id === trophyId);
  if (trophyIdx === -1) return;
  const [removed] = store.trophies.splice(trophyIdx, 1);

  saveCurrentStore();
  renderAll();
  showToast(`已删除战果记录: ${removed.text}`);
}

// =========================================================
// 辅助函数：HTML 转义
// =========================================================
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clampPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
}

function safeCssColor(value, fallback = '#2684ff') {
  const color = String(value || '').trim();
  return /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(color) ? color : fallback;
}

// =========================================================
// 底部「方案与想法拆解」小窗 (Bottom Plan Popover)
// 专为大项目拆解小步骤与方案灵感备忘打造，带精致小矩形打勾框与实时保存
// =========================================================
function toggleBottomPlanPopover(task, cardEl) {
  if (!bottomPlanPopover) return;

  if (currentPlanTaskId === task.id && bottomPlanPopover.style.display !== 'none') {
    closeBottomPlanPopover();
    return;
  }

  openBottomPlanPopover(task, cardEl);
}

function openBottomPlanPopover(task, cardEl) {
  if (!bottomPlanPopover) return;

  currentPlanTaskId = task.id;

  // 1. 高亮当前选中的任务卡片
  document.querySelectorAll('.focus-task-card').forEach(el => el.classList.remove('plan-active'));
  if (cardEl) {
    cardEl.classList.add('plan-active');
  } else {
    const matchedCard = document.querySelector(`.focus-task-card[data-id="${task.id}"]`);
    if (matchedCard) matchedCard.classList.add('plan-active');
  }

  // 2. 填充标头信息
  if (planPopoverTag) {
    planPopoverTag.textContent = `#${task.projectCode || '待做'}`;
  }
  if (planPopoverTitle) {
    planPopoverTitle.textContent = task.text;
    planPopoverTitle.title = task.text;
  }

  // 3. 渲染拆解步骤清单
  renderPlanSubtasks(task);

  // 5. 显示浮窗并通知主进程放宽硬件光标判定
  bottomPlanPopover.style.display = 'flex';
  if (window.desktopAPI && window.desktopAPI.setBottomPopoverState) {
    window.desktopAPI.setBottomPopoverState(true);
  }

  // 6. 自动聚焦拆解输入框
  if (inputAddSubtask) {
    setTimeout(() => {
      inputAddSubtask.focus();
    }, 120);
  }
}

function closeBottomPlanPopover() {
  if (!bottomPlanPopover) return;
  bottomPlanPopover.style.display = 'none';
  currentPlanTaskId = null;

  document.querySelectorAll('.focus-task-card').forEach(el => el.classList.remove('plan-active'));

  if (window.desktopAPI && window.desktopAPI.setBottomPopoverState) {
    window.desktopAPI.setBottomPopoverState(false);
  }
}

function renderPlanSubtasks(task) {
  if (!planSubtasksContainer) return;
  planSubtasksContainer.innerHTML = '';

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 更新标头进度
  if (planSubtasksCount) planSubtasksCount.textContent = `${completed}/${total} 项`;
  if (planProgressFill) planProgressFill.style.width = `${pct}%`;
  if (planProgressText) planProgressText.textContent = `${completed}/${total} 完成 (${pct}%)`;

  if (subtasks.length === 0) {
    planSubtasksContainer.innerHTML = '<div class="plan-empty-hint">暂无拆解步骤，在上方输入小目标，逐个击破大工程 🎯</div>';
    return;
  }

  subtasks.forEach((sub, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = `plan-subtask-item ${sub.completed ? 'is-done' : ''}`;

    itemEl.innerHTML = `
      <button class="apple-rect-checkbox ${sub.completed ? 'checked' : ''}" title="${sub.completed ? '标记未完成' : '点击完成'}"></button>
      <span class="plan-subtask-text">${escapeHtml(sub.text)}</span>
      <button class="btn-delete-subtask" title="删除该步骤">✕</button>
    `;

    // 核心：点击小矩形框，切换完成并产生逐个击破成就感动效
    const checkbox = itemEl.querySelector('.apple-rect-checkbox');
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      sub.completed = !sub.completed;
      await saveCurrentStore();
      renderPlanSubtasks(task);
      renderTasks(); // 联动更新卡片上的进度微徽标
      if (sub.completed) {
        triggerMicroCelebration(itemEl);
      }
    });

    // 点击删除按钮
    const btnDel = itemEl.querySelector('.btn-delete-subtask');
    btnDel.addEventListener('click', async (e) => {
      e.stopPropagation();
      task.subtasks.splice(idx, 1);
      await saveCurrentStore();
      renderPlanSubtasks(task);
      renderTasks();
    });

    planSubtasksContainer.appendChild(itemEl);
  });

  // 全达成恭喜横幅
  if (total > 0 && completed === total) {
    const banner = document.createElement('div');
    banner.className = 'plan-celebration-banner';
    banner.textContent = '🎉 该方案所有小目标已被全部逐个击破！太强了！';
    planSubtasksContainer.appendChild(banner);
  }
}

// 微型成就反馈动效
function triggerMicroCelebration(el) {
  if (!el) return;
  el.style.transform = 'scale(1.02)';
  setTimeout(() => {
    el.style.transform = 'none';
  }, 180);
}

function setupPlanPopoverListeners() {
  if (btnClosePlanPopover) {
    btnClosePlanPopover.addEventListener('click', () => {
      closeBottomPlanPopover();
    });
  }

  // 添加拆解步骤逻辑
  const handleAddSubtask = async () => {
    if (!currentPlanTaskId || !inputAddSubtask) return;
    const text = inputAddSubtask.value.trim();
    if (!text) return;

    const targetTask = store.tasks.find(t => t.id === currentPlanTaskId);
    if (!targetTask) return;

    if (!Array.isArray(targetTask.subtasks)) {
      targetTask.subtasks = [];
    }

    targetTask.subtasks.push({
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    });

    inputAddSubtask.value = '';
    await saveCurrentStore();
    renderPlanSubtasks(targetTask);
    renderTasks();
  };

  if (btnAddSubtask) {
    btnAddSubtask.addEventListener('click', handleAddSubtask);
  }

  if (inputAddSubtask) {
    inputAddSubtask.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSubtask();
      }
    });
  }
}

// 5. 中栏：任务渲染
// 视觉法则：彻底摒弃套娃小框（移除 01序号框、项目框、目录按钮框、候补框）；
// 区分待完成与完成：仅依赖顺序 (Prio 1/2/3) 与紧迫度颜色指示条/指示点；
// 交互规则：点击整个卡片任意地方（除勾选框外）直接打开文件夹或选择绑定文件夹
function renderTasks() {
  let displayTasks = store.tasks.filter(t => !t.completed);
  if (activeProjectFilter) {
    displayTasks = displayTasks.filter(t => t.projectId === activeProjectFilter);
  }

  focusSlotsContainer.innerHTML = '';
  if (displayTasks.length === 0) {
    if (store.tasks.length === 0 && store.trophies.length === 0) {
      focusSlotsContainer.innerHTML = '<div style="color:var(--text-muted);font-size:11.5px;padding:24px 0;text-align:center;">今日暂无待办任务，在上方直接输入待办即可开始 ✍️</div>';
    } else {
      focusSlotsContainer.innerHTML = '<div style="color:var(--text-emerald);font-size:11.5px;font-weight:600;padding:24px 0;text-align:center;">🎉 今日主线全部达成！在上方输入新任务即可继续</div>';
    }
  } else {
    displayTasks.forEach((task, index) => {
      const card = document.createElement('div');
      // 核心视觉层级（秩序与色彩直接传达优先级）：
      // 1. 首要任务 (Task 1): 紧迫高光红指示条，主角聚焦感
      // 2. 次要任务 (Task 2, 3): 干净黑色文本，次级聚焦
      // 3. 候补任务 (Task 4+): 纯净中性灰，绝不特意显示“候补”二字或套娃框
      let cardClass = 'focus-task-card';
      if (index === 0) {
        cardClass += ' is-hero';
      } else if (index === 1 || index === 2) {
        cardClass += ' is-secondary';
      } else {
        cardClass += ' is-standby';
      }
      if (currentPlanTaskId === task.id && bottomPlanPopover && bottomPlanPopover.style.display !== 'none') {
        cardClass += ' plan-active';
      }
      card.className = cardClass;
      card.draggable = true;
      card.setAttribute('data-id', task.id);

      // 获取真实工程代码目录（绝不使用 Obsidian 笔记路径）
      const realFolder = getTaskRealFolder(task);

      // 计算拆解步骤进度微徽标
      const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
      let subtaskBadgeHtml = '';
      if (subtasks.length > 0) {
        const doneCount = subtasks.filter(s => s.completed).length;
        const allDone = doneCount === subtasks.length;
        subtaskBadgeHtml = `<span class="task-plan-badge ${allDone ? 'all-done' : ''}" title="已拆解 ${subtasks.length} 项（${doneCount} 项完成），点击查看方案">📐 ${doneCount}/${subtasks.length}</span>`;
      }

      card.innerHTML = `
        <div class="task-stripe-trigger" title="点击记录想法与方案拆解"></div>
        <button class="apple-task-checkbox" title="勾选完成"></button>
        <div class="task-body">
        <span class="task-proj-code">${escapeHtml(task.projectCode || '待做')}</span>
          <div class="task-title-text" title="${escapeHtml(task.text)}">${escapeHtml(task.text)}</div>
          ${subtaskBadgeHtml}
        </div>
        <span class="task-folder-action" title="${escapeHtml(realFolder ? '打开真实工程: ' + realFolder : '未绑定 (点击选择工作区)')}">
          ${realFolder ? '📂' : '＋'}
        </span>
        <button class="btn-delete-task" title="删除该任务">✕</button>
      `;

      // 0. 核心：点击左侧条或拆解徽标，展开/切换底部方案拆解小窗
      const stripeTrigger = card.querySelector('.task-stripe-trigger');
      if (stripeTrigger) {
        stripeTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleBottomPlanPopover(task, card);
        });
      }

      const planBadge = card.querySelector('.task-plan-badge');
      if (planBadge) {
        planBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleBottomPlanPopover(task, card);
        });
      }

      // 1. 独立勾选框：触发完成与划线飞行动效
      const checkbox = card.querySelector('.apple-task-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        completeTaskWithFlightAnimation(task.id, card, checkbox);
      });

      // 2. 独立删除按键：一键删除在办任务 (支持清理成功后或不再需要的任务删除)
      const btnDelTask = card.querySelector('.btn-delete-task');
      if (btnDelTask) {
        btnDelTask.addEventListener('click', async (e) => {
          e.stopPropagation();
          store.tasks = store.tasks.filter(t => t.id !== task.id);
          await saveCurrentStore();
          renderTasks();
          updateInputProgress();
          showToast(`已删除任务: ${task.text}`);
        });
      }

      // 3. 整个卡片任意空白/文字/图标区域点击（除 checkbox、删除键、左侧条外）：打开文件夹或选择绑定
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.apple-task-checkbox') || e.target.closest('.btn-delete-task') || e.target.closest('.task-stripe-trigger') || e.target.closest('.task-plan-badge')) return;
        const currentFolder = getTaskRealFolder(task);
        if (currentFolder) {
          showToast(`打开真实工程: ${currentFolder}`);
          window.desktopAPI.openInExplorer(currentFolder);
        } else {
          await bindTaskFolder(task);
        }
      });

      bindTaskDragEvents(card, task.id);
      focusSlotsContainer.appendChild(card);
    });
  }

  // 候补无需特意显示，安全清空兼容引用
  if (nextTaskPreview) nextTaskPreview.innerHTML = '';
  if (standbyCount) standbyCount.textContent = '';

  renderNotchPill();
  updateInputProgress();
}

async function bindTaskFolder(task) {
  isSelectingFolder = true;
  try {
    const res = await window.desktopAPI.selectFolder();
    if (res && res.success && res.folderPath) {
      task.customPath = res.folderPath;

      // 智能提取选中的目录名，匹配已有工程或建立工程标识
      const folderBaseName = res.folderPath.split(/[\\/]/).filter(Boolean).pop() || '';
      const matchedProject = (store.projects || []).find(p => 
        (p.path && p.path.toLowerCase() === res.folderPath.toLowerCase()) ||
        (p.name && p.name.toLowerCase() === folderBaseName.toLowerCase()) ||
        (p.code && p.code.toLowerCase() === folderBaseName.toLowerCase())
      );
      if (matchedProject) {
        task.projectId = matchedProject.id;
        task.projectCode = matchedProject.code;
      } else if (folderBaseName) {
        task.projectCode = folderBaseName.slice(0, 8);
      } else {
        task.projectCode = '已选';
      }

      await saveCurrentStore();
      renderTasks();
      showToast(`已绑定并打开工作区: ${res.folderPath}`);
      window.desktopAPI.openInExplorer(res.folderPath);
    }
  } catch (err) {
    console.error('bindTaskFolder error:', err);
  } finally {
    isSelectingFolder = false;
  }
}

function completeTaskWithFlightAnimation(taskId, cardEl, checkboxEl) {
  checkboxEl.classList.add('checked');
  cardEl.classList.add('completing');

  setTimeout(() => {
    const taskIdx = store.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return;

    const [doneTask] = store.tasks.splice(taskIdx, 1);
    doneTask.completed = true;
    doneTask.completedAt = new Date().toISOString();
    doneTask.dayOfWeek = new Date().getDay();

    store.trophies.unshift(doneTask);
    saveCurrentStore();
    renderAll();
  }, 1450);
}

let draggedTaskId = null;

function bindTaskDragEvents(el, taskId) {
  el.addEventListener('dragstart', (e) => {
    draggedTaskId = taskId;
    e.dataTransfer.effectAllowed = 'move';
    el.style.opacity = '0.5';
  });

  el.addEventListener('dragend', () => {
    el.style.opacity = '1';
    draggedTaskId = null;
  });

  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  el.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === taskId) return;

    const fromIdx = store.tasks.findIndex(t => t.id === draggedTaskId);
    const toIdx = store.tasks.findIndex(t => t.id === taskId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = store.tasks.splice(fromIdx, 1);
    store.tasks.splice(toIdx, 0, moved);

    saveCurrentStore();
    renderTasks();
  });
}

function handleQuickAddKeydown(e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key !== 'Enter') return;
  const rawText = inputQuickAdd.value.trim();
  if (!rawText) return;

  let text = rawText;
  let targetProjectId = null;
  let targetProjectCode = '待选';
  let targetCustomPath = null;
  let priorityPos = null;

  const tagMatch = text.match(/#([a-zA-Z0-9_\u4e00-\u9fa5-]+)/i);
  if (tagMatch) {
    const rawTag = tagMatch[1].toUpperCase();
    const matchedProj = (store.projects || []).find(p => 
      (p.code && p.code.toUpperCase() === rawTag) || 
      (p.id && p.id.toUpperCase() === rawTag) ||
      (p.name && p.name.toUpperCase().includes(rawTag))
    );
    if (matchedProj) {
      targetProjectId = matchedProj.id;
      targetProjectCode = matchedProj.code;
      targetCustomPath = matchedProj.path || null;
    } else {
      targetProjectCode = rawTag;
    }
    text = text.replace(tagMatch[0], '').trim();
  }

  const prioMatch = text.match(/!([1-9])/);
  if (prioMatch) {
    priorityPos = parseInt(prioMatch[1], 10) - 1;
    text = text.replace(prioMatch[0], '').trim();
  } else if (text.includes('!')) {
    priorityPos = 0;
    text = text.replace('!', '').trim();
  }

  const newTask = {
    id: `t-${Date.now()}`,
    text: text || '未命名任务',
    projectId: targetProjectId,
    projectCode: targetProjectCode,
    customPath: targetCustomPath,
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (priorityPos !== null && priorityPos >= 0) {
    store.tasks.splice(priorityPos, 0, newTask);
  } else {
    store.tasks.push(newTask);
  }

  inputQuickAdd.value = '';
  saveCurrentStore();
  renderTasks();
  renderNotchPill();
  updateInputProgress();
  showToast(`已创建任务: ${newTask.text} (点击绑定工作区)`);
}

// =========================================================
// =========================================================
// 7. 右栏：开源雷达 (去噪极简卡片，向右侧弹出锚定 Inspector 详情浮窗)
// =========================================================
function renderRadar() {
  if (!radarStreamContainer) return;
  const radarItems = (store.techRadar && store.techRadar.length > 0) ? store.techRadar : HARDCORE_TECH_RADAR;
  radarStreamContainer.innerHTML = '';

  radarItems.forEach(item => {
    const isSelected = currentRightPopoverItemId === item.id;
    const card = document.createElement('div');
    card.className = `radar-chinese-card ${isSelected ? 'card-selected' : ''}`;
    card.setAttribute('data-id', item.id);

    card.innerHTML = `
      <div class="radar-card-top-row">
        <span class="radar-muted-tag">${escapeHtml(item.tag)}</span>
        <span class="radar-metric-value">${escapeHtml(item.metricNum)}</span>
      </div>
      <div class="radar-card-title">${escapeHtml(item.shortTitle || item.title)}</div>
      <div class="radar-card-sub">${escapeHtml(item.hook)}</div>
    `;

    // 点击卡片：向右侧外弹出锚定详情浮窗 (绝不向中栏覆盖)
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      openRightPopover(item, card);
    });

    radarStreamContainer.appendChild(card);
  });
}

// 换一批开源雷达推荐（将前面一批轮换到后方，呈现崭新 4 组推荐）
function refreshTechRadar() {
  if (!store.techRadar || store.techRadar.length === 0) {
    store.techRadar = [...HARDCORE_TECH_RADAR];
  }
  if (store.techRadar.length > 1) {
    const rotateCount = Math.min(4, store.techRadar.length);
    const chunk = store.techRadar.splice(0, rotateCount);
    store.techRadar.push(...chunk);
  }
  saveCurrentStore();
  renderRadar();

  if (btnRefreshRadar) {
    const icon = btnRefreshRadar.querySelector('.radar-refresh-icon');
    if (icon) {
      icon.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 400);
    }
  }
  showToast('已换一批开源雷达推荐');
}

function openRightPopover(item, cardEl) {
  if (!rightDetailPopover || !rightPopoverContent) return;

  // 如果点击的是已经打开的同一个雷达项目，则收起浮窗
  if (currentRightPopoverItemId === item.id && rightDetailPopover.style.display !== 'none') {
    closeRightPopover();
    return;
  }

  // 关闭左侧项目浮窗，保持单侧聚焦
  closeLeftPopover();

  const isAlreadyOpen = (rightDetailPopover.style.display !== 'none');
  currentRightPopoverItemId = item.id;

  // 高亮当前雷达卡片
  document.querySelectorAll('.radar-chinese-card').forEach(el => el.classList.remove('card-selected'));
  if (cardEl) cardEl.classList.add('card-selected');

  // 浮窗头部
  rightPopoverTag.textContent = item.tag;
  rightPopoverTitle.textContent = item.shortTitle || item.title;

  const renderContent = () => {
    rightPopoverContent.innerHTML = `
      <div class="inspector-meta-bar">
        <span class="inspector-metric-pill">${escapeHtml(item.metricNum)}</span>
        <span class="inspector-meta-dot">·</span>
        <span class="inspector-meta-item">${escapeHtml(item.metricLabel)}</span>
        <span class="inspector-meta-dot">·</span>
        <span class="inspector-meta-item">★ ${escapeHtml(item.stars)} · GitHub</span>
      </div>

      <div class="inspector-divider"></div>

      <div class="inspector-quote">
        “${escapeHtml(item.douyinQuote || item.hook)}”
      </div>

      <div class="inspector-divider"></div>

      <div class="inspector-points-list">
        <div class="inspector-point-item">
          <span class="inspector-bullet red">●</span>
          <div class="inspector-point-body">
            <div class="inspector-point-label">痛点根因</div>
            <div class="inspector-point-text">${escapeHtml(item.pain)}</div>
          </div>
        </div>
        <div class="inspector-point-item">
          <span class="inspector-bullet green">●</span>
          <div class="inspector-point-body">
            <div class="inspector-point-label">处方解法</div>
            <div class="inspector-point-text">${escapeHtml(item.cure)}</div>
          </div>
        </div>
      </div>

      <div class="inspector-actions-row">
        <button class="btn-apple-action primary" id="btn-pop-gh">在 GitHub 查看 ↗</button>
        <button class="btn-apple-action secondary" id="btn-pop-track">+ 追踪待办</button>
      </div>
    `;

    const btnGh = rightPopoverContent.querySelector('#btn-pop-gh');
    if (btnGh) {
      btnGh.addEventListener('click', () => {
        window.desktopAPI.openExternalUrl(item.url);
      });
    }

    const btnTrack = rightPopoverContent.querySelector('#btn-pop-track');
    if (btnTrack) {
      btnTrack.addEventListener('click', () => {
        const taskText = `[调研] ${item.shortTitle || item.title}`;
        const targetProj = store.projects.length > 0 ? store.projects[0] : { id: 'p35', code: 'P35' };
        store.tasks.push({
          id: `t-${Date.now()}`,
          text: taskText,
          projectId: targetProj.id,
          projectCode: targetProj.code,
          completed: false,
          createdAt: new Date().toISOString()
        });
        saveCurrentStore();
        renderTasks();
        updateInputProgress();
        showToast(`已添加追踪待办: ${item.shortTitle || item.title}`);
      });
    }
  };

  if (isAlreadyOpen) {
    rightPopoverContent.classList.add('switching');
    clearTimeout(popoverSwitchTimer);
    popoverSwitchTimer = setTimeout(() => {
      renderContent();
      positionRightPopover(cardEl);
      rightPopoverContent.classList.remove('switching');
    }, 120);
  } else {
    renderContent();
    rightDetailPopover.style.display = 'flex';
    positionRightPopover(cardEl);
  }
}

function positionRightPopover(cardEl) {
  if (!rightDetailPopover) return;
  rightDetailPopover.style.right = '6px';
  rightDetailPopover.style.left = 'auto';
  rightDetailPopover.style.top = '0';
}

function closeRightPopover() {
  currentRightPopoverItemId = null;
  if (rightDetailPopover) {
    rightDetailPopover.style.display = 'none';
  }
  document.querySelectorAll('.radar-chinese-card').forEach(el => el.classList.remove('card-selected'));
}

// 辅助：字节大小格式化
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// =========================================================
// 8. 晚间复盘审阅官 & 20:30 GitHub 开源雷达定时器 (路线 B)
// =========================================================
// 点击「20:30 复盘」：直接进入「复盘中」状态并提前执行复盘 (拉取今日 GitHub 热门)，
// 不弹出审计模态框；复盘完成后按钮短暂显示「已复盘」再回落到常规状态。
async function startTwilightReview() {
  if (twilightReviewing) {
    showToast('复盘进行中，请稍候...');
    return;
  }
  twilightReviewing = true;
  btnTwilightAudit.classList.add('auditing');
  twilightStatusText.textContent = '复盘中...';

  try {
    await autoFetchRadarAtTwilight(true);

    // 记录今日已完成复盘，20:30 定时器当天不再重复触发
    if (!store.settings) store.settings = {};
    const todayStr = new Date().toISOString().split('T')[0];
    store.settings.lastRadarFetchDate = todayStr;
    await saveCurrentStore();

    btnTwilightAudit.classList.remove('auditing');
    btnTwilightAudit.classList.add('done');
    twilightStatusText.textContent = '已复盘';
    showToast('✅ 复盘完成，今日 GitHub 热门已刷新');
  } catch (err) {
    console.error('Twilight review error:', err);
    btnTwilightAudit.classList.remove('auditing');
    twilightStatusText.textContent = '20:30 复盘';
    showToast(`复盘异常: ${err.message || '未知错误'}`);
  } finally {
    twilightReviewing = false;
    setTimeout(() => {
      if (!twilightReviewing) {
        btnTwilightAudit.classList.remove('done');
        checkTwilightStatus();
      }
    }, 3000);
  }
}

function checkTwilightStatus() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const twilightMinutes = 20 * 60 + 30;
  const todayStr = now.toISOString().split('T')[0];

  if (currentMinutes >= twilightMinutes) {
    btnTwilightAudit.classList.add('glowing');
    twilightStatusText.textContent = '20:30 复盘就绪';

    // 每日 20:30 自动定时抓取 GitHub 官方开源雷达 (每天严格只执行 1 次，绝不频繁轮询)
    if (!store.settings) store.settings = {};
    if (store.settings.lastRadarFetchDate !== todayStr) {
      store.settings.lastRadarFetchDate = todayStr;
      saveCurrentStore();
      autoFetchRadarAtTwilight(false);
    }
  } else {
    btnTwilightAudit.classList.remove('glowing');
    twilightStatusText.textContent = '20:30 复盘';
  }
}

// 自动/定时/测试拉取 GitHub 官方开源雷达 (路线 B)
async function autoFetchRadarAtTwilight(forceFeedback = false) {
  if (forceFeedback) showToast('正在从 GitHub 官方接口拉取开源热门...');
  try {
    const res = await window.desktopAPI.fetchGitHubRadar();
    if (res && res.success && res.items && res.items.length > 0) {
      const existingUrls = new Set(res.items.map(i => i.url));
      const merged = [...res.items];
      (store.techRadar || HARDCORE_TECH_RADAR).forEach(it => {
        if (!existingUrls.has(it.url)) {
          merged.push(it);
        }
      });
      store.techRadar = merged.slice(0, 20);
      await saveCurrentStore();
      renderRadar();

      const remaining = res.rateLimit && res.rateLimit.remaining !== null ? res.rateLimit.remaining : '充足';
      if (forceFeedback) {
        showToast(`✅ 已获取最新 GitHub 热门 (Search配额剩余: ${remaining}/30)`);
      } else {
        showToast(`🌙 20:30 暮色定时：已自动拉取今日 GitHub 热门 (Search配额剩余: ${remaining}/30)`);
      }
      updateRadarBadgeStatus(res);
      return res;
    } else if (res && !res.success && forceFeedback) {
      showToast(`拉取失败: ${res.error || '未知网络问题'}`);
    }
  } catch (err) {
    console.error('Fetch GitHub radar error:', err);
    if (forceFeedback) showToast(`拉取异常: ${err.message}`);
  }
}

async function updateRadarBadgeStatus(rateInfo) {
  if (!radarBadgeStatus) return;
  try {
    let info = rateInfo;
    if (!info || !info.rateLimit) {
      info = await window.desktopAPI.getGitHubRateLimit();
    }
    if (info && info.hasToken) {
      radarBadgeStatus.textContent = 'Token已连接';
      radarBadgeStatus.style.color = '#0284c7';
      radarBadgeStatus.title = '官方 Token 模式已启用 (每日 20:30 定时抓取)';
    } else {
      radarBadgeStatus.textContent = '神级推荐';
      radarBadgeStatus.title = '点击配置 GitHub 官方 Token 开启每日 20:30 定时抓取';
    }
  } catch (e) {}
}

async function openRadarConfigModal() {
  if (!modalRadarConfig) return;
  closeAllModals();

  if (inputGithubToken) {
    inputGithubToken.value = (store.settings && store.settings.githubToken) ? store.settings.githubToken : '';
  }

  modalRadarConfig.classList.add('open');
  if (window.desktopAPI && window.desktopAPI.setModalActive) {
    window.desktopAPI.setModalActive(true);
  }

  // 动态读取最新配额信息
  if (tokenSourceHint) {
    tokenSourceHint.textContent = '正在检测 GitHub 接口配额...';
    tokenSourceHint.style.color = '#64748b';
  }

  try {
    const info = await window.desktopAPI.getGitHubRateLimit();
    if (info && info.success) {
      if (radarQuotaSearch) radarQuotaSearch.textContent = `${info.searchRate.remaining} / ${info.searchRate.limit} 次/分钟`;
      if (radarQuotaCore) radarQuotaCore.textContent = `${info.coreRate.remaining} / ${info.coreRate.limit} 次/小时`;

      let srcText = '未配置 Token (匿名请求，受 60 次/小时限制)';
      if (info.tokenSource === 'user_setting') srcText = '✓ 当前使用手动配置的 GitHub Personal Access Token';
      else if (info.tokenSource === 'gh_cli') srcText = '✓ 已自动无感绑定本机 GitHub CLI 登录凭据 (免配置)';
      else if (info.tokenSource === 'env_var') srcText = '✓ 当前使用系统环境变量 GITHUB_TOKEN';

      if (tokenSourceHint) {
        tokenSourceHint.textContent = srcText;
        tokenSourceHint.style.color = info.hasToken ? '#059669' : '#d97706';
      }
    } else if (tokenSourceHint) {
      tokenSourceHint.textContent = `检测异常: ${info.error || '无法连接 GitHub'}`;
      tokenSourceHint.style.color = '#dc2626';
    }
  } catch (e) {
    if (tokenSourceHint) tokenSourceHint.textContent = `检测异常: ${e.message}`;
  }

  if (radarScheduleStatus) {
    const lastDate = store.settings?.lastRadarFetchDate;
    const today = new Date().toISOString().split('T')[0];
    if (lastDate === today) {
      radarScheduleStatus.textContent = '今天已在 20:30 完成自动拉取 (已消耗 1 次，永不超额)';
    } else {
      radarScheduleStatus.textContent = '每日 20:30 自动执行 (今天待触发，仅消耗 1 次)';
    }
  }
}

function openDailyAuditModal() {
  const todayTrophies = store.trophies;
  const doneCount = todayTrophies.length;
  const focusCount = store.tasks.slice(0, 3).length;
  const rate = (doneCount + focusCount === 0) ? 100 : Math.round((doneCount / (doneCount + focusCount)) * 100);

  auditStatDone.textContent = doneCount;
  auditStatRate.textContent = `${rate}%`;
  auditStatTrophies.textContent = todayTrophies.length;

  auditProjectBreakdown.innerHTML = '';
  store.projects.forEach(proj => {
    const projTrophies = todayTrophies.filter(t => t.projectCode === proj.code);
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '4px 0';
    row.style.fontSize = '10px';

    row.innerHTML = `
      <span style="color:var(--text-main);font-weight:500;">#${escapeHtml(proj.code)} ${escapeHtml(proj.name)}</span>
      <span style="color:${projTrophies.length > 0 ? 'var(--text-emerald)' : 'var(--text-muted)'};">
        ${projTrophies.length > 0 ? `完成 ${projTrophies.length} 项` : '今日暂无完成'}
      </span>
    `;
    auditProjectBreakdown.appendChild(row);
  });

  modalDailyAudit.classList.add('open');
  if (window.desktopAPI && window.desktopAPI.setModalActive) {
    window.desktopAPI.setModalActive(true);
  }
}

// 轻量 Toast 提示
function showToast(msg, duration = 2200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, duration);
}

// 启动入口
document.addEventListener('DOMContentLoaded', init);
