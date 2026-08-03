/*
华住会 - 签到/查询
cron: 35 8 * * *

变量名：huazhu
变量值：
  1. wx_server 中保存的 openid，多账号用 & 或换行分隔
  2. openid#sId，可直接复用 sId/crossAuth
  3. JSON：{"openid":"...","sId":"...","remark":"..."}

依赖变量：wx_server_url、wx_auth
*/

const { Env } = require("../tools/env.js");
const $ = new Env("华住会");
const axios = require("axios");

const ckName = "huazhu";
const MINI_APP_ID = "wx286efc12868f2559";
const PACKAGE_VERSION = "580";
const WX_SERVER_URL = (process.env.wx_server_url || "http://192.168.31.196:8787").replace(/\/$/, "");
const WX_AUTH = process.env.wx_auth || "";
const LOGIN_BASE = "https://hweb-personalcenter.huazhu.com/api";
const PERSONAL_BASE = "https://hweb-personalcenter.huazhu.com";
const SIGN_BASE = "https://appgw.huazhu.com";

function splitAccounts(value = "") {
  return String(value)
    .split(/\n|&/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function short(value, max = 500) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function mask(value = "") {
  value = String(value || "");
  if (!value) return "";
  if (value.length <= 12) return `${value.slice(0, 3)}***`;
  return `${value.slice(0, 6)}***${value.slice(-6)}`;
}

function parseAccount(raw = "") {
  const text = String(raw || "").trim();
  if (!text) return {};

  if (text.startsWith("{")) {
    const data = JSON.parse(text);
    return {
      openid: data.openid || data.openId || "",
      sId: data.sId || data.sid || data.crossAuth || data.token || "",
      remark: data.remark || data.name || "",
    };
  }

  const [openid, sId, remark] = text.split("#").map((item) => item.trim());
  if (!sId && /^[0-9a-f]{32,}\d*$/i.test(openid) && !/^o[A-Za-z0-9_-]{20,}$/.test(openid)) {
    return { openid: "", sId: openid, remark: "" };
  }
  return { openid, sId, remark };
}

async function request(options) {
  const res = await axios.request({
    timeout: 25000,
    validateStatus: () => true,
    ...options,
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b50) NetType/WIFI Language/zh_CN",
      Accept: "application/json, text/plain, */*",
      ...(options.headers || {}),
    },
  });
  return { status: res.status, data: res.data, headers: res.headers || {} };
}


function wxHeaders(sId = "") {
    const headers = {
        miniProgram: "wxapp",
        "Client-Platform": "WX-MP",
        "devNo": "7669435148127349005",
        abInfo: JSON.stringify({xcxFourFive:"B",HUA_AI_ENTRY_GROUP:"C",exclusivePrice:"B",xcxFourFive2025:"B",xcx45_tdy:true,xcx45_tiandanye:true}),
        "content-type": "application/json",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b50) NetType/WIFI Language/zh_CN",
        "mini-version": "3.0.59",
        ssid: "1729393252029349075",
        version: "",
        "Referer": "https://servicewechat.com/" + MINI_APP_ID + "/583/page-frame.html",
    };
    if (sId) {
        headers.sId = sId;
    }
    return headers;
}

function ok(data) {
  if (!data) return false;
  if (typeof data === 'number') return data === 0 || data === 1;
  if (data.success !== undefined) return !!data.success;
  if (data.code !== undefined) return data.code === 0 || data.code === 200;
  if (data.businessCode !== undefined && (String(data.businessCode) === '1000' || data.businessCode === 1000)) return true;
  if (data.status !== undefined) return data.status === 200 || data.status === 'ok';
  if (data.Result !== undefined) return !!data.Result;
  if (data.statusCode !== undefined) return data.statusCode === 200 || data.statusCode === 0;
  return true;
}

function signHeaders(sId) {
  const headers = {
    miniProgram: 'wxapp',
    'content-type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b50) NetType/WIFI Language/zh_CN',
    'Referer': 'https://servicewechat.com/' + MINI_APP_ID + '/' + PACKAGE_VERSION + '/page-frame.html',
  };
  if (sId) {
    headers.sId = sId;
  }
  return headers;
}

async function getWxCode(openid) {
  const wxServerUrl = process.env.wx_server_url;
  const wxAuth = process.env.wx_auth;
  if (wxServerUrl) {
    const req = {
      method: "POST",
      url: `${wxServerUrl}/wx/code`,
      headers: { "auth": wxAuth, "Content-Type": "application/json" },
      data: { appid: MINI_APP_ID, openid: openid },
    };
    const { status, data } = await request(req);
    const code = data?.data?.code || data?.code;
    if (status !== 200 || !code) throw new Error(`获取code失败 HTTP ${status}: ${short(data)}`);
    return code;
  }
  const wxid = openid;
  const { status, data } = await request({
    method: "POST",
    url: "http://172.17.0.13:8057/api/Wxapp/JSLogin",
    headers: { "content-type": "application/json" },
    data: { wxid, appid: MINI_APP_ID },
  });
  const code = data?.Data?.code || data?.code || data?.data?.code;
  if (status !== 200 || !code) throw new Error(`获取code失败 HTTP ${status}: ${short(data)}`);
  return code;
}

class Huazhu {
  constructor(rawAccount, index) {
    this.index = index;
    this.account = parseAccount(rawAccount);
    this.sId = this.account.sId || "";
    this.memberId = "";
  }

  log(message) {
    $.log(`账号[${this.index}]${this.account.remark ? `[${this.account.remark}]` : ""} ${message}`);
  }

  async login() {
    if (this.sId) {
      this.log(`使用已有 sId: ${mask(this.sId)}`);
      return;
    }
    if (!this.account.openid) throw new Error("账号格式错误，请配置 wx_server 中的 openid 或直接配置 sId");

    const code = await getWxCode(this.account.openid);
    const { status, data } = await request({
      method: "POST",
      url: `${LOGIN_BASE}/applet/authCheck?code=${encodeURIComponent(code)}`,
      headers: wxHeaders(""),
      data: {},
    });
    if (status !== 200 || !ok(data) || !data?.Result) throw new Error(`登录失败 HTTP ${status}: ${short(data)}`);

    this.sId = data?.Extend?.crossAuth || data?.Data || "";
    this.memberId = data?.Extend?.memberId || "";
    if (!this.sId) throw new Error(`登录响应缺少 sId: ${short(data)}`);
    this.log(`登录成功 memberId=${this.memberId || "-"} sId=${mask(this.sId)}`);
  }

  async queryMember() {
    const { status, data } = await request({
      method: "POST",
      url: `${PERSONAL_BASE}/personalCenter/rightAndInterest/getBriefInfo`,
      headers: wxHeaders(this.sId),
      data: {},
    });
    if (status !== 200) throw new Error(`会员查询失败 HTTP ${status}: ${short(data)}`);
    const bc = String(data?.businessCode || '');
    if (data?.code !== 200 && bc !== '1000' && data?.Result !== true) throw new Error(`会员查询失败 HTTP ${status}: ${short(data)}`);

    const basic = data?.content?.basicInfo || {};
    const level = data?.content?.standardLevelInfo || {};
    this.memberId = basic.memberId || this.memberId;
    this.log(
      `会员信息: ${basic.name || basic.mobile || "-"}，等级: ${basic.memberLevelText || level.levelText || "-"}，积分: ${
        basic.point ?? "-"
      }，30天到期积分: ${basic.expireDay30Point ?? 0}，升级: ${level.upgradeText || "-"}`
    );
    return data;
  }

  async querySignHeader() {
    const { status, data } = await request({
      method: "GET",
      url: `${SIGN_BASE}/game/sign_header`,
      headers: signHeaders(this.sId),
    });
    if (status !== 200 || !ok(data)) throw new Error(`签到查询失败 HTTP ${status}: ${short(data)}`);

    const info = data?.content || {};
    this.log(
      `签到信息: 今日${info.signToday ? "已签" : "未签"}，签到积分: ${info.point ?? "-"}，会员积分: ${
        info.memberPoint ?? "-"
      }，年签到: ${info.yearSignInCount ?? "-"}，下个奖励: ${info.nextAwardName || "-"}`
    );
    return info;
  }

  async sign() {
    const before = await this.querySignHeader();
    if (before.signToday) {
      this.log("签到结果: 今日已签到");
      return before;
    }

    const date = Math.floor(Date.now() / 1000);
    const { status, data } = await request({
      method: "GET",
      url: `${SIGN_BASE}/game/sign_in`,
      params: { date },
      headers: signHeaders(this.sId),
    });

    if (ok(data)) {
      const content = data?.content || {};
      this.log(
        `签到结果: 成功，获得 ${content.point ?? "-"} 积分，活跃值 ${content.activityPoints ?? "-"}，年签到 ${
          content.yearSignInCount ?? "-"
        }`
      );
      return this.querySignHeader();
    }

    if (String(data?.businessCode) === "5010") {
      this.log("签到结果: 今日已签到");
      return this.querySignHeader();
    }
    throw new Error(`签到失败 HTTP ${status}: ${short(data)}`);
  }

  async run() {
    try {
      this.log("开始执行");
      await this.login();
      await this.queryMember();
      await this.sign();
      await this.queryMember();
    } catch (e) {
      this.log(`执行失败: ${e.message || e}`);
    }
  }
}

async function main() {
  $.checkEnv(ckName);
  const accounts = $.userList && $.userList.length ? $.userList : splitAccounts(process.env[ckName]);
  if (!accounts.length) {
    $.log(`未找到变量 ${ckName}`);
    return;
  }
  for (let i = 0; i < accounts.length; i++) {
    await new Huazhu(accounts[i], i + 1).run();
    if (i < accounts.length - 1) await $.wait(1500, 3000);
  }
}

main()
  .catch((e) => $.log(`脚本异常: ${e.message || e}`))
  .finally(() => $.done());
