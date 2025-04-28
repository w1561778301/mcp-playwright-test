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
    const server = createMCPServer({ port });

    // 优雅关闭函数
    const gracefulShutdown = async () => {
      console.log("接收到终止信号，正在关闭服务器...");
      try {
        // 由于McpServer没有直接的disconnect方法，我们可以尝试访问其传输层
        if (server) {
          // 如果有transport属性并且有close方法
          if (server.transport && typeof server.transport.close === "function") {
            await server.transport.close();
            console.log("服务器传输层已成功关闭");
          } else {
            console.log("无法访问服务器关闭方法，强制退出");
          }
        }
      } catch (error) {
        console.error("关闭服务器时发生错误:", error);
      }
      process.exit(0);
    };

    // 处理进程终止信号
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

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
