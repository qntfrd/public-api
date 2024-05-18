import { createServer } from "node:http"
import { MongoClient } from "mongodb"
import Koa from "koa"
import Router from "koa-router"
import bodyparser from "koa-body"
import cors from "@koa/cors"

let counter = BigInt(Math.floor(Math.random() * 1000))
let now = BigInt(Date.now())
const snowflakeId = (machineId: bigint, epoch: bigint = 0n) => (): string => {
  const time = BigInt(Date.now()) - epoch
  if (time !== now) {
    now = time
    counter = BigInt(Math.floor(Math.random() * 1000))
  }
  const c = counter++ % 4095n
  return ((time << 22n) | (machineId << 12n) | c).toString(16)
}

const mongoP = MongoClient.connect(process.env.BOOKMARKS_MONGODB_URI!)

const healthController = () => new Router({ prefix: "/health" })
  .get("/", ctx => {
    ctx.body = {
      version: process.env.npm_package_version,
      name: process.env.npm_package_name,
      env: process.env.ENV
    }
  })
  .routes()

const bookmarksController = (client: MongoClient) => new Router({ prefix: "/bookmarks" })
  .post("/", async (ctx: Koa.Context) => {
    const url = ctx.request.body.url

    if (!url) {
      ctx.status = 400
      ctx.body = {
        code: "bad_request",
        message: "Some fiedlds are missing or invalid.",
        fields: {
          "body.url": {
            code: "required",
            message: '"body.url" is required.'
          }
        }
      }
      return
    }
    try {
      new URL(url)
    }
    catch {
      ctx.status = 400
      ctx.body = {
        code: "bad_request",
        message: "Some fiedlds are missing or invalid.",
        fields: {
          "body.url": {
            code: "invalid",
            message: '"body.url" should be an url.'
          }
        }
      }
      return
    }

    const db = client.db("bookmarks")
    const bookmarks = db.collection("bookmarks")
    const id = snowflakeId(0n)()
    const bookmark = { id, url }
    await bookmarks.insertOne(bookmark)
    ctx.status = 201
    ctx.body = bookmark
  })
  .routes()


const run = async () => {
  const client = await mongoP

  const koa = new Koa()
    .use(cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"]
    }))
    .use(bodyparser())
    .use(healthController())
    .use(bookmarksController(client))

  const server = createServer(koa.callback())

  server.listen(process.env.PORT ?? 8000, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT ?? 8000}`)
  })
}

if (module === require.main) {
  run()
    .then(() => console.log("Server is running"))
    .catch(e => { console.error(e); process.exit(1) })
}