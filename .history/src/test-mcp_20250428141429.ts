#!/usr/bin/env node
/**
 * @file Playwright MCP Server Entry Point
 * @version 0.1.0
 * @author MCP Playwright Test Team
 * @date 2025-04-28
 * @description Entry point for running the Playwright MCP server
 */

import { createMCPServer } from "./index";

/**
 * 启动MCP服务器的主函数
 */
async function main() {
  // 从命令行参数获取端口
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8931;

  console.log(`正在启动Playwright MCP服务器，端口: ${port}...`);

  try {
    // 创建并启动服务器
    createMCPServer({ port });

    // 处理进程终止信号
    process.on("SIGINT", () => {
      console.log("接收到终止信号，正在关闭服务器...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("接收到终止信号，正在关闭服务器...");
      process.exit(0);
    });

    console.log(`Playwright MCP服务器已成功启动: http://localhost:${port}`);
    console.log("按Ctrl+C终止服务器");
  } catch (error) {
    console.error("启动服务器时发生错误:", error);
    process.exit(1);
  }
}

// 立即运行主函数
main().catch((error) => {
  console.error("未处理的错误:", error);
  process.exit(1);
});
