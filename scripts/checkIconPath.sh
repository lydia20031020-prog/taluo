#!/bin/bash

if ! command -v ast-grep >/dev/null 2>&1; then
  echo "ast-grep 未安装,跳过图标路径规则扫描"
  exit 0
fi

icon_path_output=$(ast-grep scan -r .rules/noAbsoluteIconPath.yml 2>/dev/null)

if [ -z "$icon_path_output" ]; then
    exit 0
fi

echo "🔍 Scanning for absolute icon paths:"

echo "⚠️  Issue detected:"
echo "Icon paths (iconPath or selectedIconPath) should not start with '/'."
echo ""
echo "🚫 INCORRECT:"
echo "  iconPath: '/assets/icon.png'"
echo "  selectedIconPath: '/assets/icon-active.png'"
echo ""
echo "✅ CORRECTE:"
echo "  iconPath: 'assets/icon.png'"
echo "  selectedIconPath: 'assets/icon-active.png'"
echo ""
echo "Please remove the leading '/' from the icon paths shown above."

exit 1
