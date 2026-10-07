// 404 for unmatched routes
exports.notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    errors: [`Route not found: ${req.method} ${req.originalUrl}`],
  });
};

// Central error handler (last middleware)
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  // CORS rejections and malformed JSON bodies
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: 'Forbidden', errors: [err.message] });
  }
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ success: false, message: 'Validation failed', errors: ['Request body must be valid JSON.'] });
  }

  console.error(err);
  return res
    .status(500)
    .json({ success: false, message: 'Internal server error', errors: ['Something went wrong on the server.'] });
};
