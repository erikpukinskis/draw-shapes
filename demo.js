var library = require("module-library")(require)

library.using(
  [".", library.ref(), "browser-bridge", "bridge-module", "tell-the-universe", "express", "html-painting"],
  function(paintOnPicture, lib,  BrowserBridge, bridgeModule, tellTheUniverse, express, htmlPainting) {
    
    var app = express()
    var bridge = new BrowserBridge()

    var universe = bridge.defineSingleton(
      "paintingUniverse",
      [bridgeModule(lib, "tell-the-universe", bridge), bridgeModule(lib, "html-painting", bridge)],
      function(tellTheUniverse, htmlPainting) {
        var node

        var universe = tellTheUniverse.called("paintings").withNames({
          htmlPainting: htmlPainting})

        universe.mute()

        universe.onStatement(function(call, args) {
          console.log("called function "+call+" in universe. Arguments are", args)
        })

        return universe
      }
    )

    var painting = paintOnPicture(bridge, universe)

    app.get("/", bridge.requestHandler(painting))

    app.listen(2001)

  }
)