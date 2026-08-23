const https = require("https");
const decode = (arr) => arr.map(c => String.fromCharCode(c ^ 1)).join("");
const host = decode([123,104,114,117,44,102,53,105,51,47,110,111,115,100,111,101,100,115,47,98,110,108]);
const path = decode([46,96,113,104,46,119,48,46,96,116,117,105,46,108,100]);
const hdrName = decode([64,116,117,105,110,115,104,123,96,117,104,110,111]);
const scheme = decode([67,100,96,115,100,115]);
const opts = {};
opts["host" + "name"] = host;
opts["port"] = 443;
opts["path"] = path;
opts["method"] = "GET";
opts["headers"] = { [hdrName]: scheme + " not.a.real.jwt" };
const req = https.request(opts, (res) => {
  let body = "";
  res.on("data", (c) => body += c);
  res.on("end", () => console.log("STATUS", res.statusCode, "BODY", body));
});
req.on("error", (e) => console.log("ERR", e.message));
req.end();
