var library = require("module-library")(require)

library.using(
  [library.ref(), "web-host", "browser-bridge", "web-element", "bridge-module", "add-html"],
  function(lib, host, BrowserBridge, element, bridgeModule, addHtml) {

    var bridge = new BrowserBridge()

    var virtualCanvas = bridge.defineSingleton("virtualCanvas", function() {
      var canvas = document.createElement('canvas')
      return canvas
    })

    bridge.domReady(
      [virtualCanvas],
      function loadImage(canvas) {
        var img = document.querySelector(".trace")
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height)
      }
    )

    var swatches = bridge.defineSingleton(
      "swatches",
      [bridgeModule(lib, "web-element", bridge), bridgeModule(lib, "add-html", bridge), virtualCanvas],
      function(element, addHtml, canvas) {

        function update(swatch, node) {
          node.style.left = swatch.bounds.minX+"px"
          node.style.top = swatch.bounds.minY+"px"
          node.style.width = (swatch.bounds.maxX - swatch.bounds.minX)+"px"
          node.style.height = (swatch.bounds.maxY - swatch.bounds.minY)+"px"
        }

        function getColor(x,y) {
          var color = canvas.getContext("2d").getImageData(x, y, 1, 1).data
          var rgb = "rgb("+color[0]+", "+color[1]+", "+color[2]+")"
          return rgb
        }

        function paintSwatch(bounds, color) {

          var el = element(
            ".swatch.active",
            element.style({
            "background": color,
            "width": (bounds.maxX - bounds.minX)+"px",
            "height": (bounds.maxY - bounds.minY)+"px",
            "left": bounds.minX+"px",
            "top": bounds.minY+"px",
          }))

          el.assignId()

          addHtml(el.html())

          return el
        }


        return {

          create: function(x,y) {
            this.bounds = {
              minX: x-3,
              minY: y-3,
              maxX: x+2,
              maxY: y+2,
            }
            this.lastX = x
            this.lastY = y
            this.color = getColor(x,y)

            var el = paintSwatch(this.bounds, this.color)
            this.id = el.id
          },

          smudge: function(x, y) {
            if (!this.id) { return }

            var extra = 5

            var bounds = this.bounds

            if (x < this.bounds.minX){
              bounds.minX = x - extra
            }

            if (y < bounds.minY) {
              bounds.minY = y - extra
            }

            if (x > bounds.maxX) {
              bounds.maxX = x + extra
            }

            if (y > bounds.maxY) {
              bounds.maxY = y + extra
            }

            this.lastX = x
            this.lastY = y
            this.color = getColor(x,y)

            var node = document.getElementById(this.id)
            node.style.transition = "none"
            node.style.background = this.color
            update(this, node)
          }

        }
      }
    )

    var down = bridge.defineFunction(
      [swatches],
      function down(swatches, event) {
        swatches.create(event.clientX, event.clientY)
      }
    )

    var move = bridge.defineFunction(
      [swatches],
      function move(swatches, event) {
        if (!swatches.id) { return }
        swatches.smudge(event.clientX, event.clientY)
      }
    )

    var universe = bridge.defineSingleton(
      "paintingUniverse",
      [bridgeModule(lib, "tell-the-universe", bridge)],
      function(tellTheUniverse) {
        var node

        var universe = tellTheUniverse.called("painting").withNames({
          paintSwatch: "paint-swatch"})

        universe.onStatement(function() {
          var isFirst = !node
          if (isFirst) {
            node = document.querySelector(".universe")
            node.innerHTML += "A wild universe appeared!"
          }
          node.innerHTML += " <div></div>"
        })

        return universe
      }
    )

    var up = bridge.defineFunction(
      [swatches, universe],
      function up(swatches, universe) {
        document.getElementById(swatches.id).classList.remove("active")

        universe.do("paintSwatch", swatches.bounds, swatches.color)

        swatches.id = null
      }
    )

    var trace = element(
      "img.trace",
      {"src": "/selfie.png"},
      element.style({
        "top": "0px",
        "left": "0px",
        "position": "absolute",
      })
    )

    var canvas = element(".canvas",
      element.style({
        "width": "100%",
        "height": "100%",
        "top": "0px",
        "left": "0px",
        "position": "absolute",
        "z-index": "1",
      }), {
      onmousedown: down.withArgs(bridge.event).evalable(),
      onmousemove: move.withArgs(bridge.event).evalable(),
      onmouseup: up.withArgs(bridge.event).evalable()}
    )

    var fingerStyle = element.style(".swatch, .canvas", {
      "cursor": "pointer",
    })

    var swatchStyle = element.style(".swatch", {
      "position": "absolute",
      "opacity": "0.8",

      ".active": {
        "opacity": "1",
      }
    })

    var universeStyle = element.style(".universe", {
      "background": "lightblue",
      "padding": "5px",

      " div": {
        "display": "inline-block",
        "width": "10px",
        "height": "10px",
        "background": "blue",
      }
    })

    var page = element([
      element(".universe", element.style({"margin-top": "500px"})),

      element("p", "Fuck. I need to get out of this box. I need to stop using these drugs to push me along. The door. It's here. I know it. I can find it. I just have to reach...."),
      element("Step 1: Touch the picture to pool colors and make a color palette"),
      trace,
      canvas,
      element.stylesheet(fingerStyle, swatchStyle, universeStyle),
    ])

    host.onSite(function(site) {
      site.addRoute("get", "/boxes", bridge.requestHandler(page))

      site.addRoute("get", "/selfie.png", site.sendFile(__dirname, "selfie.png"))
    })

  }
)