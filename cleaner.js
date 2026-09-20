const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getDirSizeBytes(dirPath) {
  let total = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const f of files) {
      const full = path.join(dirPath, f.name);
      if (f.isDirectory()) {
        total += getDirSizeBytes(full);
      } else if (f.isFile()) {
        total += fs.statSync(full).size;
      }
    }
  } catch (e) {
    // ignore
  }
  return total;
}

// 提取文件名中的版本元数据
function extractVersionMeta(filename) {
  const lower = filename.toLowerCase();

  // 0. 模型特征关键字识别
  if (lower.startsWith('best.') || lower.includes('_best.') || lower.includes('-best.')) {
    return { hasVersion: true, isBestModel: true, weight: -1, isExplicitStable: true };
  }
  if (lower.startsWith('last.') || lower.includes('_last.') || lower.includes('-last.')) {
    return { hasVersion: true, isLastModel: true, weight: 999999999, isExplicitLatest: true };
  }
  if (lower === 'store.backup.json' || lower.startsWith('initial_') || lower.includes('_stable.')) {
    return { hasVersion: true, isBaseline: true, weight: -1, isExplicitStable: true };
  }

  // 1. 常见 SemVer: v1.0.0, 1.2.3, v0.1.2-beta, 1.0.0.1
  const semverMatch = filename.match(/(?:v|version)?(\d+)\.(\d+)(?:\.(\d+))?(?:[.-]([a-zA-Z0-9]+))?/i);
  if (semverMatch) {
    const major = parseInt(semverMatch[1], 10) || 0;
    const minor = parseInt(semverMatch[2], 10) || 0;
    const patch = parseInt(semverMatch[3], 10) || 0;
    const prerelease = semverMatch[4] ? semverMatch[4].toLowerCase() : '';
    // 数值权重：主版本*100万 + 次版本*1000 + 修订号
    const weight = major * 1000000 + minor * 1000 + patch;
    return {
      hasVersion: true,
      rawVersion: semverMatch[0],
      weight,
      major, minor, patch,
      isPrerelease: Boolean(prerelease),
      isExplicitStable: /stable|lts|release|ga/i.test(filename)
    };
  }

  // 2. 日期戳格式: 2026-09-18, 20260918, 2026_09_18
  const dateMatch = filename.match(/20\d{2}[-_.]?(?:0[1-9]|1[0-2])[-_.]?(?:0[1-9]|[12]\d|3[01])/);
  if (dateMatch) {
    const rawDate = dateMatch[0].replace(/[-_.]/g, '');
    const weight = parseInt(rawDate, 10) || 0;
    return {
      hasVersion: true,
      rawVersion: dateMatch[0],
      weight,
      isDate: true,
      isExplicitStable: /stable|backup|init|base/i.test(filename)
    };
  }

  // 3. Epoch / Iteration 编号: epoch_10, epoch-20, iter_500, checkpoint-1000
  const epochMatch = filename.match(/(?:epoch|iter|checkpoint|step)[-_]?(\d+)/i);
  if (epochMatch) {
    const weight = parseInt(epochMatch[1], 10) || 0;
    return {
      hasVersion: true,
      rawVersion: epochMatch[0],
      weight,
      isEpoch: true,
      isExplicitStable: false
    };
  }

  return { hasVersion: false };
}

// 绝对安全红线：绝不能作为清理候选的目标扩展名与目录名
const FORBIDDEN_EXTS = new Set([
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
  '.py', '.pyw',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue', '.html', '.css', '.scss', '.less',
  '.java', '.go', '.rs', '.sh', '.bat', '.cmd', '.ps1',
  '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg',
  '.md', '.markdown', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.uvprojx', '.uvoptx', '.uvmpw', '.sln', '.vcxproj', '.pbxproj'
]);

const FORBIDDEN_DIR_NAMES = new Set([
  '.git', '.svn', '.hg', '.vscode', '.idea', 'venv', '.env', 'env'
]);

// 编译中间输出与缓存目录
const PURE_JUNK_DIRS = {
  '.next': 'Next.js 编译中间缓存',
  '.nuxt': 'Nuxt.js 编译中间缓存',
  '__pycache__': 'Python 字节码缓存',
  '.gradle': 'Gradle 构建缓存',
  '.cache': '项目开发中间缓存',
  '.archive': '历史安全归档隔离残留',
  '.cxx': 'C++ 编译中间缓存',
  'cmake-build-debug': 'CMake 调试编译缓存',
  'cmake-build-release': 'CMake 发布编译缓存'
};

// 编译中间临时文件扩展名
const JUNK_EXTS = {
  '.tmp': '临时中间文件',
  '.bak': '旧版备份残留',
  '.swp': '编辑器交换文件',
  '.log': '运行日志文件',
  '.axf': 'Keil/ARM 调试可执行文件',
  '.crf': 'Keil 交叉引用中间件',
  '.o': '编译目标目标文件 (Object)',
  '.obj': '编译目标中间文件 (Object)',
  '.d': '头文件依赖关系中间件',
  '.dep': '依赖关系中间件',
  '.build_log.htm': 'Keil 构建日志文件'
};

// 常见版本化文件扩展名
const VERSIONED_EXTS = new Set([
  '.pt', '.pth', '.ckpt', '.onnx', '.safetensors', // 模型
  '.exe', '.zip', '.tar.gz', '.tgz', '.whl', '.apk', '.msi', '.7z', // 安装包与归档
  '.hex', '.bin', // 固件
  '.json' // 仅用于备份目录下的版本快照
]);

/**
 * 核心：多层受限深度扫描与版本族群聚类分析
 */
async function deepScanAndClusterWorkspaces(workspacePaths, maxDepth = 4) {
  if (!Array.isArray(workspacePaths) || workspacePaths.length === 0) {
    return { success: true, items: [] };
  }

  const items = [];

  for (const wsPath of workspacePaths) {
    if (!wsPath || typeof wsPath !== 'string' || !fs.existsSync(wsPath)) continue;
    const wsName = path.basename(wsPath);

    // 目录内的版本文件收集表：dirPath -> Array<FileItem>
    const versionedFilesByDir = new Map();

    function walk(currentDir, currentDepth) {
      if (currentDepth > maxDepth) return;

      let entries;
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const ent of entries) {
        const name = ent.name;
        const fullPath = path.join(currentDir, name);
        const lowerName = name.toLowerCase();

        // 1. 跳过黑名单保留目录
        if (ent.isDirectory()) {
          if (FORBIDDEN_DIR_NAMES.has(lowerName)) continue;

          // 特殊支持：node_modules 中的 .cache 缓存
          if (lowerName === 'node_modules') {
            const nmCache = path.join(fullPath, '.cache');
            if (fs.existsSync(nmCache)) {
              const sz = getDirSizeBytes(nmCache);
              items.push({
                id: nmCache,
                name: 'node_modules/.cache',
                fullPath: nmCache,
                relativePath: path.relative(wsPath, nmCache),
                size: sz,
                sizeFormatted: formatBytes(sz),
                category: '前端依赖包中间缓存',
                versionRole: 'junk',
                isProtected: false,
                roleLabel: '🧹 依赖缓存',
                roleDesc: 'node_modules 编译缓存，可随时自动重建',
                workspacePath: wsPath,
                workspaceName: wsName
              });
            }
            continue; // 不再递归 node_modules 内部
          }

          // 纯垃圾目录（如 cmake-build-debug, __pycache__, .gradle）整目录收纳
          if (PURE_JUNK_DIRS[lowerName]) {
            const sz = getDirSizeBytes(fullPath);
            items.push({
              id: fullPath,
              name,
              fullPath,
              relativePath: path.relative(wsPath, fullPath) || name,
              size: sz,
              sizeFormatted: formatBytes(sz),
              category: PURE_JUNK_DIRS[lowerName],
              versionRole: 'junk',
              isProtected: false,
              roleLabel: '🧹 编译中间产物',
              roleDesc: '工程编译调试缓存目录，重新构建时会自动生成',
              workspacePath: wsPath,
              workspaceName: wsName
            });
            continue; // 不再深入
          }

          // 常规 build / dist / out / target 目录：
          // 若为顶层或深层的编译目录，先检查里面是否有版本安装包或固件；如果有，深入按版本聚类；如果没有，直接整包收纳
          if (['dist', 'build', 'out', 'target'].includes(lowerName)) {
            // 深入一层探查
            walk(fullPath, currentDepth + 1);
            continue;
          }

          // 常规子目录继续递归
          walk(fullPath, currentDepth + 1);
        } else if (ent.isFile()) {
          const ext = path.extname(name).toLowerCase();

          // 核心安全红线：严格忽略所有源码与配置文件
          if (FORBIDDEN_EXTS.has(ext)) {
            continue;
          }
          if (name === 'package.json' || name === 'CMakeLists.txt' || name === 'Makefile') {
            continue;
          }
          if (ext === '.json') {
            // 仅对备份目录或明确包含日期/backup特征的 json 纳入版本聚类
            const isBackupJson = currentDir.toLowerCase().includes('backup') || 
                                 name.includes('backup') || 
                                 /20\d{2}[-_.]\d{2}[-_.]\d{2}/.test(name);
            if (!isBackupJson) {
              continue;
            }
          }

          // 检查纯垃圾扩展名 (Keil .axf, .crf, .o, .tmp, .bak)
          if (JUNK_EXTS[ext] || name.endsWith('.build_log.htm')) {
            const stats = fs.statSync(fullPath);
            items.push({
              id: fullPath,
              name,
              fullPath,
              relativePath: path.relative(wsPath, fullPath) || name,
              size: stats.size,
              sizeFormatted: formatBytes(stats.size),
              category: JUNK_EXTS[ext] || '构建日志文件',
              versionRole: 'junk',
              isProtected: false,
              roleLabel: '🧹 编译中间产物',
              roleDesc: '编译生成的链接目标或临时文件，可安全清理',
              workspacePath: wsPath,
              workspaceName: wsName
            });
            continue;
          }

          // 检查是否为多版本文件（模型、安装包、固件、备份快照）
          if (VERSIONED_EXTS.has(ext)) {
            const stats = fs.statSync(fullPath);
            const vMeta = extractVersionMeta(name);
            if (!versionedFilesByDir.has(currentDir)) {
              versionedFilesByDir.set(currentDir, []);
            }
            versionedFilesByDir.get(currentDir).push({
              name,
              fullPath,
              relativePath: path.relative(wsPath, fullPath) || name,
              size: stats.size,
              sizeFormatted: formatBytes(stats.size),
              mtimeMs: stats.mtimeMs,
              ext,
              vMeta,
              workspacePath: wsPath,
              workspaceName: wsName
            });
          }
        }
      }
    }

    walk(wsPath, 0);

    // 2. 对收集到的版本化文件进行族群聚类与角色划分 (Version Family Clustering)
    for (const [dirPath, fileList] of versionedFilesByDir.entries()) {
      // 按照文件前缀类型归类（例如 .pt 模型为一组，.exe 为一组，.hex 为一组）
      const familyGroups = new Map();

      for (const file of fileList) {
        let groupKey;
        if (['.pt', '.pth', '.ckpt', '.onnx'].includes(file.ext)) {
          groupKey = 'model_weights';
        } else if (file.ext === '.hex' || file.ext === '.bin') {
          groupKey = 'firmware_files';
        } else if (file.ext === '.json') {
          groupKey = 'backup_snapshots';
        } else {
          // 安装包/压缩包：提取应用前缀名
          const basePrefix = file.name.replace(/(?:[-_.]v?|\b)\d+.*$/i, '') || 'release_package';
          groupKey = `${basePrefix}_${file.ext}`;
        }

        if (!familyGroups.has(groupKey)) {
          familyGroups.set(groupKey, []);
        }
        familyGroups.get(groupKey).push(file);
      }

      for (const [groupKey, groupFiles] of familyGroups.entries()) {
        clusterFamilyFiles(groupFiles, groupKey, dirPath, wsPath, wsName, items);
      }
    }
  }

  return { success: true, items };
}

/**
 * 对同一族群的文件进行智能版本定级：
 * - 稳定版 (Stable): 🛡️ 黄金基准（best.pt、最低正式版本号、明确标记 stable/baseline），受保护
 * - 最新版 (Latest): 🛡️ 最新产物（last.pt、最高版本号、最新修改时间），受保护
 * - 中间版本 (Intermediate): ⚠️ 位于两端之间的过渡版本/测试包/中间 epoch，可安全清理
 */
function clusterFamilyFiles(files, groupKey, dirPath, wsPath, wsName, outputItems) {
  if (!files || files.length === 0) return;

  const familyId = `${dirPath}::${groupKey}`;
  const relDir = path.relative(wsPath, dirPath) || path.basename(dirPath);

  // 族群中文名定义
  let familyCategory = '多版本文件族群';
  if (groupKey === 'model_weights') familyCategory = `AI 模型断点族群 (${relDir})`;
  else if (groupKey === 'firmware_files') familyCategory = `嵌入式固件版本族群 (${relDir})`;
  else if (groupKey === 'backup_snapshots') familyCategory = `数据备份快照族群 (${relDir})`;
  else familyCategory = `发布安装包族群 (${relDir})`;

  // 单文件情况：唯一的活跃文件，强制保护
  if (files.length === 1) {
    const single = files[0];
    outputItems.push({
      id: single.fullPath,
      name: single.name,
      fullPath: single.fullPath,
      relativePath: single.relativePath,
      size: single.size,
      sizeFormatted: single.sizeFormatted,
      category: familyCategory,
      familyId,
      versionRole: 'latest',
      isProtected: true,
      roleLabel: '🛡️ 最新版 (唯一活跃文件)',
      roleDesc: '当前目录下唯一的活跃版本，已自动保护保留',
      workspacePath: wsPath,
      workspaceName: wsName
    });
    return;
  }

  // 2 个文件情况：一个为稳定版，一个为最新版，两者均受保护
  if (files.length === 2) {
    // 寻找是否有明确的 best/stable
    let stableIdx = files.findIndex(f => f.vMeta.isBestModel || f.vMeta.isBaseline || f.vMeta.isExplicitStable);
    if (stableIdx === -1) {
      // 依权重或时间排序：较早的为 stable，较新的为 latest
      stableIdx = (files[0].vMeta.weight || files[0].mtimeMs) <= (files[1].vMeta.weight || files[1].mtimeMs) ? 0 : 1;
    }
    const latestIdx = stableIdx === 0 ? 1 : 0;

    outputItems.push({
      id: files[stableIdx].fullPath,
      name: files[stableIdx].name,
      fullPath: files[stableIdx].fullPath,
      relativePath: files[stableIdx].relativePath,
      size: files[stableIdx].size,
      sizeFormatted: files[stableIdx].sizeFormatted,
      category: familyCategory,
      familyId,
      versionRole: 'stable',
      isProtected: true,
      roleLabel: '🛡️ 稳定版 (基准版本)',
      roleDesc: '族群中的基础稳定版本，已自动保护保留',
      workspacePath: wsPath,
      workspaceName: wsName
    });

    outputItems.push({
      id: files[latestIdx].fullPath,
      name: files[latestIdx].name,
      fullPath: files[latestIdx].fullPath,
      relativePath: files[latestIdx].relativePath,
      size: files[latestIdx].size,
      sizeFormatted: files[latestIdx].sizeFormatted,
      category: familyCategory,
      familyId,
      versionRole: 'latest',
      isProtected: true,
      roleLabel: '🛡️ 最新版 (活跃版本)',
      roleDesc: '族群中的最新活跃版本，已自动保护保留',
      workspacePath: wsPath,
      workspaceName: wsName
    });
    return;
  }

  // 3 个及以上文件：识别出两端的 Stable 与 Latest，其余全部归为 Intermediate (中间版本)
  let stableFile = null;
  let latestFile = null;

  // 1. 优先根据模型命名规范定位
  if (groupKey === 'model_weights') {
    stableFile = files.find(f => f.vMeta.isBestModel);
    latestFile = files.find(f => f.vMeta.isLastModel);
  } else if (groupKey === 'backup_snapshots') {
    stableFile = files.find(f => f.vMeta.isBaseline);
  }

  // 2. 若未明确指定，按照 (vMeta.weight 或 mtimeMs) 进行数值升序排序
  const sorted = [...files].sort((a, b) => {
    if (a.vMeta.weight !== undefined && b.vMeta.weight !== undefined && a.vMeta.weight !== b.vMeta.weight) {
      return a.vMeta.weight - b.vMeta.weight;
    }
    return a.mtimeMs - b.mtimeMs;
  });

  if (!stableFile) {
    // 首个正式版或排序最小版本
    stableFile = sorted[0];
  }
  if (!latestFile) {
    // 排序最大（最新）版本
    latestFile = sorted[sorted.length - 1];
    // 避免与 stableFile 重叠
    if (latestFile === stableFile && sorted.length > 1) {
      latestFile = sorted[sorted.length - 1];
    }
  }

  for (const file of files) {
    if (file === stableFile) {
      outputItems.push({
        id: file.fullPath,
        name: file.name,
        fullPath: file.fullPath,
        relativePath: file.relativePath,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        category: familyCategory,
        familyId,
        versionRole: 'stable',
        isProtected: true,
        roleLabel: '🛡️ 稳定版 (基准指标)',
        roleDesc: '族群黄金稳定基准（最高评估分/首次正式发布），已自动保护保留',
        workspacePath: wsPath,
        workspaceName: wsName
      });
    } else if (file === latestFile) {
      outputItems.push({
        id: file.fullPath,
        name: file.name,
        fullPath: file.fullPath,
        relativePath: file.relativePath,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        category: familyCategory,
        familyId,
        versionRole: 'latest',
        isProtected: true,
        roleLabel: '🛡️ 最新版 (续训/最新发布)',
        roleDesc: '族群最新生成版本（断点续训恢复必备/最高发行版），已自动保护保留',
        workspacePath: wsPath,
        workspaceName: wsName
      });
    } else {
      // 中间过渡版本
      outputItems.push({
        id: file.fullPath,
        name: file.name,
        fullPath: file.fullPath,
        relativePath: file.relativePath,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        category: familyCategory,
        familyId,
        versionRole: 'intermediate',
        isProtected: false,
        roleLabel: '⚠️ 中间过渡版本',
        roleDesc: '夹在稳定版与最新版之间的历史过渡产物/中间 epoch，可安全清理',
        workspacePath: wsPath,
        workspaceName: wsName
      });
    }
  }
}

/**
 * 安全清理执行：优先送入 Windows 回收站，支持一键还原
 */
function isPathStrictlyInside(rootPath, candidatePath) {
  const root = path.resolve(rootPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

async function safeTrashOrDelete(itemPath, allowedRoots = [], allowProtected = false) {
  if (!itemPath || typeof itemPath !== 'string' || !fs.existsSync(itemPath)) {
    return { success: false, error: '文件不存在' };
  }

  const normPath = path.resolve(itemPath);

  // 1. 安全边界检查：必须严格位于目标工作区内部
  if (allowedRoots.length > 0) {
    const isInside = allowedRoots.some(root => isPathStrictlyInside(root, normPath));
    if (!isInside) {
      return { success: false, error: '未授权路径，禁止删除' };
    }
  }

  // 2. 安全红线：严防误删源码与核心配置文件，以及系统保护的黄金稳定版与最新版
  const base = path.basename(normPath);
  const ext = path.extname(base).toLowerCase();
  if (base === '.git' || FORBIDDEN_EXTS.has(ext) || base === 'package.json' || base === 'CMakeLists.txt') {
    return { success: false, error: '命中源码与工程配置白名单保护，拒绝删除' };
  }

  // 保护黄金稳定版与最新版特征（防止误勾选或前端异常传参误伤）
  const lowerBase = base.toLowerCase();
  if (!allowProtected) {
    if (lowerBase.startsWith('best.') || lowerBase.includes('_best.') || 
        lowerBase.startsWith('last.') || lowerBase.includes('_last.') || 
        lowerBase === 'store.backup.json') {
      return { success: false, error: '该文件为受系统保护的稳定版/最新版，拒绝清理' };
    }
  }

  const stats = fs.statSync(normPath);
  const sz = stats.isDirectory() ? getDirSizeBytes(normPath) : stats.size;

  let electronShell = null;
  try {
    electronShell = require('electron').shell;
  } catch (e) {}

  if (!electronShell || typeof electronShell.trashItem !== 'function') {
    return { success: false, error: '系统回收站不可用，未执行清理' };
  }

  try {
    await electronShell.trashItem(normPath);
  } catch (trashErr) {
    console.warn(`[Clean] shell.trashItem failed for ${normPath}:`, trashErr);
    return { success: false, error: `移入系统回收站失败: ${trashErr.message || trashErr}` };
  }

  return {
    success: true,
    size: sz,
    sizeFormatted: formatBytes(sz),
    trashed: true,
    name: base,
    path: normPath
  };
}

module.exports = {
  formatBytes,
  getDirSizeBytes,
  extractVersionMeta,
  deepScanAndClusterWorkspaces,
  safeTrashOrDelete
};
