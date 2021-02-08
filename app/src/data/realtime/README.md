## Realtime WebSocket Interaction

WebSocket messages are received by the front end in Protocol Buffer (protobuf) format. Messages are parsed using the [pbf](https://github.com/mapbox/pbf) package.

---
### Generate and modify `decode.proto.js`

```bash
npm install -g pbf
pbf [backend repo root]/ws2ldc/ldcmsg.proto > 
\ [front end root]/app/src/data/realtime/decode.proto.js
```

The output js isn't formatted properly for modern es imports, so you'll have to modify lines like this:

```js
var tc_record = self.tc_record = {}
```

to look like this:

```js
export const tc_record = self.tc_record = {}
```

Then you can import them from `/app/data/realtime/ws.js` to begin parsing messages (see that file for current integration/example). This process will need to be run again every time there is a schema change for incoming WS data.
