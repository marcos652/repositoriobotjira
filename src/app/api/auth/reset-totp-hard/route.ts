import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const projectPath = path.join(process.cwd(), 'data', 'totp.json');
    const tmpPath = '/tmp/jiraops-totp.json';

    let msgs = [];

    if (fs.existsSync(projectPath)) {
      fs.unlinkSync(projectPath);
      msgs.push('Deleted data/totp.json');
    }
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
      msgs.push('Deleted /tmp/jiraops-totp.json');
    }

    // Clear memory cache
    (globalThis as any)['__jiraops_totp_store__'] = new Map();
    (globalThis as any)['__jiraops_totp_store_ts__'] = 0;

    return NextResponse.json({ success: true, message: 'Hard reset complete', details: msgs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
