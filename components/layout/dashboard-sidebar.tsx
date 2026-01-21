"use client";

import { useUIStore, type Widget } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface NavItem {
  id: Widget;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    id: "email",
    label: "Email",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    disabled: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    disabled: true,
  },
  {
    id: "notes",
    label: "Notes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    disabled: true,
  },
];

export function DashboardSidebar() {
  const { sidebarExpanded, activeWidget, setActiveWidget } = useUIStore();

  return (
    <aside
      className={cn(
        "bg-sidebar-bg border-r border-sidebar-border shrink-0",
        "transition-all duration-300 ease-in-out",
        sidebarExpanded ? "w-60" : "w-16"
      )}
    >
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && setActiveWidget(item.id)}
            disabled={item.disabled}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5",
              "transition-all duration-200",
              "focus-ring",

              // Active state
              activeWidget === item.id
                ? "bg-sidebar-item-active text-sidebar-icon-active"
                : "text-sidebar-icon hover:bg-sidebar-item-hover hover:text-sidebar-icon-active",

              // Disabled state
              item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-sidebar-icon",

              // Collapsed state
              !sidebarExpanded && "justify-center px-0"
            )}
            aria-label={item.label}
            title={!sidebarExpanded ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>

            {sidebarExpanded && (
              <span className="text-sm font-medium truncate">{item.label}</span>
            )}

            {sidebarExpanded && item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom section - Coming soon indicator */}
      {sidebarExpanded && (
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="text-xs text-foreground-muted text-center py-2 px-3 bg-background-secondary rounded-lg">
            More widgets coming soon
          </div>
        </div>
      )}
    </aside>
  );
}
