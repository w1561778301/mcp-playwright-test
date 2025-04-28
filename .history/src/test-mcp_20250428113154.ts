/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description:
 */
/**
 * MCP测试服务器启动脚本
 *
 * 启动MCP服务器，用于Playwright自动化测试
 */

import createMCPServer from "./index";

// 环境变量配置
const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 8931;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn("警告: 未设置ANTHROPIC_API_KEY环境变量，一些功能可能无法正常工作");
}

// 启动服务器
try {
  const server = createMCPServer({
    port: PORT,
  });

  console.log(`MCP测试服务器已启动，监听端口: ${PORT}`);

  // 监听退出信号
  const handleExit = () => {
    console.log("正在关闭MCP测试服务器...");
    process.exit(0);
  };

  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);
} catch (error) {
  console.error("启动MCP测试服务器失败:", error);
  process.exit(1);
}
