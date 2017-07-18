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

        return {

          create: function(x,y) {
            this.bounds = {
              minX: x,
              minY: y,
              maxX: x,
              maxY: y,
            }
            this.lastX = x
            this.lastY = y

            var el = element(
              ".swatch",
              element.style({
              "position": "absolute",
              "background": getColor(x,y),
              "width": "5px",
              "height": "5px",
              "left": x+"px",
              "top": y+"px",
            }))

            el.assignId()
            this.id = el.id

            addHtml(el.html())

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

            var node = document.getElementById(this.id)
            node.style.transition = "none"
            node.style.background = getColor(x,y)
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

    var up = bridge.defineFunction(
      [swatches],
      function up(swatches) {
        swatches.id = null
      }
    )

    var finger = element.style(".swatch, .canvas", {
      "cursor": "pointer",
    })

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

    var page = element([
      trace,
      canvas,
      element.stylesheet(finger),
    ])

    host.onSite(function(site) {
      site.addRoute("get", "/boxes", bridge.requestHandler(page))

      site.addRoute("get", "/selfie.png", site.sendFile(__dirname, "selfie.png"))
    })

  }
)