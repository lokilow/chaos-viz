// Hénon Map Bifurcation Diagram
// Paste into https://editor.p5js.org/ to run standalone
//
// To use a different map, replace the mapStep() function and adjust parameters.

// ---- map function ----
function mapStep(x, y, params) {
  return [params.a - x * x + params.b * y, x]
}

// ---- parameters ----
var paramName = 'a'
var paramMin = 2
var paramMax = 2
var dParam = 1e-5
var N = 10000
var ic = [0, 2]
var fixedParams = { b: -0.4 }
var plotYMin = -0.5
var plotYMax = 2

// ---- layout ----
var W = 900
var H = 900
var MARGIN = { top: 60, right: 40, bottom: 60, left: 70 }

function setup() {
  createCanvas(W, H)
  background(255)
  noLoop()
}

function draw() {
  background(255)
  drawAxes()
  drawBifurcation()
  drawLabels()
}

function drawBifurcation() {
  var S = 12
  var tol = 1e-5
  strokeWeight(1)
  stroke(0)

  for (var a = paramMin; a <= paramMax; a += dParam) {
    var params = Object.assign({}, fixedParams)
    params[paramName] = a

    var xArr = new Float64Array(N + 1)
    var yArr = new Float64Array(N + 1)
    xArr[0] = ic[0]
    yArr[0] = ic[1]

    var diverged = false
    for (var i = 0; i < N; i++) {
      var next = mapStep(xArr[i], yArr[i], params)
      xArr[i + 1] = next[0]
      yArr[i + 1] = next[1]
      if (Math.abs(xArr[i + 1]) > 1e10) {
        diverged = true
        break
      }
    }
    if (diverged) continue

    // detect shortest periodic orbit
    var p = S
    var found = false
    for (var j = 0; j <= S; j++) {
      var period = Math.pow(2, j)
      if (period > N) break
      if (Math.abs(xArr[N] - xArr[N - period]) < tol && !found) {
        found = true
        p = j
      }
    }

    var detectedPeriod = Math.pow(2, p)
    var orbitLen = found ? detectedPeriod : Math.min(256, N)
    var start = N - orbitLen
    for (var k = start; k <= N; k++) {
      point(mapPx(a), mapPy(xArr[k]))
    }
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

  // x ticks
  textAlign(CENTER, TOP)
  var xStep = niceStep(paramMax - paramMin)
  for (var a = ceilTo(paramMin, xStep); a <= paramMax + 0.0001; a += xStep) {
    var px = mapPx(a)
    stroke(0)
    line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
    noStroke()
    text(a.toFixed(3), px, H - MARGIN.bottom + 10)
  }

  // y ticks
  textAlign(RIGHT, CENTER)
  var yStep = niceStep(plotYMax - plotYMin)
  for (var v = ceilTo(plotYMin, yStep); v <= plotYMax + 0.0001; v += yStep) {
    var py = mapPy(v)
    stroke(0)
    line(MARGIN.left - 6, py, MARGIN.left, py)
    noStroke()
    text(v.toFixed(1), MARGIN.left - 10, py)
  }
}

function drawLabels() {
  noStroke()
  fill(0)
  textAlign(CENTER, TOP)
  textSize(18)
  textStyle(BOLD)
  text('Bifurcation Diagram', W / 2, 15)
  textSize(13)
  textStyle(NORMAL)
  var paramStr = Object.keys(fixedParams)
    .map(function (k) {
      return k + ' = ' + fixedParams[k]
    })
    .join(', ')
  text('sweep: ' + paramName + '   ' + paramStr, W / 2, 38)
  textSize(14)
  text('parameter ' + paramName, W / 2, H - 20)

  push()
  translate(18, H / 2)
  rotate(-HALF_PI)
  textAlign(CENTER, CENTER)
  textSize(14)
  text('x', 0, 0)
  pop()
}

// ---- helpers ----
function mapPx(a) {
  return map(a, paramMin, paramMax, MARGIN.left, W - MARGIN.right)
}

function mapPy(val) {
  return map(val, plotYMin, plotYMax, H - MARGIN.bottom, MARGIN.top)
}

function niceStep(range) {
  var rough = range / 8
  var mag = Math.pow(10, Math.floor(Math.log10(rough)))
  var norm = rough / mag
  if (norm < 1.5) return mag
  if (norm < 3.5) return 2 * mag
  if (norm < 7.5) return 5 * mag
  return 10 * mag
}

function ceilTo(value, step) {
  return Math.ceil(value / step) * step
}
