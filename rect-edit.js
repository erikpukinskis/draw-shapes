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
      [bridgeModule(lib, "web-element", bridge), bridgeModule(lib, "add-html", bridge)],
      function(element, addHtml) {

        function Palette() {
          this.swatches = []
          this.length = 0
        }

        Palette.prototype.add = function(color) {
          var el = element(".swatch")
          el.appendStyles({
            "width": "1px",
            "height": "1px",
            "background": color,
            "position": "absolute",
            "transition": "transform 2s linear"
          })
          el.assignId()

          addHtml(el.html())

          var swatch = new Swatch(el.id)
          this.swatches.push(swatch)
          this.swatches.active = swatch
          this.length++
          return swatch
        }


        function Swatch(id) {
          this.id = id
          this.node = document.getElementById(id)
          setTimeout(this.pool.bind(this))
          this.interval = setInterval(this.pool.bind(this), 2000)
          this.size = 0
          this.node.onmouseup = this.lift.bind(this)
        }

        Swatch.prototype.pool = function() {
          this.size += 25
          var width = Math.ceil(Math.sqrt(this.size))
          this.node.style.transform = "scale("+this.size+")"
        }

        Swatch.prototype.lift = function() {
          clearInterval(this.interval)
        }

        Swatch.prototype.setPosition = function(left,top) {
          this.node.style.left = left+"px"
          this.node.style.top = top+"px"
        }

        return new Palette()
      }
    )

    var poolColor = bridge.defineFunction(
      [virtualCanvas, swatches],
      function poolColor(canvas, swatches, event) {
      var color = canvas.getContext("2d").getImageData(event.offsetX, event.offsetY, 1, 1).data
      var rgb = "rgb("+color[0]+", "+color[1]+", "+color[2]+")"

      if (swatches.length < 1) {
        var swatch = swatches.add(rgb)
        swatch.setPosition(event.clientX, event.clientY)
      }

    })

    var releaseColor = bridge.defineFunction(
      [swatches],
      function releaseColor(swatches) {
        console.log("do")
        swatches.active.lift()
      }
    )

    var page = element([
      element("Step 1: Touch the picture to pool colors and make a color palette"),
      element("img.selfie", {
        src: "/selfie.png",
        onmousedown: poolColor.withArgs(bridge.event).evalable(),
        onmouseup: releaseColor.withArgs().evalable()}),
    ])

    host.onSite(function(site) {
      site.addRoute("get", "/palette", bridge.requestHandler(page))

      site.addRoute("get", "/selfie.png", site.sendFile(__dirname, "selfie.png"))
    })

  }
)