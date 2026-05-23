import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await req.json();
    const { title, pdfUrl, coverImageUrl, isActive } = body;

    const edition = await prisma.printEdition.update({
      where: { id },
      data: {
        title,
        pdfUrl,
        coverImageUrl,
        isActive
      }
    });

    return NextResponse.json(edition);
  } catch (error) {
    console.error('Error updating print edition:', error);
    return NextResponse.json({ error: 'Failed to update print edition' }, { status: 500 });
  }
}
