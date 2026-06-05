const fs = require('fs');
let file = fs.readFileSync('src/app/dashboard/consultar-demanda/page.tsx', 'utf8');

const newCSS = `
        /* Clear all hardcoded Jira backgrounds to avoid white squares */
        .jira-description * { background-color: transparent !important; }
        .jira-description table, .jira-description th, .jira-description td, .jira-description tr, .jira-description tbody, .jira-description div, .jira-description span, .jira-description .panel, .jira-description .confluenceTable, .jira-description .confluenceTd, .jira-description .confluenceTh, .jira-description .confluence-information-macro, .jira-description [style*="background"] { background-color: transparent !important; background: transparent !important; }
        
        .jira-description code { font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 2px 6px; border-radius: 4px; background-color: rgba(99,102,241,0.08) !important; color: #A78BFA; }
        .jira-description pre { background-color: rgba(0,0,0,0.2) !important; border: 1px solid var(--border-secondary); border-radius: 8px; padding: 14px 18px; overflow-x: auto; margin: 12px 0; }
        .jira-description pre code { background-color: transparent !important; padding: 0; color: var(--text-secondary); }
        .jira-description blockquote { margin: 12px 0; padding: 10px 16px; border-left: 3px solid #818CF8; background-color: rgba(99,102,241,0.04) !important; border-radius: 0 8px 8px 0; }
        
        .jira-description table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; border: 1px solid var(--border-secondary) !important; }
        .jira-description th { padding: 10px 14px; text-align: left; font-weight: 700; color: var(--text-primary); border: 1px solid var(--border-secondary) !important; border-bottom: 2px solid var(--border-secondary) !important; }
        .jira-description td { padding: 8px 14px; border: 1px solid var(--border-secondary) !important; color: var(--text-secondary); }
        .jira-description img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .jira-description hr { border: none; border-top: 1px solid var(--border-secondary); margin: 16px 0; }
        
        .jira-description .user-hover { color: #818CF8; font-weight: 600; }
      \`}</style>
`;

file = file.replace(/        \.jira-description code \{[\s\S]*?      `\}<\/style>/, newCSS.trim());
fs.writeFileSync('src/app/dashboard/consultar-demanda/page.tsx', file);
