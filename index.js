let http=require('http')
let https=require('https')
const WebhooksApi = require('@vanderlaan/gitlab-webhooks')
const webhooks = new WebhooksApi({
  secret: 'mysecret'
})

webhooks.on('Push Hook', ({id, name, payload}) => {
  const {before, after, user_name, project: { web_url, namespace, name: project_name }} = payload
  const branch_name = payload.ref.split('/').pop()
  const branch_url  = `${web_url}/commits/${branch_name}`
  const branch_link = `<${branch_url}|${branch_name}>`
  const project_link = `<${web_url}|${namespace} / ${project_name}>`
  const compare_url = `${web_url}/compare/${before}...${after}`
  const compare_link = `<${compare_url}|Compare changes>`
  const commits = payload.commits.map(c => `> <${c.url}|${c.id.substr(0,8)}>: ${c.title} - ${c.author.name}`).join('\n').replace(/\"/g, '\\"')
  const msg = `${user_name} pushed to branch ${branch_link} of ${project_link} (${compare_link})\n${commits}`
  const data = `payload={"text": "${msg}"}`

  const options = {
    hostname: 'chat.synology.com',
    path: '/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=%22A33vUQlfN4ETsuJonT7pVsYxiDbhPWVnCG078pHQ1JGEdSo8zKqWuAkQ3JzTT2LQ%22',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
  });
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  // Write data to request body
  req.write(data);
  req.end();
})

webhooks.on('Tag Push Hook', ({id, name, payload}) => {
  const {user_name, ref, project: { web_url, namespace, name: project_name }} = payload
  const tag_name = ref.split('/').pop()
  const tag_url  = `${web_url}/-/tags/${tag_name}`
  const msg = `${user_name} pushed new tag <${tag_url}|${tag_name}> to <${web_url}|${namespace} / ${project_name}>`
  const data = `payload={"text": "${msg}"}`

  const options = {
    hostname: 'chat.synology.com',
    path: '/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=%22A33vUQlfN4ETsuJonT7pVsYxiDbhPWVnCG078pHQ1JGEdSo8zKqWuAkQ3JzTT2LQ%22',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
  });
  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  // Write data to request body
  req.write(data);
  req.end();
})

http.createServer(webhooks.middleware).listen(3000)
// can now receive webhook events at port 3000
