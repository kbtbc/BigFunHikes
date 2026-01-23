import { Link, useLocation } from "react-router-dom";
import { Mountain, BookOpen, LogOut, Shield, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const location = useLocation();
  const { isAuthenticated, isLoading, logout } = useAuth();

  const navItems = [
    { path: "/", label: "Home", icon: Mountain },
    { path: "/timeline", label: "Journal", icon: BookOpen },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
              <Mountain className="h-6 w-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold font-outfit">BigFun Hikes!</h1>
              <p className="text-xs text-muted-foreground">
                Appalachian Trail 2026
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            {/* New Entry Button (only for authenticated users) */}
            {!isLoading && isAuthenticated && (
              <Link
                to="/entries/new"
                className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors",
                  location.pathname === "/entries/new"
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground bg-accent/50 hover:bg-accent"
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Link>
            )}

            {/* Admin Button - always visible */}
            {!isLoading && !isAuthenticated && (
              <Link to="/admin" title="Admin Login">
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}

            {/* Admin Logout - just icons */}
            {!isLoading && isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="ml-2"
                title="Logout"
              >
                <Shield className="h-4 w-4" />
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
