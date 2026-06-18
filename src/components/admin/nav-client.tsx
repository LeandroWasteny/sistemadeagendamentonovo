"use client";

import Link from "next/link";
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
  Scissors,
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

export function AdminNavClient({ logoutAction }: AdminNavClientProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadedPreference, setLoadedPreference] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("agenda-admin-nav-collapsed") === "true");
    setLoadedPreference(true);
  }, []);

  useEffect(() => {
    if (!loadedPreference) return;
    localStorage.setItem("agenda-admin-nav-collapsed", String(collapsed));
  }, [collapsed, loadedPreference]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const navGroups = useMemo(() => groups, []);
  const navId = "admin-sidebar-navigation";

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
        "relative z-40 border-b border-blue-100 bg-white/95 shadow-sm shadow-blue-950/5 backdrop-blur md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:border-b-0 md:border-r md:transition-[width] md:duration-200",
        collapsed ? "md:w-[76px]" : "md:w-[260px]"
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-4 md:py-5">
        <Link
          href="/admin"
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
            collapsed && "md:justify-center"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-slate-600 transition hover:bg-blue-50 hover:text-[#0F5EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2 md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls={navId}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-[12px] text-slate-600 transition hover:bg-blue-50 hover:text-[#0F5EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2 md:inline-flex"
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            aria-controls={navId}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight aria-hidden className="h-5 w-5" /> : <ChevronLeft aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="hidden px-4 pb-3 md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F5EF7]">Central de Gestao</p>
          <p className="mt-1 text-xs font-medium text-slate-400">Agenda Pra Ja</p>
        </div>
      )}

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
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                          ? "bg-blue-50 text-[#0F5EF7]"
                          : "text-slate-600 hover:bg-blue-50 hover:text-[#0F5EF7]"
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 h-6 w-1 rounded-r-full bg-[#0F5EF7]" aria-hidden="true" />
                      )}
                      <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active ? "text-[#0F5EF7]" : "text-slate-500 group-hover:text-[#0F5EF7]")} />
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
            "flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0F5EF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5EF7] focus-visible:ring-offset-2",
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
