"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Cell = {
  value: number | null
  id: number
  mergedFrom: number[] | null
}

interface LeaderboardEntry {
  nickname: string
  score: number
  timeTaken: number | null
  timestamp: number
}

const TILE_IMAGES: Record<number, string> = {
  2: "/images/2.png",
  4: "/images/4.png",
  8: "/images/8.png",
  16: "/images/16.png",
  32: "/images/32.png",
  64: "/images/64.png",
  128: "/images/128.png",
  256: "/images/256.png",
  512: "/images/512.png",
  1024: "/images/1024.png",
  2048: "/images/2048.png",
}

const INITIAL_TIME = 45 // 45 seconds timer

export default function LetterFusion() {
  const [grid, setGrid] = useState<Cell[][]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [size] = useState(4)
  const [idCounter, setIdCounter] = useState(0)

  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)
  const [timerActive, setTimerActive] = useState(false)
  const [hasMadeFirstMove, setHasMadeFirstMove] = useState(false) // New state for first move
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nickname, setNickname] = useState("")
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [finalScore, setFinalScore] = useState(0)
  const [timeToWin, setTimeToWin] = useState<number | null>(null)
  const [gameOutcome, setGameOutcome] = useState<"win" | "lose" | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard")
      if (res.ok) {
        const data = await res.json()
        setLeaderboardData(data)
      } else {
        console.error("Failed to fetch leaderboard:", res.statusText)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }, [])

  // Initialize game and fetch leaderboard on mount
  useEffect(() => {
    startGame()
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (timerActive && timeLeft > 0 && !gameOver && !won) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
    } else if (timeLeft === 0 && !won) {
      setGameOver(true)
      setTimerActive(false)
      setGameOutcome("lose")
    }
    return () => clearInterval(timer)
  }, [timeLeft, timerActive, gameOver, won])

  // Handle game end (win/lose)
  useEffect(() => {
    if (gameOver || won) {
      setTimerActive(false)
      setFinalScore(score)
      if (won && timeToWin === null) {
        // Ensure timeToWin is only set once on win
        setTimeToWin(INITIAL_TIME - timeLeft)
        setGameOutcome("win")
      } else if (gameOver && !won) {
        setGameOutcome("lose")
      }
      setShowNicknameModal(true)
    }
  }, [gameOver, won, score, timeLeft, timeToWin])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver || won || showNicknameModal) return // Prevent moves if modal is open

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          move("up")
          break
        case "ArrowDown":
          e.preventDefault()
          move("down")
          break
        case "ArrowLeft":
          e.preventDefault()
          move("left")
          break
        case "ArrowRight":
          e.preventDefault()
          move("right")
          break
      }
    },
    [grid, gameOver, won, showNicknameModal],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown]) // Added move to dependency array

  const startGame = () => {
    const newGrid = Array(size)
      .fill(null)
      .map(() =>
        Array(size)
          .fill(null)
          .map(() => ({ value: null, id: 0, mergedFrom: null })),
      )

    setGrid(newGrid)
    setScore(0)
    setGameOver(false)
    setWon(false)
    setIdCounter(0)
    setTimeLeft(INITIAL_TIME)
    setTimerActive(false) // Timer is not active initially
    setHasMadeFirstMove(false) // Reset first move flag
    setShowNicknameModal(false)
    setNickname("")
    setFinalScore(0)
    setTimeToWin(null)
    setGameOutcome(null)

    addRandomTile(newGrid)
    addRandomTile(newGrid)
  }

  const getNextValue = (currentValue: number): number => {
    return currentValue * 2
  }

  const addRandomTile = (currentGrid: Cell[][]) => {
    const emptyCells: { row: number; col: number }[] = []

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (currentGrid[row][col].value === null) {
          emptyCells.push({ row, col })
        }
      }
    }

    if (emptyCells.length > 0) {
      const value = Math.random() < 0.9 ? 2 : 4

      const newId = idCounter + 1
      setIdCounter(newId)

      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      currentGrid[row][col] = {
        value,
        id: newId,
        mergedFrom: null,
      }
    }
  }

  const move = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      // Start timer on first move
      if (!hasMadeFirstMove) {
        setTimerActive(true)
        setHasMadeFirstMove(true)
      }

      const newGrid = JSON.parse(JSON.stringify(grid))

      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (newGrid[row][col].mergedFrom) {
            newGrid[row][col].mergedFrom = null
          }
        }
      }

      let moved = false

      if (direction === "left") {
        for (let row = 0; row < size; row++) {
          moved = processLine(newGrid[row], row, 0, 0, 1, newGrid) || moved
        }
      } else if (direction === "right") {
        for (let row = 0; row < size; row++) {
          moved = processLine(newGrid[row].slice().reverse(), row, size - 1, 0, -1, newGrid) || moved
        }
      } else if (direction === "up") {
        for (let col = 0; col < size; col++) {
          const line = Array(size)
            .fill(null)
            .map((_, row) => newGrid[row][col])
          moved = processLine(line, 0, col, 1, 0, newGrid) || moved
        }
      } else if (direction === "down") {
        for (let col = 0; col < size; col++) {
          const line = Array(size)
            .fill(null)
            .map((_, row) => newGrid[row][col])
            .reverse()
          moved = processLine(line, size - 1, col, -1, 0, newGrid) || moved
        }
      }

      if (moved) {
        addRandomTile(newGrid)
        setGrid(newGrid)

        if (!canMove(newGrid)) {
          setGameOver(true)
          setGameOutcome("lose")
        }
      }
    },
    [grid, hasMadeFirstMove],
  ) // Added grid and hasMadeFirstMove to useCallback dependencies

  const processLine = (
    line: Cell[],
    startRow: number,
    startCol: number,
    rowDelta: number,
    colDelta: number,
    newGrid: Cell[][],
  ): boolean => {
    let moved = false

    const movedLine = moveTiles(line)
    const mergedLine = mergeTiles(movedLine)

    for (let i = 0; i < size; i++) {
      if (line[i].value !== mergedLine[i].value || line[i].mergedFrom !== mergedLine[i].mergedFrom) {
        moved = true
      }

      const row = startRow + i * rowDelta
      const col = startCol + i * colDelta
      newGrid[row][col] = mergedLine[i]
    }

    return moved
  }

  const moveTiles = (line: Cell[]): Cell[] => {
    const newLine = Array(size)
      .fill(null)
      .map(() => ({ value: null, id: 0, mergedFrom: null }))
    let position = 0

    for (let i = 0; i < size; i++) {
      if (line[i].value !== null) {
        newLine[position] = { ...line[i] }
        position++
      }
    }

    return newLine
  }

  const mergeTiles = (line: Cell[]): Cell[] => {
    for (let i = 0; i < size - 1; i++) {
      if (line[i].value !== null && line[i].value === line[i + 1].value) {
        const nextValue = getNextValue(line[i].value as number)

        setScore((prev) => prev + nextValue)

        if (nextValue === 2048) {
          setWon(true)
          setTimeToWin(INITIAL_TIME - timeLeft) // Record time taken to win
          setGameOutcome("win")
        }

        const newId = idCounter + 1
        setIdCounter(newId)

        line[i] = {
          value: nextValue,
          id: newId,
          mergedFrom: [line[i].id, line[i + 1].id],
        }

        line[i + 1] = { value: null, id: 0, mergedFrom: null }

        i++
      }
    }

    return moveTiles(line)
  }

  const canMove = (grid: Cell[][]): boolean => {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col].value === null) {
          return true
        }
      }
    }

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const value = grid[row][col].value

        if (col < size - 1 && grid[row][col + 1].value === value) {
          return true
        }

        if (row < size - 1 && grid[row + 1][col].value === value) {
          return true
        }
      }
    }

    return false
  }

  const getTileBackgroundStyle = (value: number | null) => {
    if (value === null) {
      return { backgroundColor: "rgba(209, 213, 219, 0.2)" }
    }

    let gradientColors: [string, string] = ["#0DA591", "#196DFF"]

    if (value >= 2 && value < 16) {
      gradientColors = ["#0DA591", "#196DFF"]
    } else if (value >= 16 && value < 128) {
      gradientColors = ["#196DFF", "#3C19FF"]
    } else if (value >= 128 && value < 1024) {
      gradientColors = ["#3C19FF", "#5B0995"]
    } else if (value >= 1024) {
      gradientColors = ["#0DA591", "#5B0995"]
    }

    return {
      background: `linear-gradient(to bottom right, ${gradientColors[0]}, ${gradientColors[1]})`,
    }
  }

  const handleSubmitScore = async () => {
    if (nickname.trim() === "") {
      alert("Please enter a nickname.")
      return
    }

    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          score: finalScore,
          timeTaken: gameOutcome === "win" ? timeToWin : null, // Only save time if won
        }),
      })

      if (res.ok) {
        alert("Score saved successfully!")
        setShowNicknameModal(false)
        fetchLeaderboard() // Refresh leaderboard
      } else {
        const errorData = await res.json()
        alert(`Failed to save score: ${errorData.message || res.statusText}`)
      }
    } catch (error) {
      console.error("Error submitting score:", error)
      alert("An error occurred while saving your score.")
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden mx-auto">
      <Image
        alt="Abstract purple landscape with glowing cube"
        src="/images/background.png"
        placeholder="blur"
        quality={100}
        fill
        sizes="100vw"
        style={{
          objectFit: "cover",
          zIndex: -1,
        }}
      />
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* Game Board Section */}
        <div className="flex-1 w-full max-w-md mx-auto lg:mx-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{
                  backgroundImage: `linear-gradient(to right, #0DA591, #196DFF, #3C19FF, #5B0995)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Cysic Fusion
              </h1>
              <p className="text-sm text-gray-400">Combine images to reach the 2048 tile!</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-100">{score}</div>
              <p className="text-sm text-gray-400">Score</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-100">{timeLeft}s</div>
              <p className="text-sm text-gray-400">Time Left</p>
            </div>
          </div>

          <div
            className="p-4 rounded-lg mb-4"
            style={{
              background: `linear-gradient(to bottom right, rgba(13, 165, 145, 0.7), rgba(25, 109, 255, 0.7), rgba(60, 25, 255, 0.7), rgba(91, 9, 149, 0.7))`,
            }}
          >
            <div className="grid grid-cols-4 gap-2">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-full aspect-square flex items-center justify-center rounded-md shadow-md transition-all duration-100 transform`}
                    style={getTileBackgroundStyle(cell.value)}
                  >
                    {cell.value !== null && TILE_IMAGES[cell.value] && (
                      <Image
                        src={TILE_IMAGES[cell.value] || "/placeholder.svg"}
                        alt={`Tile value ${cell.value}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                )),
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" onClick={() => move("up")} className="w-12 h-12">
              <ArrowUp className="h-6 w-6" />
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => move("left")} className="w-12 h-12">
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <Button variant="outline" onClick={() => move("down")} className="w-12 h-12">
                <ArrowDown className="h-6 w-6" />
              </Button>
              <Button variant="outline" onClick={() => move("right")} className="w-12 h-12">
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>
            <Button variant="default" onClick={startGame} className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          </div>

          <div className="mt-6 text-sm text-gray-100">
            <p className="mb-2">How to play:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use arrow keys or buttons to move tiles.</li>
              <li>The timer starts after your first move.</li>
              <li>
                When two identical images collide, they merge into the next image in the sequence (e.g., 2 + 2 = 4).
              </li>
              <li>
                Try to create the 2048 tile! If you do it within {INITIAL_TIME} seconds, your speed will be recorded on
                the leaderboard.
              </li>
            </ul>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="flex-1 w-full max-w-md mx-auto lg:mx-0 lg:mt-0 mt-8 bg-gray-900 bg-opacity-70 p-4 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Leaderboard</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-300">Rank</TableHead>
                <TableHead className="text-gray-300">Nickname</TableHead>
                <TableHead className="text-gray-300">Score</TableHead>
                <TableHead className="text-gray-300">Speed (s)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    No scores yet. Be the first!
                  </TableCell>
                </TableRow>
              ) : (
                leaderboardData.slice(0, 10).map(
                  (
                    entry,
                    index, // Show top 10
                  ) => (
                    <TableRow key={entry.timestamp}>
                      <TableCell className="font-medium text-gray-200">{index + 1}</TableCell>
                      <TableCell className="text-gray-200">{entry.nickname}</TableCell>
                      <TableCell className="text-gray-200">{entry.score}</TableCell>
                      <TableCell className="text-gray-200">
                        {entry.timeTaken !== null ? entry.timeTaken : "-"}
                      </TableCell>
                    </TableRow>
                  ),
                )
              )}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-gray-400">
            Note: Leaderboard data is stored in a JSON file on the server. This is not persistent in serverless
            environments like Vercel. For a production application, a database is recommended.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-8 text-center text-gray-400 text-lg font-bold">
        <p className="text-lg font-bold">Created for the Cysic project with love. Developer LeBwA</p>
      </div>

      {/* Nickname Input Modal */}
      <Dialog open={showNicknameModal} onOpenChange={setShowNicknameModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{gameOutcome === "win" ? "You Won!" : "Game Over"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {gameOutcome === "win"
                ? `Congratulations! You reached the 2048 tile with a score of ${finalScore} in ${timeToWin} seconds.`
                : `Game Over! Your final score is ${finalScore}.`}
              <br />
              Enter your nickname to save your score to the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nickname" className="text-right text-gray-300">
                Nickname
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="col-span-3 bg-gray-800 text-white border-gray-700"
                placeholder="Your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmitScore}>
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
