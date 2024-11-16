import "./styles.css";

import "@webxdc/highscores";
import { Howl } from "howler";
import { Astar } from "./astar.js";
import { storage } from "./storage.js";

const h = (tag, attributes, ...children) => {
  const element = document.createElement(tag);
  if (attributes) {
    Object.entries(attributes).forEach((entry) => {
      element.setAttribute(entry[0], entry[1]);
    });
  }
  element.append(...children);
  return element;
};

const padZero = (score) => String(score).padStart(5, "0");

let sfxScore = new Howl({ src: ["sounds/score.mp3"], volume: 0.5 }),
  sfxDie = new Howl({ src: ["sounds/gameover.mp3"], volume: 0.4 });
let Lines = (function () {
  // Game variables
  let grid, forecast, score, selected, blocked, gameover;

  // Ball colors
  const colors = {
    1: "blue",
    2: "cyan",
    3: "red",
    4: "brown",
    5: "green",
    6: "yellow",
    7: "magenta",
    key: function (color) {
      for (let key in this) {
        if (this[key] === color) {
          return parseInt(key);
        }
      }
    },
  };

  // Game DOM elements
  const game = h("div", { id: "game" });

  const gridElement = h("div", { class: "grid" }),
    forecastElement = h("div", { class: "forecast" }),
    scoreElement = h("span"),
    recordElement = h("span");

  const newGameBtn = h(
      "div",
      { id: "restartBtn", class: "footer-item" },
      h("img", { src: "./images/restart.svg" }),
      h("p", {}, "Restart"),
    ),
    skipBtn = h(
      "div",
      { class: "footer-item" },
      h("img", { src: "./images/skip.svg" }),
      h("p", {}, "Skip"),
    ),
    highscoresBtn = h(
      "div",
      { class: "footer-item" },
      h("img", { src: "./images/coup.svg" }),
      h("p", {}, "Scoreboard"),
    );

  game.append(
    h(
      "section",
      { class: "forecast-container" },
      h("p", { class: "next-label" }, "NEXT"),
      forecastElement,
      h("p", { class: "forecast-children" }, "SCORE: ", scoreElement),
      h("p", { class: "forecast-children" }, "BEST: ", recordElement),
    ),
    gridElement,
    h("footer", {}, newGameBtn, skipBtn, highscoresBtn),
  );

  const overlay = h(
    "div",
    { class: "overlay" },
    h("h2", { class: "overlay__text" }, "Scoreboard"),
    h("div", { id: "scoreboard" }),
  );
  overlay.addEventListener("click", () => {
    overlay.classList.remove("overlay--visible");
    game.classList.remove("blur");
    if (gameover) {
      init();
    }
  });

  document.body.append(game, overlay);

  // set onClick event for Highscores button
  highscoresBtn.addEventListener("click", () => {
    overlay.classList.add("overlay--visible");
    game.classList.add("blur");
  });

  // Set onClick() for new game button
  newGameBtn.addEventListener("click", () => {
    window.highscores.setScore(score);
    resetState();
    init();
  });

  // set onClick for skip button
  skipBtn.addEventListener("click", () => {
    addBalls(function (cells) {
      let lineSets = [];

      for (let i = 0; i < cells.length; i++) {
        let lines = getLines(cells[i]);
        if (lines) {
          lineSets.push(lines);
        }
      }

      // Checks if five-ball lines are found after adding balls
      if (lineSets.length > 0) {
        removeLines(lineSets);
      } else {
        // Checks if the grid is completely filled with balls
        if (getCells(".empty").length === 0) {
          gameOver();
        }
      }
    });
  });

  // save highscore on visibility change
  document.addEventListener("visibilitychange", () =>
    window.highscores.setScore(score),
  );

  /**
   * Initializes game
   *
   * @param string
   */
  function init() {
    // Sets default game values
    blocked = false;
    gameover = false;
    selected = null;
    grid = storage.load("color-lines-grid");
    score = storage.load("color-lines-score", 0);
    scoreElement.innerText = padZero(score);
    recordElement.innerText = padZero(window.highscores.getScore());

    // Generates forecast balls
    forecastBalls(storage.load("color-lines-forecast"));

    // Create or restore grid
    restoreGrid();
  }

  function restoreGrid() {
    // Clears grid element
    gridElement.innerText = "";

    const emptyGrid = !grid;

    if (emptyGrid) {
      // grid is empty, generate new
      grid = [];
      for (let i = 0; i < 9; i++) {
        grid[i] = [];
        for (let j = 0; j < 9; j++) {
          grid[i][j] = 0;
        }
      }
    }

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = h("div", {
          id: "cell-" + j + "-" + i,
          class:
            grid[i][j] !== 0
              ? "ball " + colors[parseInt(grid[i][j])] + " fadein"
              : "empty",
          style: `grid-area: ${i + 1} / ${j + 1} / ${i + 2} / ${j + 2}`,
          "data-x": j,
          "data-y": i,
        });

        // Adds cell to the grid
        gridElement.appendChild(cell);

        // Listens for a click event
        cell.addEventListener(
          "click",
          function (e) {
            if (blocked) {
              return;
            } else if (e.currentTarget.className === "empty") {
              onEmptyCellClick(e);
            } else {
              onBallClick(e);
            }
          },
          false,
        );
      }
    }

    if (emptyGrid) {
      // Add initial random balls on the grid
      addBalls();
    }
  }

  /**
   * Gets cells by selector
   *
   * @param string
   * @return object
   */
  function getCells(selector) {
    return gridElement.querySelectorAll(selector);
  }

  /**
   * Gets specific cell by x and y coordinates
   *
   * @param integer
   * @param integer
   * @return object
   */
  function getCell(x, y) {
    return document.getElementById("cell-" + x + "-" + y);
  }

  /**
   * Event: ball clicked
   *
   * @param object
   */
  function onBallClick(e) {
    // Unselects previously selected cell
    each(getCells(".ball"), function (cell) {
      if (cell.classList.contains("selected")) {
        cell.classList.remove("selected");
        return;
      }
    });

    // Marks clicked cell as selected
    e.currentTarget.classList.add("selected");
    selected = e.currentTarget;
  }

  /** Reset game state */
  function resetState() {
    storage.store("color-lines-grid", null);
    storage.store("color-lines-score", null);
    storage.store("color-lines-forecast", null);
  }

  /** Save game state */
  function storeState() {
    storage.store("color-lines-grid", grid);
    storage.store("color-lines-score", score);
    storage.store("color-lines-forecast", forecast);
  }

  /**
   * Event: empty cell clicked
   *
   * @param object
   */
  function onEmptyCellClick(e) {
    // Checks if any cell is selected
    if (!selected) {
      return;
    }

    let to = e.currentTarget,
      from = selected;

    // Tries to find the path
    let astar = new Astar(grid);
    let path = astar.find(
      from.dataset.x,
      from.dataset.y,
      to.dataset.x,
      to.dataset.y,
    );

    // Checks if path were found
    if (path) {
      moveBall(from, to, path, function () {
        let lines = getLines(to);

        // Checks if there are five-ball lines for destination cell
        if (lines) {
          removeLines([lines]);
        } else {
          // Adds balls and checks for five-ball lines
          addBalls(function (cells) {
            let lineSets = [];

            for (let i = 0; i < cells.length; i++) {
              let lines = getLines(cells[i]);
              if (lines) {
                lineSets.push(lines);
              }
            }

            // Checks if five-ball lines are found after adding balls
            if (lineSets.length > 0) {
              removeLines(lineSets);
            } else {
              // Checks if the grid is completely filled with balls
              if (getCells(".empty").length === 0) {
                // Ends the game
                return gameOver();
              }
            }
          });
        }
      });
    }
  }

  /**
   * Adds balls on the grid
   *
   * @param function
   */
  function addBalls(callback) {
    blocked = true;
    let cells = [];

    for (let i = 0; i < 3; i++) {
      let emptyCells = getCells(".empty");
      if (emptyCells.length > 0) {
        // Gets random empty cell
        let cell = emptyCells[rand(0, emptyCells.length - 1)];
        grid[cell.dataset.y][cell.dataset.x] = colors.key(forecast[i]);

        cells.push(cell);
        cell.className = "ball " + forecast[i] + " fadein";
      } else {
        break;
      }
    }

    // Generates forecast balls
    forecastBalls();
    storeState();

    // Sets timeout for animation
    setTimeout(function () {
      each(getCells(".fadein"), function (cell) {
        cell.classList.remove("fadein");
      });

      blocked = false;
      if (callback) {
        return callback(cells);
      }
    }, 300);
  }

  /**
   * Removes lines
   *
   * @param array
   */
  function removeLines(lineSets) {
    blocked = true;

    let count = 0;
    for (let k in lineSets) {
      let lines = lineSets[k];

      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
          let x = lines[i][j][0],
            y = lines[i][j][1];
          let cell = getCell(x, y);

          cell.classList.add("fadeout");
          if (grid[y][x] !== 0) count++;
          grid[y][x] = 0;
        }
      }
    }

    // Update score
    sfxScore.play();
    score += count ** 2;
    storeState();
    if (score > window.highscores.getScore()) {
      // new highscore
      recordElement.innerText = padZero(score);
    }
    scoreElement.innerText = padZero(score);

    // Sets timeout for animation
    setTimeout(function () {
      each(getCells(".fadeout"), function (cell) {
        cell.className = "empty";
      });
      blocked = false;
    }, 300);
  }

  /**
   * Moves ball from one cell to another
   *
   * @param object
   * @param object
   * @param array
   * @param function
   */
  function moveBall(from, to, path, callback) {
    blocked = true;
    grid[from.dataset.y][from.dataset.x] = 0;

    let color = from.classList.item(1);
    let previous;

    // Removes selected ball
    from.className = "empty";
    selected = null;

    for (let i = 0; i <= path.length; i++) {
      (function (i) {
        setTimeout(function () {
          if (path.length == i) {
            // Adds ball to destination cell
            grid[to.dataset.y][to.dataset.x] = colors.key(color);
            to.className = "ball " + color;
            blocked = false;
            return callback();
          }

          if (previous) {
            previous.className = "empty";
          }

          let cell = (previous = getCell(path[i].x, path[i].y));
          cell.className = "ball " + color;
        }, 50 * i);
      })(i);
    }
  }

  /**
   * Gets lines of 5 or more balls
   *
   * @param object
   * @return array|bool
   */
  function getLines(cell) {
    let x = parseInt(cell.dataset.x),
      y = parseInt(cell.dataset.y),
      ball = colors.key(cell.classList.item(1)),
      lines = [[[x, y]], [[x, y]], [[x, y]], [[x, y]]];

    let l, r, d, u, lu, ru, ld, rd;
    l = r = d = u = lu = ru = ld = rd = ball;

    let i = 1;
    while ([l, r, u, d, lu, ru, ld, rd].indexOf(ball) !== -1) {
      // Horizontal lines
      if (l == grid[y][x - i]) {
        lines[0].push([x - i, y]);
      } else {
        l = -1;
      }
      if (r == grid[y][x + i]) {
        lines[0].push([x + i, y]);
      } else {
        r = -1;
      }

      // Vertical lines
      if (y - i >= 0 && u == grid[y - i][x]) {
        lines[1].push([x, y - i]);
      } else {
        u = -1;
      }
      if (y + i <= 8 && d == grid[y + i][x]) {
        lines[1].push([x, y + i]);
      } else {
        d = -1;
      }

      // Diagonal lines
      if (y - i >= 0 && lu == grid[y - i][x - i]) {
        lines[2].push([x - i, y - i]);
      } else {
        lu = -1;
      }
      if (y + i <= 8 && rd == grid[y + i][x + i]) {
        lines[2].push([x + i, y + i]);
      } else {
        rd = -1;
      }
      if (y + i <= 8 && ld == grid[y + i][x - i]) {
        lines[3].push([x - i, y + i]);
      } else {
        ld = -1;
      }
      if (y - i >= 0 && ru == grid[y - i][x + i]) {
        lines[3].push([x + i, y - i]);
      } else {
        ru = -1;
      }

      i++;
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].length < 5) {
        lines.splice(i, 1);
      }
    }

    // Returns five-ball lines or false
    return lines.length > 0 ? lines : false;
  }

  /**
   * Generates 3 forecast balls
   */
  function forecastBalls(restore) {
    if (restore) {
      forecast = restore;
    } else {
      forecast = [colors[rand(1, 7)], colors[rand(1, 7)], colors[rand(1, 7)]];
    }
    forecastElement.innerText = "";

    for (let i = 0; i < 3; i++) {
      forecastElement.appendChild(h("div", { class: "ball " + forecast[i] }));
    }
  }

  /**
   * Shows game over alert
   *
   * @param integer
   */
  function gameOver() {
    blocked = true;
    gameover = true;

    sfxDie.play();
    window.highscores.setScore(score);
    resetState();

    game.classList.add("blur");
    overlay.classList.add("overlay--visible");
  }

  /**
   * Generates random number between specified interval
   *
   * @param integer
   * @param integer
   * @return integer
   */
  function rand(from, to) {
    return Math.floor(Math.random() * (to - from + 1)) + from;
  }

  /**
   * Goes through all objects
   *
   * @param object
   * @param function
   */
  function each(object, callback) {
    for (let i = 0; i < object.length; i++) {
      callback(object[i], i);
    }
  }

  /**
   * Returns public methods
   */
  return {
    init: init,
  };
})();

// Initializes scores api
const scoreboard = document.querySelector("#scoreboard");
scoreboard.appendChild(
  h("p", { class: "score-row", style: "text-align: center;" }, "No scores yet"),
);
await window.highscores.init({
  getAnnouncement: (name, score) => `${name} scored ${score} in Color Lines`,
  onHighscoresChanged: () => {
    scoreboard.innerHTML = window.highscores.renderScoreboard().innerHTML;
  },
});
Lines.init();
