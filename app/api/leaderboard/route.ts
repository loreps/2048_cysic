import { promises as fs } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"

const leaderboardFilePath = path.join(process.cwd(), "data", "leaderboard.json")

interface LeaderboardEntry {
  nickname: string
  score: number
  timeTaken: number | null
  timestamp: number
}

// Helper to read leaderboard data
async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const data = await fs.readFile(leaderboardFilePath, "utf-8")
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File does not exist, return empty array
      return []
    }
    console.error("Error reading leaderboard file:", error)
    return [] // Return empty on other errors
  }
}

// Helper to write leaderboard data
async function writeLeaderboard(data: LeaderboardEntry[]): Promise<void> {
  try {
    await fs.writeFile(leaderboardFilePath, JSON.stringify(data, null, 2), "utf-8")
  } catch (error) {
    console.error("Error writing leaderboard file:", error)
    throw new Error("Failed to save leaderboard data.")
  }
}

export async function GET(req: NextRequest) {
  try {
    const leaderboard = await readLeaderboard()
    // Sort by score descending, then by timeTaken ascending (for wins)
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      // If scores are equal, sort by timeTaken (faster is better)
      // Handle null timeTaken (losses) by putting them at the end
      if (a.timeTaken === null && b.timeTaken !== null) return 1
      if (a.timeTaken !== null && b.timeTaken === null) return -1
      if (a.timeTaken === null && b.timeTaken === null) return 0
      return (a.timeTaken as number) - (b.timeTaken as number)
    })
    return NextResponse.json(leaderboard)
  } catch (error) {
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

    const newEntry: LeaderboardEntry = {
      nickname: nickname.trim(),
      score,
      timeTaken,
      timestamp: Date.now(),
    }

    const leaderboard = await readLeaderboard()
    leaderboard.push(newEntry)
    await writeLeaderboard(leaderboard)

    return NextResponse.json({ message: "Score saved successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error saving score:", error)
    return NextResponse.json({ message: "Failed to save score" }, { status: 500 })
  }
}
