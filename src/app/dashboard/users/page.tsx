import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';
import UsersManager from './UsersManager';

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await prisma.user.findMany({
    orderBy: [{ archivedAt: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      archivedAt: true,
      _count: { select: { posts: true } },
    },
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="users" title="People" />
      <UsersManager users={users} currentUserId={session.user.id} />
    </div>
  );
}
