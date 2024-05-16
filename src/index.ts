import { createServer } from "node:http"

const server = createServer((_, res) => {
  res.end(
    JSON.stringify({
      version: process.env.npm_package_version,
      name: process.env.npm_package_name,
      env: process.env.ENV
    })
  )
})

if (module === require.main) {
  server.listen(process.env.PORT ?? 8000)
}