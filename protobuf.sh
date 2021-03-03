# only works if run from front end root and your back end 
# repo is in a sibling directory named 'gis6'
pbf ../gis6/ws2ldc/ldcmsg.proto > app/src/data/realtime/decode.proto.js
sed -i .raw '1 a\
let exports = {}
' app/src/data/realtime/decode.proto.js
sed -i .raw 's/^var/export const/g' app/src/data/realtime/decode.proto.js
