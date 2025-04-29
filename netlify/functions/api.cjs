var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(src_exports);
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_morgan = __toESM(require("morgan"), 1);
var trpcExpress = __toESM(require("@trpc/server/adapters/express"), 1);
var import_netlify = require("@trpc/server/adapters/netlify");
var import_pusher = __toESM(require("pusher"), 1);

// src/db.ts
var import_client = require("@prisma/client");
var getConnectionString = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.DATABASE_URL || "";
  }
  return process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/nottoday";
};
var prisma = new import_client.PrismaClient({
  datasources: {
    db: {
      url: getConnectionString()
    }
  },
  log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"]
});

// src/index.ts
var import_server = require("@trpc/server");
var t = import_server.initTRPC.context().create();
var appRouter = t.router({
  healthz: t.procedure.query(async ({ ctx }) => {
    await ctx.prisma.$connect();
    return { ok: true, env: process.env.NODE_ENV };
  })
  // 다른 tRPC 라우트...
});
var app = (0, import_express.default)();
app.use((0, import_cors.default)({
  origin: ["https://nottoday.netlify.app", "http://localhost:3000"],
  credentials: true
}));
app.use((0, import_helmet.default)());
app.use(import_express.default.json({ limit: "1mb" }));
app.use((0, import_morgan.default)("combined"));
var pusher = new import_pusher.default({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "ap3",
  useTLS: true
});
app.post("/ecg-update", async (req, res) => {
});
app.post("/risk-alert", async (req, res) => {
});
var handler = (0, import_netlify.createNetlifyHandler)({
  router: appRouter,
  createContext: () => ({ prisma })
  // Express 앱을 fallback으로 사용 (선택적)
  // expressApp: app 
});
if (process.env.NODE_ENV === "development") {
  const PORT = process.env.PORT || 8080;
  app.use("/trpc", trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({ prisma })
  }));
  app.listen(PORT, () => {
    console.log(`Local API server running: http://localhost:${PORT}`);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
