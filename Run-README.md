# cli 运行说明

## 一、当前状态

- 仓库已克隆到 `H:\WS\ai-tools\opensource\cli`
- 已在 Windows PowerShell 下完成依赖安装和实际运行验证
- `bun` 已安装成功，可直接使用仓库原生命令
- CLI 已识别到 `cn` 区域

## 二、环境要求

- Node.js 18+（当前机器已满足）
- Bun（当前机器已安装）

## 三、安装依赖

### PowerShell

```powershell
Set-Location "H:\WS\ai-tools\opensource\cli"
npm install
```

说明：
- 这个仓库的脚本以 `bun` 为主，但用 `npm install` 安装依赖也可以正常运行源码
- 如果当前终端刚装完 `bun`，先刷新 PATH：

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
```

## 四、认证

CLI 会把 API Key 保存到用户目录配置文件：

```text
C:\Users\YeZhimin\.mmx\config.json
```

如果要重新登录：

```powershell
Set-Location "H:\WS\ai-tools\opensource\cli"
bun run "src/main.ts" auth login --method api-key --api-key "<YOUR_TOKEN_PLAN_KEY>"
```

如果只想查看当前状态：

```powershell
bun run "src/main.ts" auth status --non-interactive --no-color
```

## 五、运行项目

### 方式一：原生 Bun 运行

```powershell
Set-Location "H:\WS\ai-tools\opensource\cli"
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
bun run "src/main.ts" --help
```

示例：

```powershell
bun run "src/main.ts" quota --non-interactive --no-color
bun run "src/main.ts" text chat --message "请只回复：ok" --non-interactive --no-color
```

### 方式二：备用 tsx 运行

如果 `bun` 临时不可用，也可以这样跑：

```powershell
Set-Location "H:\WS\ai-tools\opensource\cli"
npx tsx "src/main.ts" --help
```

## 六、验证结果

本次已经实际验证通过：

- `bun --version` 返回 `1.3.12`
- `bun run "src/main.ts" --version` 返回 `mmx 1.0.4`
- `quota` 命令成功返回额度信息
- `text chat` 命令成功返回 `ok`

## 七、常见问题

### 1. `bun` 刚安装后提示找不到命令

刷新当前 PowerShell 会话的 PATH：

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
```

### 2. 直接用 `node src/main.ts` 运行失败

这是正常的。该仓库使用了无扩展名的 TypeScript 导入，Node 原生解析会报模块找不到。请使用：

```powershell
bun run "src/main.ts" --help
```

或：

```powershell
npx tsx "src/main.ts" --help
```

### 3. 想清除本地保存的认证

```powershell
bun run "src/main.ts" auth logout --non-interactive
```
