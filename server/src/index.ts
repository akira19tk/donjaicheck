import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT) || 3000;

// Bind 0.0.0.0 so the container is reachable on Cloud Run.
createApp().listen(port, "0.0.0.0", () => {
  console.log(`Donjaicheck API listening on port ${port}`);
});
