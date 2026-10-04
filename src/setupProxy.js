/*
  Development only (`npm start` on :3000; never part of the build): the dev
  server has no PHP, so /api and /admin are passed to the local Apache + PHP +
  MySQL stack (tests/server/docker-compose.yml, :8080). Without this the forms
  can't get a token and say the connection dropped.

  The Host header is kept (changeOrigin: false) so the admin's same-origin
  check sees localhost:3000 on both sides. Another target:
  API_PROXY_TARGET=http://localhost:8081 npm start
*/
const proxy = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  const target = process.env.API_PROXY_TARGET || "http://localhost:8080";
  app.use(proxy(["/api", "/admin"], { target, changeOrigin: false, logLevel: "warn" }));
};
