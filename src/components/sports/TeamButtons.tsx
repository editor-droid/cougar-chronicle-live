import Link from 'next/link';
import { SPORT_SPECS, teamHref } from '@/lib/scores/paths';

export default function TeamButtons() {
  return (
    <nav className="sports-teams" aria-label="Teams">
      {Object.values(SPORT_SPECS).map((spec) => (
        <Link key={spec.key} href={teamHref(spec.key)} className="sports-teams__link">
          {spec.label}
        </Link>
      ))}
    </nav>
  );
}
