const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

// Rejects the request with a 400 when any named route param is not a valid
// ObjectId, so malformed IDs never reach Mongoose (where they would surface
// as a 500 CastError).
export function validateObjectIds(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];

      if (value !== undefined && !isObjectId(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${name}`,
        });
      }
    }

    return next();
  };
}
