import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ooshsymupswnebcqrjrm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_OqQMPU9kVpiOWPmwonQ8uQ_4ISvWtZm")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
