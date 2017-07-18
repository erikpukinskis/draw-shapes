var library = require("module-library")(require)

library.using(
  [library.ref(), "web-host", "browser-bridge", "web-element", "bridge-module", "add-html"],
  function(lib, host, BrowserBridge, element, bridgeModule, addHtml) {

    var bridge = new BrowserBridge()

    var swatches = bridge.defineSingleton(
      "swatches",
      [bridgeModule(lib, "web-element", bridge), bridgeModule(lib, "add-html", bridge)],
      function(element, addHtml) {

        return {

          create: function(x,y) {
            var el = element(
              ".swatch",
              element.style({
              "position": "absolute",
              "background": "red",
              "width": "1px",
              "height": "1px",
              "left": x+"px",
              "top": y+"px",
            }))

            el.assignId()

            addHtml(el.html())

            this.id = el.id
            this.bounds = {}
          },

          smudge: function(x, y) {
            if (!this.id) { return }

            var bounds = this.bounds

            if (!bounds.minX || x < this.bounds.minX) {
              bounds.minX = x
            }

            if (!bounds.minY || y < bounds.minY) {
              bounds.minY = y
            }

            if (!bounds.maxX || x > bounds.maxX) {
              bounds.maxX = x
            }

            if (!bounds.maxY || y > bounds.maxY) {
              bounds.maxY = y
            }

            var node = document.getElementById(this.id)

            node.style.left = bounds.minX+"px"
            node.style.top = bounds.minY+"px"
            node.style.width = (bounds.maxX - bounds.minX)+"px"
            node.style.height = (bounds.maxY - bounds.minY)+"px"
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

    var page = element(".canvas",
      element.style({
        "width": "100%",
        "height": "100%",
        "position": "absolute",
        "z-index": "1",
      }), {
      onmousedown: down.withArgs(bridge.event).evalable(),
      onmousemove: move.withArgs(bridge.event).evalable(),
      onmouseup: up.withArgs(bridge.event).evalable()},
      element.stylesheet(finger)
    )

    host.onSite(function(site) {
      site.addRoute("get", "/boxes", bridge.requestHandler(page))
    })

  }
)