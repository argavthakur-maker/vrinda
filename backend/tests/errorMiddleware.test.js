import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "production";
const { errorHandler } = await import("../middleware/errorMiddleware.js");

function runErrorHandler(error) {
  let statusCode;
  let payload;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  errorHandler(error, {}, response, () => {});
  return { statusCode, payload };
}

test("malformed JSON returns a safe 400 response", () => {
  const error = new SyntaxError("Unexpected token in request body");
  error.status = 400;
  error.type = "entity.parse.failed";

  const response = runErrorHandler(error);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload, {
    success: false,
    message: "Invalid JSON payload.",
  });
});

test("oversized request bodies retain the 413 status", () => {
  const error = new Error("request entity too large");
  error.status = 413;
  error.type = "entity.too.large";

  const response = runErrorHandler(error);
  assert.equal(response.statusCode, 413);
});

test("unexpected errors remain generic 500 responses in production", () => {
  const response = runErrorHandler(new Error("database password leaked"));
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.payload, {
    success: false,
    message: "database password leaked",
  });
});
