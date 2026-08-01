const { Env } = require('../tools/env');
const $ = new Env('SMTP测试');

!(async () => {
  $.log('✅ 这是一封 SMTP 测试邮件');
  $.log('如果你收到这封邮件，说明配置完全正确');
})()
.finally(() => $.done());