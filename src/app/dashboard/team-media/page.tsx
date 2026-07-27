import { redirect } from 'next/navigation';

/** @deprecated Split into /dashboard/team and /dashboard/media */
export default function TeamMediaRedirect() {
  redirect('/dashboard/team');
}
