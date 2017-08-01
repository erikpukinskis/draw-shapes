var library = require("module-library")(require)

module.exports = library.export(
  "paint-on-picture",
  [library.ref(), "web-element", "bridge-module", "add-html", "basic-styles"],
  function(lib, element, bridgeModule, addHtml, basicStyles) {

    return function(bridge, universe) {

      basicStyles.addTo(bridge)

      var virtualCanvas = bridge.defineSingleton("virtualCanvas", function() {
        var canvas = document.createElement("canvas")
        return canvas
      })

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

            var container = document.querySelector(".canvas")
            addHtml.inside(container, el.html())

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

      var up = bridge.defineFunction(
        [swatches, universe, bridgeModule(lib, "html-painting", bridge)],
        function up(swatches, universe, htmlPainting) {
          document.getElementById(swatches.id).classList.remove("active")

          var id = swatches.paintingId

          if (!id) {
            id = swatches.paintingId = htmlPainting()
            universe.do("htmlPainting", id)
          }

          htmlPainting.stroke(id, swatches.color, swatches.bounds)
          
          universe.do("htmlPainting.stroke", id, swatches.color, swatches.bounds)

          swatches.id = null
        }
      )

      var move = bridge.defineFunction(
        [swatches, virtualCanvas, up],
        function move(swatches, canvas, up, event) {

          if (event.buttons == 0 && swatches.id) {
            up(event)
            return
          }

          var x = event.pageX
          var y = event.pageY
          if (canvas.__left) {
            x = x - canvas.__left
            y = y - canvas.__top
          }
          if (!swatches.id) { return }
          swatches.smudge(x, y)
        }
      )

      var down = bridge.defineFunction(
        [swatches, virtualCanvas],
        function down(swatches, canvas, event) {
          var x = event.pageX
          var y = event.pageY
          if (canvas.__left) {
            x = x - canvas.__left
            y = y - canvas.__top
          }
          swatches.create(x, y)
        }
      )

      var trace = element("img.trace", element.style({"margin-top": "10px"}))

      var touch = element(".touch-area",
        element.style({
          "width": "100%",
          "height": "100%",
          "top": "0px",
          "left": "0px",
          "width": "100%",
          "height": "100%",
          "position": "absolute",
          "z-index": "1",
        }), {
        onmousedown: down.withArgs(bridge.event).evalable(),
        onmousemove: move.withArgs(bridge.event).evalable(),
        onmouseup: up.withArgs(bridge.event).evalable(),
      })

      var canvas = element(
        ".canvas",
        element.style({
          "position": "relative",
          "display": "inline-block"
        }),
        [trace, touch]
      )

      var fingerStyle = element.style(".touch-area", {
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
        "padding": "10px",
        "border": "2px solid blue",
        "max-width": "400px",

        " .statement": {
          "display": "inline-block",
          "width": "10px",
          "height": "10px",
          "background": "blue",
        }
      })

      var showSource = bridge.defineFunction(
        [universe],
        function showSource(universe) {
          var node = document.querySelector(".universe-source")
          var button = document.querySelector(".show-source")

          if (node.style.display == "none") {
            node.style.display = null
            node.innerHTML = universe.source()
            button.innerHTML = "Hide source"
          } else {
            node.style.display = "none"
            button.innerHTML = "Show source"
          }
        }
      )

      var universeEl = element(
        ".universe",
        element.style({"display": "none"}),
        element("input", {type: "text", value: "A wild universe appeared!"}),
        element(
          "textarea.universe-source",
          element.style({"display": "none", "font-size": "0.6em", "min-height": "7em"})
        ),
        element("p",
          element(".button.show-source", "View source", {onclick: showSource.evalable()})
        )
      )

      var loadTracingPicture = bridge.defineFunction(
        [virtualCanvas],
        function(canvas, event) {

        var files = (event.target || window.event.srcElement).files
        var isSupported = FileReader && files && files.length

        if (isSupported) {
          var reader = new FileReader()
          reader.onload = setSrc.bind(null, reader)
          reader.readAsDataURL(files[0])
        } else {
          throw new Error("No file support?")
        }

        function setSrc(reader) {
          document.querySelector(".trace").src = reader.result
          setTimeout(prepareCanvas)
        }

        function prepareCanvas() {
          var img = document.querySelector(".trace")

          canvas.width = img.width;
          canvas.height = img.height;

          var container = document.querySelector(".canvas")

          canvas.__left = container.offsetLeft
          canvas.__top = container.offsetTop

          canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height)
        }

      })

      var traceFileInput = element(
        "input.trace-file-input", {
        type: "file",
        accept: "image/*",
        onchange: loadTracingPicture.withArgs(bridge.event).evalable()},
        element.style({"display": "none"}))

      var chooseFile = bridge.defineFunction(function() {
        document.querySelector(".trace-file-input").click()
      })

      var chooseFileButton = element("button", "Choose a picture to trace", {onclick: chooseFile.evalable()})

      var page = element([
        traceFileInput,
        chooseFileButton,
        element("p", canvas),
        element.stylesheet(fingerStyle, swatchStyle),
      ])

      return page
    }

  }
)