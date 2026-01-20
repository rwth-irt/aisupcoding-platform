const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL_ERROR: JWT_SECRET is not defined in environment variables.');
}

function authenticateToken(req, res, next) {
  // Get the token from the 'Authorization' header
  // It's usually in the format: "Bearer TOKEN_STRING"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    // No token provided
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token is invalid or expired
      return res.sendStatus(403); // Forbidden
    }
    
    // Token is valid, save the user payload to the request
    // so our endpoint can use it if needed
    req.user = user;
    next(); // Move on to the next function (the endpoint handler)
  });
}

module.exports = authenticateToken;