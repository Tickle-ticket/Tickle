const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function apiBaseUrl() {
  return import.meta.env.VITE_COLLECTOR_API_URL || DEFAULT_API_BASE_URL;
}

export async function fetchTrials() {
  const response = await fetch(`${apiBaseUrl()}/api/trials`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function saveTrial(trial) {
  const response = await fetch(`${apiBaseUrl()}/api/trials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trial),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
