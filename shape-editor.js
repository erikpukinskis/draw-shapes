var shapeEditor = (function() {

  var handleMove

  var strokes = []
  var triangles = []

  function down(event) {
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

    var isInside = 2*Math.PI - totalAngle < 0

    return isInside
  }

  function startStretch(coordinates, stroke) {
    var pathIndex = stroke.paths.length

    var path = stroke.paths[pathIndex] = [coordinates]

    handleMove = addPoint.bind(null, path)
    handleUp = finish
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

  function finish() {
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
    var linePath = stroke.paths[0]
    var trianglePath = stroke.paths[1]

    var lineStart = linePath[0]
    var lineEnd = linePath[linePath.length-1]

    var firstPoint = screenCoordToPoint(lineStart)

    var lastPoint = screenCoordToPoint(lineEnd)

    var out = []
    var midPoint = []
    var otherMidPoint = []

    vec3.subtract(out, lastPoint, firstPoint)

    vec3.scale(out, out, 0.5)

    vec3.add(out, firstPoint, out)

    var distance = vec3.distance(firstPoint, lastPoint)

    var thickness = (7 - Math.log(distance)) / 8.0

    vec3.rotateZ(midPoint, out, firstPoint, thickness)

    vec3.rotateZ(otherMidPoint, out, firstPoint, -thickness)

    if (trianglePath && trianglePath.length) {
      var dragStart = screenCoordToPoint(trianglePath[0])
      var dragEnd = screenCoordToPoint(trianglePath[trianglePath.length-1])

      var drag = []
      vec3.subtract(drag, dragEnd, dragStart)

      vec3.add(midPoint, midPoint, drag)
      vec3.add(otherMidPoint, otherMidPoint, drag)
    }

    triangles.push([firstPoint, midPoint, lastPoint, stroke])

    triangles.push([firstPoint, otherMidPoint, lastPoint, stroke])

    return [
      triangle(firstPoint, midPoint, lastPoint),
      triangle(firstPoint, otherMidPoint, lastPoint)
    ]
  }

  function triangle(a,b,c) {
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
    xPos: -205.0,
    yPos: 205.0,
    zPos: -340.0  
  }

  drawScene.init(camera)

  var editor = {
    down: down,
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