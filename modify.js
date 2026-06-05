const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/consultar-demanda/page.tsx', 'utf8');

// 1. Add uploadingAnexo state
content = content.replace(
  '  const [searchResults, setSearchResults] = useState<any[] | null>(null);',
  '  const [searchResults, setSearchResults] = useState<any[] | null>(null);\n  const [uploadingAnexo, setUploadingAnexo] = useState(false);'
);

// 2. Add handleFileUpload function
const funcToAdd = `
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !demanda) return;
    setUploadingAnexo(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
      }
      const res = await fetch(\`/api/demanda/\${demanda.issue_key}/anexos\`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        handleSearch(demanda.issue_key);
      } else {
        alert('Erro ao enviar anexo');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar anexo');
    } finally {
      setUploadingAnexo(false);
      e.target.value = '';
    }
  };
`;

content = content.replace(
  '  const handleTransition = async (transitionId: string) => {',
  funcToAdd + '\n  const handleTransition = async (transitionId: string) => {'
);

// 3. Replace Attachments rendering
const oldAtt = `{demanda.attachments.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={S.label}><Paperclip size={12} /> Anexos ({demanda.attachments.length})</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>`;

const newAtt = `<div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={S.label}><Paperclip size={12} /> Anexos ({demanda.attachments.length})</label>
                      {editing && (
                        <div>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: uploadingAnexo ? 'not-allowed' : 'pointer', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}>
                            {uploadingAnexo ? <Loader2 size={10} className="animate-spin" /> : <Paperclip size={10} />}
                            {uploadingAnexo ? 'Enviando...' : 'Adicionar'}
                            <input type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadingAnexo} />
                          </label>
                        </div>
                      )}
                    </div>
                    {demanda.attachments.length > 0 ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>`;

content = content.replace(oldAtt, newAtt);

// Replace closing tags
const oldClose = `                      </div>
                    </div>
                  )}`;

const newClose = `                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Nenhum anexo encontrado.</p>
                    )}
                  </div>`;

content = content.replace(oldClose, newClose);

fs.writeFileSync('src/app/dashboard/consultar-demanda/page.tsx', content);
console.log('File modified successfully');
