# phonecall-mint — one-line installer for SillyTavern (Windows PowerShell)
#   irm https://raw.githubusercontent.com/Link2theWorld/phonecall-mint/main/install.ps1 | iex
# Optional: set $env:ST_DIR to your SillyTavern folder first.
# SPDX-License-Identifier: MIT

$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/Link2theWorld/phonecall-mint'
$Name = 'phonecall-mint'

function Test-StDir([string]$p) {
  return ($p -and (Test-Path (Join-Path $p 'server.js')) -and (Test-Path (Join-Path $p 'public\scripts\extensions')))
}

function Find-SillyTavern {
  if (Test-StDir $env:ST_DIR) { return (Resolve-Path $env:ST_DIR).Path }
  # current folder or one of its parents
  $d = (Get-Location).Path
  while ($d) {
    if (Test-StDir $d) { return $d }
    $parent = Split-Path $d -Parent
    if ($parent -eq $d) { break }
    $d = $parent
  }
  # common places
  $roots = @($HOME, (Join-Path $HOME 'Desktop'), (Join-Path $HOME 'Documents'), (Join-Path $HOME 'Downloads'))
  $roots += (Get-PSDrive -PSProvider FileSystem | ForEach-Object { $_.Root })
  foreach ($r in $roots) {
    if (-not (Test-Path $r)) { continue }
    $hits = Get-ChildItem -Path $r -Directory -Depth 1 -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match 'SillyTavern|tavern|酒馆' }
    foreach ($h in $hits) {
      if (Test-StDir $h.FullName) { return $h.FullName }
      foreach ($sub in (Get-ChildItem $h.FullName -Directory -ErrorAction SilentlyContinue)) {
        if (Test-StDir $sub.FullName) { return $sub.FullName }
      }
    }
  }
  return $null
}

Write-Host "`n  phonecall-mint 酒馆电话扩展 · 一键安装`n" -ForegroundColor Magenta

$st = Find-SillyTavern
if (-not $st) {
  Write-Host '没找到 SillyTavern（酒馆）文件夹。' -ForegroundColor Yellow
  $st = Read-Host '把酒馆文件夹的路径粘贴到这里（里面有 server.js 的那个）'
  $st = $st.Trim('"', ' ')
  if (-not (Test-StDir $st)) { throw "这个文件夹不是酒馆：$st" }
}
Write-Host "酒馆位置：$st"

$target = Join-Path $st "public\scripts\extensions\third-party\$Name"
New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null

$git = Get-Command git -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $target '.git')) {
  if ($git) {
    Write-Host '已经装过了，正在更新…'
    git -C $target pull --ff-only
  } else {
    Write-Host '已经装过了（没有 git，跳过更新）。'
  }
} elseif (Test-Path $target) {
  Write-Host '发现旧版本，替换中…'
  Remove-Item -Recurse -Force $target
}

if (-not (Test-Path $target)) {
  if ($git) {
    git clone --depth 1 "$Repo.git" $target
  } else {
    $zip = Join-Path $env:TEMP "$Name.zip"
    $tmp = Join-Path $env:TEMP "$Name-unzip"
    Write-Host '下载中…'
    Invoke-WebRequest -UseBasicParsing "$Repo/archive/refs/heads/main.zip" -OutFile $zip
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    Expand-Archive $zip -DestinationPath $tmp
    Move-Item (Join-Path $tmp "$Name-main") $target
    Remove-Item -Recurse -Force $tmp, $zip
  }
}

Write-Host "`n  装好了！" -ForegroundColor Green
Write-Host '  刷新酒馆网页（酒馆没开就先启动），魔杖菜单里会多出「打给角色」「让角色打来」。'
Write-Host "  也可以在聊天框输入 /call 或 /ring。`n"
