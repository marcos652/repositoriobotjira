import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Tipo de arquivo não suportado: ${file.type}. Envie imagens, PDFs, Word ou Excel.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 15MB)' }, { status: 400 });
    }

    // Convert to base64 data URL (works on Vercel serverless — no filesystem needed)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Generate a display name
    const ext = file.name.split('.').pop() || 'file';
    const random = Math.random().toString(36).slice(2, 8);
    const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_${random}.${ext}`;

    return NextResponse.json({
      url: dataUrl,
      filename: file.name,
      displayName: filename,
      size: file.size,
      type: file.type,
      isImage: file.type.startsWith('image/'),
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Falha no upload', message: error?.message },
      { status: 500 }
    );
  }
}
