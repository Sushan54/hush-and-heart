import { Link } from "@tanstack/react-router";
import brandLogo from "@/assets/brand-logo.svg";
import brandMark from "@/assets/brand-mark.svg";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="MIDNIGHT CONFESSIONS home">
      <img
        src={compact ? brandMark : brandLogo}
        alt="Midnight Confessions"
        className={compact ? "size-10" : "h-11 w-[205px]"}
      />
    </Link>
  );
}
