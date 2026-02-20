// Logistic Map Bifurcation Diagram
// Paste into https://editor.p5js.org/ to run standalone
//
// g_a(x) = a * x * (1 - x),  a in [aMin, aMax]

// ---- parameters ----
var aMin = 2
var aMax = 4
var dA = 0.001
var N = 1000
var plotYMin = 0
var plotYMax = 1

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

function logisticStep(x, a) {
  return a * x * (1 - x)
}

function drawBifurcation() {
  strokeWeight(1)
  stroke(0)

  for (var a = aMin; a <= aMax; a += dA) {
    var x = random() // random IC in (0, 1)

    // burn transient (first 100 iterates)
    for (var i = 0; i < 100; i++) {
      x = logisticStep(x, a)
    }

    // plot iterates 101..1000
    for (var i = 100; i < N; i++) {
      x = logisticStep(x, a)
      point(mapPx(a), mapPy(x))
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

  // x ticks: a in [2, 4] step 0.5
  textAlign(CENTER, TOP)
  for (var a = aMin; a <= aMax + 0.0001; a += 0.5) {
    var px = mapPx(a)
    stroke(0)
    line(px, H - MARGIN.bottom, px, H - MARGIN.bottom + 6)
    noStroke()
    text(a.toFixed(1), px, H - MARGIN.bottom + 10)
  }

  // y ticks: x in [0, 1] step 0.2
  textAlign(RIGHT, CENTER)
  for (var v = 0; v <= 1.0001; v += 0.2) {
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
  text('Logistic Map Bifurcation Diagram', W / 2, 15)
  textSize(13)
  textStyle(NORMAL)
  text('g_a(x) = a x(1-x),  random IC,  N = ' + N, W / 2, 38)
  textSize(14)
  text('parameter a', W / 2, H - 20)

  push()
  translate(18, H / 2)
  rotate(-HALF_PI)
  textAlign(CENTER, CENTER)
  textSize(14)
  text('x', 0, 0)
  pop()
}

// ---- helpers ----
// map re-maps a number from one range to another
// map(2, 0, 10, 0, 100) => 20
function mapPx(a) {
  return map(a, aMin, aMax, MARGIN.left, W - MARGIN.right)
}

function mapPy(val) {
  return map(val, plotYMin, plotYMax, H - MARGIN.bottom, MARGIN.top)
}
