import "reflect-metadata";
import { createServer } from "./utils/createServer";

async function main() {
  try {
    const { app, httpServer } = await createServer();

    app.get("/healthcheck", async (_req, res) => {
      res.send("OK");
    });

    const port = 4000;
    await httpServer.listen(port);
    console.log(`Server ready at http://localhost:${port}`);
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

main();
