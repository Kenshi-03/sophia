import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { cacheManager } from "@/lib/cache/cache-manager"
import { makeCacheKey } from "@/lib/redis"
import { cognitiveAnalysisQueue } from "@/lib/queue/client"
import { generateCognitiveBriefing } from "@/lib/ai/cognitive/briefing-generator"
import { checkUserAiQuota } from "@/lib/security/rate-limit"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Validate User-scoped Daily AI Quota
    const quota = await checkUserAiQuota(user.id)
    if (!quota.allowed) {
      return NextResponse.json(
        { 
          error: "Kuota AI Harian Terlampaui", 
          details: `Anda telah mencapai batas ${quota.limit} permintaan AI hari ini. Kuota akan tereset dalam ${Math.ceil(quota.resetSeconds / 60)} menit.`
        }, 
        { 
          status: 429,
          headers: {
            "Retry-After": quota.resetSeconds.toString()
          }
        }
      )
    }

    // 2. Fetch/Compute Daily Briefing via SWR Cache
    const cacheKey = makeCacheKey(user.id, "cognitive", "briefing")
    const hourStamp = new Date().toISOString().slice(0, 13) // Hourly stamp for revalidation lock
    
    const briefingResult = await cacheManager.getOrCompute(
      cacheKey,
      () => generateCognitiveBriefing(user.id),
      3600, // 1 hour freshness TTL
      24 * 3600, // 24 hours stale fallback grace period
      async () => {
        try {
          // Enqueue background revalidation job with deterministic jobId for idempotency
          await cognitiveAnalysisQueue.add(
            "briefing",
            { userId: user.id },
            { jobId: `briefing:${user.id}:${hourStamp}` }
          )
        } catch (queueErr) {
          console.warn("Failed to queue background briefing revalidation, will fallback on next miss:", queueErr)
        }
      }
    )

    return NextResponse.json(briefingResult)

  } catch (error: any) {
    console.error("GET /api/ai/cognitive/briefing error:", error)
    return NextResponse.json({ error: "Gagal memproses briefing kognitif." }, { status: 500 })
  }
}
