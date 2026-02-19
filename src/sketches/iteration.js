// Hénon Map Iteration
// Paste into https://editor.p5js.org/ to run standalone
//
// Click on the plot to choose an initial condition, then watch the orbit.
// To use a different map, replace the mapStep() function and adjust parameters.

// ---- map function ----
function mapStep(x, y, params) {
  return [params.a - x * x + params.b * y, x]
}

// ---- parameters ----
var params = { a: 2.182, b: -0.4 }
var numIterates = 1000
var lag = 50
var speed = 10

// ---- plot bounds ----
var xMin = -2.5
var xMax = 2.5
var yMin = -2.5
var yMax = 2.5

// ---- layout ----
var W = 900
var H = 900
var MARGIN = { top: 60, right: 40, bottom: 60, left: 70 }

// ---- state ----
var orbit = []
var curX = 0
var curY = 0
var curStep = 0
var waiting = true
var diverged = false

function setup() {
  createCanvas(W, H)
  frameRate(30)
}

function draw() {
  background(255)
  drawAxes()

  if (waiting) {
    drawWaitingMessage()
    return
  }

  if (!diverged && curStep < numIterates) {
    for (var i = 0; i < speed; i++) {
      if (curStep >= numIterates || diverged) break
      var next = mapStep(curX, curY, params)
      curX = next[0]
      curY = next[1]
      curStep++

      if (Math.abs(curX) > 1e10 || Math.abs(curY) > 1e10) {
        diverged = true
        break
      }

      orbit.push({ x: curX, y: curY })
      if (orbit.length > lag) {
        orbit.shift()
      }
    }
  }

  drawOrbit()

  if (diverged) {
    drawDivergedMessage()
  } else if (curStep >= numIterates) {
    noLoop()
  }
}

function mousePressed() {
  if (
    mouseX >= MARGIN.left &&
    mouseX <= W - MARGIN.right &&
    mouseY >= MARGIN.top &&
    mouseY <= H - MARGIN.bottom
  ) {
    curX = map(mouseX, MARGIN.left, W - MARGIN.right, xMin, xMax)
    curY = map(mouseY, MARGIN.top, H - MARGIN.bottom, yMax, yMin)
    orbit = [{ x: curX, y: curY }]
    curStep = 0
    waiting = false
    diverged = false
    loop()
  }
}

function drawAxes() {
  stroke(0)
  strokeWeight(1)
  line(MARGIN.left, H - MARGIN.bottom, W - MARGIN.right, H - MARGIN.bottom)
  line(MARGIN.left, MARGIN.top, MARGIN.left, H - MARGIN.bottom)

  textSize(12)
  fill(0)
  noStroke()

  textAlign(CENTER, TOP)
  for (var v = Math.ceil(xMin); v <= xMax; v += 1) {
    var px = mapPx(v)
    stroke(0)
    line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
    noStroke()
    text(v.toFixed(0), px, H - MARGIN.bottom + 10)
  }

  textAlign(RIGHT, CENTER)
  for (var v2 = Math.ceil(yMin); v2 <= yMax; v2 += 1) {
    var py = mapPy(v2)
    stroke(0)
    line(MARGIN.left - 6, py, MARGIN.left, py)
    noStroke()
    text(v2.toFixed(0), MARGIN.left - 10, py)
  }

  // title
  noStroke()
  fill(0)
  textAlign(CENTER, TOP)
  textSize(18)
  textStyle(BOLD)
  text('Map Iteration', W / 2, 15)
  textSize(13)
  textStyle(NORMAL)
  var paramStr = Object.keys(params)
    .map(function (k) {
      return k + ' = ' + params[k]
    })
    .join(', ')
  text(paramStr, W / 2, 38)

  textSize(14)
  text('x', W / 2, H - 20)

  push()
  translate(18, H / 2)
  rotate(-HALF_PI)
  textAlign(CENTER, CENTER)
  textSize(14)
  text('y', 0, 0)
  pop()
}

function drawOrbit() {
  strokeWeight(6)
  stroke(220, 50, 50)
  for (var i = 0; i < orbit.length; i++) {
    point(mapPx(orbit[i].x), mapPy(orbit[i].y))
  }
}

function drawWaitingMessage() {
  noStroke()
  fill(100)
  textAlign(CENTER, CENTER)
  textSize(16)
  text('Click on the plot to choose an initial condition', W / 2, H / 2)
}

function drawDivergedMessage() {
  noStroke()
  fill(200, 50, 50)
  textAlign(CENTER, TOP)
  textSize(14)
  text('Orbit diverged!', W / 2, MARGIN.top + 10)
}

// ---- helpers ----
function mapPx(val) {
  return map(val, xMin, xMax, MARGIN.left, W - MARGIN.right)
}

function mapPy(val) {
  return map(val, yMin, yMax, H - MARGIN.bottom, MARGIN.top)
}
