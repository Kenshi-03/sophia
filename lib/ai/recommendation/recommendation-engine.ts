import { generateGatewayResponse } from "../gateway/maia_gateway"
import { CognitiveContext } from "../context/cognitive-builder"

export interface RecommendationItem {
  id: string
  priority: "subtle" | "moderate" | "high"
  text: string
}

export interface RecommendationResult {
  schedulingSuggestions: RecommendationItem[]
  recoverySuggestions: RecommendationItem[]
  focusOptimizations: RecommendationItem[]
}

/**
 * Generates dynamic, energy-aware, and cognitive-aware recommendations.
 */
export async function generateSmartRecommendations(
  context: CognitiveContext
): Promise<RecommendationResult> {
  const apiKey = process.env.MAIA_API_KEY || ""
  
  // Set default fallbacks based on load score
  const isHighLoad = context.metrics.score > 70
  const isMediumLoad = context.metrics.score > 35
  
  const defaultRecommendations: RecommendationResult = {
    schedulingSuggestions: [
      {
        id: "s1",
        priority: isHighLoad ? "high" : isMediumLoad ? "moderate" : "subtle",
        text: isHighLoad 
          ? "Beban kognitif harian Anda terpantau tinggi. Pertimbangkan menunda agenda sekunder demi fokus utama."
          : "Jadwal harian Anda seimbang. Waktu yang tepat untuk merencanakan tugas-tugas teknis berdurasi sedang.",
      }
    ],
    recoverySuggestions: [
      {
        id: "r1",
        priority: isHighLoad ? "high" : "subtle",
        text: isHighLoad
          ? "Alokasikan jeda istirahat minimal 15 menit setelah sesi fokus untuk memulihkan energi mental Anda."
          : "Sempatkan berjalan kaki ringan atau melakukan peregangan otot di sela-sela aktivitas Anda.",
      }
    ],
    focusOptimizations: [
      {
        id: "f1",
        priority: isHighLoad ? "high" : "subtle",
        text: isHighLoad
          ? "Aktifkan Focus Mode untuk mereduksi distraksi visual pada dashboard Anda selama jam sibuk."
          : "Pilah 2 tugas paling penting hari ini dan kerjakan di awal sesi produktif Anda.",
      }
    ]
  }

  // If MAIA_API_KEY is not configured, gracefully return default recommendations
  if (!apiKey) {
    return defaultRecommendations
  }

  const prompt = `Nama Pengguna: ${context.userName}
Beban Kognitif: ${context.metrics.score}% (${context.metrics.state} load)
Waktu Fokus: ${context.metrics.focusMinutes} menit
Waktu Pemulihan: ${context.metrics.recoveryMinutes} menit
Risiko Burnout: ${context.metrics.burnoutRisk}
Fragmentasi Fokus: ${context.metrics.focusFragmentation}%
Perpindahan Konteks: ${context.metrics.contextSwitchingCount} kali

Tolong buatkan rekomendasi kognitif taktis dalam Bahasa Indonesia menggunakan format JSON murni.
Format JSON harus persis seperti ini:
{
  "schedulingSuggestions": [
    { "id": "s1", "priority": "subtle" | "moderate" | "high", "text": "Kalimat rekomendasi jadwal..." }
  ],
  "recoverySuggestions": [
    { "id": "r1", "priority": "subtle" | "moderate" | "high", "text": "Kalimat rekomendasi pemulihan..." }
  ],
  "focusOptimizations": [
    { "id": "f1", "priority": "subtle" | "moderate" | "high", "text": "Kalimat rekomendasi optimasi fokus..." }
  ]
}

Gaya rekomendasi: tenang, bersahabat, cerdas, tidak mendikte, dan mendukung produktivitas berkelanjutan (sustainable productivity). Berikan maksimal 2 rekomendasi untuk tiap kategori.`

  const systemInstruction = `Anda adalah SOPHIA OS Cognitive Recommender.
Tugas Anda adalah menghasilkan rekomendasi produktivitas yang santun, menenangkan, dan adaptif berdasarkan beban kognitif pengguna hari ini.
Ingat: Produktivitas sejati adalah tentang menjaga keseimbangan energi, bukan hanya bekerja terus-menerus.
Selalu kembalikan respons hanya berupa format JSON murni tanpa markdown wrapper \`\`\`json atau teks tambahan di luar JSON.`

  try {
    const aiResponse = await generateGatewayResponse(prompt, {
      systemInstruction,
      model: context.userPreferences.aiModel,
      aiMode: context.userPreferences.aiMode as any,
    })

    if (aiResponse.text) {
      let cleanText = aiResponse.text.trim()
      if (cleanText.startsWith("```")) {
        const firstLineBreak = cleanText.indexOf("\n")
        const lastBackticks = cleanText.lastIndexOf("```")
        cleanText = cleanText.substring(firstLineBreak + 1, lastBackticks).trim()
      }

      const parsed = JSON.parse(cleanText)
      if (
        Array.isArray(parsed.schedulingSuggestions) &&
        Array.isArray(parsed.recoverySuggestions) &&
        Array.isArray(parsed.focusOptimizations)
      ) {
        return parsed
      }
    }
  } catch (err) {
    console.warn("Recommendation engine failed, falling back to default rules:", err)
  }

  return defaultRecommendations
}
