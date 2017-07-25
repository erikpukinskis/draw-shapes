var BrowserBridge = require("browser-bridge")
var paintOnPicture = require("paint-on-picture")
var bridgeModule = require("bridge-module")
var tellTheUniverse = require("tell-the-universe")
var express = require("express")()

var bridge = new BrowserBridge()

var universe = bridge.defineSingleton(
  "paintingUniverse",
  [bridgeModule(lib, "tell-the-universe", bridge)],
  function(tellTheUniverse) {
    var node

    var universe = tellTheUniverse.called("painting").withNames({
      paintSwatch: "paint-swatch"})

    universe.mute()

    universe.onStatement(function(call, args) {
      console.log("called function "+call+" in universe. Arguments are", args)
    })

    return universe
  }
)

var painting = paintOnPicture(bridge, universe)

express.get("/", bridge.requestHandler(painting)

express.start(2001)