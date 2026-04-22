import React, { useEffect, useMemo, useRef, useState } from "react";
import { Armchair, MousePointer2, Search, ShieldCheck, Ticket } from "lucide-react";
import { fetchTrials, saveTrial } from "../api/trials";
import {
  buildSeats,
  createSession,
  deriveMetrics,
  formatMetricValue,
  gradeColors,
  isValidTrackForStage,
  prices,
  queueDuration,
  relativeMs,
  resolveCategory,
  seatCols,
} from "../tracking/core";

function shellStyle() {
  return {
    background: "#16181d",
    border: "1px solid #2c3138",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
  };
}

function cardStyle(light = false) {
  return {
    background: light ? "#f5f7fb" : "#0f1217",
    border: `1px solid ${light ? "#d5dce6" : "#232832"}`,
    borderRadius: 18,
    padding: 18,
  };
}

function sectionTitleStyle() {
  return {
    margin: "0 0 16px",
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: 700,
  };
}

function buttonStyle(options = {}) {
  const { accent = false, subtle = false, disabled = false } = options;
  return {
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#9ca3af" : accent ? "#f97316" : subtle ? "#e5e7eb" : "#1f2937",
    color: accent || !subtle ? "#fff" : "#111827",
    opacity: disabled ? 0.7 : 1,
  };
}

function inputStyle() {
  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    padding: "12px 14px",
    fontSize: 14,
  };
}

function SectionShell({ title, children }) {
  return (
    <section style={shellStyle()}>
      <h2 style={sectionTitleStyle()}>{title}</h2>
      {children}
    </section>
  );
}

function StageBadge({ currentStage }) {
  const labels = [
    ["intro", "Intro"],
    ["queue", "Queue"],
    ["captcha", "Captcha"],
    ["booking", "Seat Select"],
    ["confirmed", "Confirmed"],
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {labels.map(([key, label]) => (
        <div
          key={key}
          style={{
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 700,
            background: currentStage === key ? "#f97316" : "#1f2937",
            color: "#fff",
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function HeroPanel({ onStart }) {
  return (
    <SectionShell title="Start Booking">
      <div
        style={{
          ...cardStyle(true),
          display: "grid",
          gap: 20,
          textAlign: "left",
          color: "#111827",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            width: "fit-content",
            borderRadius: 999,
            background: "#fff7ed",
            color: "#ea580c",
            padding: "8px 12px",
            fontWeight: 700,
          }}
        >
          <Ticket size={16} />
          Browser Booking Flow
        </div>
        <div>
          <h3 style={{ margin: "0 0 10px", fontSize: 34, lineHeight: 1.15 }}>Click to start a measurable booking flow</h3>
          <p style={{ margin: 0, maxWidth: 760, color: "#475569", lineHeight: 1.7 }}>
            From this point on, click, mousemove, hover, and scroll signals are collected in real time. The dashboard
            below updates until right before seat confirmation.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <InfoCard icon={ShieldCheck} title="Queue" description="10 second wait with countdown based progression." />
          <InfoCard icon={Ticket} title="Captcha" description="The fixed captcha token is capcha." />
          <InfoCard icon={Armchair} title="Seat Select" description="Seat choice and confirmation produce the main click features." />
        </div>
        <div>
          <button type="button" style={buttonStyle({ accent: true })} onClick={onStart}>
            Start Booking
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function InfoCard({ icon, title, description }) {
  const IconComponent = icon;

  return (
    <div style={{ ...cardStyle(false), color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fb923c", fontWeight: 700 }}>
        <IconComponent size={16} />
        <span>{title}</span>
      </div>
      <p style={{ margin: "10px 0 0", color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function QueuePanel({ secondsLeft, onSkip }) {
  const aheadCount = Math.max(0, Math.ceil((secondsLeft / queueDuration) * 2487));
  const progress = Math.round(((queueDuration - secondsLeft) / queueDuration) * 100);

  return (
    <SectionShell title="Queue">
      <div style={{ ...cardStyle(true), color: "#111827" }}>
        <div style={{ ...cardStyle(true), maxWidth: 560, margin: "0 auto", display: "grid", gap: 24 }}>
          <div
            style={{
              margin: "0 auto",
              width: 280,
              background: "#111827",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              padding: "24px 16px",
              textAlign: "center",
              borderRadius: 16,
            }}
          >
            Waiting for your turn
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>People ahead</span>
              <strong>{aheadCount.toLocaleString()}</strong>
            </div>
            <div style={{ height: 14, borderRadius: 999, background: "#d1d5db", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#f97316" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280" }}>
              <span>Estimated wait</span>
              <span>{secondsLeft}s</span>
            </div>
          </div>
          <button type="button" style={buttonStyle({ subtle: true })} data-track-id="queue-skip" onClick={onSkip}>
            Skip to captcha
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function CaptchaPanel({ value, onChange, onSubmit, error }) {
  return (
    <SectionShell title="Captcha">
      <div style={{ ...cardStyle(true), display: "flex", justifyContent: "center", minHeight: 360 }}>
        <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 18, alignContent: "center" }}>
          <div
            style={{
              height: 144,
              display: "grid",
              placeItems: "center",
              background: "#dc2626",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 4,
              borderRadius: 16,
              fontSize: 28,
            }}
          >
            capcha
          </div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type capcha"
            style={inputStyle()}
            data-track-id="captcha-input"
          />
          {error ? <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <button type="button" style={buttonStyle({ accent: true })} data-track-id="captcha-confirm" onClick={onSubmit}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function SeatGrid({ seats, selectedSeatIds, onToggleSeat }) {
  return (
    <div style={{ ...cardStyle(false), background: "#111827" }}>
      <div
        style={{
          background: "#2563eb",
          color: "#fff",
          textAlign: "center",
          borderRadius: 10,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Stage
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${seatCols}, minmax(0, 1fr))`,
          gap: 6,
        }}
      >
        {seats.map((seat) => {
          const isSelected = selectedSeatIds.includes(seat.id);
          const background = !seat.available ? "#374151" : isSelected ? "#f97316" : gradeColors[seat.grade];
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => seat.available && onToggleSeat(seat.id)}
              data-track-id={`seat-${seat.id}`}
              style={{
                border: "none",
                borderRadius: 8,
                minHeight: 34,
                cursor: seat.available ? "pointer" : "not-allowed",
                background,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                opacity: seat.available ? 1 : 0.55,
              }}
            >
              {seat.id}
            </button>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 12,
          background: "#6b7280",
          color: "#fff",
          textAlign: "center",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Exit
      </div>
    </div>
  );
}

function SeatLegend() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {Object.keys(prices).map((grade) => (
        <div
          key={grade}
          style={{
            ...cardStyle(false),
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            color: "#fff",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: gradeColors[grade],
              display: "inline-block",
            }}
          />
          <span>{grade}</span>
          <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 13 }}>{formatMetricValue(prices[grade])} KRW</span>
        </div>
      ))}
    </div>
  );
}

function SelectedSeatList({ selectedSeats }) {
  if (selectedSeats.length === 0) {
    return <div style={{ ...cardStyle(false), color: "#94a3b8" }}>No seats selected.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {selectedSeats.map((seat) => (
        <div
          key={seat.id}
          style={{
            ...cardStyle(false),
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            color: "#fff",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>
              {seat.id} / {seat.grade}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
              {seat.zone} zone, row {seat.row}, seat {seat.col}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", color: "#fb923c", fontWeight: 700 }}>
            {prices[seat.grade].toLocaleString()} KRW
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingPanel({ seats, selectedSeatIds, searchText, onSearchChange, onToggleSeat, onConfirm }) {
  const filteredSeats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return seats;
    return seats.map((seat) => ({
      ...seat,
      available: seat.available && seat.id.toLowerCase().includes(q),
    }));
  }, [seats, searchText]);

  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(seat.id));
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + prices[seat.grade], 0);

  return (
    <SectionShell title="Seat Selection">
      <div style={{ ...cardStyle(true), color: "#111827" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(280px, 0.75fr)", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...cardStyle(true), background: "#fff" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ position: "relative", flex: "1 1 280px" }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "#94a3b8" }} />
                  <input
                    value={searchText}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search seat number, e.g. B3"
                    style={{ ...inputStyle(), paddingLeft: 36 }}
                    data-track-id="seat-search"
                  />
                </div>
              </div>
              <SeatGrid seats={filteredSeats} selectedSeatIds={selectedSeatIds} onToggleSeat={onToggleSeat} />
            </div>
            <SeatLegend />
          </div>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ ...cardStyle(false), color: "#fff", display: "grid", gap: 10 }}>
              <div
                style={{
                  borderRadius: 10,
                  padding: "10px 14px",
                  background: "#4b5563",
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                Selected Seats
              </div>
              <SelectedSeatList selectedSeats={selectedSeats} />
            </div>

            <div style={{ ...cardStyle(false), display: "grid", gridTemplateColumns: "1fr auto", color: "#fff" }}>
              <span>Total Price</span>
              <strong style={{ color: "#fb923c" }}>{totalPrice.toLocaleString()} KRW</strong>
            </div>
            <button
              type="button"
              style={buttonStyle({ accent: true, disabled: selectedSeatIds.length === 0 })}
              onClick={onConfirm}
              disabled={selectedSeatIds.length === 0}
              data-track-id="proceed-booking"
            >
              Proceed Booking
            </button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function ConfirmationPanel({ selectedSeats, onRestart }) {
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + prices[seat.grade], 0);

  return (
    <SectionShell title="Booking Confirmed">
      <div style={{ ...cardStyle(true), display: "grid", gap: 18, color: "#111827" }}>
        <div
          style={{
            borderRadius: 18,
            background: "#ecfdf5",
            border: "1px solid #86efac",
            padding: 20,
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 28, color: "#166534" }}>Your seats are confirmed</h3>
          <p style={{ margin: 0, color: "#166534", lineHeight: 1.6 }}>
            The click and mouse features below remain visible as the final snapshot collected before confirmation.
          </p>
        </div>
        <SelectedSeatList selectedSeats={selectedSeats} />
        <div style={{ ...cardStyle(false), display: "grid", gridTemplateColumns: "1fr auto", color: "#fff" }}>
          <span>Final Price</span>
          <strong style={{ color: "#fb923c" }}>{totalPrice.toLocaleString()} KRW</strong>
        </div>
        <div>
          <button type="button" style={buttonStyle({ accent: true })} onClick={onRestart}>
            Back to Start
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function DashboardPanel({ metrics, recentClicks, active, tab, onTabChange }) {
  const clickMetrics = [
    "time_to_first_click_ms",
    "time_from_element_visible_to_click_ms",
    "time_from_element_clickable_to_click_ms",
    "inter_click_interval_ms",
    "click_sequence_consistency_score",
    "click_position_repeat_rate",
    "click_offset_from_element_center_px",
    "click_offset_variance_px",
    "double_click_rate",
    "misclick_rate",
    "reclick_rate",
    "pre_click_mousemove_count",
    "pre_click_hover_time_ms",
    "pre_click_scroll_flag",
    "immediate_post_render_click_rate",
  ];

  const mouseMetrics = [
    "mouse_total_travel_distance_px",
    "mouse_avg_speed_px_per_ms",
    "mouse_max_speed_px_per_ms",
    "mouse_speed_change_mean",
    "mouse_acceleration_mean",
    "mouse_jerk_mean",
    "mouse_path_straightness_score",
    "mouse_path_curvature_mean",
    "mouse_direction_change_count",
    "mouse_overshoot_flag",
    "mouse_hover_dwell_time_ms",
    "mouse_stop_segment_count",
    "mousemove_event_rate",
    "pre_click_mouse_path_pattern_300ms",
    "pre_click_mouse_path_pattern_500ms",
    "inter_element_move_interval_std_ms",
    "edge_or_fixed_point_visit_rate",
  ];

  const keyboardMetrics = [
    "time_to_first_keydown_ms",
    "inter_key_interval_ms_mean",
    "inter_key_interval_ms_std",
    "keydown_to_keyup_ms_mean",
    "typing_total_duration_ms",
    "typing_speed_cps",
    "backspace_rate",
    "correction_count",
    "paste_flag",
    "focus_to_submit_ms",
  ];

  return (
    <SectionShell title="Live Feature Dashboard">
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle({ subtle: tab !== "metrics" })} onClick={() => onTabChange("metrics")}>
              Metrics
            </button>
            <button type="button" style={buttonStyle({ subtle: tab !== "events" })} onClick={() => onTabChange("events")}>
              Recent Clicks
            </button>
          </div>
          <div
            style={{
              alignSelf: "center",
              color: active ? "#22c55e" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {active ? "Collecting from Start Booking to Proceed Booking" : "Paused / frozen snapshot"}
          </div>
        </div>

        {tab === "metrics" ? (
          <div style={{ display: "grid", gap: 18 }}>
            <MetricGrid title="Click Features" keysList={clickMetrics} metrics={metrics} />
            <MetricGrid title="Mouse Features" keysList={mouseMetrics} metrics={metrics} />
            <MetricGrid title="Keyboard Features" keysList={keyboardMetrics} metrics={metrics} />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recentClicks.length === 0 ? (
              <div style={{ ...cardStyle(false), color: "#94a3b8" }}>No tracked clicks yet.</div>
            ) : (
              recentClicks.map((click) => (
                <div
                  key={`${click.ts}-${click.trackId}`}
                  style={{
                    ...cardStyle(false),
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
                    gap: 12,
                    color: "#fff",
                    fontSize: 13,
                  }}
                >
                  <span>{click.trackId}</span>
                  <span>{click.stage}</span>
                  <span>{click.category}</span>
                  <span>{click.timeLabel}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function MetricGrid({ title, keysList, metrics }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fb923c", fontWeight: 700 }}>
        <MousePointer2 size={16} />
        <span>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        {keysList.map((key) => (
          <div key={key} style={{ ...cardStyle(false), color: "#fff", display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{key}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMetricValue(metrics[key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrialHistoryPanel({ trials, selectedTrialId, onSelectTrial, dataTab, onDataTabChange, persistState }) {
  const selectedTrial = trials.find((trial) => trial.trialId === selectedTrialId) ?? null;

  return (
    <SectionShell title="Accumulated Trials">
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ color: "#94a3b8", fontSize: 14 }}>
            Trials stored in memory: <strong style={{ color: "#fff" }}>{trials.length}</strong>
          </div>
          <div
            style={{
              color:
                persistState.type === "error"
                  ? "#f87171"
                  : persistState.type === "success"
                    ? "#22c55e"
                    : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {persistState.message}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle({ subtle: dataTab !== "summary" })} onClick={() => onDataTabChange("summary")}>
              Summary
            </button>
            <button type="button" style={buttonStyle({ subtle: dataTab !== "windows" })} onClick={() => onDataTabChange("windows")}>
              Window Rows
            </button>
            <button type="button" style={buttonStyle({ subtle: dataTab !== "events" })} onClick={() => onDataTabChange("events")}>
              Event Rows
            </button>
          </div>
        </div>

        {trials.length === 0 ? (
          <div style={{ ...cardStyle(false), color: "#94a3b8" }}>No completed trials yet. Finish one booking flow to accumulate data.</div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {trials.map((trial) => (
                <button
                  key={trial.trialId}
                  type="button"
                  onClick={() => onSelectTrial(trial.trialId)}
                  style={{
                    ...cardStyle(false),
                    textAlign: "left",
                    color: "#fff",
                    cursor: "pointer",
                    border: trial.trialId === selectedTrialId ? "1px solid #f97316" : "1px solid #232832",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center" }}>
                    <strong>Trial #{trial.trialId}</strong>
                    <span>{trial.summary.stage}</span>
                    <span>{trial.summary.clickCount} clicks</span>
                    <span>{trial.summary.windowCount} windows</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
                    duration {formatMetricValue(trial.summary.durationMs)} ms | events {trial.summary.eventCount} | selected seats {trial.summary.selectedSeats.join(", ") || "-"}
                  </div>
                </button>
              ))}
            </div>

            {selectedTrial ? (
              dataTab === "summary" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <div style={{ ...cardStyle(false), color: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>trial_id</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedTrial.trialId}</div>
                  </div>
                  <div style={{ ...cardStyle(false), color: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>duration_ms</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMetricValue(selectedTrial.summary.durationMs)}</div>
                  </div>
                  <div style={{ ...cardStyle(false), color: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>event_rows</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedTrial.eventRows.length}</div>
                  </div>
                  <div style={{ ...cardStyle(false), color: "#fff" }}>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>window_rows</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedTrial.windowRows.length}</div>
                  </div>
                </div>
              ) : (
                <DataRowTable rows={dataTab === "windows" ? selectedTrial.windowRows : selectedTrial.eventRows} kind={dataTab} />
              )
            ) : null}
          </>
        )}
      </div>
    </SectionShell>
  );
}

function DataRowTable({ rows, kind }) {
  const previewRows = rows.slice(-20).reverse();

  if (previewRows.length === 0) {
    return <div style={{ ...cardStyle(false), color: "#94a3b8" }}>No rows stored for this tab yet.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {previewRows.map((row, index) => (
        <div key={`${kind}-${index}-${row.relative_ms ?? row.ts}`} style={{ ...cardStyle(false), color: "#fff", fontSize: 12 }}>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#cbd5e1",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {JSON.stringify(row, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function TicketingWireframeDemoApp() {
  const seats = useMemo(() => buildSeats(), []);
  const [stage, setStage] = useState("intro");
  const [isCollecting, setIsCollecting] = useState(false);
  const [queueSecondsLeft, setQueueSecondsLeft] = useState(queueDuration);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [confirmedSeatIds, setConfirmedSeatIds] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [dashboardTab, setDashboardTab] = useState("metrics");
  const [dataTab, setDataTab] = useState("summary");
  const [metrics, setMetrics] = useState(deriveMetrics(createSession()));
  const [recentClicks, setRecentClicks] = useState([]);
  const [trialHistory, setTrialHistory] = useState([]);
  const [selectedTrialId, setSelectedTrialId] = useState(null);
  const [persistState, setPersistState] = useState({
    type: "idle",
    message: "Waiting for collector API connection",
  });

  const sessionRef = useRef(createSession());
  const rafRef = useRef(null);
  const stageRef = useRef(stage);
  const nextTrialIdRef = useRef(1);
  const snapshotIntervalRef = useRef(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    const loadPersistedTrials = async () => {
      try {
        const trials = await fetchTrials();
        setTrialHistory(trials);
        if (trials.length > 0) {
          const maxTrialId = Math.max(...trials.map((trial) => trial.trialId ?? 0));
          nextTrialIdRef.current = maxTrialId + 1;
          setSelectedTrialId(trials[trials.length - 1].trialId);
        }
        setPersistState({
          type: "success",
          message: `collector API connected: loaded ${trials.length} stored trial(s)`,
        });
      } catch (error) {
        setPersistState({
          type: "error",
          message: `collector API unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
        });
      }
    };

    void loadPersistedTrials();
  }, []);

  const scheduleMetricsUpdate = () => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setMetrics(deriveMetrics(sessionRef.current));
      setRecentClicks(
        sessionRef.current.clicks
          .slice(-8)
          .reverse()
          .map((click) => ({
            ...click,
            timeLabel: `${((click.ts - sessionRef.current.startTs) / 1000).toFixed(2)}s`,
          })),
      );
    });
  };

  const appendWindowSnapshot = () => {
    const session = sessionRef.current;
    if (!session.active || session.startTs == null) return;

    const now = performance.now();
    if (session.lastSnapshotTs != null && now - session.lastSnapshotTs < 240) return;

    const snapshotMetrics = deriveMetrics(session);
    session.lastSnapshotTs = now;
    session.windowRows.push({
      trial_id: session.trialId,
      snapshot_index: session.windowRows.length + 1,
      relative_ms: Math.round(relativeMs(session, now)),
      stage: stageRef.current,
      click_count: session.clicks.length,
      move_count: session.moves.length,
      scroll_count: session.scrolls.length,
      ...snapshotMetrics,
    });

    setMetrics(snapshotMetrics);
    setRecentClicks(
      session.clicks
        .slice(-8)
        .reverse()
        .map((click) => ({
          ...click,
          timeLabel: `${((click.ts - session.startTs) / 1000).toFixed(2)}s`,
        })),
    );
  };

  const persistTrial = async (trial) => {
    setPersistState({
      type: "saving",
      message: `Saving trial #${trial.trialId} to collector API...`,
    });

    try {
      const result = await saveTrial(trial);
      setPersistState({
        type: "success",
        message: `Saved trial #${result.trial_id} to ${result.saved_to}`,
      });
    } catch (error) {
      setPersistState({
        type: "error",
        message: `Failed to save trial #${trial.trialId}: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  };

  const markTargetsVisible = (ids) => {
    const now = performance.now();
    ids.forEach((id) => {
      sessionRef.current.visibleAt[id] = now;
      sessionRef.current.clickableAt[id] = now;
    });
  };

  useEffect(() => {
    if (!sessionRef.current.active) return;
    if (stage === "queue") markTargetsVisible(["queue-skip"]);
    if (stage === "captcha") markTargetsVisible(["captcha-input", "captcha-confirm"]);
    if (stage === "booking") {
      markTargetsVisible(["seat-search", "proceed-booking", ...seats.map((seat) => `seat-${seat.id}`)]);
    }
    scheduleMetricsUpdate();
  }, [stage, seats]);

  useEffect(() => {
    if (!isCollecting) {
      if (snapshotIntervalRef.current != null) {
        window.clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
      return undefined;
    }

    appendWindowSnapshot();
    snapshotIntervalRef.current = window.setInterval(() => {
      appendWindowSnapshot();
    }, 250);

    return () => {
      if (snapshotIntervalRef.current != null) {
        window.clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
    };
  }, [isCollecting]);

  useEffect(() => {
    const onMouseMove = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;
      const ts = performance.now();
      const trackElement = event.target.closest?.("[data-track-id]");
      const hoverId = trackElement?.getAttribute("data-track-id") ?? null;

      if (session.currentHover?.id !== hoverId) {
        if (session.currentHover) {
          session.hoverSamples.push({
            id: session.currentHover.id,
            duration: ts - session.currentHover.startTs,
          });
        }
        session.currentHover = hoverId ? { id: hoverId, startTs: ts } : null;
      }

      session.moves.push({
        ts,
        x: event.clientX,
        y: event.clientY,
        targetId: hoverId,
      });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "mousemove",
        track_id: hoverId,
        x: event.clientX,
        y: event.clientY,
      });
      scheduleMetricsUpdate();
    };

    const onClick = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;

      const ts = performance.now();
      const trackElement = event.target.closest?.("[data-track-id]");
      const trackId = trackElement?.getAttribute("data-track-id") ?? "__untracked__";
      const rect = trackElement?.getBoundingClientRect?.();
      const targetCenterX = rect ? rect.left + rect.width / 2 : null;
      const targetCenterY = rect ? rect.top + rect.height / 2 : null;
      const offsetDistance =
        targetCenterX == null || targetCenterY == null
          ? null
          : Math.hypot(event.clientX - targetCenterX, event.clientY - targetCenterY);

      const prevClick = session.clicks[session.clicks.length - 1];
      const preWindowStart = ts - 500;
      const preClickMoves = session.moves.filter((move) => move.ts >= preWindowStart && move.ts <= ts);
      const preClickScrollFlag = session.scrolls.some((entry) => entry.ts >= preWindowStart && entry.ts <= ts) ? 1 : 0;
      const hoverTime = session.currentHover?.id === trackId ? ts - session.currentHover.startTs : 0;
      const timeFromVisible = session.visibleAt[trackId] != null ? ts - session.visibleAt[trackId] : null;
      const timeFromClickable = session.clickableAt[trackId] != null ? ts - session.clickableAt[trackId] : null;
      const interClickInterval = prevClick ? ts - prevClick.ts : null;
      const isDoubleClick = Boolean(prevClick && ts - prevClick.ts <= 500);
      const isReclick = Boolean(prevClick && prevClick.trackId === trackId && ts - prevClick.ts <= 1200);
      const immediatePostRender = Boolean(timeFromVisible != null && timeFromVisible <= 500);

      session.clicks.push({
        ts,
        x: event.clientX,
        y: event.clientY,
        trackId,
        category: resolveCategory(trackId),
        stage: stageRef.current,
        targetCenterX,
        targetCenterY,
        offsetDistance,
        timeFromVisible,
        timeFromClickable,
        interClickInterval,
        preClickMousemoveCount: preClickMoves.length,
        preClickHoverTime: hoverTime,
        preClickScrollFlag,
        immediatePostRender,
        isDoubleClick,
        isReclick,
        isMisclick: !isValidTrackForStage(stageRef.current, trackId),
      });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "click",
        track_id: trackId,
        x: event.clientX,
        y: event.clientY,
        time_from_visible_ms: timeFromVisible,
        time_from_clickable_ms: timeFromClickable,
        inter_click_interval_ms: interClickInterval,
        pre_click_mousemove_count: preClickMoves.length,
        pre_click_hover_time_ms: hoverTime,
        pre_click_scroll_flag: preClickScrollFlag,
        offset_distance_px: offsetDistance,
        is_double_click: isDoubleClick ? 1 : 0,
        is_reclick: isReclick ? 1 : 0,
        is_misclick: !isValidTrackForStage(stageRef.current, trackId) ? 1 : 0,
      });

      scheduleMetricsUpdate();
    };

    const onScroll = () => {
      const session = sessionRef.current;
      if (!session.active) return;
      session.scrolls.push({
        ts: performance.now(),
        y: window.scrollY,
      });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, performance.now())),
        stage: stageRef.current,
        event_type: "scroll",
        scroll_y: window.scrollY,
      });
      scheduleMetricsUpdate();
    };

    const onFocusIn = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;
      const trackElement = event.target.closest?.("[data-track-id]");
      const trackId = trackElement?.getAttribute("data-track-id");
      if (trackId !== "captcha-input") return;

      const ts = performance.now();
      session.captchaFocusTs = ts;
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "focus",
        track_id: trackId,
      });
      scheduleMetricsUpdate();
    };

    const onKeyDown = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;
      const trackElement = event.target.closest?.("[data-track-id]");
      const trackId = trackElement?.getAttribute("data-track-id");
      if (trackId !== "captcha-input") return;

      const ts = performance.now();
      const keyId = event.code || event.key;
      if (!event.repeat && session.pressedKeys[keyId] == null) {
        session.pressedKeys[keyId] = ts;
      }

      session.keydowns.push({
        ts,
        key: event.key,
        code: event.code,
        repeat: event.repeat ? 1 : 0,
      });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "keydown",
        track_id: trackId,
        key: event.key,
        code: event.code,
        is_repeat: event.repeat ? 1 : 0,
      });
      scheduleMetricsUpdate();
    };

    const onKeyUp = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;
      const trackElement = event.target.closest?.("[data-track-id]");
      const trackId = trackElement?.getAttribute("data-track-id");
      if (trackId !== "captcha-input") return;

      const ts = performance.now();
      const keyId = event.code || event.key;
      const downTs = session.pressedKeys[keyId];
      const holdMs = downTs != null ? ts - downTs : null;
      delete session.pressedKeys[keyId];

      session.keyPresses.push({
        ts,
        key: event.key,
        code: event.code,
        holdMs,
      });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "keyup",
        track_id: trackId,
        key: event.key,
        code: event.code,
        hold_ms: holdMs,
      });
      scheduleMetricsUpdate();
    };

    const onPaste = (event) => {
      const session = sessionRef.current;
      if (!session.active) return;
      const trackElement = event.target.closest?.("[data-track-id]");
      const trackId = trackElement?.getAttribute("data-track-id");
      if (trackId !== "captcha-input") return;

      const ts = performance.now();
      session.pasteEvents.push({ ts });
      session.eventRows.push({
        trial_id: session.trialId,
        event_index: session.eventRows.length + 1,
        relative_ms: Math.round(relativeMs(session, ts)),
        stage: stageRef.current,
        event_type: "paste",
        track_id: trackId,
      });
      scheduleMetricsUpdate();
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("paste", onPaste, true);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("paste", onPaste, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  useEffect(() => {
    if (stage !== "queue") return undefined;

    const timer = window.setTimeout(() => {
      setQueueSecondsLeft((prev) => {
        if (prev <= 1) {
          setStage("captcha");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, queueSecondsLeft]);

  const startFlow = () => {
    const nextTrialId = nextTrialIdRef.current;
    nextTrialIdRef.current += 1;

    const nextSession = createSession(nextTrialId);
    nextSession.active = true;
    nextSession.startTs = performance.now();
    sessionRef.current = nextSession;

    setStage("queue");
    setIsCollecting(true);
    setQueueSecondsLeft(queueDuration);
    setCaptchaValue("");
    setCaptchaError("");
    setSelectedSeatIds([]);
    setConfirmedSeatIds([]);
    setSearchText("");
    setDashboardTab("metrics");
    setDataTab("summary");
    setRecentClicks([]);
    setMetrics(deriveMetrics(nextSession));
    setSelectedTrialId(nextTrialId);
  };

  const handleCaptchaSubmit = () => {
    if (captchaValue.trim() !== "capcha") {
      setCaptchaError("Captcha value must be exactly: capcha");
      return;
    }

    setCaptchaError("");
    setStage("booking");
  };

  const handleToggleSeat = (seatId) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId].slice(0, 4),
    );
  };

  const handleConfirmBooking = () => {
    const session = sessionRef.current;
    if (session.currentHover) {
      session.hoverSamples.push({
        id: session.currentHover.id,
        duration: performance.now() - session.currentHover.startTs,
      });
      session.currentHover = null;
    }

    appendWindowSnapshot();
    sessionRef.current.freezeTs = performance.now();
    sessionRef.current.active = false;
    setIsCollecting(false);
    setMetrics(deriveMetrics(sessionRef.current));
    const nextTrial = {
      trialId: session.trialId,
      summary: {
        stage: "confirmed",
        durationMs: session.freezeTs - session.startTs,
        clickCount: session.clicks.length,
        eventCount: session.eventRows.length,
        windowCount: session.windowRows.length,
        selectedSeats: [...selectedSeatIds],
      },
      metrics: deriveMetrics(session),
      eventRows: [...session.eventRows],
      windowRows: [...session.windowRows],
    };
    setTrialHistory((prev) => [...prev, nextTrial]);
    setSelectedTrialId(nextTrial.trialId);
    void persistTrial(nextTrial);
    setConfirmedSeatIds(selectedSeatIds);
    setStage("confirmed");
  };

  const confirmedSeats = seats.filter((seat) => confirmedSeatIds.includes(seat.id));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #09090b 0%, #111827 100%)",
        padding: 24,
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 24 }}>
        <header style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "fit-content",
              borderRadius: 999,
              background: "#f97316",
              color: "#fff",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Ticket Macro Demo
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.1, color: "#fff" }}>Step based booking demo with live features</h1>
            <p style={{ marginTop: 12, maxWidth: 920, color: "#94a3b8", fontSize: 15, lineHeight: 1.7 }}>
              Metrics are collected from the moment `Start Booking` is pressed until right before `Proceed Booking`
              transitions into the confirmed screen. The panel below updates in real time and keeps the final snapshot.
            </p>
          </div>
          <StageBadge currentStage={stage} />
        </header>

        {stage === "intro" ? <HeroPanel onStart={startFlow} /> : null}
        {stage === "queue" ? <QueuePanel secondsLeft={queueSecondsLeft} onSkip={() => setStage("captcha")} /> : null}
        {stage === "captcha" ? (
          <CaptchaPanel
            value={captchaValue}
            onChange={setCaptchaValue}
            onSubmit={handleCaptchaSubmit}
            error={captchaError}
          />
        ) : null}
        {stage === "booking" ? (
          <BookingPanel
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            searchText={searchText}
            onSearchChange={setSearchText}
            onToggleSeat={handleToggleSeat}
            onConfirm={handleConfirmBooking}
          />
        ) : null}
        {stage === "confirmed" ? <ConfirmationPanel selectedSeats={confirmedSeats} onRestart={() => setStage("intro")} /> : null}

        <DashboardPanel
          metrics={metrics}
          recentClicks={recentClicks}
          active={isCollecting}
          tab={dashboardTab}
          onTabChange={setDashboardTab}
        />
        <TrialHistoryPanel
          trials={trialHistory}
          selectedTrialId={selectedTrialId}
          onSelectTrial={setSelectedTrialId}
          dataTab={dataTab}
          onDataTabChange={setDataTab}
          persistState={persistState}
        />
      </div>
    </div>
  );
}
