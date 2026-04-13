.PHONY: build dev install test test-watch clean storybook build-storybook rebuild help

# 插件安装目录
PLUGIN_DIR = .obsidian/plugins/project-manager

# 生产构建并安装到 Obsidian
build:
	@echo "🔨 构建生产版本..."
	npm run build
	@echo "📦 复制到插件目录..."
	@mkdir -p $(PLUGIN_DIR)
	@cp main.js $(PLUGIN_DIR)/
	@cp styles.css $(PLUGIN_DIR)/
	@cp manifest.json $(PLUGIN_DIR)/
	@echo "✅ 插件已安装到 Obsidian"

# 开发模式（热重载）
dev:
	@echo "🔥 启动热重载开发模式..."
	@node esbuild.dev.mjs

# 仅安装（不构建）
install:
	@echo "📦 复制到插件目录..."
	@mkdir -p $(PLUGIN_DIR)
	@cp main.js $(PLUGIN_DIR)/
	@cp styles.css $(PLUGIN_DIR)/
	@cp manifest.json $(PLUGIN_DIR)/
	@echo "✅ 插件已安装"

# 运行测试
test:
	@echo "🧪 运行测试..."
	npm test

# 监听模式测试
test-watch:
	@echo "👀 监听测试..."
	npm run test:watch

# 覆盖率测试
test-coverage:
	@echo "📊 生成覆盖率报告..."
	npm run test:coverage

# 清理构建产物
clean:
	@echo "🧹 清理构建产物..."
	@rm -f main.js
	@rm -f styles.css
	@echo "✅ 清理完成"

# 完整流程：清理、构建、安装
rebuild: clean build

# 启动 Storybook
storybook:
	@echo "📚 启动 Storybook..."
	npm run storybook

# 构建 Storybook 静态文件
build-storybook:
	@echo "📦 构建 Storybook 静态文件..."
	npm run build-storybook

# 帮助
help:
	@echo "可用命令:"
	@echo "  make build          - 构建并安装到 Obsidian"
	@echo "  make dev            - 启动热重载开发模式"
	@echo "  make install        - 仅复制文件（不构建）"
	@echo "  make test           - 运行测试"
	@echo "  make test-watch     - 监听模式运行测试"
	@echo "  make test-coverage  - 生成测试覆盖率报告"
	@echo "  make storybook      - 启动 Storybook 组件库"
	@echo "  make build-storybook- 构建 Storybook 静态文件"
	@echo "  make clean          - 清理构建产物"
	@echo "  make rebuild        - 清理并重新构建"
