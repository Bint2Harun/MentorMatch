import { useState } from "react";
import { supabase } from "../lib/supabase";
import { friendlyBookingError } from "../lib/bookingErrors";
import {
  isZonedWallTimeInPast,
  zonedWallTimeToUtc,
  formatInstantRangeLocal,
} from "../lib/timezones";

/**
 * Reschedule an existing booking through reschedule_booking(). Times are
 * entered in the mentor's wall clock (exactly like the booking forms); the
 * student sees the resulting instant in their own timezone. A rescheduled
 * session returns to 'pending' for the mentor to re-confirm.
 */
function RescheduleModal({ booking, onClose, onRescheduled }) {
  const [date, setDate] = useState(booking.scheduled_date);
  const [startTime, setStartTime] = useState(
    (booking.start_time || "10:00").slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    (booking.end_time || "11:00").slice(0, 5)
  );
  const [notes, setNotes] = useState(booking.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const localPreview =
    date && startTime && endTime
      ? formatInstantRangeLocal(
          zonedWallTimeToUtc(date, startTime, booking.timezone),
          zonedWallTimeToUtc(date, endTime, booking.timezone)
        )
      : "";

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!date) {
      setErrorMessage("Please choose a date.");
      return;
    }

    if (date < today) {
      setErrorMessage("Booking date cannot be in the past.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (isZonedWallTimeInPast(date, startTime, booking.timezone)) {
      setErrorMessage("Choose a future date and time.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc("reschedule_booking", {
      p_booking_id: booking.id,
      p_scheduled_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_notes: notes.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(friendlyBookingError(error));
      return;
    }

    onRescheduled();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Reschedule Session</h2>

          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="dashboard-info-card reschedule-mentor">
            <div className="dashboard-info-label">Mentor</div>
            <div className="dashboard-info-value">{booking.mentorName}</div>
          </div>

          <div className="edit-profile-field">
            <label htmlFor="reschedule-date">Date</label>
            <input
              id="reschedule-date"
              type="date"
              value={date}
              min={today}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="grid-3">
            <div>
              <label>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>

            <div>
              <label>End</label>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <p className="dashboard-muted-text">
            Times are in the mentor&rsquo;s timezone ({booking.timezone}).
          </p>

          {localPreview && (
            <p className="reschedule-local-preview">
              In your local time: {localPreview}
            </p>
          )}

          {booking.status === "confirmed" && (
            <p className="reschedule-warning">
              This session is currently accepted. Rescheduling will move it back
              to pending so the mentor can re-confirm the new time.
            </p>
          )}

          <div className="edit-profile-field">
            <label htmlFor="reschedule-notes">Notes (optional)</label>
            <textarea
              id="reschedule-notes"
              value={notes}
              rows={3}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything the mentor should know about the change?"
            />
          </div>

          {errorMessage && (
            <div className="dashboard-error-message">{errorMessage}</div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Rescheduling..." : "Request new time"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RescheduleModal;