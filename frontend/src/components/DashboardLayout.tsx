import { NavLink, Outlet, useLocation } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { VercelLogo } from "./ui/VercelLogo";
import { Separator } from "./ui/separator";
import { useState, useEffect } from "react";

interface NavChild {
  to: string;
  label: string;
}

interface NavItemFlat {
  to: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  children?: never;
}

interface NavItemGroup {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  children: NavChild[];
  to?: never;
}

type NavItem = NavItemFlat | NavItemGroup;

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  {
    label: "Finance",
    icon: CreditCard,
    children: [
      { to: "/dashboard/invoices", label: "Invoices" },
      { to: "/dashboard/payments", label: "Payments" },
      { to: "/dashboard/scan-receipt", label: "Scan Receipts" },
      { to: "/dashboard/invoice-prevet", label: "Invoice Pre-vet" },
      { to: "/dashboard/hitl-review", label: "HITL Review" },
    ],
  },
  {
    label: "Data Hub",
    icon: Users,
    children: [
      { to: "/dashboard/clients", label: "Clients" },
      { to: "/dashboard/inventory", label: "Inventory" },
    ],
  },
  {
    label: "Credits and Compliance",
    icon: ShieldCheck,
    children: [
      { to: "/dashboard/passport", label: "Regional Passport" },
      { to: "/dashboard/readiness", label: "Readiness" },
      { to: "/dashboard/ctos", label: "AI CTOS" },
      { to: "/dashboard/registry", label: "Registry" },
      { to: "/dashboard/compliance", label: "Compliance" },
    ],
  },
  { to: "/dashboard/whatsapp", icon: MessageSquare, label: "WhatsApp Sandbox" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function SidebarGroup({
  item,
  isOpen,
  onToggle,
}: {
  item: NavItemGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const isChildActive = item.children.some(
    (child) => location.pathname === child.to
  );

  return (
    <div
      className="sidebar-group"
      onMouseEnter={() => {
        if (!isOpen) onToggle();
      }}
      onMouseLeave={() => {
        if (!isChildActive && isOpen) onToggle();
      }}
    >
      <button
        className={`sidebar-group-header ${isOpen || isChildActive ? "expanded" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen || isChildActive}
      >
        <div className="sidebar-group-left">
          <item.icon size={16} strokeWidth={1.8} />
          <span>{item.label}</span>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`sidebar-chevron ${isOpen || isChildActive ? "rotated" : ""}`}
        />
      </button>
      <div
        className={`sidebar-submenu ${isOpen || isChildActive ? "open" : ""}`}
      >
        <div className="sidebar-submenu-inner">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `sidebar-link sidebar-sublink ${isActive ? "active" : ""}`
              }
            >
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user } = useUser();
  const location = useLocation();

  // Initialize open menus based on current route
  const getInitialOpenMenus = () => {
    const initial = new Set<string>();
    NAV_ITEMS.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) => location.pathname === child.to
        );
        if (isChildActive) initial.add(item.label);
      }
    });
    return initial;
  };

  const [openMenus, setOpenMenus] = useState<Set<string>>(getInitialOpenMenus);

  // Keep menus in sync when route changes
  useEffect(() => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      NAV_ITEMS.forEach((item) => {
        if (item.children) {
          const isChildActive = item.children.some(
            (child) => location.pathname === child.to
          );
          if (isChildActive) next.add(item.label);
        }
      });
      return next;
    });
  }, [location.pathname]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar border-r border-border bg-card shadow-sm">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <VercelLogo />
            <span className="sidebar-brand-text font-semibold tracking-tight">FinanceFlow</span>
          </div>
        </div>
        <Separator className="mx-2" />
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.label}
                item={item}
                isOpen={openMenus.has(item.label)}
                onToggle={() => toggleMenu(item.label)}
              />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <item.icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        <Separator className="mx-2" />
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <UserButton afterSignOutUrl="/" />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.firstName ||
                  user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
                  "User"}
              </span>
              <span className="sidebar-user-email">
                {user?.emailAddresses[0]?.emailAddress || ""}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <VercelLogo />
            <ChevronRight size={14} className="topbar-separator" />
            <span className="topbar-project">FinanceFlow</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-email">
              {user?.emailAddresses[0]?.emailAddress}
            </span>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
