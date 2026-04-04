#!/bin/bash

# Project Manager 示例数据安装脚本
# 用法: ./install.sh [你的Obsidian笔记库路径]

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}用法: $0 [你的Obsidian笔记库路径]${NC}"
    echo ""
    echo "示例:"
    echo "  $0 ~/Documents/MyVault"
    echo "  $0 /Users/username/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault"
    echo ""
    exit 1
fi

VAULT_PATH="$1"

# 检查路径是否存在
if [ ! -d "$VAULT_PATH" ]; then
    echo -e "${RED}错误: 笔记库路径不存在: $VAULT_PATH${NC}"
    exit 1
fi

# 检查是否是 Obsidian 笔记库（包含 .obsidian 目录）
if [ ! -d "$VAULT_PATH/.obsidian" ]; then
    echo -e "${YELLOW}警告: 路径可能不是 Obsidian 笔记库（未找到 .obsidian 目录）${NC}"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 目标路径
TARGET_PATH="$VAULT_PATH/ProjectManager"

# 检查是否已存在
if [ -d "$TARGET_PATH" ]; then
    echo -e "${YELLOW}警告: ProjectManager 目录已存在${NC}"
    read -p "是否覆盖? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
    echo "删除旧目录..."
    rm -rf "$TARGET_PATH"
fi

# 复制数据
echo "复制示例数据到笔记库..."
cp -r "$SCRIPT_DIR/ProjectManager" "$TARGET_PATH"

# 统计
echo ""
echo -e "${GREEN}✅ 示例数据安装成功!${NC}"
echo ""
echo "统计信息:"
echo "  版本: $(ls -1 "$TARGET_PATH/Versions" | wc -l) 个"
echo "  项目: $(ls -1 "$TARGET_PATH/Projects" | wc -l) 个"
echo "  特性: $(ls -1 "$TARGET_PATH/Features" | wc -l) 个"
echo ""
echo "下一步:"
echo "  1. 在 Obsidian 中打开笔记库"
echo "  2. 确保 Project Manager 插件已启用"
echo "  3. 打开 ProjectManager/总览.md 查看效果"
echo "  4. 或打开 ProjectManagerInObsidian/project-manager/examples/grid-demo.md 查看完整演示"
echo ""
