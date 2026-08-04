import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, pdfUrl, coverImageUrl, isActive } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const edition = await prisma.printEdition.create({
      data: {
        title,
        pdfUrl: pdfUrl || '',
        coverImageUrl: coverImageUrl || null,
        isActive: isActive !== false,
      }
    });

    return NextResponse.json(edition);
  } catch (error) {
    console.error('Error creating print edition:', error);
    return NextResponse.json({ error: 'Failed to create print edition' }, { status: 500 });
  }
}
