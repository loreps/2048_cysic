import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

interface LeaderboardEntry {
  nickname: string
  score: number
  timeTaken: number | null
  timestamp: string // ISO string for Supabase timestamp
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("leaderboard")
      .select("nickname, score, time_taken, timestamp")
      .order("score", { ascending: false }) // Sort by score descending
      .order("time_taken", { ascending: true, nullsFirst: false }) // Then by time_taken ascending (faster is better), nulls (losses) last

    if (error) {
      console.error("Supabase GET error:", error)
      return NextResponse.json({ message: "Failed to retrieve leaderboard", error: error.message }, { status: 500 })
    }

    // Map time_taken to timeTaken for client component compatibility
    const leaderboard = data.map((entry) => ({
      nickname: entry.nickname,
      score: entry.score,
      timeTaken: entry.time_taken,
      timestamp: entry.timestamp,
    }))

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error("Error in GET /api/leaderboard:", error)
    return NextResponse.json({ message: "Failed to retrieve leaderboard" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nickname, score, timeTaken } = await req.json()

    if (
      typeof nickname !== "string" ||
      nickname.trim() === "" ||
      typeof score !== "number" ||
      (timeTaken !== null && typeof timeTaken !== "number")
    ) {
      return NextResponse.json({ message: "Invalid data provided" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("leaderboard")
      .insert([
        {
          nickname: nickname.trim(),
          score: score,
          time_taken: timeTaken, // Use time_taken for Supabase column
          timestamp: new Date().toISOString(),
        },
      ])
      .select() // Select the inserted data to confirm

    if (error) {
      console.error("Supabase POST error:", error)
      return NextResponse.json({ message: "Failed to save score", error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Score saved successfully", data: data[0] }, { status: 200 })
  } catch (error) {
    console.error("Error in POST /api/leaderboard:", error)
    return NextResponse.json({ message: "Failed to save score" }, { status: 500 })
  }
}
