/**
 * 任务名称
 * name: script name
 * 定时规则
 * cron: 1 9 * * *
 */
const { sendNotify } = require('./sendNotify');

console.log('test scripts');
// QLAPI.notify('test scripts', 'test desc');
sendNotify('test scripts', 'test desc')
console.log('test desc');
