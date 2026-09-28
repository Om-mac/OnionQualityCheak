const API_BASE = '/api';

export async function detectImage(file: File): Promise<DetectionResponse> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}

export async function detectBase64(base64: string): Promise<DetectionResponse> {
  const res = await fetch(`${API_BASE}/detect-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
