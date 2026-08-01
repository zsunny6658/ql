/**
 * 零跑汽车App自动签到脚本
 * 接口: https://apptec.leapmotor.com/app-community/appuseroperate/appstatus
 * 
 * 使用方法:
 * 1. 设置环境变量 LEAPMOTOR_ACCESS_TOKEN 为您的accessToken
 * 2. 运行: node leapmotor_sign.js
 */

const https = require('https');
const zlib = require('zlib');
const { sendNotify } = require('./sendNotify');
const crypto = require('crypto');

// 零跑汽车签到脚本
async function leapMotorSignIn() {
    // 从环境变量获取accessToken，如果没有则使用示例token（请替换为您自己的token）
    const accessToken = process.env.LEAPMOTOR_ACCESS_TOKEN || '1A890781685A450D99EAD60B4FA5DBA31A890781685A450D99EAD60B4FA5DBA3';
    
    const url = 'https://apptec.leapmotor.com/app-community/appuseroperate/appstatus';
    
    // 生成当前时间戳和随机数
    const timespan = Date.now();
    const nonce = Math.floor(Math.random() * 10000000000);
    
    // 根据抓包信息构建请求参数（这里需要根据实际签名算法调整）
    // 注意：实际的signStr签名算法需要根据App的实现来确定，这里仅为示例
    const signStr = generateSign(nonce, timespan);
    
    // 构建POST数据
    const postData = `deviceID=ios_fb70d286edfe98558dbbc1000f986a1d&nonce=${nonce}&signStr=${signStr}&timespan=${timespan}`;
    
    // 设置请求头（完全按照抓包信息）
    const headers = {
        'Host': 'apptec.leapmotor.com',
        'Accept': '*/*',
        'APPImei': 'ios_fb70d286edfe98558dbbc1000f986a1d',
        'APPVersion': '1.21.93',
        'XFX-CDN-VRS': 'v4',
        'accessToken': accessToken,
        'Accept-Language': 'zh-Hans-CN;q=1, zh-Hant-CN;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'XFX-CDN-CROSS-NODE': accessToken,
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'leapmotorCarOwner/1.21.93 (iPhone; iOS 17.3.1; Scale/3.00)',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded',
        'APPPlatform': 'iOS',
        'C-VERSIONS': 'APP',
        // 注意：Cookie可能需要定期更新，建议从实际抓包中获取最新的Cookie
        'Cookie': '.thumbcache_bbb817cd91da12b0ba055f39c7d51e5d=xNDSqHvvxjZ5nS8funS2WGa/ykVAv0vkyweG+fGwl4XCTNIVnqbuoe/YBfxBbxttDajFLaSfV3zmKAjDBK9mvQ%3D%3D; acw_tc=0a03836a17569405402512394e7080ad365a570b6122a76723310314b38f9f; smidV2=2024111807260084ab729bde979ca83329a78823cf40d200c213e4fc01fbf80'
    };
    
    console.log(`发送签到请求到: ${url}`);
    console.log(`使用accessToken: ${accessToken.substring(0, 10)}...`);
    
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
                            sendNotify('零跑汽车签到失败', `解压响应数据时出错: ${err.message}`);
                            reject(err);
                        } else {
                            handleResponse(decoded.toString(), resolve, reject);
                        }
                    });
                } else if (isBr) {
                    zlib.brotliDecompress(buffer, (err, decoded) => {
                        if (err) {
                            console.error('解压br响应数据时出错:', err);
                            sendNotify('零跑汽车签到失败', `解压响应数据时出错: ${err.message}`);
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
            sendNotify('零跑汽车签到失败', '签到请求超时');
            reject(error);
        });
        
        req.on('error', (e) => {
            console.error(`请求遇到问题: ${e.message}`);
            sendNotify('零跑汽车签到失败', `请求遇到问题: ${e.message}`);
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
        if (jsonData.code === 200 && jsonData.success === true) {
            console.log('🎉 零跑汽车签到成功！');
            console.log(`签到信息: ${jsonData.msg}`);
            sendNotify('零跑汽车签到成功', `签到成功！信息: ${jsonData.msg}`);
            resolve(jsonData);
        } else {
            console.log(`签到失败: ${jsonData.msg || '未知错误'}`);
            sendNotify('零跑汽车签到失败', `签到失败: ${jsonData.msg || '未知错误'}`);
            resolve(jsonData);
        }
    } catch (e) {
        console.log(`非JSON响应数据:`, responseText);
        sendNotify('零跑汽车签到异常', `响应数据解析异常: ${responseText}`);
        resolve(responseText);
    }
}

/**
 * 生成签名（需要根据实际算法调整）
 * 注意：这里的签名算法是示例，实际应用中需要根据App的实现来确定
 * @param {number} nonce 随机数
 * @param {number} timespan 时间戳
 * @returns {string} 签名字符串
 */
function generateSign(nonce, timespan) {
    // 这里需要根据实际的签名算法实现
    // 可能涉及设备ID、时间戳、随机数等参数的加密
    // 由于没有具体的签名算法，这里返回一个示例值
    // 在实际使用中，您需要通过逆向工程或抓包分析确定具体的签名算法
    
    // 示例：简单的MD5签名（实际可能更复杂）
    const signData = `deviceID=ios_fb70d286edfe98558dbbc1000f986a1d&nonce=${nonce}&timespan=${timespan}`;
    return crypto.createHash('md5').update(signData).digest('hex').substring(0, 16);
}

// 运行签到功能
leapMotorSignIn().then((result) => {
    console.log('零跑汽车签到流程完成');
}).catch((error) => {
    console.error('零跑汽车签到失败:', error);
});

module.exports = {
    leapMotorSignIn
};