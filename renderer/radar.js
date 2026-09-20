// =========================================================
// 开源雷达专属小窗口逻辑 (Right-side Radar Popout Window)
// =========================================================

const popoutStreamContainer = document.getElementById('popout-stream-container');
const btnCloseWindow = document.getElementById('btn-close-window');
const popoutToast = document.getElementById('popout-toast');

const HARDCORE_TECH_RADAR = [
  {
    id: 'r0',
    tag: 'GitHub神级补丁',
    stars: '4.6k',
    metricNum: '一键去AI味',
    metricLabel: '大厂审美规范',
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
    stars: '5.2k',
    metricNum: '60帧极速',
    metricLabel: '渐进式微交互',
    shortTitle: '页面生硬像后台？一键注入大厂顶级丝滑感！',
    hook: '拒绝 PPT 生硬翻页！渐进式披露 + 呼吸感微动效，60帧丝滑跟手不卡顿！',
    douyinQuote: '界面做出来像十年前企业后台？信息堆砌弹窗晃眼，动效要么没有要么拖沓卡死！一键注入渐进式披露与大厂设计总监级微动效规范，让你的产品交互质感瞬间翻倍！',
    pain: '信息全塞在一个界面里，用户眼花缭乱懒得看；弹窗跳来跳去遮挡主视线，动效生硬掉帧。',
    cure: '已沉淀本地知识库！严控注意力分配，鼠标悬停渐进式呈现，呼吸感平滑过渡，告别视觉轰炸。',
    url: 'https://github.com/impeccable/impeccable'
  },
  {
    id: 'r1',
    tag: '告别内存刺客',
    stars: '2.4k',
    metricNum: '6MB',
    metricLabel: '内存暴降 96%',
    shortTitle: 'Electron 吃 200MB？6MB 极客贴顶神器！',
    hook: '开个待办电脑风扇狂转、内存暴涨？纯 Win32 穿透贴顶，冷启只需 8ms，内存暴降 96%！',
    douyinQuote: '打工人必备极客工作台！Electron 动辄吃 200MB 内存还偶尔掉帧漂移？纯 Win32 贴顶微架构，开机秒起只需 8ms，常驻后台仅 6MB，呼之即来挥之即去，丝滑不占资源！',
    pain: 'Electron 庞大臃肿，开着后台风扇呼呼转，低配电脑卡顿，多开几个工程直接爆内存。',
    cure: '纯 C++ 与 Win32 原生 API 绑定，DWM 硬件级透传贴顶，内存不到 Node 的 1/20，零 GC 卡顿。',
    url: 'https://github.com/xiaopu-ai/TO-DO-Panel'
  },
  {
    id: 'r2',
    tag: '边缘AI黑科技',
    stars: '1.2k',
    metricNum: '11ms',
    metricLabel: '定点狂飙 2.5X',
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
    stars: '1.8k',
    metricNum: '28ms',
    metricLabel: '零抖动告别断音',
    shortTitle: '语音对讲总断音爆音？双工乒乓管道彻底解决！',
    hook: '轮询队列处理音频总是卡顿爆音？DMA 乒乓双缓存直通 I2S，延迟压至 28ms，双工如丝般顺滑！',
    douyinQuote: '做智能家居和语音硬件最怕什么？对讲总是断麦、爆破音、唤醒后卡半天！ESP32 DMA 乒乓双工音频流管道，毫秒级实时对讲，彻底消灭破音断音，交互像德芙一样丝滑！',
    pain: 'FreeRTOS 队列轮询处理音频流容易被其他任务抢占，导致 I2S 缓冲区欠载出现爆音与丢包。',
    cure: '纯硬件 DMA 中断级双缓冲传输，CPU 占用率低于 4%，毫秒级全双工实时语音交互。',
    url: 'https://github.com/espressif/esp-adf'
  }
];

async function initRadar() {
  btnCloseWindow.addEventListener('click', () => {
    window.desktopAPI.closeRadarWindow();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.desktopAPI.closeRadarWindow();
    }
  });

  let radarData = HARDCORE_TECH_RADAR;
  try {
    const store = await window.desktopAPI.getStore();
    if (store && store.techRadar && store.techRadar.length > 0 && store.techRadar[0].douyinQuote) {
      radarData = store.techRadar;
    }
  } catch (e) {
    console.warn('Load radar store fallback:', e);
  }

  renderRadarCards(radarData);
}

function renderRadarCards(items) {
  popoutStreamContainer.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'radar-popout-card';

    card.innerHTML = `
      <div class="card-top-bar">
        <span class="card-metric-num">${item.metricNum}</span>
        <span class="card-badge">${item.tag}</span>
      </div>

      <div class="card-title">${item.shortTitle}</div>

      <div class="card-douyin-quote">
        “${item.douyinQuote || item.hook}”
      </div>

      <div class="card-breakdown">
        <div class="card-pain"><strong>🔴 痛点：</strong>${item.pain}</div>
        <div class="card-cure"><strong>🟢 处方：</strong>${item.cure}</div>
      </div>

      <div class="card-actions">
        <button class="btn-card-gh">在 GitHub 查看 ↗</button>
        <button class="btn-card-track">+ 追踪待做</button>
      </div>
    `;

    card.querySelector('.btn-card-gh').addEventListener('click', () => {
      window.desktopAPI.openExternalUrl(item.url);
    });

    card.querySelector('.btn-card-track').addEventListener('click', async () => {
      const res = await window.desktopAPI.addRadarTask({
        text: `[调研] ${item.shortTitle}`
      });
      if (res && res.success) {
        showToast(`已添加待做: ${item.shortTitle}`);
      }
    });

    popoutStreamContainer.appendChild(card);
  });
}

function showToast(msg) {
  popoutToast.textContent = msg;
  popoutToast.className = 'popout-toast show';
  clearTimeout(popoutToast._timer);
  popoutToast._timer = setTimeout(() => {
    popoutToast.className = 'popout-toast';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', initRadar);
