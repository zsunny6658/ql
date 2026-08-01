const https = require('https');
const zlib = require('zlib');
const { sendNotify } = require('./sendNotify');

// 龙湖天街抽奖签到脚本（获取抽奖机会）
async function lotterySign() {
    // 从环境变量获取token，如果没有则使用默认值
    const token = process.env.LONG_FOR_TOKEN || '1a230ca96430464895bd56617b7be8be';
    
    const url = 'https://gw2c-hw-open.longfor.com/llt-gateway-prod/api/v1/activity/auth/lottery/sign';
    
    // 完全按照抓包信息设置请求头
    const headers = {
        'Host': 'gw2c-hw-open.longfor.com',
        'Accept': 'application/json, text/plain, */*',
        'channel': 'C2',
        'authtoken': token,
        'X-LF-DXRisk-Token': '68b59882mcYUnWzhKmat1tbuAfDzxLxrlZ6iHRC1',
        'Accept-Language': 'zh-cn',
        'x-gaia-api-key': '2f9e3889-91d9-4684-8ff5-24d881438eaf',
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        'Origin': 'https://llt.longfor.com',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x1800323d) NetType/WIFI Language/zh_CN miniProgram/wx50282644351869da',
        'Referer': 'https://llt.longfor.com/AP25F082Y9BE1C8Q/PU13L5240730GXIJ/index.html?miniShare=false&sa=mf14l6rz&lmId=67064857&buCode=C20400&channel=C2&openId=b0FqdEg0Njc3dTdoMU5aQnhDRFdHVG1zZVRzUQ%3D%3D&latitude=30.30517550998264&longitude=120.3879931640625&gpsCity=&optProjectId=C2-781298c0-028f-40ed-acef-77e6d8177248&optProjectName=%E6%9D%AD%E5%B7%9E%E5%90%BE%E8%A7%92%E5%A4%A9%E8%A1%97&cityCode=330100&cityName=%E6%9D%AD%E5%B7%9E&thirdId=781298c0-028f-40ed-acef-77e6d8177248&businessId=333&appId=wx50282644351869da&deviceId=68b592bbGqEp77VMC56E2qIxVAKHmgj4i5CHaM54&utm_source=SY&utm_medium=C20400',
        'bucode': 'C20400',
        'X-LF-DXRisk-Source': '5',
        'Cookie': 'acw_tc=ac11000117567303228851722e2073a21a8b260b528b87c68c0bb94f6ee916',
        'Connection': 'keep-alive'
    };
    
    // 可变参数，可以通过环境变量设置
    const componentNo = process.env.LONG_FOR_COMPONENT_NO || 'CO13545A08P7EI9Y'; // 需每次调整
    const activityNo = process.env.LONG_FOR_ACTIVITY_NO || 'AP25O123K1HEE8DB'; // 需每次调整
    
    const data = {
        "component_no": componentNo,
        "activity_no": activityNo
    };
    
    const postData = JSON.stringify(data);
    // 更新Content-Length
    headers['Content-Length'] = Buffer.byteLength(postData);
    
    console.log(`发送抽奖签到请求到: ${url}`);
    console.log(`使用token: ${token}`);
    console.log(`component_no: ${componentNo}`);
    console.log(`activity_no: ${activityNo}`);
    
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
                            sendNotify('龙湖天街抽奖签到失败', `解压响应数据时出错: ${buffer.toString()}`);
                            // ==================== 新增结束 ====================
                            resolve(buffer.toString());
                        } else {
                            console.log(`原始响应数据: ${decoded.toString()}`);
                            try {
                                const jsonData = JSON.parse(decoded.toString());
                                console.log(`解析后的JSON数据:`, jsonData);
                                
                                // 检查抽奖签到结果
                                if (jsonData.code === '0000') {
                                    console.log('🎉 抽奖签到成功！');
                                    console.log(`获得抽奖机会: ${jsonData.data ? jsonData.data.chance : '未知'}次`);
                                    sendNotify('龙湖天街签到成功', `今日抽奖签到成功！获得抽奖机会: ${jsonData.data ? jsonData.data.chance : '未知'}次`);
                                } else {
                                    console.log(`抽奖签到失败: ${jsonData.message || '未知错误'}`);
                                    sendNotify('龙湖天街抽奖签到失败', `${jsonData.message || '未知错误'}`);
                                }
                                
                                resolve(jsonData);
                            } catch (e) {
                                console.log(`非JSON响应数据:`, decoded.toString());
                                sendNotify('龙湖天街抽奖签到异常', `响应数据解析异常: ${decoded.toString()}`);
                                resolve(decoded.toString());
                            }
                        }
                    });
                } else {
                    console.log(`原始响应数据: ${buffer.toString()}`);
                    try {
                        const jsonData = JSON.parse(buffer.toString());
                        console.log(`解析后的JSON数据:`, jsonData);
                        
                        // 检查抽奖签到结果
                        if (jsonData.code === '0000') {
                            console.log('🎉 抽奖签到成功！');
                            console.log(`获得抽奖机会: ${jsonData.data ? jsonData.data.chance : '未知'}次`);
                            sendNotify('龙湖天街抽奖签到成功', `今日签到成功！获得抽奖机会: ${jsonData.data ? jsonData.data.chance : '未知'}次`);
                        } else {
                            console.log(`抽奖签到失败: ${jsonData.message || '未知错误'}`);
                            sendNotify('龙湖天街抽奖签到失败', `${jsonData.message || '未知错误'}`);
                        }
                        
                        resolve(jsonData);
                    } catch (e) {
                        console.log(`非JSON响应数据:`, buffer.toString());
                        sendNotify('龙湖天街抽奖签到异常', `响应数据解析异常: ${buffer.toString()}`);
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

// 运行抽奖签到功能
lotterySign().then(() => {
    console.log('抽奖签到流程完成');
}).catch((error) => {
    console.error('抽奖签到失败:', error);
});

module.exports = { lotterySign };