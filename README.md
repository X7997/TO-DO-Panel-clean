# TO-DO Panel

基于 Electron 的 Windows 桌面任务与项目工作台。它把快速录入、活跃项目、今日任务、本周战果和开源项目雷达放在一个轻量的三栏面板中。

## 功能

- 管理项目与待办任务，支持项目关联、优先级和完成记录。
- 以白色毛玻璃样式呈现三栏工作区、项目详情和雷达详情。
- 扫描已登记工作区中的构建缓存与临时产物；用户确认后，将选中项移入 Windows 回收站。
- 只有清理实际成功后，应用才会从活跃工作区移除对应项目和未完成任务。项目源码目录保留。
- 托盘菜单支持展开面板、开机启动、置顶和退出。

## 环境要求

- Windows 10/11
- Node.js 与 npm
- PowerShell、CIM/WMI（用于独立后台启动）

## 启动

```powershell
cd Q:\Todo
npm install
npm start
```

`npm start` 会通过 `Win32_Process.Create` 启动独立的 Electron 进程；成功后命令返回，工作台继续在当前登录会话运行。首次打开时应用会启用 Windows 登录启动。

```powershell
npm stop                 # 向本应用实例发送正常退出请求
npm run start:dev        # 前台开发启动，日志留在当前终端
```

也可以双击 `scripts/start-background.vbs` 静默启动。后台启动错误会写入 `scripts/background-launch.log`。

## 清理行为

清理仅接受应用已登记的项目或在办任务工作区，并在执行前重新确认候选路径。选中的缓存或临时文件通过 Electron `shell.trashItem` 移入 Windows 回收站；回收站不可用或清理失败时会返回失败信息，不会退回到永久删除。全部选中项成功移入回收站后，关联项目和未完成任务才会从应用的活跃工作区中移除。

## 本地数据

首次保存时，应用会在 `data/store.json` 创建本地项目、任务、设置与雷达配置，并在 `data/backups/` 保留备份。这些文件已加入 Git 忽略规则；它们可能含本地路径或个人设置，请不要提交或分享。

## 目录结构

```text
Q:\Todo\
├── cleaner.js                 # 工作区扫描与回收站清理
├── main.js                    # Electron 主进程、IPC 与窗口管理
├── preload.js                 # 安全 IPC 桥接
├── renderer/                  # HTML、CSS 与界面交互
├── scripts/                   # 后台启动、停止与任务辅助脚本
├── data/                      # 本机运行时数据（Git 忽略）
├── package.json
└── LICENSE
```

## 许可证

本项目采用 [MIT License](LICENSE)。
