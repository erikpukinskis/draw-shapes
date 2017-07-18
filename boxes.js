var library = require("module-library")(require)

library.using(
  [library.ref(), "web-host", "browser-bridge", "web-element", "bridge-module", "add-html"],
  function(lib, host, BrowserBridge, element, bridgeModule, addHtml) {

    var bridge = new BrowserBridge()

    var swatches = bridge.defineSingleton(
      "swatches",
      [bridgeModule(lib, "web-element", bridge), bridgeModule(lib, "add-html", bridge)],
      function(element, addHtml) {

        function poolTo(minPool) {
          if (!this.bounds.minX || this.bounds.minX > this.lastX - minPool) {
            this.bounds.minX = this.lastX - minPool
          }
          if (!this.bounds.maxX || this.bounds.maxX < this.lastX + minPool) {
            this.bounds.maxX = this.lastX + minPool
          }

          if (!this.bounds.minY || this.bounds.minY > this.lastY - minPool) {
            this.bounds.minY = this.lastY - minPool
          }
          if (!this.bounds.maxY || this.bounds.maxY < this.lastY + minPool) {
            this.bounds.maxY = this.lastY + minPool
          }

        }

        function bleed() {
          if (!this.id) { return }

          var now = new Date()
          var dt = now - this.bleedStart + 1000

          var minPool = Math.sqrt(dt/10.0)

          poolTo.call(this, minPool)

          var node = document.getElementById(this.id)
          node.style.transition = "2s linear"
          update(this, node)

          this.timeout = setTimeout(bleed.bind(this), 1000)
        }

        function update(swatch, node) {
          node.style.left = swatch.bounds.minX+"px"
          node.style.top = swatch.bounds.minY+"px"
          node.style.width = (swatch.bounds.maxX - swatch.bounds.minX)+"px"
          node.style.height = (swatch.bounds.maxY - swatch.bounds.minY)+"px"
        }

        return {

          create: function(x,y) {
            this.bounds = {}
            this.lastX = x
            this.lastY = y

            var el = element(
              ".swatch",
              element.style({
              "position": "absolute",
              "background": "red",
              "width": "5px",
              "height": "5px",
              "left": x+"px",
              "top": y+"px",
            }))

            el.assignId()
            this.id = el.id

            addHtml(el.html())

            this.bleedStart = new Date()
            this.timeout = setTimeout(bleed.bind(this), 1)


          },

          smudge: function(x, y) {
            if (!this.id) { return }

            this.lastX = x
            this.lastY = y

            this.bleedStart = new Date()

            var extra = 5

            var bounds = this.bounds

            if (!bounds.minX || x - extra < this.bounds.minX) {
              bounds.minX = x - extra
            }

            if (!bounds.minY || y - extra < bounds.minY) {
              bounds.minY = y - extra
            }

            if (!bounds.maxX || x + extra > bounds.maxX) {
              bounds.maxX = x + extra
            }

            if (!bounds.maxY || y + extra > bounds.maxY) {
              bounds.maxY = y + extra
            }

            var node = document.getElementById(this.id)
            node.style.transition = "0s"
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

    var page = element(".canvas",
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
      onmouseup: up.withArgs(bridge.event).evalable()},
      element.stylesheet(finger)
    )

    host.onSite(function(site) {
      site.addRoute("get", "/boxes", bridge.requestHandler(page))
    })

  }
)