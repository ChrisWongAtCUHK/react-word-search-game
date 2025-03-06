import { useEffect, useState, useMemo } from 'react'
import './App.scss'

function App() {
  const matrix = [
    ['A', 'M', 'C', 'N', 'T', 'S', 'K', 'B', 'A', 'N'],
    ['D', 'O', 'A', 'H', 'T', 'O', 'T', 'A', 'L', 'S'],
    ['A', 'J', 'N', 'X', 'E', 'V', 'R', 'U', 'O', 'R'],
    ['P', 'C', 'D', 'U', 'P', 'E', 'F', 'R', 'N', 'E'],
    ['R', 'B', 'Y', 'R', 'S', 'R', 'S', 'V', 'A', 'K'],
    ['E', 'Y', 'O', 'G', 'U', 'R', 'T', 'E', 'R', 'C'],
    ['T', 'L', 'N', 'I', 'B', 'A', 'R', 'S', 'G', 'A'],
    ['Z', 'K', 'T', 'G', 'I', 'I', 'J', 'X', 'W', 'R'],
    ['E', 'I', 'L', 'R', 'S', 'S', 'P', 'I', 'H', 'C'],
    ['L', 'S', 'E', 'I', 'K', 'O', 'O', 'C', 'U', 'F'],
  ]

  const words = useMemo(() => [
    'BARS',
    'CANDY',
    'CARROT',
    'CHEESE',
    'CHIPS',
    'COOKIES',
    'CRACKERS',
    'FRUIT',
    'GRANOLA',
    'NUTS',
    'PRETZEL',
    'YOGURT',
  ], [])

  const [foundWords, setFoundWords] = useState([])
  const [selectedCells, setSelectedCells] = useState([])
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selectedFrom, setSelectedFrom] = useState(null)
  const [selectedTo, setSelectedTo] = useState(null)
  const [debounceActiveCell, setDebounceActiveCell] = useState('')

  function debounce(fn, delay) {
    let timeout

    return (...args) => {
      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(() => {
        fn(...args)
      }, delay)
    }
  }

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
      selected.push(matrix[coordinate.y][coordinate.x])
    })

    if (selectedCells.length < 2) {
      setSelectedFrom(() => null)
      setSelectedTo(() => null)
      return
    }

    let foundWord = words.find((word) => word === selected.join(''))

    let x_start = selectedCells[0]?.x
    let y_start = selectedCells[0]?.y
    let x_end = selectedCells[selectedCells.length - 1].x
    let y_end = selectedCells[selectedCells.length - 1].y

    if (!foundWord) {
      const selected_word = selected.reverse().join('')
      foundWord = words.find((word) => word === selected_word)
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
      } else {
        ;[x, y] = debounceActiveCell.split('_')
      }
    }
    setSelectedTo(() => {
      return { x: parseInt(x), y: parseInt(y) }
    })
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

  useEffect(() => {
    setDebounceActiveCell(() => debounce(wordSelectUpdate, 100))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setDone(() => foundWords.length === words.length)
  }, [foundWords, words])

  return (
    <main>
      <section className='main-content word-game'>
        <h2>Find these {words.length} words</h2>
        <div className='word-search-game'>
          <div className='words-list'>
            {words.map((word) => (
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
            {matrix.map((row, row_key) =>
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
                    onMouseMove={wordSelectUpdate}
                    onMouseEnter={() =>
                      setDebounceActiveCell(() => `${col_key}_${row_key}`)
                    }
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
                  {wordLinesForTile(col_key, row_key).map((wordLineData, i) => (
                    <div
                      key={`${row_key}_${col_key}_${i}`}
                      className={wordLineClasses(wordLineData)}
                    ></div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
