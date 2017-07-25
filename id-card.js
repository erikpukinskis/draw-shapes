var library = require("module-library")(require)

library.using(
  [library.ref(), ".", "web-host", "bridge-module", "web-element"],
  function(lib, paintOnPicture, host, bridgeModule, element) {

    host.onSite(function(site) {
      site.addRoute("post", "/avatars", function(request, response) {
        console.log("New avatar for "+request.body.name+":\n\n"+request.body.picture)
        response.redirect("/assignment")
      })
    })

    host.onRequest(function(getBridge) {
      var bridge = getBridge()

      var paintOnId = bridge.defineFunction(
        [{}, bridgeModule(lib, "add-html", bridge), bridgeModule(lib, "web-element", bridge)],
        function paintOnId(picture, addHtml, element, bounds, color) {

        var pictureNode = document.querySelector(".id-photo-swatches")

        if (typeof picture.minX == "undefined" || bounds.minX < picture.minX) {
          picture.minX = bounds.minX
        }
        if (typeof picture.maxX == "undefined" || bounds.maxX > picture.maxX) {
          picture.maxX = bounds.maxX
        }
        if (typeof picture.minY == "undefined" || bounds.minY < picture.minY) {
          picture.minY = bounds.minY
        }
        if (typeof picture.maxY == "undefined" || bounds.maxY > picture.maxY) {
          picture.maxY = bounds.maxY
        }

        var swatch = element(
          element.style({
            "position": "absolute",
            "background": color,
            "left": bounds.minX+"px",
            "top": bounds.minY+"px",
            "width": (bounds.maxX - bounds.minX)+"px",
            "height": (bounds.maxY - bounds.minY)+"px",
          })
        )

        addHtml.inside(pictureNode, swatch.html())

        var targetWidth = 70
        var widthUsed = picture.maxX - picture.minX
        var scale = targetWidth/widthUsed
        var left = -Math.ceil(picture.minX)
        var top = -Math.ceil(picture.minY)

        pictureNode.style.transform = "scale("+scale+") translate("+left+"px, "+top+"px)"

      })

      var universe = bridge.defineSingleton(
        "paintingUniverse",
        [bridgeModule(lib, "tell-the-universe", bridge), paintOnId],
        function(tellTheUniverse) {
          var node

          var universe = tellTheUniverse.called("painting").withNames({
            paintSwatch: "paint-swatch"})

          universe.mute()

          universe.onStatement(function(call, args) {
            document.querySelector(".id-card").style.display = "block"
            paintOnId.apply(null, args)
          })

          return universe
        }
      )

      var painting = paintOnPicture(bridge, universe)

      var prepareIdPicture = bridge.defineFunction(
        [universe],
        function(universe) {
          var input = document.querySelector(".id-picture-input")
          input.value = universe.source()
          console.log("OK!", input.value)
        }
      )

      var id = element(
        "form.id-card",
        {method: "post", action: "/avatars", onsubmit: prepareIdPicture.evalable()},
        element.style({"display": "none"}),[
        element(".label", "IDENTIFICATION"),
        element(".id-photo", element(".id-photo-swatches")),
        element("input.name", {type: "text", placeholder: "Your Name", name: "name"}),
        element("input.id-picture-input", {type: "hidden", name: "picture"}),
        element("input", {type: "submit", value: "Issue card"}, element.style({"margin-top": "10px"})),
      ])

      var idStyle = element.style(".id-card", {
        "border": "5px solid #eee",
        "color": "#ccc",
        "background": "#dff",
        "border-radius": "10px",
        "margin-top": "10px",
        "width": "260px",
        "height": "140px",

        " .label": {
          "text-align": "center",
          "border-radius": "7px 7px 0 0",
          "background": "#77f",
          "color": "#dff",
          "text-align": "center",
          "font-size": "12px",
          "font-weight": "bold",
          "line-height": "20px",
        },

        " .name": {
          "width": "130px",
        },

        " .id-photo": {
          "float": "left",
          "position": "relative",
          "overflow": "hidden",
          "margin": "10px",
          "width": "70px",
          "height": "90px",
          "background": "#e7e2f6",
        },

        " .id-photo-swatches": {
          "position": "absolute",
        },
      })

      var page = element([
        painting,
        id,
        element.stylesheet(idStyle)
      ])

      bridge.send(page)
    })

  }
)


