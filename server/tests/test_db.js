import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ooshsymupswnebcqrjrm.supabase.co'
const supabaseKey = 'sb_publishable_OqQMPU9kVpiOWPmwonQ8uQ_4ISvWtZm'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    // Try to query 'venues' table to see if it exists
    const { data, error } = await supabase.from('venues').select('*').limit(1);
    if (error) {
        console.error("Error querying venues:", error.message);
    } else {
        console.log("Venues table exists! Sample data:", data);
    }
}

test();
