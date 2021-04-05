## Realtime WebSocket Interaction

WebSocket messages are received by the front end in Protocol Buffer (protobuf) format. The schema is derived (and messages are parsed) using the [pbf](https://github.com/mapbox/pbf) package.

---
### Generate and modify `decode.proto.js`

You'll need to install the `pbf` tool globally as a prerequisite.

```bash
npm install -g pbf
```
The schema must be kept in sync for the front and back ends. That means the following process will need to be run again every time there is a schema change for incoming WS data.

#### Automatic schema change
A bash script is available to automatically do the following manual steps. The script is at `[gis6-frontend]/protobuf.sh`. It requires the same folder structure as the back end container, i.e. the back end and front end repos must be sibling directories, and the back end must have the folder name `gis6`. With that folder structure (and the latest pulled from GH for both repos) you can do the following:

```bash
cd [front end root]
./protobuf.sh
```

#### Manual schema change
Alternatively, (or if the above fails for some reason) you can follow these steps to manually generate and modify the js schema files:

```bash
pbf [backend repo root]/ws2ldc/ldcmsg.proto > 
\ [front end root]/app/src/data/realtime/decode.proto.js
```

That will output the js parsing functions to `/app/src/data/realtime/decode.proto.js`. The output js isn't formatted properly for modern es imports, so you'll have to modify lines like this:

```js
var tc_record = self.tc_record = {}
```

to look like this:

```js
export const tc_record = self.tc_record = {}
```

#### Parsing messages

Once either process is complete, you can import the updated schema  definitions from `/app/data/realtime/ws-worker.js` to begin parsing messages (see that file for current integration/example).
