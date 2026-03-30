const token = "406B8641-CAA9-412C-8C37-74B85A9890B3";
const auth = Buffer.from("goodbe:" + token).toString('base64');
fetch("https://evo-integracao-api.w12app.com.br/api/v2/members?take=5", {
  headers: { "Authorization": "Basic " + auth, "Content-Type": "application/json" }
})
.then(r => r.json())
.then(d => {
  require('fs').writeFileSync('member_dump.json', JSON.stringify(d, null, 2));
  console.log("Done");
})
.catch(console.error);
