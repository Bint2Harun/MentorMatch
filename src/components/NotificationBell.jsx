import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { BellIcon } from "./Icons";

const POLL_INTERVAL_MS = 30000;

function relativeTime(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("get_my_notifications");

    if (error) return;
    if (data) setItems(data);
  }, [user]);

  useEffect(() => {
    // Initial fetch + resubscribe: load flips no synchronous loading flag, but
    // the rule still reads the awaited setState as a cascading render.
    /* eslint-disable react-hooks/set-state-in-effect */
    load();
    /* eslint-enable react-hooks/set-state-in-effect */

    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    const onMouseDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const markRead = async (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("id", id);
  };

  const markAllRead = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", unreadIds);
  };

  const handleItemClick = (notification) => {
    if (!notification.is_read) markRead(notification.id);

    setOpen(false);

    if (notification.booking_id) {
      navigate("/student-bookings");
    }
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="notification-bell" ref={wrapRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((isOpen) => !isOpen);
          load();
        }}
      >
        <BellIcon width={20} height={20} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="notification-empty">You&rsquo;re all caught up.</p>
          ) : (
            <ul className="notification-list">
              {items.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? "" : "notification-item-unread"
                  }`}
                  onClick={() => handleItemClick(notification)}
                >
                  <div className="notification-title">
                    {notification.title}
                  </div>

                  <div className="notification-body">{notification.body}</div>

                  <div className="notification-time">
                    {relativeTime(notification.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;