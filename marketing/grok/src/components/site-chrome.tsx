import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { APP_URL } from "@/app-url";
import { socialLinks } from "@/social-links";

const NAV = [
  { label: "Field", to: "/", hash: "field" },
  { label: "Between points", to: "/", hash: "points" },
  { label: "Scout", to: "/", hash: "scout" },
  { label: "Sunday", to: "/", hash: "sunday" },
  { label: "Support", to: "/support", hash: undefined },
  { label: "Privacy", to: "/privacy", hash: undefined },
] as const;

export function Wordmark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img
      src="/brand/gridlock-wordmark.png"
      alt="Gridlock"
      width={1738}
      height={422}
      className={className}
    />
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15em] shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.76c.03 2.52 2.21 3.36 2.24 3.37-.02.06-.35 1.2-1.15 2.37-.69 1.01-1.41 2.02-2.54 2.04-1.11.02-1.47-.66-2.74-.66-1.27 0-1.67.64-2.72.68-1.09.04-1.92-1.09-2.62-2.1-1.43-2.06-2.52-5.82-1.05-8.36.73-1.26 2.03-2.06 3.44-2.08 1.07-.02 2.09.72 2.74.72.65 0 1.87-.89 3.15-.76.54.02 2.05.22 3.02 1.63-.08.05-1.8 1.05-1.77 3.15ZM14.7 5.9c.58-.7 1.63-1.24 2.47-1.28.11 1.01-.29 2.02-.86 2.74-.57.72-1.52 1.28-2.45 1.21-.13-.98.34-2.01.84-2.67Z"
      />
    </svg>
  );
}

function AndroidMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15em] shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M17.6 9.48 19.44 6.3c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"
      />
    </svg>
  );
}

export function Platforms({ className = "" }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      <span>Web app</span>
      <span className="inline-flex items-center gap-1.5">
        <AppleMark />
        iPhone / iPad
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AndroidMark />
        Android
      </span>
      <span>PC / Mac</span>
    </p>
  );
}

export function GetGridlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={APP_URL} className={className}>
      {children}
    </a>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Follow />
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const here = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    setOpen(false);
  }, [here]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="h-1 bg-primary" />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center text-fg lg:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          <Link
            to="/"
            hash="field"
            activeOptions={{ includeHash: true }}
            className="font-display text-lg font-bold uppercase tracking-wide text-fg hover:text-accent data-[status=active]:text-signal"
          >
            Field
          </Link>
          <Link
            to="/"
            hash="points"
            activeOptions={{ includeHash: true }}
            className="font-display text-lg font-bold uppercase tracking-wide text-fg hover:text-accent data-[status=active]:text-signal"
          >
            Points
          </Link>
          <Link
            to="/"
            hash="scout"
            activeOptions={{ includeHash: true }}
            className="font-display text-lg font-bold uppercase tracking-wide text-fg hover:text-accent data-[status=active]:text-signal"
          >
            Scout
          </Link>
          <Link
            to="/support"
            className="font-display text-lg font-bold uppercase tracking-wide text-fg hover:text-accent data-[status=active]:text-signal"
            activeProps={{ className: "text-signal" }}
          >
            Support
          </Link>
        </nav>
        <Link to="/" className="ml-auto shrink-0" aria-label="Gridlock Coach, home">
          <Wordmark className="h-8 w-auto sm:h-9" />
        </Link>
      </div>
      {open ? (
        <nav
          id="site-menu"
          className="fixed inset-x-0 bottom-0 top-header z-30 overflow-y-auto bg-bg px-5 py-2 lg:hidden"
          aria-label="Mobile"
        >
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              activeOptions={{ exact: true, includeHash: true }}
              className="flex min-h-14 items-center border-b border-line font-display text-3xl font-extrabold uppercase text-fg data-[status=active]:text-signal"
              activeProps={{ className: "text-signal" }}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073C24 5.446 18.627 0 12 0S0 5.373 0 12.073C0 18.062 4.388 23.027 10.125 23.927v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
      />
    </svg>
  );
}

const SOCIAL_MARKS = {
  facebook: FacebookMark,
  instagram: InstagramMark,
} as const;

function Follow() {
  const itemClass = "inline-flex min-h-11 items-center gap-2.5 font-display text-lg font-bold tracking-wide text-signal";
  return (
    <section className="border-t border-line" aria-label="Follow us">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <h2 className="display text-card text-fg">Follow us</h2>
        <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-2">
          {(Object.keys(socialLinks) as (keyof typeof socialLinks)[]).map((key) => {
            const { name, url } = socialLinks[key];
            const href = url.trim();
            const Mark = SOCIAL_MARKS[key];
            const body = (
              <>
                <Mark />
                <span>{name}</span>
              </>
            );
            return (
              <li key={key}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${itemClass} rounded-sm hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal`}
                  >
                    {body}
                  </a>
                ) : (
                  <span className={itemClass}>{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-inset">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10">
        <Wordmark className="block h-auto w-[240px] max-w-full self-start object-contain" />
        <p className="font-display text-lg font-bold uppercase tracking-wide text-fg">
          Gridlock System · powered by UPRA
        </p>
        <Platforms className="font-display text-lg font-bold tracking-wide text-signal" />
        <p className="text-signal">© 2026 Gridlock PB LLC · Florida, USA</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-1" aria-label="Footer">
          <Link to="/privacy" className="inline-flex min-h-11 items-center text-signal underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link to="/support" className="inline-flex min-h-11 items-center text-signal underline-offset-4 hover:underline">
            Support
          </Link>
          <a
            href="mailto:support@gridlockpb.com"
            className="inline-flex min-h-11 items-center text-signal underline-offset-4 hover:underline"
          >
            Email support
          </a>
        </nav>
      </div>
    </footer>
  );
}
