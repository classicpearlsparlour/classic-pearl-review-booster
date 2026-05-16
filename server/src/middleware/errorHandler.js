export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === 'ZodError') {
    return res.status(400).json({
      message: 'Validation failed',
      issues: error.issues
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Something went wrong' });
}
