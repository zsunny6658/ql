const https = require('https');
const zlib = require('zlib');
const { sendNotify } = require('./sendNotify');

// 龙湖天街签到脚本（仅签到功能）
async function signIn() {
    const token = process.env.LONG_FOR_TOKEN_WQ || '3ef01acd84864812a5ba7220896615a3';
    const risktoken = process.env.LONG_FOR_RISK_TOKEN_WQ || '695674737QyXo9l2ejhxRlKAkVT7EcQv7B4M2K41';

    const url = 'https://gw2c-hw-open.longfor.com/lmarketing-task-api-mvc-prod/openapi/task/v1/signature/clock';
    
    // 完全按照抓包信息设置请求头
    const headers = {
        'Host': 'gw2c-hw-open.longfor.com',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003137) NetType/WIFI Language/zh_CN miniProgram/wx50282644351869da',
        'Referer': 'https://longzhu.longfor.com/',
        'X-GAIA-API-KEY': 'c06753f1-3e68-437d-b592-b94656ea5517',
        'X-LF-DXRisk-Captcha-Token': 'undefined',
        'Origin': 'https://longzhu.longfor.com',
        'X-LF-UserToken': token,
        'X-LF-DXRisk-Source': '5',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Site': 'same-site',
        'X-LF-Channel': 'C2',
        'X-LF-DXRisk-Token': risktoken,
        'Connection': 'keep-alive',
        'token': token,
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'X-LF-Bu-Code': 'C20400',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept-Encoding': 'gzip, deflate, br'
    };
    
    const data = {
        "activity_no": "11111111111686241863606037740000"
    };
    
    const postData = JSON.stringify(data);
    // 更新Content-Length
    headers['Content-Length'] = Buffer.byteLength(postData);
    
    console.log(`发送签到请求到: ${url}`);
    console.log(`使用token: ${token}`);
    
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
            let isGzip = res.headers['content-encoding'] === 'gzip';
            
            res.on('data', (chunk) => {
                responseData.push(chunk);
            });
            
            res.on('end', () => {
                console.log(`响应状态码: ${res.statusCode}`);
                console.log(`响应头: ${JSON.stringify(res.headers)}`);
                
                let buffer = Buffer.concat(responseData);
                
                // 如果是gzip压缩，需要解压
                if (isGzip) {
                    zlib.gunzip(buffer, (err, decoded) => {
                        if (err) {
                            console.error('解压响应数据时出错:', err);
                            console.log(`原始响应数据: ${buffer.toString()}`);
                            // ==================== 新增通知调用 ====================
                            sendNotify('WQ龙湖天街签到失败', `解压响应数据时出错: ${buffer.toString()}`);
                            // ==================== 新增结束 ====================
                            resolve(buffer.toString());
                        } else {
                            console.log(`原始响应数据: ${decoded.toString()}`);
                            try {
                                const jsonData = JSON.parse(decoded.toString());
                                console.log(`解析后的JSON数据:`, jsonData);
                                
                                // 检查签到结果
                                if (jsonData.code === '0000') {
                                    if (jsonData.data && jsonData.data.is_popup === 1) {
                                        console.log('🎉 签到成功！');
                                        console.log(`今日签到获得成长值: ${jsonData.data.reward_info ? jsonData.data.reward_info[0].reward_num : '未知'}`);
                                        sendNotify('WQ龙湖天街签到成功', `今日签到成功！获得成长值: ${jsonData.data.reward_info ? jsonData.data.reward_info[0].reward_num : '未知'}`);
                                    } else {
                                        console.log('✅ 今日已签到');
                                        // ==================== 新增通知调用 ====================
                                        sendNotify('WQ龙湖天街签到', '今日已签到，无需重复签到');
                                        // ==================== 新增结束 ====================
                                    }
                                } else {
                                    console.log(`签到失败: ${jsonData.message || '未知错误'}`);
                                    sendNotify('WQ龙湖天街签到失败', `${jsonData.message || '未知错误'}`);
                                }
                                
                                resolve(jsonData);
                            } catch (e) {
                                console.log(`非JSON响应数据:`, decoded.toString());
                                sendNotify('WQ龙湖天街签到异常', `响应数据解析异常: ${decoded.toString()}`);
                                resolve(decoded.toString());
                            }
                        }
                    });
                } else {
                    console.log(`原始响应数据: ${buffer.toString()}`);
                    try {
                        const jsonData = JSON.parse(buffer.toString());
                        console.log(`解析后的JSON数据:`, jsonData);
                        
                        // 检查签到结果
                        if (jsonData.code === '0000') {
                            if (jsonData.data && jsonData.data.is_popup === 1) {
                                console.log('🎉 签到成功！');
                                console.log(`今日签到获得成长值: ${jsonData.data.reward_info ? jsonData.data.reward_info[0].reward_num : '未知'}`);
                                sendNotify('WQ龙湖天街签到成功', `今日签到成功！获得成长值: ${jsonData.data.reward_info ? jsonData.data.reward_info[0].reward_num : '未知'}`);

                            } else {
                                console.log('✅ 今日已签到');
                                // ==================== 新增通知调用 ====================
                                sendNotify('WQ龙湖天街签到', '今日已签到，无需重复签到');
                                // ==================== 新增结束 ====================
                            }
                        } else {
                            console.log(`签到失败: ${jsonData.message || '未知错误'}`);
                            sendNotify('WQ龙湖天街签到失败', `${jsonData.message || '未知错误'}`);
                        }
                        
                        resolve(jsonData);
                    } catch (e) {
                        console.log(`非JSON响应数据:`, buffer.toString());
                        sendNotify('WQ龙湖天街签到异常', `响应数据解析异常: ${buffer.toString()}`);
                        resolve(buffer.toString());
                    }
                }
            });
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            console.log('请求超时');
            reject(new Error('请求超时'));
        });
        
        req.on('error', (e) => {
            console.error(`请求遇到问题: ${e.message}`);
            reject(e);
        });
        
        req.write(postData);
        req.end();
    });
}

// 运行签到功能
signIn().then(() => {
    console.log('签到流程完成');
}).catch((error) => {
    console.error('签到失败:', error);
});