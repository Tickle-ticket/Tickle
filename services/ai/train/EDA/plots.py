"""
Phase A: raw eventRows 시각화 함수 4종 + grid wrapper + plotly deep dive.

함수는 trial dict 또는 trial_id 를 받음.
모든 matplotlib plot 함수는 ax optional — None 이면 내부에서 생성.
캡션은 영문 (Windows 한글 폰트 폴백 회피).
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.axes import Axes
from matplotlib.figure import Figure

from trial_loader import (
    DATA_DIR,
    DEFAULT_SAMPLE_N,
    event_rows_to_df,
    load_trial,
    sample_trials,
)

MIN_EVENTS_FOR_PLOT = 10

PLOT_TYPES = ("trajectory", "speed", "dt", "pre_click")
GRID_LAYOUT = {
    "lv2_human": (4, 4),
    "lv2_macro": (4, 4),
    "balabit": (5, 4),
}


def _resolve_trial(trial_or_id: dict | int) -> dict:
    if isinstance(trial_or_id, dict):
        return trial_or_id
    return load_trial(int(trial_or_id))


def _trial_label(trial: dict) -> str:
    return f"trial_{trial.get('trialId')} ({trial.get('label')})"


def _ensure_ax(ax: Axes | None) -> tuple[Axes, bool]:
    if ax is None:
        _, ax = plt.subplots(figsize=(5, 4))
        return ax, True
    return ax, False


def _insufficient(ax: Axes, trial: dict, msg: str = "insufficient events") -> Axes:
    ax.text(0.5, 0.5, msg, ha="center", va="center", transform=ax.transAxes,
            fontsize=9, color="gray")
    ax.set_title(_trial_label(trial), fontsize=9)
    ax.set_xticks([])
    ax.set_yticks([])
    return ax


def plot_trajectory(
    trial_or_id: dict | int,
    ax: Axes | None = None,
    cmap: str = "viridis",
    show_clicks: bool = True,
    click_size: int = 80,
) -> Axes:
    trial = _resolve_trial(trial_or_id)
    df = event_rows_to_df(trial)
    ax, _ = _ensure_ax(ax)

    moves = df[df["is_move"]].dropna(subset=["x", "y", "ts_ms"])
    if len(moves) < MIN_EVENTS_FOR_PLOT:
        return _insufficient(ax, trial)

    ax.scatter(moves["x"], moves["y"], c=moves["ts_ms"], cmap=cmap,
               s=4, alpha=0.7, linewidths=0)

    if show_clicks:
        clicks = df[df["is_click"]].dropna(subset=["x", "y"])
        if not clicks.empty:
            ax.scatter(clicks["x"], clicks["y"], c="red", marker="x",
                       s=click_size, linewidths=1.5, label="click", zorder=5)

    ax.invert_yaxis()
    ax.set_aspect("equal", adjustable="datalim")
    ax.set_title(_trial_label(trial), fontsize=9)
    ax.set_xlabel("x", fontsize=8)
    ax.set_ylabel("y", fontsize=8)
    ax.tick_params(labelsize=7)
    return ax


def plot_speed_over_time(
    trial_or_id: dict | int,
    ax: Axes | None = None,
    log_y: bool = False,
    click_lines: bool = True,
) -> Axes:
    trial = _resolve_trial(trial_or_id)
    df = event_rows_to_df(trial)
    ax, _ = _ensure_ax(ax)

    moves = df[df["is_move"]].dropna(subset=["ts_ms", "speed"])
    if len(moves) < MIN_EVENTS_FOR_PLOT:
        return _insufficient(ax, trial)

    ax.plot(moves["ts_ms"], moves["speed"], linewidth=0.7, color="steelblue")

    if click_lines:
        clicks = df[df["is_click"]].dropna(subset=["ts_ms"])
        for ts in clicks["ts_ms"]:
            ax.axvline(ts, color="red", alpha=0.3, linewidth=0.7)

    if log_y:
        ax.set_yscale("log")
    ax.set_title(_trial_label(trial), fontsize=9)
    ax.set_xlabel("ts_ms", fontsize=8)
    ax.set_ylabel("speed (px/ms)", fontsize=8)
    ax.tick_params(labelsize=7)
    return ax


def plot_dt_distribution(
    trial_or_id: dict | int,
    ax: Axes | None = None,
    log_y: bool = True,
) -> Axes:
    trial = _resolve_trial(trial_or_id)
    df = event_rows_to_df(trial)
    ax, _ = _ensure_ax(ax)

    valid = df.dropna(subset=["ts_ms", "dt_ms"])
    valid = valid[valid["dt_ms"] > 0]
    if len(valid) < MIN_EVENTS_FOR_PLOT:
        return _insufficient(ax, trial)

    ax.scatter(valid["ts_ms"], valid["dt_ms"], s=3, alpha=0.5, color="darkorange")
    if log_y:
        ax.set_yscale("log")
    ax.set_title(_trial_label(trial), fontsize=9)
    ax.set_xlabel("ts_ms", fontsize=8)
    ax.set_ylabel("dt_ms", fontsize=8)
    ax.tick_params(labelsize=7)
    return ax


def plot_pre_click_paths(
    trial_or_id: dict | int,
    ax: Axes | None = None,
    n_events: int = 20,
    alpha: float = 0.5,
) -> Axes:
    trial = _resolve_trial(trial_or_id)
    df = event_rows_to_df(trial)
    ax, _ = _ensure_ax(ax)

    moves = df[df["is_move"]].dropna(subset=["x", "y"]).reset_index(drop=True)
    clicks = df[df["is_click"]].dropna(subset=["ts_ms"])

    if clicks.empty or len(moves) < MIN_EVENTS_FOR_PLOT:
        return _insufficient(ax, trial, msg="no clicks / too few moves")

    cmap = plt.get_cmap("tab10")
    plotted = 0
    for i, (_, click) in enumerate(clicks.iterrows()):
        ts = click["ts_ms"]
        prior = moves[moves["ts_ms"] <= ts].tail(n_events)
        if len(prior) < 2:
            continue
        cx, cy = float(prior["x"].iloc[-1]), float(prior["y"].iloc[-1])
        rel_x = prior["x"].astype(float) - cx
        rel_y = prior["y"].astype(float) - cy
        color = cmap(plotted % 10)
        ax.plot(rel_x, rel_y, color=color, alpha=alpha, linewidth=0.9)
        ax.scatter([0], [0], color=color, s=20, zorder=5)
        plotted += 1

    if plotted == 0:
        return _insufficient(ax, trial, msg="no usable pre-click paths")

    ax.invert_yaxis()
    ax.set_aspect("equal", adjustable="datalim")
    ax.axhline(0, color="lightgray", linewidth=0.5, zorder=0)
    ax.axvline(0, color="lightgray", linewidth=0.5, zorder=0)
    ax.set_title(f"{_trial_label(trial)} | last {n_events} pre-click", fontsize=9)
    ax.set_xlabel("dx from click", fontsize=8)
    ax.set_ylabel("dy from click", fontsize=8)
    ax.tick_params(labelsize=7)
    return ax


_PLOT_FN = {
    "trajectory": plot_trajectory,
    "speed": plot_speed_over_time,
    "dt": plot_dt_distribution,
    "pre_click": plot_pre_click_paths,
}


def plot_grid(
    group: str,
    plot_type: str,
    n: int | None = None,
    seed: int = 42,
    figsize_per_cell: tuple[float, float] = (3.5, 3.5),
    save_path: str | Path | None = None,
    data_dir: Path = DATA_DIR,
) -> Figure:
    if plot_type not in _PLOT_FN:
        raise ValueError(f"unknown plot_type {plot_type!r}, expected one of {PLOT_TYPES}")
    if group not in GRID_LAYOUT:
        raise ValueError(f"unknown group {group!r}")

    rows, cols = GRID_LAYOUT[group]
    target_n = n if n is not None else DEFAULT_SAMPLE_N[group]
    metas = sample_trials(group, n=target_n, seed=seed, data_dir=data_dir)

    fig, axes = plt.subplots(
        rows, cols,
        figsize=(cols * figsize_per_cell[0], rows * figsize_per_cell[1]),
    )
    flat_axes = np.array(axes).reshape(-1)
    plot_fn = _PLOT_FN[plot_type]

    for ax, meta in zip(flat_axes, metas):
        try:
            trial = load_trial(meta["trial_id"], data_dir=data_dir)
            plot_fn(trial, ax=ax)
        except Exception as e:
            ax.text(0.5, 0.5, f"error: {e}", ha="center", va="center",
                    transform=ax.transAxes, fontsize=8, color="red")
            ax.set_xticks([])
            ax.set_yticks([])

    for ax in flat_axes[len(metas):]:
        ax.axis("off")

    fig.suptitle(f"{group} | {plot_type} | n={len(metas)} | seed={seed}", fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.97))

    if save_path is not None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(save_path, dpi=120, bbox_inches="tight")
        print(f"[plots] saved {save_path}")

    return fig


def plot_single_trial_interactive(trial_or_id: dict | int):
    """plotly trajectory + speed subplot. hover: ts_ms / event / speed."""
    try:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots
    except ImportError as e:
        raise ImportError("plotly 가 설치되지 않았습니다. requirements-eda.txt 참고") from e

    trial = _resolve_trial(trial_or_id)
    df = event_rows_to_df(trial)
    if df.empty:
        raise ValueError("eventRows is empty")

    moves = df[df["is_move"]].dropna(subset=["x", "y", "ts_ms"])
    clicks = df[df["is_click"]].dropna(subset=["x", "y", "ts_ms"])

    fig = make_subplots(
        rows=2, cols=1,
        row_heights=[0.65, 0.35],
        subplot_titles=("trajectory (x-y)", "speed over time"),
        vertical_spacing=0.12,
    )

    fig.add_trace(
        go.Scatter(
            x=moves["x"], y=moves["y"],
            mode="markers",
            marker=dict(size=4, color=moves["ts_ms"], colorscale="Viridis", showscale=True,
                        colorbar=dict(title="ts_ms", thickness=12, x=1.02)),
            text=[f"ts={ts:.0f}ms<br>speed={s:.3f}" if pd.notna(s) else f"ts={ts:.0f}ms"
                  for ts, s in zip(moves["ts_ms"], moves["speed"])],
            hoverinfo="text",
            name="move",
        ),
        row=1, col=1,
    )

    if not clicks.empty:
        fig.add_trace(
            go.Scatter(
                x=clicks["x"], y=clicks["y"],
                mode="markers",
                marker=dict(size=11, color="red", symbol="x"),
                text=[f"click ts={ts:.0f}ms" for ts in clicks["ts_ms"]],
                hoverinfo="text",
                name="click",
            ),
            row=1, col=1,
        )

    speed_df = moves.dropna(subset=["speed"])
    fig.add_trace(
        go.Scatter(
            x=speed_df["ts_ms"], y=speed_df["speed"],
            mode="lines",
            line=dict(width=1, color="steelblue"),
            name="speed",
        ),
        row=2, col=1,
    )

    for ts in clicks["ts_ms"]:
        fig.add_vline(x=ts, line=dict(color="red", width=1, dash="dot"),
                      opacity=0.3, row=2, col=1)

    fig.update_yaxes(autorange="reversed", row=1, col=1, scaleanchor="x", scaleratio=1)
    fig.update_xaxes(title_text="x", row=1, col=1)
    fig.update_yaxes(title_text="y", row=1, col=1)
    fig.update_xaxes(title_text="ts_ms", row=2, col=1)
    fig.update_yaxes(title_text="speed (px/ms)", row=2, col=1)

    fig.update_layout(
        title=_trial_label(trial),
        height=720,
        showlegend=True,
    )
    return fig
