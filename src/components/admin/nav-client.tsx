"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  Scissors,
  Sun,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

type AdminNavClientProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
};

const groups = [
  {
    label: "Principal",
    links: [
      { href: "/admin", label: "Dashboard", icon: Home },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays }
    ]
  },
  {
    label: "Gestao",
    links: [
      { href: "/admin/servicos", label: "Servicos", icon: Scissors },
      { href: "/admin/profissionais", label: "Profissionais", icon: Users },
      { href: "/admin/horarios", label: "Horarios", icon: Clock }
    ]
  },
  {
    label: "Analise",
    links: [{ href: "/admin/relatorios", label: "Relatorios", icon: BarChart3 }]
  },
  {
    label: "Configuracao",
    links: [{ href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle }]
  }
];

const themeOptions = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "mixed", label: "Misto", icon: Palette },
  { value: "dark", label: "Escuro", icon: Moon }
];

export function AdminNavClient({ logoutAction }: AdminNavClientProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [loadedPreference, setLoadedPreference] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("agenda-admin-nav-collapsed") === "true");
    setLoadedPreference(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loadedPreference) return;
    localStorage.setItem("agenda-admin-nav-collapsed", String(collapsed));
  }, [collapsed, loadedPreference]);

  useEffect(() => {
    setMobileOpen(false);
    setThemeMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen && !themeMenuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setThemeMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, themeMenuOpen]);

  const navGroups = useMemo(() => groups, []);
  const navId = "admin-sidebar-navigation";
  const themeMenuId = "admin-theme-menu";
  const activeTheme = mounted ? theme ?? "light" : "light";
  const currentTheme = themeOptions.find((option) => option.value === activeTheme) ?? themeOptions[0];
  const CurrentThemeIcon = currentTheme.icon;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px] md:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "relative z-40 border-b text-[var(--sidebar-text)] backdrop-blur [background:var(--sidebar-bg)] [box-shadow:0_16px_40px_var(--shadow-soft)] md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:border-b-0 md:border-r md:transition-[width] md:duration-200",
          "border-[var(--sidebar-border)]",
          collapsed ? "md:w-[76px]" : "md:w-[260px]"
        )}
      >
      <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-4 md:py-5">
        <Link
          href="/admin"
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
            collapsed ? "md:justify-center" : "bg-white/90 px-2 py-1.5 shadow-sm shadow-blue-950/10"
          )}
          aria-label="Agenda Pra Ja - Central de Gestao"
        >
          <BrandLogo
            size="sm"
            showName={!collapsed}
            className={cn("min-w-0 transition-all", collapsed && "md:gap-0")}
            iconClassName={collapsed ? "md:h-9 md:w-9" : undefined}
            wordmarkClassName="origin-left scale-[0.86]"
          />
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-active-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2 md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls={navId}
            onClick={() => {
              setMobileOpen((value) => !value);
              setThemeMenuOpen(false);
            }}
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-[12px] text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-active-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2 md:inline-flex"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            aria-controls={navId}
            onClick={() => {
              setCollapsed((value) => !value);
              setThemeMenuOpen(false);
            }}
          >
            {collapsed ? <ChevronRight aria-hidden className="h-5 w-5" /> : <ChevronLeft aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={cn("relative px-4 pb-3", collapsed && "hidden px-3 md:block")}>
        {!collapsed ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sidebar-heading)]">Central de Gestao</p>
              <p className="mt-1 text-xs font-medium text-[var(--sidebar-muted)]">Agenda Pra Ja</p>
            </div>
            <ThemeButton
              activeLabel={currentTheme.label}
              controls={themeMenuId}
              expanded={themeMenuOpen}
              icon={CurrentThemeIcon}
              onClick={() => setThemeMenuOpen((value) => !value)}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <ThemeButton
              activeLabel={currentTheme.label}
              controls={themeMenuId}
              expanded={themeMenuOpen}
              icon={CurrentThemeIcon}
              onClick={() => setThemeMenuOpen((value) => !value)}
            />
          </div>
        )}

        {themeMenuOpen && (
          <div
            id={themeMenuId}
            role="menu"
            className={cn(
              "absolute top-10 z-50 w-40 rounded-[16px] border border-[var(--sidebar-border)] bg-[var(--surface-strong)] p-1.5 text-[var(--text-strong)] shadow-xl shadow-blue-950/15",
              collapsed ? "left-3" : "right-4"
            )}
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = option.value === activeTheme;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-[12px] px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7]",
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--brand-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-tint)] hover:text-[var(--text-strong)]"
                  )}
                  onClick={() => {
                    setTheme(option.value);
                    setThemeMenuOpen(false);
                  }}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <nav
        id={navId}
        className={cn(
          "px-3 pb-3 md:flex-1 md:overflow-y-auto",
          mobileOpen ? "block" : "hidden md:block"
        )}
        aria-label="Navegacao administrativa"
      >
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sidebar-muted)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={collapsed ? link.label : undefined}
                      aria-label={collapsed ? link.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
                        collapsed && "md:justify-center md:px-0",
                        active
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-active-text)]"
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 h-6 w-1 rounded-r-full bg-[#0F5EF7]" aria-hidden="true" />
                      )}
                      <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active ? "text-[var(--sidebar-active-text)]" : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-active-text)]")} />
                      {!collapsed && <span className="truncate">{link.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <form
        action={logoutAction}
        className={cn("px-3 pb-4", mobileOpen ? "block" : "hidden md:block")}
      >
        <button
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm font-semibold text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-active-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
            collapsed && "md:justify-center md:px-0"
          )}
          title={collapsed ? "Sair" : undefined}
          aria-label={collapsed ? "Sair" : undefined}
        >
          <LogOut aria-hidden className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </form>
    </aside>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type ThemeButtonProps = {
  activeLabel: string;
  controls: string;
  expanded: boolean;
  icon: typeof Sun;
  onClick: () => void;
};

function ThemeButton({ activeLabel, controls, expanded, icon: Icon, onClick }: ThemeButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[var(--sidebar-muted)] transition hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-active-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2"
      title={`Tema: ${activeLabel}`}
      aria-label={`Escolher tema. Atual: ${activeLabel}`}
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="menu"
      onClick={onClick}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
}
