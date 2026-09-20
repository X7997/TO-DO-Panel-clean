/**
 * TO-DO Panel 全局快速录入待办脚本 (支持红队审查元数据、方案备忘与逐个击破子任务)
 * 供任何 AI Agent、外部脚本或命令行直接调用：
 * 
 * 用法 1 (命令行位置参数):
 *   node Q:\Todo\scripts\add-task.js "任务内容" [项目代号，如 P34] [自定义路径] [方案备忘 planNotes] [子任务JSON]
 * 
 * 用法 2 (红队审查结构化模式 --json):
 *   node Q:\Todo\scripts\add-task.js --json "{\"text\":\"[P1] 优化居中\",\"projectCode\":\"SmartIsland\",\"planNotes\":\"...\",\"subtasks\":[\"步骤1\",\"步骤2\"]}"
 * 
 * 用法 3 (文件读取模式 --file):
 *   node Q:\Todo\scripts\add-task.js --file "path/to/payload.json"
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'store.json');

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    console.error('用法: node add-task.js "任务内容" [项目代号] [关联路径] [方案思路] [子任务JSON]');
    console.error('或:   node add-task.js --json \'{"text":"...", "projectCode":"...", "planNotes":"...", "subtasks":["..."]}\'');
    process.exit(1);
  }

  // 模式 1: --json 字符串传参
  if (rawArgs[0] === '--json') {
    const jsonStr = rawArgs.slice(1).join(' ').trim();
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('错误: 解析 --json 参数失败:', e.message);
      process.exit(1);
    }
  }

  // 模式 2: --file 载荷文件传参
  if (rawArgs[0] === '--file' && rawArgs[1]) {
    const filePath = rawArgs[1];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('错误: 读取 --file 载荷文件失败:', e.message);
      process.exit(1);
    }
  }

  // 模式 3: 常规位置参数
  const text = rawArgs[0].trim();
  const projectCode = rawArgs[1] ? rawArgs[1].trim().toUpperCase() : null;
  const customPath = rawArgs[2] ? rawArgs[2].trim() : null;
  const planNotes = rawArgs[3] ? rawArgs[3].trim() : '';
  let subtasks = [];
  if (rawArgs[4]) {
    try {
      subtasks = JSON.parse(rawArgs[4]);
    } catch (e) {
      // 容错：如果是逗号分隔字符串
      subtasks = rawArgs[4].split(/[,，]/).map(s => s.trim()).filter(Boolean);
    }
  }

  return { text, projectCode, customPath, planNotes, subtasks };
}

function main() {
  const payload = parseArgs();
  const taskText = (payload.text || '').trim();
  if (!taskText) {
    console.error('错误: 任务内容不能为空');
    process.exit(1);
  }

  const projectCodeInput = payload.projectCode ? payload.projectCode.trim().toUpperCase() : null;
  const customPathInput = payload.customPath ? payload.customPath.trim() : null;
  const planNotesInput = payload.planNotes ? payload.planNotes.trim() : '';
  const rawSubtasks = Array.isArray(payload.subtasks) ? payload.subtasks : [];

  let store;
  try {
    if (fs.existsSync(STORE_PATH)) {
      store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    } else {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      store = {
        projects: [],
        tasks: [],
        trophies: [],
        techRadar: [],
        settings: {
          autoCollapseOnBlur: true,
          twilightHour: 20,
          twilightMinute: 30
        },
        deletedProjectCodes: []
      };
    }
  } catch (err) {
    console.error(`解析 store.json 失败:`, err.message);
    process.exit(1);
  }

  if (!store.tasks) store.tasks = [];
  if (!store.projects) store.projects = [];

  // 匹配项目
  let matchedProject = null;
  if (projectCodeInput) {
    matchedProject = store.projects.find(p => 
      (p.code && String(p.code).toUpperCase() === projectCodeInput) ||
      (p.id && String(p.id).toUpperCase() === projectCodeInput)
    );
  }

  // 默认项目优先使用匹配项目，其次使用首个项目，最后使用当前检出目录。
  const appRoot = path.resolve(__dirname, '..');
  const defaultProj = store.projects[0] || {
    id: 'todo-panel',
    code: 'LOCAL',
    name: 'TO-DO Panel',
    path: appRoot
  };
  if (store.projects.length === 0) store.projects.push(defaultProj);
  const targetProj = matchedProject || defaultProj;

  // 格式化子任务为贴顶工作台原生标准格式
  const formattedSubtasks = rawSubtasks.map((sub, idx) => {
    if (typeof sub === 'string') {
      return {
        id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        text: sub.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
    } else if (typeof sub === 'object' && sub !== null) {
      return {
        id: sub.id || `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        text: (sub.text || '').trim(),
        completed: Boolean(sub.completed),
        createdAt: sub.createdAt || new Date().toISOString()
      };
    }
    return null;
  }).filter(Boolean);

  const newTask = {
    id: `t-${Date.now()}`,
    text: taskText,
    projectId: targetProj.id,
    projectCode: projectCodeInput || targetProj.code,
    customPath: customPathInput || targetProj.path || '',
    completed: false,
    createdAt: new Date().toISOString(),
    planNotes: planNotesInput,
    subtasks: formattedSubtasks
  };

  // 新任务置顶，优先聚焦
  store.tasks.unshift(newTask);

  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    console.log(`[TO-DO] ✓ 成功添加待办: "${newTask.text}"`);
    console.log(`[TO-DO]   归属项目: #${newTask.projectCode}`);
    console.log(`[TO-DO]   关联路径: ${newTask.customPath || '无'}`);
    if (newTask.planNotes) {
      console.log(`[TO-DO]   红队方案思路: 已写入 planNotes (${newTask.planNotes.length} 字符)`);
    }
    if (newTask.subtasks.length > 0) {
      console.log(`[TO-DO]   逐个击破子任务: 已拆解 ${newTask.subtasks.length} 项`);
      newTask.subtasks.forEach((s, i) => console.log(`[TO-DO]     [${i + 1}] ${s.text}`));
    }
    console.log(`[TO-DO]   任务ID: ${newTask.id}`);
  } catch (err) {
    console.error(`保存 store.json 失败:`, err.message);
    process.exit(1);
  }
}

main();
