import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import EditorForm from './EditorForm';
import { recordEditorOpened } from '@/lib/desk-reminders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  
  const { id } = await params;
  
  let post = null;
  if (id !== 'new') {
    post = await prisma.post.findUnique({
      where: { id },
      include: {
        editorialNotes: {
          include: { author: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    // Writers can only edit their own drafts
    if (post && post.authorId !== session.user.id && session.user.role === 'WRITER') {
      redirect('/dashboard');
    }

    if (post) {
      try {
        await recordEditorOpened({
          postId: post.id,
          title: post.title,
          state: post.state,
          assignedWriterId: post.assignedWriterId,
          deskNotices: post.deskNotices,
          openerId: session.user.id,
          openerName: session.user.name,
          openerRole: session.user.role,
        });
      } catch (error) {
        console.error('Failed to record editor open', error);
      }
    }
  }

  let authors: any[] = [];
  let customAuthorsList: string[] = [];
  
  if (session.user.role === 'ADMIN' || session.user.role === 'EDITOR') {
    authors = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'EDITOR', 'WRITER'] }, archivedAt: null },
      orderBy: { name: 'asc' }
    });

    const distinctAuthors = await prisma.post.findMany({
      where: { customAuthor: { not: null } },
      select: { customAuthor: true },
      distinct: ['customAuthor'],
      orderBy: { customAuthor: 'asc' }
    });
    customAuthorsList = distinctAuthors.map(a => a.customAuthor as string).filter(a => a && a.trim() !== '');
  }

  const printEditions = await prisma.printEdition.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, isActive: true },
  });

  return (
    <div className="container editor-full-width animate-fade-in" style={{ marginTop: '2rem' }}>
      <EditorForm 
        post={post} 
        authorId={session.user.id} 
        userRole={session.user.role} 
        availableAuthors={authors} 
        customAuthorsList={customAuthorsList}
        printEditions={printEditions}
        isNew={id === 'new'}
      />
    </div>
  );
}
