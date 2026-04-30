import { useCallback, useEffect, useState } from 'react'
import { faker } from '@faker-js/faker'

import './App.scss'

const GRID_SIZE = 10
const MIN_WORD_COUNT = 5
const MAX_WORD_COUNT = 10

let globalCtx = null

function generateWords(min = MIN_WORD_COUNT, max = MAX_WORD_COUNT) {
  const minCeiled = Math.ceil(min)
  const maxFloored = Math.floor(max)
  const wordListSize = Math.floor(
    Math.random() * (maxFloored - minCeiled + 1) + minCeiled,
  )

  return Array.from({ length: wordListSize }, () => {
    let word = faker.word.noun()
    while (word.length > GRID_SIZE) {
      word = faker.word.noun()
    }

    return word.toUpperCase()
  })
}

function generateMatrix(wordList) {
  // Filter out the words longer than the grid size
  const filteredWords = wordList.filter((w) => w.length <= GRID_SIZE)

  // Sort filteredWords by length (longest first)
  filteredWords.sort((a, b) => b.length - a.length)
  // Init empty grid
  let grid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(''))

  // 8 directions [dy, dx]
  const directions = [
    [0, 1], // right
    [1, 0], // down
    [1, 1], // right-down
    [1, -1], // left-down
    [0, -1], // left
    [-1, 0], // up
    [-1, -1], // left-up
    [-1, 1], // right-up
  ]

  function canPlace(word, row, col, dy, dx) {
    for (let i = 0; i < word.length; i++) {
      let r = row + i * dy
      let c = col + i * dx
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false
      if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false
    }
    return true
  }

  // Randomly place words in the grid
  filteredWords.forEach((word) => {
    let placed = false

    // List all possible placements for this word (row, col, direction)
    const possibilities = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        directions.forEach((dir) => {
          possibilities.push({ row, col, dy: dir[0], dx: dir[1] })
        })
      }
    }

    // Fisher-Yates Shuffle
    for (let i = possibilities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[possibilities[i], possibilities[j]] = [
        possibilities[j],
        possibilities[i],
      ]
    }

    // Try to place the word in one of the possible positions
    for (const pos of possibilities) {
      if (canPlace(word, pos.row, pos.col, pos.dy, pos.dx)) {
        for (let i = 0; i < word.length; i++) {
          grid[pos.row + i * pos.dy][pos.col + i * pos.dx] = word[i]
        }
        placed = true
        break // Stop after placing the word
      }
    }

    if (!placed) console.warn(`Cannot place word: ${word}`)
  })

  // Randomly fill remaining empty cells with letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)]
      }
    }
  }
  return grid
}

const soundWellDone = new Audio('/sounds/well-done.mp3')

function App() {
  const words = generateWords() // randomly generate words
  const [foundWords, setFoundWords] = useState([])
  const [selectedCells, setSelectedCells] = useState([])
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selectedFrom, setSelectedFrom] = useState(null)
  const [selectedTo, setSelectedTo] = useState(null)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [currentWords, setCurrentWords] = useState(words)
  const [currentMatrix, setCurrentMatrix] = useState(() =>
    generateMatrix(words),
  )

  function letterTileClasses(x, y) {
    const foundCell = selectedCells.find((cell) => cell.x === x && cell.y === y)
    if (foundCell) {
      return 'selected'
    }
    if (done && !foundCell) {
      return 'done'
    }
  }

  function wordSelectStart(e) {
    if (!globalCtx) {
      globalCtx = new (window.AudioContext || window.webkitAudioContext)()
    }

    if (globalCtx.state === 'suspended') {
      globalCtx.resume() // 用戶點擊時直接解鎖
    }
    setDragging(() => true)
    const touchedElement = e.target.closest('div.cell')

    if (touchedElement && touchedElement.dataset && touchedElement.dataset.x) {
      const { x, y } = touchedElement.dataset
      setSelectedFrom(() => {
        return {
          x: parseInt(x, 10),
          y: parseInt(y, 10),
        }
      })
      return true
    }
    return false
  }

  function wordDirection(x_start, y_start, x_end, y_end) {
    if (x_start === x_end && y_start > y_end) {
      // up
      return 0
    } else if (x_start < x_end && y_start > y_end) {
      // up-right
      return 1
    } else if (x_start < x_end && y_start === y_end) {
      // right
      return 2
    } else if (x_start < x_end && y_start < y_end) {
      // down-right
      return 3
    } else if (x_start === x_end && y_start < y_end) {
      // down
      return 4
    } else if (x_start > x_end && y_start < y_end) {
      // down-left
      return 5
    } else if (x_start > x_end && y_start === y_end) {
      // left
      return 6
    } else if (x_start > x_end && y_start > y_end) {
      // up-left
      return 7
    }
  }

  function wordSelectStop() {
    setDragging(() => false)
    let selected = []

    selectedCells.forEach((coordinate) => {
      selected.push(currentMatrix[coordinate.y][coordinate.x])
    })

    if (selectedCells.length < 2) {
      setSelectedFrom(() => null)
      setSelectedTo(() => null)
      return
    }

    let foundWord = currentWords.find((word) => word === selected.join(''))

    let x_start = selectedCells[0]?.x
    let y_start = selectedCells[0]?.y
    let x_end = selectedCells[selectedCells.length - 1].x
    let y_end = selectedCells[selectedCells.length - 1].y

    if (!foundWord) {
      const selected_word = selected.reverse().join('')
      foundWord = currentWords.find((word) => word === selected_word)
      x_end = selectedCells[0]?.x
      y_end = selectedCells[0]?.y
      x_start = selectedCells[selectedCells.length - 1].x
      y_start = selectedCells[selectedCells.length - 1].y
    }

    if (foundWord) {
      let exists = false
      foundWords.forEach((w) => {
        if (w.value === foundWord) {
          exists = true
        }
      })

      if (!exists) {
        let cells = []
        selectedCells.forEach((coordinate) => {
          cells.push({ x: coordinate.x, y: coordinate.y })
        })

        playSuccessBeep()

        setFoundWords((pre) => [
          ...pre,
          {
            value: foundWord,
            x_start,
            y_start,
            direction: wordDirection(x_start, y_start, x_end, y_end),
            length: foundWord.length,
          },
        ])
      }
    }
    setSelectedFrom(() => null)
    setSelectedTo(() => null)
  }

  function wordSelectUpdate(e = null) {
    if (!dragging) return
    let x, y
    if (e) {
      let touch = e
      if (e.type.indexOf('touch') === 0) {
        touch = e.changedTouches.item(0)
      }

      const touchedElement = document
        .elementFromPoint(touch.clientX, touch.clientY)
        .closest('div.cell')

      if (
        touchedElement &&
        touchedElement.dataset &&
        touchedElement.dataset.x
      ) {
        x = parseInt(touchedElement.dataset.x, 10)
        y = parseInt(touchedElement.dataset.y, 10)
        setLastPos({ x, y })
      } else {
        // If the touch is outside of the grid, use the last known position
        x = lastPos.x
        y = lastPos.y
      }
    }
    // Only update selectedTo if the position has changed
    if (x !== undefined && y !== undefined) {
      setSelectedTo({ x, y })
    }
  }

  function wordLinesForTile(x, y) {
    return foundWords.filter((w) => w.x_start === x && w.y_start === y)
  }

  function wordLineClasses(wordLine) {
    const classes = [
      'word-strike',
      'word-strike-direction-' + wordLine.direction,
      'word-strike-length-' + wordLine.length,
    ]
    // Odd directions are diagonal
    if (wordLine.direction % 2 === 1) {
      classes.push('word-strike-diagonal')
    }
    return classes.join(' ')
  }

  function isFound(word) {
    const f = foundWords.find((w) => {
      const eq = w.value === word
      return eq
    })
    return f && f.value
  }

  // Helper function to play a beep
  function playSuccessBeep() {
    const oscillator = globalCtx.createOscillator()
    const gainNode = globalCtx.createGain()

    // Connect: Oscillator -> Gain -> Speakers
    oscillator.connect(gainNode)
    gainNode.connect(globalCtx.destination)

    // Settings for a pleasant "ding"
    oscillator.type = 'sine' // Smooth wave
    oscillator.frequency.setValueAtTime(880, globalCtx.currentTime) // A5 note (440Hz * 2)

    // Fade out to avoid clicking sounds
    gainNode.gain.setValueAtTime(0.1, globalCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      globalCtx.currentTime + 0.1,
    )

    oscillator.start()
    oscillator.stop(globalCtx.currentTime + 0.1) // Stop after 100ms
  }

  // Reset the game
  const handleReset = useCallback(() => {
    const words = generateWords()
    setCurrentWords(words)
    setCurrentMatrix(generateMatrix(words))
    setFoundWords([])
    setDone(false)
  }, [])

  useEffect(() => {
    if (done) {
      setTimeout(() => {
        soundWellDone.play()
        alert('Congratulations! You found all the words!')
        handleReset()
      }, 100)
    }
  }, [done, handleReset])

  useEffect(() => {
    let cells = []
    if (selectedFrom && selectedTo) {
      if (selectedFrom.x === selectedTo.x) {
        // horizontal direction (-)
        let from = Math.min(selectedFrom.y, selectedTo.y)
        let to = Math.max(selectedFrom.y, selectedTo.y)
        for (let i = from; i <= to; i++) {
          cells.push({ x: selectedFrom.x, y: i })
        }
      } else if (selectedFrom.y === selectedTo.y) {
        // vertical direction (|)
        let from = Math.min(selectedFrom.x, selectedTo.x)
        let to = Math.max(selectedFrom.x, selectedTo.x)
        for (let i = from; i <= to; i++) {
          cells.push({ x: i, y: selectedFrom.y })
        }
      } else if (
        selectedFrom.x - selectedTo.x ===
        selectedFrom.y - selectedTo.y
      ) {
        // right-down direction (\)
        let x_from = Math.min(selectedFrom.x, selectedTo.x)
        let x_to = Math.max(selectedFrom.x, selectedTo.x)
        let y_from = Math.min(selectedFrom.y, selectedTo.y)
        for (let i = x_from; i <= x_to; i++) {
          cells.push({ x: i, y: y_from })
          y_from++
        }
      } else if (
        selectedFrom.x - selectedTo.x ===
        selectedTo.y - selectedFrom.y
      ) {
        // right-up direction (/)
        let x_from = Math.min(selectedFrom.x, selectedTo.x)
        let x_to = Math.max(selectedFrom.x, selectedTo.x)
        let y_to = Math.max(selectedFrom.y, selectedTo.y)
        for (let i = x_from; i <= x_to; i++) {
          cells.push({ x: i, y: y_to })
          y_to--
        }
      }
    }
    setSelectedCells(() => {
      return [...cells]
    })
  }, [selectedFrom, selectedTo])

  useEffect(() => {
    setDone(() => foundWords.length === currentWords.length)
  }, [foundWords, currentWords])

  return (
    <main>
      <section className='main-content word-game'>
        <h2>Find these {currentWords.length} words</h2>
        <div className='word-search-game'>
          <div className='words-list'>
            {currentWords.map((word) => (
              <div key={word} className='words-list__item'>
                <span
                  className={[
                    'words-list__value',
                    isFound(word) ? 'found' : '',
                  ].join(' ')}
                >
                  {word}
                </span>
              </div>
            ))}
          </div>

          <div className='matrix word-search-game__matrix'>
            {currentMatrix.map((row, row_key) =>
              row.map((letter, col_key) => (
                <div
                  key={`${row_key}_${col_key}`}
                  className={[
                    'matrix-cell',
                    letterTileClasses(col_key, row_key),
                  ].join(' ')}
                >
                  <div
                    data-x={col_key}
                    data-y={row_key}
                    className='cell'
                    onMouseDown={wordSelectStart}
                    onMouseUp={wordSelectStop}
                    onMouseEnter={(e) => dragging && wordSelectUpdate(e)} // Only trigger onMouseMove when dragging
                    onMouseMove={wordSelectUpdate}
                    onTouchStart={wordSelectStart}
                    onTouchEnd={wordSelectStop}
                    onTouchMove={wordSelectUpdate}
                  >
                    <svg
                      style={{ border: '1px solid black' }}
                      width='100%'
                      height='100%'
                      viewBox='0 0 18 18'
                    >
                      <text x='50%' y='13' textAnchor='middle'>
                        {letter}
                      </text>
                    </svg>
                  </div>
                  {/* Render word lines for this tile */}
                  {wordLinesForTile(col_key, row_key).map((wordLineData, i) => (
                    <div
                      key={`${row_key}_${col_key}_${i}`}
                      className={wordLineClasses(wordLineData)}
                    ></div>
                  ))}
                </div>
              )),
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
