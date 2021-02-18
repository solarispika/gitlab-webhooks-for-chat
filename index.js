let http=require('http')
let https=require('https')

const required_env = [ 'GITLAB_SECRET', 'CHAT_WEBHOOK' ]
if (!required_env.every(e => Object.keys(process.env).includes(e))) {
  console.log('The following environment variables are required:', required_env.join());
  process.exit(1)
}

const WebhooksApi = require('@vanderlaan/gitlab-webhooks')
const webhooks = new WebhooksApi({
  secret: process.env.GITLAB_SECRET
})

const chat_url = new URL(process.env.CHAT_WEBHOOK)

function send_hook(data)
{
  const options = {
    hostname: chat_url.hostname,
    path: `${chat_url.pathname}${chat_url.search}`,
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
}

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

  send_hook(data)
})

webhooks.on('Tag Push Hook', ({id, name, payload}) => {
  const {user_name, ref, project: { web_url, namespace, name: project_name }} = payload
  const tag_name = ref.split('/').pop()
  const tag_url  = `${web_url}/-/tags/${tag_name}`
  const msg = `${user_name} pushed new tag <${tag_url}|${tag_name}> to <${web_url}|${namespace} / ${project_name}>`
  const data = `payload={"text": "${msg}"}`

  send_hook(data)
})

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

function target_status(status)
{
  switch (status) {
    case 'pending':
    case 'running':
    case 'skipped':
    case 'canceled':
    case 'unknown':
    case 'passed':
      return false
    case 'failed':
      return true
  }
  return false
}

webhooks.on('Pipeline Hook', ({id, name, payload}) => {
  const {object_attributes: {
    id: pipeline_id, detailed_status, duration: dur_in_seconds, ref
  }, user: { name: username, username: user_id }, project: { web_url, namespace, name: project_name }} = payload
  if (!target_status(detailed_status)) {
    return
  }
  const pipeline_url = `${web_url}/-/pipelines/${pipeline_id}`
  const duration = seconds => new Date(seconds* 1000).toISOString().substr(14, 5)
  const pipeline_status = `Pipeline #${pipeline_id} has ${detailed_status} in ${duration(dur_in_seconds)}`
  const branch_name = ref.split('/').pop()
  const branch_url  = `${web_url}/commits/${branch_name}`
  const space_padding = size => Array(size).fill(' ').join('')
  const padding = (str, width) => space_padding((width - str.length).clamp(0, width))
  const msgs = [
    `${username} (${user_id})`,
    `<${pipeline_url}|${pipeline_status}>`,
    `Branch          Commit`,
    `<${branch_url}|${branch_name}>${padding(branch_name, 16)}<${payload.commit.url}|${payload.commit.title.replace(/[<>]/g, '')}>`
  ].map(m => `> ${m}`).join('\n')
  const data = `payload={"text": "${msgs}"}`

  send_hook(data)
});

http.createServer(webhooks.middleware).listen(3000)
// can now receive webhook events at port 3000
