// Centralized error handling middleware

export function errorHandler(err, _req, res, _next) {
  console.error("[error]", err.message, err.stack);

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  };

  // Add stack trace in development
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// Async route wrapper to catch promise rejections
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
