import { admin, cors, json, requireUser } from '../_shared/clients.ts'
import { decrypt } from '../_shared/crypto.ts'

// Shows the full key once. We keep it encrypted (to read usage), but the customer only sees it
// one time; after that, losing it means rolling a new one.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const user = await requireUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  // Flip the flag first so two tabs can't both reveal it.
  const { data, error } = await admin.from('api_keys')
    .update({ needs_reveal: false, revealed_at: new Date().toISOString() })
    .eq('user_id', user.id).is('revoked_at', null).eq('needs_reveal', true)
    .select('secret_enc')
  if (error) return json({ error: error.message }, 500)
  if (!data?.length) return json({ error: 'This key was already shown. Roll a new key to see one again.' }, 404)

  return json({ key: await decrypt(data[0].secret_enc) })
})
