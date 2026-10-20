import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET

export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' })
}

/** Express middleware: requires a valid bearer token, sets req.userId. */
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'unauthorized' })
  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'unauthorized' })
  }
}
