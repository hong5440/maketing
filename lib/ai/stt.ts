/**
 * STT — OpenAI Whisper API (fetch 호출)
 *
 * OPENAI_API_KEY 가 없거나 호출 실패 시 null을 반환한다.
 * (클라이언트가 Web Speech API로 받아 보낸 텍스트를 대신 사용)
 */

export async function transcribeAudio(
  audioBase64: string,
  mimeType = "audio/webm"
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.DEMO_MODE === "true") return null;

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    const ext = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("mpeg")
        ? "mp3"
        : mimeType.includes("wav")
          ? "wav"
          : "webm";
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      `audio.${ext}`
    );
    form.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { text?: string };
    return typeof json.text === "string" && json.text.trim().length > 0
      ? json.text.trim()
      : null;
  } catch {
    return null;
  }
}
