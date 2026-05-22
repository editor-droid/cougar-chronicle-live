import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import EditorForm from './EditorForm';

export default async function EditorPage({ params }: { params: { id: string } }) {
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
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <h1 className="font-serif" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        {id === 'new' ? 'Create New Draft' : 'Edit Post'}
      </h1>
      <EditorForm post={post} authorId={session.user.id} userRole={session.user.role} />
    </div>
  );
}
