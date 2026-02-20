// Logistic Map — Lyapunov Exponent
// Paste into https://editor.p5js.org/ to run standalone
//
// Computes lambda = (1/900) * sum( log|a(1 - 2x_i)| ) for i = 101..1000
// for the logistic map g_a(x) = a * x * (1 - x)

// ---- parameters ----
var aMin = 2
var aMax = 4
var dA = 0.001
var N = 1000 // total iterations per a value
var TRANSIENT = 100 // skip first 100 iterates (use 101..1000)

// ---- layout ----
var W = 900
var H = 900
var MARGIN = { top: 60, right: 40, bottom: 60, left: 80 }

// computed data
var lyapData = [] // [{a, lambda}]
var yMin, yMax

function setup() {
  createCanvas(W, H)
  background(255)
  noLoop()
  computeLyapunov()
}

function draw() {
  background(255)
  drawAxes()
  drawZeroLine()
  drawLyapunov()
  drawLabels()
}

function logisticStep(x, a) {
  return a * x * (1 - x)
}

function computeLyapunov() {
  lyapData = []
  var lo = Infinity
  var hi = -Infinity

  for (var a = aMin; a <= aMax; a += dA) {
    var x = random() // random IC in (0, 1)

    var diverged = false
    var lyapSum = 0
    var lyapCount = 0

    for (var i = 0; i < N; i++) {
      x = logisticStep(x, a)
      if (Math.abs(x) > 1e10) {
        diverged = true
        break
      }
      // accumulate log|f'(x)| = log|a(1 - 2x)| for iterates 101..1000
      if (i >= TRANSIENT) {
        var deriv = a * (1 - 2 * x)
        if (deriv !== 0) {
          lyapSum += Math.log(Math.abs(deriv))
          lyapCount++
        }
      }
    }
    if (diverged || lyapCount === 0) continue

    var lambda = lyapSum / lyapCount
    lyapData.push({ a: a, lambda: lambda })
    if (lambda < lo) lo = lambda
    if (lambda > hi) hi = lambda
  }

  var pad = Math.max(0.1, (hi - lo) * 0.1)
  yMin = lo - pad
  yMax = hi + pad
}

function drawZeroLine() {
  var py0 = mapPy(0)
  stroke(220, 50, 50)
  strokeWeight(1.5)
  drawingContext.setLineDash([6, 4])
  line(MARGIN.left, py0, W - MARGIN.right, py0)
  drawingContext.setLineDash([])
}

function drawLyapunov() {
  stroke(0)
  strokeWeight(1)
  for (var i = 0; i < lyapData.length; i++) {
    point(mapPx(lyapData[i].a), mapPy(lyapData[i].lambda))
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
  var xStep = 0.5
  for (var a = aMin; a <= aMax + 0.0001; a += xStep) {
    var px = mapPx(a)
    stroke(0)
    line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
    noStroke()
    text(a.toFixed(1), px, H - MARGIN.bottom + 10)
  }

  textAlign(RIGHT, CENTER)
  var yStep = 0.5
  for (
    var v = Math.ceil(yMin / yStep) * yStep;
    v <= yMax + 0.0001;
    v += yStep
  ) {
    var py = mapPy(v)
    stroke(0)
    line(MARGIN.left - 6, py, MARGIN.left, py)
    noStroke()
    text(v.toFixed(2), MARGIN.left - 10, py)
  }
}

function drawLabels() {
  noStroke()
  fill(0)
  textAlign(CENTER, TOP)
  textSize(18)
  textStyle(BOLD)
  text('Lyapunov Exponent — Logistic Map', W / 2, 15)
  textSize(13)
  textStyle(NORMAL)
  text(
    'lambda = avg log|a(1-2x)|,  iterates 101-' + N + ',  random IC',
    W / 2,
    38
  )
  textSize(14)
  text('parameter a', W / 2, H - 20)

  push()
  translate(18, H / 2)
  rotate(-HALF_PI)
  textAlign(CENTER, CENTER)
  textSize(14)
  text('λ', 0, 0)
  pop()
}

// ---- helpers ----
function mapPx(a) {
  return map(a, aMin, aMax, MARGIN.left, W - MARGIN.right)
}

function mapPy(val) {
  return map(val, yMin, yMax, H - MARGIN.bottom, MARGIN.top)
}
