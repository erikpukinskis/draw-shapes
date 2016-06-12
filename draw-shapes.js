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

    var path = [coordinates]
    stroke.paths.push(path)

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
    if (stroke && stroke.paths) {

      if (stroke.paths.length == stroke.bakedPoints) {
        stroke.paths.pop()
      }

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

    stroke.bakedPoints = 2

    if (trianglePath && trianglePath.length > 1) {
      var dragStart = screenCoordToPoint(trianglePath[0])
      var dragEnd = screenCoordToPoint(trianglePath[trianglePath.length-1])

      var lastSide = []

      vec3.subtract(lastSide, dragEnd, firstPoint)

      var drag = []
      vec3.subtract(drag, dragEnd, dragStart)


      var convergence = Math.min(1.0, vec3.distance(dragStart, dragEnd) / 50.0)

      if (convergence > 0.99) {
        stroke.bakedPoints = 3
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

    shapes.push(pointsToShape(
      firstPoint, midPoint, lastPoint
    ))

    if (stroke.bakedPoints < 3) {

      triangles.push([firstPoint, otherMidPoint, lastPoint, stroke])

      shapes.push(pointsToShape(
        firstPoint, otherMidPoint, lastPoint
      ))
    }

    var prevPoint = firstPoint
    var nextPoint = midPoint

    for(var i=2; i<stroke.paths.length; i++) {
      var path = stroke.paths[i]
      if (path && path.length > 1) {

        var newPoint = guessNewPoint(stroke, firstPoint, midPoint, path)

        var shape = pointsToShape(prevPoint, newPoint, nextPoint)

        triangles.push([prevPoint, newPoint, nextPoint, stroke])

        shapes.push(shape)

        nextPoint = newPoint
      }
    }

    return shapes
  }

  function guessNewPoint(stroke, firstPoint, secondPoint, path) {

    var dragStart = screenCoordToPoint(path[0])
    var dragEnd = screenCoordToPoint(path[path.length-1])

    var r = vectorToIntersection(dragStart, dragEnd, firstPoint, secondPoint)

    if (r == false) {

      newPoint = dragEnd
      stroke.bakedPoints++

    } else {
      var distance = vec3.distance(dragStart, dragEnd)

      var base = 150

      if (distance < 15) {
        var scale = base + 15 - distance
      } else {
        var scale = base + distance - 5
      }

      scale = 1 + distance / scale


      vec3.scale(r, r, scale)

      var newPoint = []
      vec3.add(newPoint, dragStart, r)
    }

    return newPoint
  }


  function vectorToIntersection(p, pPlusR, q, qPlusS) {

    // from http://stackoverflow.com/a/565282/778946

    var r = []
    var s = []

    vec3.subtract(r, pPlusR, p)
    vec3.subtract(s, qPlusS, q)


    var qMinusP = []
    vec3.subtract(qMinusP, q, p)
    var qMinusPCrossS = []
    vec3.cross(qMinusPCrossS, qMinusP, s)
    var rCrossS = []
    vec3.cross(rCrossS, r, s)
    var t = []
    vec3.divide(t, qMinusPCrossS, rCrossS)
    t = t[2]


    var pMinusQ = []
    vec3.subtract(pMinusQ, p, q)
    var pMinusQCrossR = []
    vec3.cross(pMinusQCrossR, pMinusQ, r)
    var sCrossR = []
    vec3.cross(sCrossR, s, r)
    var u = []
    vec3.divide(u, pMinusQCrossR, sCrossR)
    u = u[2]


    if ((rCrossS == 0) && (qMinusPCrossR == 0)) {

      throw new Error("colinear")

    } else if ((rCrossS == 0)
      && (qMinusPCrossR) != 0) {

      // parallel
      return false

    }

    if ((rCrossS != 0) 
      && (0 <= t) && (t <= 1)
      && (0 <= u) && (u <= 1)) {

      // nonintersecting
      return false
    }

    var rScaledByT = []
    vec3.scale(rScaledByT, r, t)

    var sScaledByU = []
    vec3.scale(sScaledByU, s, u)

    var intersectionT = []
    vec3.add(intersectionT, p, rScaledByT)

    var intersectionU = []
    vec3.add(intersectionU, q, sScaledByU)

    var error = vec3.distance(intersectionT, intersectionU)

    if (error > 0.001) {
      throw new Error("t and u yield different intersections")
    }

    return rScaledByT
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
