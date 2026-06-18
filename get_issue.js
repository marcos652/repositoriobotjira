const JIRA_BASE_URL = 'https://movingpay.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const issueKey = 'DSMM-136';

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, {
  headers: {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data.fields.description))
.catch(console.error);
