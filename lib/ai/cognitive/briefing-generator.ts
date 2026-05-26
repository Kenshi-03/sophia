import { buildCognitiveContext } from "../context/cognitive-builder"
import { generateGatewayResponse } from "../gateway/maia_gateway"
import { generateSmartRecommendations, RecommendationResult } from "../recommendation/recommendation-engine"
import { getSettings } from "../../settings/settings"
import { decrypt } from "../../security/encryption"
import { logger } from "../../logger"

export interface BriefingResult {
  success: boolean;
  metrics: unknown;
  aiBriefing: {
    analysis: string;
    recommendations: string[];
  };
  recommendations: RecommendationResult;
}

export async function generateCognitiveBriefing(userId: string): Promise<BriefingResult> {
  // 1. Build cognitive context metadata
  const context = await buildCognitiveContext(userId)

  // 2. Generate smart energy/focus recommendations (heuristics)
  const recommendations = await generateSmartRecommendations(context)

  // 3. Format structured payload for MAIA router
  const eventsSummary = context.events.length > 0
    ? context.events.map((e, idx) => {
        return `${idx + 1}. "${e.title}" (${e.categoryName}, ${e.durationMinutes} menit) jam ${new Date(e.startTime).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"})} s.d ${new Date(e.endTime).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"})}`
      }).join("\n")
    : "Tidak ada agenda yang dijadwalkan hari ini."

  const warningsSummary = context.metrics.burnoutWarnings.length > 0
    ? context.metrics.burnoutWarnings.map((w: string) => `- ${w}`).join("\n")
    : "Tidak ada peringatan burnout aktif."

  const userPrompt = `Nama Pengguna: ${context.userName}
Preferensi Produktivitas: Intensitas ${context.userPreferences.productivityIntensity}, Mode AI ${context.userPreferences.aiMode}.
Beban Kognitif Hari Ini: ${context.metrics.score}% (${context.metrics.state} load)
Waktu Fokus: ${context.metrics.focusMinutes} menit
Waktu Pemulihan/Istirahat: ${context.metrics.recoveryMinutes} menit
Risiko Burnout: ${context.metrics.burnoutRisk}
Indikator Peringatan:\n${warningsSummary}
Fragmentasi Fokus: ${context.metrics.focusFragmentation}%
Perpindahan Konteks (Context Switches): ${context.metrics.contextSwitchingCount} kali

Agenda Jadwal Hari Ini:
${eventsSummary}

Tolong berikan briefing kognitif harian yang tenang, membantu, dan mendukung secara emosional (tidak agresif atau robotik). Kembalikan respons dalam format JSON dengan struktur berikut:
{
  "analysis": "Penjelasan singkat (1 paragraf hangat dalam Bahasa Indonesia) tentang ritme kognitif pengguna hari ini...",
  "recommendations": [
    "Rekomendasi tindakan 1 (spesifik, taktis, dalam Bahasa Indonesia)...",
    "Rekomendasi tindakan 2 (spesifik, taktis, dalam Bahasa Indonesia)..."
  ]
}`

  const systemPrompt = `Anda adalah SOPHIA OS Cognitive Companion, asisten cerdas yang menganalisis beban kerja kognitif dan membimbing energi pengguna sepanjang hari. 
Fokus Anda adalah menjaga keseimbangan kesehatan mental dan performa kerja pengguna.
Gaya komunikasi Anda harus:
- Tenang, santun, hangat, dan suportif secara emosional.
- Tidak menghakimi, mendikte, atau memicu kepanikan (hindari kalimat yang menakut-nakuti).
- Menggunakan Bahasa Indonesia yang alami, ramah, dan profesional.
Selalu kembalikan respons hanya berupa format JSON murni tanpa markdown wrapper \`\`\`json atau teks tambahan di luar JSON.`

  let aiBriefing = {
    analysis: `Halo ${context.userName}, hari ini tingkat beban kerja Anda berada dalam kategori ${context.metrics.state}. Mari atur ritme kerja harian Anda dengan bijak agar fokus tetap tajam dan energi terjaga.`,
    recommendations: [
      "Sediakan jeda istirahat 10-15 menit di sela-sela perpindahan agenda fokus Anda.",
      "Alokasikan sesi pemulihan mental yang cukup setelah pengerjaan mendalam selesai.",
    ]
  }

  const settings = await getSettings(userId)
  const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null

  try {
    const aiResponse = await generateGatewayResponse(userPrompt, {
      systemInstruction: systemPrompt,
      model: context.userPreferences.aiModel,
      aiMode: context.userPreferences.aiMode as "focus" | "creative" | "balanced" | undefined,
      customApiKey,
      userId,
    })

    if (aiResponse.text) {
      let cleanText = aiResponse.text.trim()
      if (cleanText.startsWith("```")) {
        const firstLineBreak = cleanText.indexOf("\n")
        const lastBackticks = cleanText.lastIndexOf("```")
        cleanText = cleanText.substring(firstLineBreak + 1, lastBackticks).trim()
      }
      
      const parsed = JSON.parse(cleanText)
      if (parsed.analysis && Array.isArray(parsed.recommendations)) {
        aiBriefing = parsed
      }
    }
  } catch (err) {
    logger.warn("Failed to generate AI Briefing via MAIA Gateway, using dynamic fallback", { userId, error: err })
    if (context.metrics.score > 70) {
      aiBriefing = {
        analysis: `Hari ini beban kognitif Anda terpantau cukup padat (${context.metrics.score}%). Mari berfokus untuk menyederhanakan tugas, mengambil jeda pemulihan mental secara teratur, dan mengaktifkan DND saat deep work.`,
        recommendations: [
          "Kurangi aktivitas multitasking; selesaikan satu agenda fokus sebelum beralih ke yang lain.",
          "Terapkan teknik 50/10 (50 menit kerja mendalam, 10 menit istirahat berjalan kaki ringan).",
          "Sore ini disarankan melakukan olahraga ringan (Workout) untuk menurunkan ketegangan stres."
        ]
      }
    }
  }

  return {
    success: true,
    metrics: {
      ...context.metrics,
      cognitiveThreshold: context.userPreferences.cognitiveThreshold,
    },
    aiBriefing,
    recommendations,
  }
}
