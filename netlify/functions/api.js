// Netlify Function: saari /api/* requests isi Express app par aati hain (netlify.toml ka redirect dekho)
import serverless from "serverless-http";
import app from "../../server/app.js";

const handler0 = serverless(app);
export const handler = (event, context) => {
  // /.netlify/functions/api/xyz  ->  /api/xyz
  if (event.path && event.path.startsWith("/.netlify/functions/api")) {
    event.path = "/api" + event.path.slice("/.netlify/functions/api".length);
  }
  return handler0(event, context);
};
