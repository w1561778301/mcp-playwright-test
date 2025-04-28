import { PlaywrightMCPTestSDK } from '../src';
import * as path from 'path';

// 示例OpenAPI规范文件路径
const specPath = path.resolve(__dirname, '../examples/petstore.yaml');

/**
 * 示例：演示使用SDK进行API测试
 */
async function main() {
  // 初始化SDK
  const sdk = new PlaywrightMCPTestSDK({
    apiTestingOptions: {
      baseUrl: 'https://petstore.swagger.io/v2',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  });

  try {
    console.log('开始执行API测试...');

    // 从OpenAPI规范生成测试用例
    console.log(`正在从规范生成测试用例: ${specPath}`);
    const testCases = await sdk.generateAPITestsFromSpec(specPath);
    console.log(`成功生成${testCases.length}个测试用例`);

    // 执行API测试
    console.log('开始执行测试用例...');
    const results = await sdk.runAPITests(testCases);

    // 输出测试结果摘要
    const passedCount = results.filter(r => r.passed).length;
    console.log(`\n测试结果摘要:`);
    console.log(`总计: ${results.length}`);
    console.log(`通过: ${passedCount}`);
    console.log(`失败: ${results.length - passedCount}`);

    // 输出失败的测试详情
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n失败的测试用例:');
      failedTests.forEach((result, index) => {
        console.log(`\n${index + 1}. 测试ID: ${result.testCaseId}`);
        console.log(`   URL: ${result.response?.url}`);
        console.log(`   状态码: ${result.response?.status}`);
        console.log(`   失败断言: ${result.failedAssertions?.join(', ')}`);
      });
    }

    // 生成并保存测试报告
    console.log('\n生成错误报告...');
    const report = await sdk.generateAPIErrorReport(results);
    await sdk.saveAPIErrorReport(report, 'api-test-report.md');
    console.log('报告已保存到: api-test-report.md');

  } catch (error) {
    console.error('执行API测试时出错:', error);
  } finally {
    // 清理资源
    await sdk.close();
  }
}

// 运行示例
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});
