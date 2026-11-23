#!/usr/bin/env bash
# phonecall-mint — one-line installer for SillyTavern (macOS / Linux / Android Termux)
#   curl -fsSL https://raw.githubusercontent.com/Link2theWorld/phonecall-mint/main/install.sh | bash
# Optional: ST_DIR=/path/to/SillyTavern before the command.
# SPDX-License-Identifier: MIT
set -euo pipefail

REPO="https://github.com/Link2theWorld/phonecall-mint"
NAME="phonecall-mint"

is_st() { [ -n "${1:-}" ] && [ -f "$1/server.js" ] && [ -d "$1/public/scripts/extensions" ]; }

find_st() {
  if is_st "${ST_DIR:-}"; then (cd "$ST_DIR" && pwd); return; fi
  local d; d="$(pwd)"
  while [ "$d" != "/" ]; do is_st "$d" && { echo "$d"; return; }; d="$(dirname "$d")"; done
  local roots=("$HOME" "$HOME/Desktop" "$HOME/Documents" "$HOME/Downloads" "/storage/emulated/0" "/opt")
  for r in "${roots[@]}"; do
    [ -d "$r" ] || continue
    for c in "$r"/*SillyTavern* "$r"/*tavern* "$r"/*/SillyTavern*; do
      is_st "$c" && { (cd "$c" && pwd); return; }
    done
  done
  echo ""
}

printf '\n  phonecall-mint 酒馆电话扩展 · 一键安装\n\n'

ST="$(find_st)"
if [ -z "$ST" ]; then
  echo "没找到 SillyTavern（酒馆）文件夹。"
  printf '把酒馆文件夹的路径粘贴到这里（里面有 server.js 的那个）：'
  read -r ST < /dev/tty
  is_st "$ST" || { echo "这个文件夹不是酒馆：$ST"; exit 1; }
fi
echo "酒馆位置：$ST"

TARGET="$ST/public/scripts/extensions/third-party/$NAME"
mkdir -p "$(dirname "$TARGET")"

if [ -d "$TARGET/.git" ] && command -v git >/dev/null 2>&1; then
  echo "已经装过了，正在更新…"
  git -C "$TARGET" pull --ff-only
else
  rm -rf "$TARGET"
  if command -v git >/dev/null 2>&1; then
    git clone --depth 1 "$REPO.git" "$TARGET"
  else
    echo "下载中…"
    TMP="$(mktemp -d)"
    curl -fsSL "$REPO/archive/refs/heads/main.tar.gz" | tar -xz -C "$TMP"
    mv "$TMP/$NAME-main" "$TARGET"
    rm -rf "$TMP"
  fi
fi

printf '\n  装好了！\n'
echo "  刷新酒馆网页（酒馆没开就先启动），魔杖菜单里会多出「打给角色」「让角色打来」。"
printf '  也可以在聊天框输入 /call 或 /ring。\n\n'
