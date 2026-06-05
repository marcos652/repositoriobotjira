const url = 'https://movingpay.atlassian.net/rest/api/3/search?jql=text~"Divergencia"';
const token = Buffer.from('marcos.vinicius@movingpay.com.br:ATATT3xFfGF0cQGlscENFeaMAeSInP-2-krRBaxdPI-x9gDhMPh6rDaZ0w9WlR3AHuxWkijgtzkQ8TnebuO2oolBQyByO9nl4q58fsQf7sDwJSDDSwGFsG9J1CjMO-fJiwrqmhvFHvdud_UWyflHlG4FtqgzVKBN6BJIJ6S9-Ws5EaLVHXlHLT8=49CF867A').toString('base64');

fetch(url, { headers: { Authorization: 'Basic ' + token } })
  .then(res => res.json())
  .then(data => {
      if(data.issues && data.issues.length > 0) {
          const key = data.issues[0].key;
          console.log('Issue found:', key);
          return fetch('https://movingpay.atlassian.net/rest/api/3/issue/' + key + '?expand=renderedFields', { headers: { Authorization: 'Basic ' + token } })
            .then(r => r.json())
            .then(d => {
                const fs = require('fs');
                fs.writeFileSync('jira_html.txt', d.renderedFields.description);
                console.log('Saved HTML to jira_html.txt');
            });
      } else {
          console.log('Not found');
      }
  })
  .catch(err => console.error(err));
