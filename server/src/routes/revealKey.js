import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { q } from '../db.js'
import { decrypt } from '../crypto.js'

const router = Router()

// Shows the full key once. We keep it encrypted (to read usage), but the customer only sees it
// one time; after that, losing it means rolling a new one.
router.post('/', requireAuth, async (req, res) => {
  // Flip the flag first so two tabs can't both reveal it.
  const { rows } = await q(
    `update api_keys set needs_reveal = false, revealed_at = now()
     where user_id = $1 and revoked_at is null and needs_reveal = true
     returning secret_enc`,
    [req.userId],
  )
  if (!rows.length) return res.status(404).json({ error: 'This key was already shown. Roll a new key to see one again.' })
  res.json({ key: decrypt(rows[0].secret_enc) })
})

export default router
