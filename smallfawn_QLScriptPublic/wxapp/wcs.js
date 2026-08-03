const axios = require("axios");
class WeChatCodeServer {
    constructor(options) {
        this.serverUrl = options.url;
        this.appid = options.appid;
        this.auth = options.auth;
    }
    getCode(openid) {
        const url = process.env.wx_server_url;
        const auth = process.env.wx_auth;
        if (url) {
            return axios.post(url + "/wx/code", { appid: this.appid, openid }, {
                headers: { "auth": auth, "Content-Type": "application/json" },
                timeout: 30000
            }).then(res => {
                const code = res.data?.data?.code || res.data?.code;
                return { data: { Data: { code }, code }, status: res.status };
            });
        }
        return axios.post("http://172.17.0.13:8057/api/Wxapp/JSLogin",
            { wxid: openid || "zx491814", appid: this.appid },
            { headers: { "content-type": "application/json" }, timeout: 30000 }
        );
    }
   
    cloudInit(openid) {
        console.log('等待云函数初始化:');
        return new Promise((resolve, reject) => {
            axios.post(this.serverUrl + '/wx/call/init', { appid: this.appid, openid }, {
                headers: {
                    'auth': this.auth
                },
                timeout: 30 * 1000
            }).then(res => {
                console.log('云函数初始化成功:');
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
    cloudCall(openid) {
        console.log('等待云函数调用:');
        return new Promise((resolve, reject) => {
            axios.post(this.serverUrl + '/wx/cloud/call', { appid: this.appid, openid }, {
                headers: {
                    'auth': this.auth
                },
                timeout: 30 * 1000
            }).then(res => {
                console.log('云函数调用成功:');
                resolve(res);
            }).catch(err => {
                reject(err);
            });
        });
    }
}
module.exports = WeChatCodeServer;