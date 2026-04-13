import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ooshsymupswnebcqrjrm.supabase.co'
const supabaseKey = 'sb_publishable_OqQMPU9kVpiOWPmwonQ8uQ_4ISvWtZm'

export const supabase = createClient(supabaseUrl, supabaseKey)