import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";

const formatNotificationTime = (date) => {
  if (!date) return "";

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(date));
};

export const Navbar = ({ user, onLogin, onLogout, navigate, unreadCount }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      setNotificationsError("");

      if (!user) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }

      setNotificationsLoading(true);

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const sessionUser = sessionData.session?.user;
        if (!sessionUser) {
          if (active) setNotifications([]);
          return;
        }

        const response = await fetch(`/api/notifications?user_id=${encodeURIComponent(sessionUser.id)}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load notifications right now.");
        }

        if (active) setNotifications(Array.isArray(payload?.data) ? payload.data : []);
      } catch (error) {
        if (active) {
          setNotifications([]);
          setNotificationsError(error instanceof Error ? error.message : "Unable to load notifications right now.");
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, [user]);

  const realUnreadCount = user ? notifications.filter((notification) => !notification.read_at).length : 0;

  const navGroups = [
    {
      name: "SwasthyaSathi",
      items: [
        { name: "SwasthyaSathi Products", path: "/tools/products", icon: "search" },
        { name: "Scanner", path: "/tools/products/scanner", icon: "camera" },
      ],
    },
    {
      name: "RaktaSetu",
      items: [
        { name: "Bloodwork Compare", path: "/tools/raktasetu", icon: "activity" },
        { name: "Upload Report", path: "/tools/raktasetu", icon: "fileText" },
      ],
    },
    {
      name: "Check",
      items: [
        { name: "Heart Health Risk", path: "/tools/heart-health", icon: "heart" },
        { name: "Brain Health Risk", comingSoon: true, icon: "activity" },
        { name: "Cancer Risk", comingSoon: true, icon: "shield" },
        { name: "Prostate Risk", comingSoon: true, icon: "user" },
        { name: "Breast Risk", comingSoon: true, icon: "heart" },
        { name: "Gut Health Risk", comingSoon: true, icon: "activity" },
        { name: "PCOS Reflection", path: "/tools/pcos", icon: "fileText" },
        { name: "Diabetes Risk", comingSoon: true, icon: "activity" },
        { name: "Metabolic Risk Profile", comingSoon: true, icon: "trendingUp" },
        { name: "Lung Cancer Risk", comingSoon: true, icon: "shield" },
      ],
    },
    {
      name: "Exercise Intelligence",
      items: [
        { name: "Fat Gain/Loss Prediction", path: "/tools/body-fat", icon: "scale" },
        { name: "BMI Calculator", comingSoon: true, icon: "activity" },
        { name: "Lean Mass Calculator", comingSoon: true, icon: "trendingUp" },
        { name: "Personalised Exercise Plan", comingSoon: true, icon: "calendar" },
        { name: "Intelligent Diet", comingSoon: true, icon: "zap" },
      ],
    },
    {
      name: "Parivar Health",
      items: [
        { name: "Parent Profile", path: "/dashboard/parents", icon: "users", note: "Rs 199/mo" },
        { name: "Family Profile", path: "/dashboard/parents", icon: "home", note: "From Rs 299/mo" },
      ],
    },
  ];
  const profileItems = [
    { id: "dashboard", name: "Dashboard", path: "/dashboard", icon: "home" },
    { id: "assessment-history", name: "Assessment History", path: "/dashboard/history", icon: "clock" },
    { id: "parent-profiles", name: "Parent Profiles", path: "/dashboard/parents", icon: "users" },
  ];
  const handleNavItem = (item) => {
    if (item.comingSoon) return;
    navigate(item.path);
    setOpenGroup(null);
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 glass border-b border-ink/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => navigate("/")} className="flex items-baseline leading-none">
              <span>
                <span className="serif text-2xl font-bold text-ink tracking-tight">CrossCheck</span>
                <span className="serif text-2xl font-bold text-aqua-deep tracking-tight italic">Health</span>
              </span>
            </button>
            <div className="hidden lg:flex items-center gap-1">
              {navGroups.map((group, index) => (
                <div key={group.name} className="relative">
                  <button onClick={() => setOpenGroup(openGroup === group.name ? null : group.name)}
                    className="flex items-center gap-1 px-3 py-2 rounded-full hover:bg-cream-warm text-sm font-medium text-ink/75 hover:text-ink transition-colors">
                    {group.name} <Icon name="chevronDown" size={14} />
                  </button>
                  {openGroup === group.name && (
                    <div className={`absolute top-full ${index >= 2 ? "right-0" : "left-0"} mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-3xl shadow-lift border border-ink/5 py-2 fade-in`}>
                      {group.items.map(item => (
                        <button key={item.name} onClick={() => handleNavItem(item)} disabled={item.comingSoon}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${item.comingSoon ? "text-ink/35 cursor-not-allowed" : "text-ink/75 hover:bg-cream"}`}>
                          <Icon name={item.icon} size={16} className={item.comingSoon ? "text-ink/25" : "text-aqua-deep"} />
                          <span className="flex-1">{item.name}</span>
                          {item.note && <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{item.note}</span>}
                          {item.comingSoon && <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Soon</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/support")} className="hidden lg:flex items-center gap-1 px-3 py-2 rounded-full hover:bg-cream-warm text-sm font-medium text-ink/75 hover:text-ink transition-colors">Support</button>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-full hover:bg-cream-warm relative">
                    <Icon name="bell" size={20} className="text-ink/65" />
                    {realUnreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full text-[10px] leading-5 text-white text-center font-semibold">{realUnreadCount}</span>}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-lift border border-ink/5 py-2 fade-in">
                      <div className="px-4 py-2 border-b border-ink/5 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">Notifications</span>
                        {realUnreadCount > 0 && <span className="text-xs text-gray-400">{realUnreadCount} unread</span>}
                      </div>
                      {notificationsLoading ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-gray-500">Loading notifications</p>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-gray-500">{notificationsError}</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 ${!n.read_at ? "bg-blue-50/50" : ""}`}>
                          <p className="text-sm font-medium text-gray-700">{n.title}</p>
                          {n.message && <p className="text-sm text-gray-600 mt-1">{n.message}</p>}
                          <div className="flex items-center justify-between gap-3 mt-1">
                            <p className="text-xs text-gray-400">{n.type || "notification"}</p>
                            <p className="text-xs text-gray-400">{formatNotificationTime(n.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-cream-warm transition-colors">
                    <div className="w-8 h-8 bg-ink rounded-full flex items-center justify-center text-cream text-sm font-medium">{user.name?.[0] || "U"}</div>
                    <span className="hidden sm:block text-sm font-medium text-ink/75">{user.name}</span>
                    <Icon name="chevronDown" size={14} className="text-ink/40 hidden sm:block" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-lift border border-ink/5 py-2 fade-in">
                      {profileItems.map(item => (
                        <button key={item.id} onClick={() => { navigate(item.path); setProfileOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream text-left text-sm text-ink/75 transition-colors">
                          <Icon name={item.icon} size={16} className="text-ink/40" />{item.name}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => { onLogout(); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-red-600 transition-colors">
                          <Icon name="logOut" size={16} />Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={onLogin}>Login</Button>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-full hover:bg-cream-warm"><Icon name={menuOpen ? "x" : "menu"} size={20} /></button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-ink/5 slide-up">
          <div className="px-4 py-3 space-y-1">
            {navGroups.map(group => (
              <div key={group.name} className="py-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">{group.name}</p>
                {group.items.map(item => (
                  <button key={item.name} onClick={() => handleNavItem(item)} disabled={item.comingSoon}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm font-medium ${item.comingSoon ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}>
                    <Icon name={item.icon} size={18} className={item.comingSoon ? "text-gray-300" : "text-teal-deep"} />
                    <span className="flex-1">{item.name}</span>
                    {item.note && <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{item.note}</span>}
                    {item.comingSoon && <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Soon</span>}
                  </button>
                ))}
              </div>
            ))}
            <div className="border-t border-gray-100 my-2" />
            <button onClick={() => { navigate("/support"); setMenuOpen(false); }} className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">Support</button>
            {user ? (
              <>
                <button onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">Dashboard</button>
                <button onClick={() => { onLogout(); setMenuOpen(false); }} className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-red-600">Logout</button>
              </>
            ) : (
              <Button variant="primary" fullWidth onClick={() => { onLogin(); setMenuOpen(false); }}>Login / Sign Up</Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
