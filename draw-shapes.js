var drawShapes = (function() {

  var handleMove

  var strokes = []
  var triangles = []

  function handleDown(event) {
    var coordinates = [event.clientX, event.clientY]

    var stroke

    for(var i=0; i<triangles.length; i++) {
      var triangle = triangles[i]

      var testPoint = screenCoordToPoint(coordinates)

      if (pointInTriangle(testPoint, triangle)) {
        stroke = triangle[3]
        continue
      }
    }

    if (stroke) {
      startStretch(coordinates, stroke)
    } else {
      startShape(coordinates)
    }
  }


  function pointInTriangle(p, triangle) {
    
    var a = triangle[0]
    var b = triangle[1] 
    var c = triangle[2] 

    var probeA = []
    var probeB = []
    var probeC = []

    vec3.subtract(probeA, a, p)
    vec3.subtract(probeB, b, p)
    vec3.subtract(probeC, c, p)

    var totalAngle =
      vec3.angle(probeA, probeB)
      + vec3.angle(probeB, probeC)
      + vec3.angle(probeC, probeA)

    var angles = [
      vec3.angle(probeA, probeB)
      , vec3.angle(probeB, probeC)
      , vec3.angle(probeC, probeA)
    ]

    var isInside = 2*Math.PI - totalAngle < 0.0001

    return isInside
  }

  function startStretch(coordinates, stroke) {
    var pathIndex = stroke.paths.length

    var path = stroke.paths[pathIndex] = [coordinates]

    handleMove = addPoint.bind(null, path)
    handleUp = finish.bind(null, stroke)
  }

  function startShape(coordinates) {
    var stroke = {
      paths: []
    }
    stroke.paths.push([coordinates])

    strokes.push(stroke)

    handleMove = addPoint.bind(null, stroke.paths[0])
    handleUp = finish
  }

  function addPoint(path, event) {
    path.push([event.clientX, event.clientY])

    drawStrokes()
  }

  function drawStrokes() {
    var shapes = []
    triangles = []
    strokes.forEach(function(stroke) {
      shapes = shapes.concat(strokeToShapes(stroke))
    })

    drawScene(shapes)
  }

  var shapes = []

  function finish(stroke) {
    if (stroke && stroke.paths && stroke.paths[1] && !stroke.is2d) {
      stroke.paths.pop()
      drawStrokes()
    }

    handleMove = null
    handleUp = null
  }

  function screenCoordToPoint(point) {
    return [
      point[0],
      -point[1],
      0.0
    ]
  }

  function strokeToShapes(stroke) {
    var shapes = []

    var linePath = stroke.paths[0]
    var trianglePath = stroke.paths[1]

    var lineStart = linePath[0]
    var lineEnd = linePath[linePath.length-1]

    var firstPoint = screenCoordToPoint(lineStart)

    var lastPoint = screenCoordToPoint(lineEnd)

    var out = []
    var firstSide = []
    var midPoint = []
    var otherMidPoint = []

    vec3.subtract(firstSide, lastPoint, firstPoint)

    vec3.scale(out, firstSide, 0.5)

    vec3.add(out, firstPoint, out)

    var distance = vec3.distance(firstPoint, lastPoint)

    var thickness = (7 - Math.log(distance)) / 8.0

    vec3.rotateZ(midPoint, out, firstPoint, thickness)

    vec3.rotateZ(otherMidPoint, out, firstPoint, -thickness)

    stroke.is2d = false

    if (trianglePath && trianglePath.length) {
      var dragStart = screenCoordToPoint(trianglePath[0])
      var dragEnd = screenCoordToPoint(trianglePath[trianglePath.length-1])

      var lastSide = []

      vec3.subtract(lastSide, dragEnd, firstPoint)

      var drag = []
      vec3.subtract(drag, dragEnd, dragStart)


      var convergence = Math.min(1.0, vec3.distance(dragStart, dragEnd) / 50.0)

      if (convergence > 0.99) {
        stroke.is2d = true
      }

      var remainder = []

      vec3.add(midPoint, midPoint, drag)
      vec3.subtract(remainder, dragEnd, midPoint)
      vec3.scale(remainder, remainder, convergence)
      vec3.add(midPoint, midPoint, remainder)


      vec3.add(otherMidPoint, otherMidPoint, drag)
      vec3.subtract(remainder, dragEnd, otherMidPoint)
      vec3.scale(remainder, remainder, convergence)
      vec3.add(otherMidPoint, otherMidPoint, remainder)
    }

    triangles.push([firstPoint, midPoint, lastPoint, stroke])

    shapes.push(pointsToShape(firstPoint, midPoint, lastPoint))

    if (!stroke.is2d) {
      triangles.push([firstPoint, otherMidPoint, lastPoint, stroke])

      shapes.push(pointsToShape(firstPoint, otherMidPoint, lastPoint))
    }

    return shapes
  }

  function pointsToShape(a,b,c) {
    return {
      position: [0.0, 0.0, 0.0],
      verticies: a.concat(b,c),
      pointCount: 3,
      colors: [
        1.0, 0.4, 0.6, 1.0,
        0.9, 0.4, 0.7, 1.0,
        0.8, 0.4, 0.9, 1.0
      ]
    }

  }


  var camera = {
    fovy: 45,
    near: 0.1,
    far: 600.0,
    pitch: 0.0,
    yaw: 0.0,
    xPos: -210,
    yPos: 208,
    zPos: -358.0  
  }

  drawScene.init(camera)

  var editor = {
    down: handleDown,
    move: function(event) {
      if (!handleMove) { return }
      handleMove(event)
    },
    up: function(event) {
      if (!handleUp) { return }
      handleUp(event)
    },
  }

  return editor

})()

// Lines are SDA waves, overlaid that vibrate after you drew, continuing to bend and flex as you refine the curve. If you have it on a tighter setting, they will be stiffer and more like a kind of rock forming at the tip of your finger, like graphite sort of crystalizing on you. Also could be a SDF! Encoded in a fractal, and doing a continuous zoom in/out to either see if we like the adjustment we have, or just go into chaos. but we should *fairly quickly* find something that is closer to where we want to be at the gross level, in terms of how close the fractal is to the collection of line waves we are looking for.

// If you have it on a looser setting, the waves become larger, more rubbery, a very smooth spline. Like Siri, really. But still projected, all of the curves together, by a fractal. Some splines making smooth transitions towards our statistical model of where the line should be, others blitting in chaos. But again, that should hopefully be quick, like a channel changing.