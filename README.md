Draw simple rectangle-based sketches on top of an image with **paint-on-picture**:

```javascript
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
```

## Ramblings

Eventually this should be all waves that create SDFs and are quantized via waveform collapse, but IDK how that will work.

Interesting possible equation: https://en.wikipedia.org/wiki/Sine-Gordon_equation Could that standing wave be something we use to model particle motion? I have been thinking about how, for example, to model a house in a scene... if all of the pieces are waves, how do we show one isolated in space? Those animations show a wave that looks like it's isolated in space (although it rotates?)

