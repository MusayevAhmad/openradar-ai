import { NextResponse } from 'next/server';
import { getStoredSettings, saveStoredSettings } from '@/lib/storage';

export async function GET() {
  return NextResponse.json(getStoredSettings());
}

export async function POST(req: Request) {
  try {
    const updated = await req.json();
    saveStoredSettings(updated);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
