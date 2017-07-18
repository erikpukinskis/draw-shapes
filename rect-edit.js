var library = require("module-library")(require)

library.using(
  [library.ref(), "web-host", "web-element", "browser-bridge", "bridge-module"],
  function(lib, host, element, BrowserBridge, bridgeModule) {

    var bridge = new BrowserBridge()

    var virtualCanvas = bridge.defineSingleton("virtualCanvas", function() {
      var canvas = document.createElement('canvas')
      return canvas
    })

    bridge.domReady(
      [virtualCanvas],
      function loadImage(canvas) {
        var img = document.querySelector(".selfie")
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height)
      }
    )

    var swatches = bridge.defineSingleton(
      "swatches",
      [
        bridgeModule(lib, "web-element", bridge),
        bridgeModule(lib, "add-html", bridge),
        virtualCanvas
      ],
      function(element, addHtml, canvas) {

        function Palette() {
          this.swatches = []
        }

        var img

        Palette.prototype.add = function(color) {
          var el = element(".swatch")
          el.appendStyles({
            "width": "1px",
            "height": "1px",
            "background": color,
            "position": "absolute",
            "transition": "transform 2s linear",
          })
          el.assignId()

          if (!img) {
            var selfie = document.querySelector(".selfie")
            img = {
              x: selfie.offsetLeft,
              y: selfie.offsetTop,
            }
          }

          addHtml(el.html())

          var swatch = new Swatch(el.id, this)

          return swatch
        }


        function Swatch(id, palette) {
          this.id = id
          this.palette = palette
          this.palette.active = this
          this.palette.swatches.push(this)
          this.bounds = {}
          this.poolStart = new Date()

          this.node = document.getElementById(id)
          setTimeout(this.pool.bind(this))
          this.interval = setInterval(this.pool.bind(this), 1000)
          this.size = 0
          this.node.onmouseup = this.lift.bind(this)
          this.node.onmousemove = this.track.bind(this)
        }

        Swatch.prototype.pool = function() {
          var now = new Date()
          var dt = now - this.poolStart
          var pooledAmount = dt/10
          console.log(pooledAmount)

          var pooledWidth = Math.ceil(Math.sqrt(pooledAmount))

          var width = Math.max(pooledWidth, this.minWidth)

          this.node.style.transform = "scale("+width+")"
        }

        Swatch.prototype.lift = function() {
          clearInterval(this.interval)
          this.palette.active = null
        }

        Swatch.prototype.track = function(event) {

          if (this.palette.active != this) { return }

          var x = event.clientX - img.x
          var y = event.clientY - img.y

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

          var color = canvas.getContext("2d").getImageData(x, y, 1, 1).data
          var rgb = "rgb("+color[0]+", "+color[1]+", "+color[2]+")"

          var width = bounds.maxX - bounds.minX
          var height = bounds.maxY - bounds.minY
          var centerX = bounds.minX + width
          var centerY = bounds.minY + width


          this.node.style.left = centerX+"px"
          this.node.style.top = centerX+"px"
          this.node.style.background = rgb
          this.minWidth = width
        }

        Swatch.prototype.setPosition = function(left,top) {
        }

        return new Palette()
      }
    )

    var poolColor = bridge.defineFunction(
      [swatches],
      function poolColor(swatches, event) {
        event.preventDefault()
        if (!swatches.active) {
          var swatch = swatches.add()
          swatch.track(event)
        }
      }
    )

    var withActiveSwatch = bridge.defineFunction(
      [swatches],
      function withActiveSwatch(swatches, action, arg) {
        if (!swatches.active) { return }
        swatches.active[action](arg)
      }
    )

    var selfie = element(
      "img.selfie",
      {
        src: "/selfie.png",
        onmousedown: poolColor.withArgs(bridge.event).evalable(),
        onmouseup: withActiveSwatch.withArgs("lift").evalable(),
        onmousemove: withActiveSwatch.withArgs("track", bridge.event).evalable()
      }
    )

    var selfieStyle = element.style(".selfie, .swatch", {
      "cursor": "pointer",
    })

    var imgStyle = element.style(".selfie::selection", {
      "background-color": "transparent",
      "color": "#000",
    })

    var page = element([
      element("p", "Fuck. I need to get out of this box. I need to stop using these drugs to push me along. The door. It's here. I know it. I can find it. I just have to reach...."),
      element("Step 1: Touch the picture to pool colors and make a color palette"),
      selfie,
      element.stylesheet(selfieStyle, imgStyle),
    ])

    host.onSite(function(site) {
      site.addRoute("get", "/palette", bridge.requestHandler(page))

      site.addRoute("get", "/selfie.png", site.sendFile(__dirname, "selfie.png"))
    })

  }
)