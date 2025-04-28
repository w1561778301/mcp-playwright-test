import PlaywrightMCPTestSDK from '../src/index';
import { APITestCase, APIResponse } from '../src/types';

/**
 * 示例：演示使用SDK进行API测试
 */
async function main() {
  // 创建SDK实例
  const sdk = new PlaywrightMCPTestSDK({
    apiTestingOptions: {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  });

  try {
    console.log('开始API测试示例...');

    // 1. 手动定义API测试用例
    const testCases: APITestCase[] = [
      {
        id: 'get-posts-1',
        description: '获取单个帖子',
        endpoint: '/posts/1',
        method: 'GET',
        assertions: [
          { type: 'status', target: 'status', operator: '=', value: 200 },
          { type: 'body', target: 'id', operator: '=', value: 1 },
          { type: 'body', target: 'title', operator: 'contains', value: 'sunt' }
        ]
      },
      {
        id: 'create-post',
        description: '创建新帖子',
        endpoint: '/posts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          title: 'foo',
          body: 'bar',
          userId: 1
        },
        assertions: [
          { type: 'status', target: 'status', operator: '=', value: 201 },
          { type: 'body', target: 'id', operator: '>', value: 0 }
        ]
      },
      {
        id: 'failing-test',
        description: '预期失败的测试',
        endpoint: '/posts/999',
        method: 'GET',
        assertions: [
          { type: 'status', target: 'status', operator: '=', value: 200 } // 这将失败，因为返回404
        ]
      }
    ];

    // 2. 使用模拟服务器设置响应
    await sdk.startMockServer();
    const mockResponse: APIResponse = {
      status: 200,
      statusText: 'OK',
      body: { id: 999, title: '模拟帖子', body: '这是一个模拟响应', userId: 1 }
    };
    sdk.mockAPIEndpoint('/posts/999', 'GET', mockResponse);

    // 3. 运行API测试
    console.log('运行API测试...');
    const results = await sdk.runAPITests(testCases);

    // 4. 打印测试结果
    console.log('API测试结果:');
    results.forEach(result => {
      console.log(`- 测试: ${result.testCaseId}, 通过: ${result.passed}`);
      if (!result.passed && result.failedAssertions) {
        console.log(`  失败原因: ${result.failedAssertions.join(', ')}`);
      }
    });

    // 5. 生成错误报告
    if (results.some(r => !r.passed)) {
      console.log('生成API测试错误报告...');
      const errorReport = await sdk.generateAPIErrorReport();
      const reportPath = await sdk.saveErrorReport(errorReport, './reports');
      console.log(`错误报告已保存到: ${reportPath}`);
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    // 清理资源
    await sdk.stopMockServer();
    await sdk.close();
  }
}

// 运行示例
main().catch(console.error);
