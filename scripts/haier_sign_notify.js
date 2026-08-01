/**
 * 海尔智家小程序签到脚本
 * 接口: https://zj.haier.net/api-gw/zjBaseServer/daily/channel/sign
 * 
 * 使用方法:
 * 1. 设置环境变量 HAIER_ACCOUNT_TOKEN 为您的accountToken
 * 2. 设置环境变量 HAIER_OPEN_ID 为您的openId
 * 3. 运行: node haier_actual_sign.js
 */

const https = require('https');
const zlib = require('zlib');
const { sendNotify } = require('./sendNotify');

// 海尔智家签到脚本
async function haierSignIn() {
    // 从环境变量获取必要参数
    const accountToken = process.env.HAIER_ACCOUNT_TOKEN || '3c79a6d83b60468fbbb0ceb998d084c1';
    const openId = process.env.HAIER_OPEN_ID || 'o9C0x5ZirnqmvJD7WmJb7Iksp4l4';
    
    const url = 'https://zj.haier.net/api-gw/zjBaseServer/daily/channel/sign';
    
    // 构建POST数据
    const postData = JSON.stringify({
        "channelCode": 2
    });
    
    // 获取当前时间戳
    const timestamp = Date.now();
    
    // 设置请求头（完全按照抓包信息）
    const headers = {
        'Host': 'zj.haier.net',
        'accountToken': accountToken,
        'appId': 'MB-SHEZJAPPWXXCX-0000',
        'Accept': 'application/json, text/plain, */*',
        'timestamp': timestamp,
        'Sec-Fetch-Site': 'same-site',
        'clientId': 'iOS17311742380595327',
        'appVersion': '5.3.0',
        'openId': openId,
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'Sec-Fetch-Mode': 'cors',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://zjrs.haier.net',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN miniProgram/wxe24b2f1f4e378891',
        'Referer': 'https://zjrs.haier.net/',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Sec-Fetch-Dest': 'empty'
    };
    
    console.log(`发送签到请求到: ${url}`);
    console.log(`使用accountToken: ${accountToken.substring(0, 10)}...`);
    console.log(`使用openId: ${openId.substring(0, 10)}...`);
    
    const urlObj = new URL(url);
    const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: headers,
        timeout: 15000 // 15秒超时
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = [];
            // 检查是否是gzip压缩
            const isGzip = res.headers['content-encoding'] === 'gzip';
            const isBr = res.headers['content-encoding'] === 'br'; // Brotli压缩
            
            res.on('data', (chunk) => {
                responseData.push(chunk);
            });
            
            res.on('end', () => {
                console.log(`响应状态码: ${res.statusCode}`);
                console.log(`响应头: ${JSON.stringify(res.headers)}`);
                
                let buffer = Buffer.concat(responseData);
                
                // 处理不同类型的压缩
                if (isGzip) {
                    zlib.gunzip(buffer, (err, decoded) => {
                        if (err) {
                            console.error('解压gzip响应数据时出错:', err);
                            sendNotify('海尔智家签到失败', `解压响应数据时出错: ${err.message}`);
                            reject(err);
                        } else {
                            handleResponse(decoded.toString(), resolve, reject);
                        }
                    });
                } else if (isBr) {
                    zlib.brotliDecompress(buffer, (err, decoded) => {
                        if (err) {
                            console.error('解压br响应数据时出错:', err);
                            sendNotify('海尔智家签到失败', `解压响应数据时出错: ${err.message}`);
                            reject(err);
                        } else {
                            handleResponse(decoded.toString(), resolve, reject);
                        }
                    });
                } else {
                    handleResponse(buffer.toString(), resolve, reject);
                }
            });
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            const error = new Error('请求超时');
            console.log('请求超时');
            sendNotify('海尔智家签到失败', '签到请求超时');
            reject(error);
        });
        
        req.on('error', (e) => {
            console.error(`请求遇到问题: ${e.message}`);
            sendNotify('海尔智家签到失败', `请求遇到问题: ${e.message}`);
            reject(e);
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * 处理响应数据
 * @param {string} responseText 响应文本
 * @param {function} resolve Promise resolve函数
 * @param {function} reject Promise reject函数
 */
function handleResponse(responseText, resolve, reject) {
    console.log(`原始响应数据: ${responseText}`);
    
    try {
        const jsonData = JSON.parse(responseText);
        console.log(`解析后的JSON数据:`, jsonData);
        
        // 根据响应数据判断签到结果
        if (jsonData.retCode === "00000") {
            console.log('🎉 海尔智家签到成功！');
            
            // 提取签到信息
            const data = jsonData.data;
            console.log(`总签到天数: ${data.totalSignDay}`);
            console.log(`本次签到天数: ${data.signDay}`);
            console.log(`签到日期: ${data.signDate}`);
            console.log(`获得海贝数量: ${data.haibeiCount}`);
            
            // 显示连续签到奖励信息
            if (data.haibeiList && data.haibeiList.length > 0) {
                console.log('连续签到奖励:');
                data.haibeiList.forEach(item => {
                    console.log(`  第${item.signDay}天: ${item.count}海贝`);
                });
            }
            
            sendNotify('海尔智家签到成功', `签到成功！总签到天数: ${data.totalSignDay}天，本次获得: ${data.haibeiCount}海贝`);
            resolve(jsonData);
        } else {
            console.log(`签到失败: ${jsonData.retInfo || '未知错误'}`);
            sendNotify('海尔智家签到失败', `签到失败: ${jsonData.retInfo || '未知错误'}`);
            resolve(jsonData);
        }
    } catch (e) {
        console.log(`非JSON响应数据:`, responseText);
        sendNotify('海尔智家签到异常', `响应数据解析异常: ${responseText}`);
        resolve(responseText);
    }
}

// 导出函数供其他脚本调用
module.exports = {
    haierSignIn
};

// 如果直接运行此脚本，则执行签到
if (require.main === module) {
    haierSignIn().then((result) => {
        console.log('海尔智家签到流程完成');
    }).catch((error) => {
        console.error('海尔智家签到失败:', error);
    });
}